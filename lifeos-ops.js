/* =========================
   lifeos-ops.js: operations contract logic (OPS_CONTRACT.md, contract v1)
   - No DOM, no storage, no network. Data in, data out.
   - Three functions: validate an envelope, derive a row's state, commit.
   - Another surface (native app, home rig) must be able to drive this from
     the data alone, so nothing here knows the confirm screen exists.
   - An operation names a WRITER, not a collection, and entity is that
     writer's argument byte for byte. Commit is therefore zero-translation:
     LifeOSWrite[op.writer](op.entity, opts).
   ========================= */

(function (global) {
  const CONTRACT = "lifeos-ops/1";

  /* -------------------------
     The writer vocabulary
     ------------------------- */

  // Writers this slice accepts. workLog is deliberately absent: it is a real
  // LifeOSWrite writer, but a writer the slice never validated must never
  // reach storage through the contract, or the M2 hole reopens inside the
  // contract itself. Refusing it is a feature, not an oversight.
  const ACCEPTED_WRITERS = Object.freeze(["metricEntry", "moneyTransaction"]);

  // Every writer LifeOSWrite actually exposes that takes an entity. Used only
  // to tell "not a writer at all" apart from "a writer, out of scope here",
  // so the rejection message can say which.
  const KNOWN_WRITERS = Object.freeze([
    "workLog",
    "metricEntry",
    "moneyTransaction",
  ]);

  // Entity keys are the writer's argument, read straight off lifeos-writers.js.
  // metricEntry reads metricId, date, value and note. moneyTransaction reads
  // date, accountId, amount, categoryId, essentiality, merchant, note,
  // isPayday, createdAt and id. Nothing else is a writer argument, so nothing
  // else may sit inside entity.
  const ENTITY_KEYS = Object.freeze({
    metricEntry: Object.freeze(["metricId", "date", "value", "note"]),
    moneyTransaction: Object.freeze([
      "id",
      "date",
      "accountId",
      "amount",
      "categoryId",
      "essentiality",
      "merchant",
      "note",
      "isPayday",
      "createdAt",
    ]),
  });

  // Writer-required: what the writer itself throws without.
  const REQUIRED_KEYS = Object.freeze({
    metricEntry: Object.freeze(["metricId", "date", "value"]),
    moneyTransaction: Object.freeze(["date"]),
  });

  /* -------------------------
     The resolution vocabulary (closed, four values)
     ------------------------- */

  const RESOLUTIONS = Object.freeze(["stated", "matched", "guessed", "default"]);

  // The entire highlighting rule, exported as data rather than as a function
  // so every client renders identically without reimplementing the mapping:
  // stated and matched render plain, these two render as tappable chips.
  const FLAGGED_RESOLUTIONS = Object.freeze(["guessed", "default"]);

  /* -------------------------
     Small helpers
     ------------------------- */

  function has(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
  }

  function isPlainObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }

  function isNonEmptyString(value) {
    return typeof value === "string" && value.trim() !== "";
  }

  function isIsoDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return false;
    }
    // The pattern alone accepts 2026-02-31. The round trip rejects it, and the
    // explicit Z keeps this off the local timezone, matching the way the app
    // computes dates (new Date().toISOString().slice(0, 10)).
    const parsed = new Date(value + "T00:00:00Z");
    return (
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  }

  /* -------------------------
     validateEnvelope
     Loud and total: returns { ok, errors }, never a partial pass. Every
     problem found is reported, so one round of inspection sees them all.
     ------------------------- */

  function validateEnvelope(envelope) {
    const errors = [];

    if (!isPlainObject(envelope)) {
      return { ok: false, errors: ["Envelope is not an object."] };
    }

    if (envelope.contract !== CONTRACT) {
      errors.push(
        `Envelope contract must be "${CONTRACT}", got ${JSON.stringify(
          envelope.contract
        )}.`
      );
    }

    if (!Array.isArray(envelope.operations)) {
      errors.push("Envelope operations must be an array.");
    }

    if (has(envelope, "unhandled") && !Array.isArray(envelope.unhandled)) {
      errors.push("Envelope unhandled must be an array when present.");
    }

    // Unknown sibling fields on the envelope are ignored on purpose: the
    // versioning rule permits additive siblings within a version, and a
    // committer must ignore what it does not recognise.

    if (Array.isArray(envelope.operations)) {
      const seenOpIds = Object.create(null);

      envelope.operations.forEach((op, index) => {
        const at = `operations[${index}]`;

        if (!isPlainObject(op)) {
          errors.push(`${at} is not an object.`);
          return;
        }

        if (!isNonEmptyString(op.opId)) {
          errors.push(`${at}.opId must be a non-empty string.`);
        } else if (seenOpIds[op.opId]) {
          errors.push(`${at}.opId "${op.opId}" is not unique in this envelope.`);
        } else {
          seenOpIds[op.opId] = true;
        }

        if (has(op, "sourceText") && typeof op.sourceText !== "string") {
          errors.push(`${at}.sourceText must be a string when present.`);
        }

        // Unknown sibling fields beside entity are ignored here too, for the
        // same versioning reason. Only entity is closed.

        const writerOk = validateWriterName(op.writer, at, errors);
        const entityOk = validateEntityShape(op, at, errors, writerOk);
        validateResolution(op, at, errors, entityOk);
      });
    }

    if (Array.isArray(envelope.unhandled)) {
      envelope.unhandled.forEach((item, index) => {
        const at = `unhandled[${index}]`;
        if (!isPlainObject(item)) {
          errors.push(`${at} is not an object.`);
          return;
        }
        if (!isNonEmptyString(item.sourceText)) {
          errors.push(`${at}.sourceText must be a non-empty string.`);
        }
        // Free text, but it must be there: nothing heard is silently dropped,
        // and a reason the user cannot read is a silent drop with extra steps.
        if (!isNonEmptyString(item.reason)) {
          errors.push(`${at}.reason must be a non-empty string.`);
        }
      });
    }

    return { ok: errors.length === 0, errors };
  }

  function validateWriterName(writer, at, errors) {
    if (typeof writer !== "string" || writer === "") {
      errors.push(`${at}.writer must be a writer name.`);
      return false;
    }
    if (ACCEPTED_WRITERS.indexOf(writer) >= 0) {
      return true;
    }
    if (KNOWN_WRITERS.indexOf(writer) >= 0) {
      errors.push(
        `${at}.writer "${writer}" is a real LifeOSWrite writer but is outside ` +
          `this slice's scope (accepted: ${ACCEPTED_WRITERS.join(", ")}). ` +
          `Refused rather than forwarded.`
      );
      return false;
    }
    errors.push(`${at}.writer "${writer}" is not a LifeOSWrite writer.`);
    return false;
  }

  function validateEntityShape(op, at, errors, writerOk) {
    if (!isPlainObject(op.entity)) {
      errors.push(`${at}.entity must be an object.`);
      return false;
    }
    // Without a known writer there is no argument shape to check against, so
    // the entity checks below would be guesswork. The writer error already
    // makes the envelope invalid.
    if (!writerOk) return false;

    const writer = op.writer;
    const allowed = ENTITY_KEYS[writer];
    let ok = true;

    Object.keys(op.entity).forEach((key) => {
      if (allowed.indexOf(key) < 0) {
        errors.push(
          `${at}.entity.${key} is not an argument of the ${writer} writer. ` +
            `Annotations belong beside entity, never inside it.`
        );
        ok = false;
      }
    });

    // Create-only slice. id is a genuine moneyTransaction writer argument, so
    // this is a scope rule rather than an unknown key, and it says so.
    if (has(op.entity, "id")) {
      errors.push(
        `${at}.entity.id is not permitted: this slice is create-only.`
      );
      ok = false;
    }

    REQUIRED_KEYS[writer].forEach((key) => {
      if (!has(op.entity, key)) {
        errors.push(`${at}.entity.${key} is required by the ${writer} writer.`);
        ok = false;
      }
    });

    if (writer === "metricEntry") {
      ok = validateMetricEntry(op.entity, at, errors) && ok;
    } else if (writer === "moneyTransaction") {
      ok = validateMoneyTransaction(op.entity, at, errors) && ok;
    }

    return ok;
  }

  function validateMetricEntry(entity, at, errors) {
    let ok = true;

    if (has(entity, "metricId") && !isNonEmptyString(entity.metricId)) {
      errors.push(`${at}.entity.metricId must be a non-empty string.`);
      ok = false;
    }
    if (has(entity, "date") && !isIsoDate(entity.date)) {
      errors.push(`${at}.entity.date must be a real YYYY-MM-DD date.`);
      ok = false;
    }
    if (has(entity, "value")) {
      const value = entity.value;
      // The writer passes value straight through, so a NaN here would be
      // stored as a metric reading. Everything else is left to the writer.
      if (value === null || value === undefined) {
        errors.push(`${at}.entity.value must not be null.`);
        ok = false;
      } else if (typeof value === "number" && !Number.isFinite(value)) {
        errors.push(`${at}.entity.value must be a finite number.`);
        ok = false;
      }
    }
    if (has(entity, "note") && typeof entity.note !== "string") {
      errors.push(`${at}.entity.note must be a string when present.`);
      ok = false;
    }

    return ok;
  }

  function validateMoneyTransaction(entity, at, errors) {
    let ok = true;

    if (has(entity, "date") && !isIsoDate(entity.date)) {
      errors.push(`${at}.entity.date must be a real YYYY-MM-DD date.`);
      ok = false;
    }

    // Stricter than the writer, on purpose: the writer coerces with Number(),
    // so a missing or non-numeric amount is written as NaN with no complaint.
    // A contract whose job is refusing bad operations refuses that one.
    if (!has(entity, "amount") || typeof entity.amount !== "number" || !Number.isFinite(entity.amount)) {
      errors.push(`${at}.entity.amount must be a finite number.`);
      ok = false;
    }

    ["accountId", "categoryId"].forEach((key) => {
      if (has(entity, key) && !isNonEmptyString(entity[key])) {
        errors.push(`${at}.entity.${key} must be a non-empty string when present.`);
        ok = false;
      }
    });

    // The writer silently treats anything that is not exactly "essential" as
    // "optional", so a typo would be swallowed. Caught here instead.
    if (has(entity, "essentiality") && entity.essentiality !== "essential" && entity.essentiality !== "optional") {
      errors.push(
        `${at}.entity.essentiality must be "essential" or "optional".`
      );
      ok = false;
    }

    ["merchant", "note", "createdAt"].forEach((key) => {
      if (has(entity, key) && typeof entity[key] !== "string") {
        errors.push(`${at}.entity.${key} must be a string when present.`);
        ok = false;
      }
    });

    if (has(entity, "isPayday") && typeof entity.isPayday !== "boolean") {
      errors.push(`${at}.entity.isPayday must be a boolean when present.`);
      ok = false;
    }

    return ok;
  }

  function validateResolution(op, at, errors, entityOk) {
    if (!has(op, "resolution")) return;

    if (!isPlainObject(op.resolution)) {
      errors.push(`${at}.resolution must be an object when present.`);
      return;
    }

    Object.keys(op.resolution).forEach((field) => {
      const value = op.resolution[field];
      if (RESOLUTIONS.indexOf(value) < 0) {
        errors.push(
          `${at}.resolution.${field} must be one of ${RESOLUTIONS.join(", ")}.`
        );
      }
      // A resolution annotates how an entity field got its value, so a key
      // naming no entity field describes nothing. Only checked when the
      // entity itself is sound, to avoid piling errors on one cause.
      if (entityOk && !has(op.entity, field)) {
        errors.push(
          `${at}.resolution.${field} annotates a field that is not in entity.`
        );
      }
    });
  }

  /* -------------------------
     deriveState
     The contract's derivation rule and nothing else. Fields absent from
     resolution are stated, so an operation with no resolution is ready.
     ------------------------- */

  function deriveState(op) {
    if (!isPlainObject(op)) {
      throw new Error("deriveState expects an operation object");
    }

    const resolution = isPlainObject(op.resolution) ? op.resolution : {};
    const flagged = Object.keys(resolution).some(
      (field) => FLAGGED_RESOLUTIONS.indexOf(resolution[field]) >= 0
    );

    return flagged ? "needs-check" : "ready";
  }

  /* -------------------------
     commitOperations
     Iterates the checked operations in spoken order and returns the result
     object OPS_CONTRACT.md half two defines. Records and continues, never
     aborts the batch, the same discipline as M6's importWorkoutData.

     deps is committing-code policy, never contract surface:
       deps.writers          defaults to window.LifeOSWrite
       deps.checkDuplicate   defaults to true, passed to moneyTransaction only.
                             "Log anyway" re-invokes this with the single
                             operation and { checkDuplicate: false }.

     An invalid envelope throws rather than returning a result, because it is
     a programmer error and the result shape is pinned. The caller is expected
     to have gated on validateEnvelope already.
     ------------------------- */

  function commitOperations(envelope, checkedOpIds, deps) {
    const options = isPlainObject(deps) ? deps : {};
    const writers = options.writers || global.LifeOSWrite;

    if (!writers) {
      throw new Error("commitOperations requires writers (LifeOSWrite).");
    }

    const check = validateEnvelope(envelope);
    if (!check.ok) {
      throw new Error(
        "commitOperations refused an invalid envelope: " + check.errors[0]
      );
    }

    const checked = new Set(
      checkedOpIds instanceof Set
        ? Array.from(checkedOpIds)
        : Array.isArray(checkedOpIds)
        ? checkedOpIds
        : []
    );
    const checkDuplicate = options.checkDuplicate !== false;
    const results = [];

    envelope.operations.forEach((op) => {
      if (!checked.has(op.opId)) {
        results.push({ opId: op.opId, outcome: "skipped" });
        return;
      }

      if (typeof writers[op.writer] !== "function") {
        results.push({
          opId: op.opId,
          outcome: "failed",
          error: `No writer named ${op.writer} is available.`,
        });
        return;
      }

      // Policy is chosen here, never carried in the operation.
      const opts =
        op.writer === "moneyTransaction" ? { checkDuplicate } : undefined;

      try {
        // The zero-translation commit line. No mapping, spreading or renaming
        // of entity happens anywhere in this path: the writer's argument is
        // the entity exactly as the envelope carried it.
        const result = writers[op.writer](op.entity, opts);

        // Reading the writer's answer is not translating the entity.
        // moneyTransaction answers { status, existing, entity }; the other
        // writers answer with the stored entity itself.
        const statusResult =
          isPlainObject(result) && typeof result.status === "string";

        if (statusResult && result.status === "duplicate") {
          results.push({
            opId: op.opId,
            outcome: "duplicate",
            existing: result.existing || null,
          });
          return;
        }

        if (statusResult && result.status !== "written") {
          results.push({
            opId: op.opId,
            outcome: "failed",
            error: `Writer ${op.writer} returned unknown status "${result.status}".`,
          });
          return;
        }

        results.push({
          opId: op.opId,
          outcome: "written",
          entity: statusResult ? result.entity : result,
        });
      } catch (err) {
        // Including the storage-quota throw from setCollection. Recorded, and
        // the loop carries on to the next operation.
        results.push({
          opId: op.opId,
          outcome: "failed",
          error: err && err.message ? err.message : String(err),
        });
      }
    });

    return { results };
  }

  global.LifeOSOps = {
    CONTRACT,
    ACCEPTED_WRITERS,
    RESOLUTIONS,
    FLAGGED_RESOLUTIONS,
    validateEnvelope,
    deriveState,
    commitOperations,
  };
})(window);
