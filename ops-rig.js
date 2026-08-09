/* =========================
   ops-rig.js: proving rig for the operations contract
   - The confirm screen renderer plus the fixture harness.
   - Every contract rule lives in lifeos-ops.js. This file holds none of its
     own: it asks LifeOSOps for validity, for a row's state, and for which
     resolution values are chips, then draws the answer.
   - Fixtures are factory functions run at click time against live
     collections, because account ids are minted at random on create and
     cannot be hardcoded.
   - Reachable only by typing #rig. No nav link, no title-map entry.
   ========================= */

(function (global) {
  const doc = global.document;

  function db() {
    if (!global.LifeOSDB) throw new Error("The rig requires LifeOSDB.");
    return global.LifeOSDB;
  }

  function ops() {
    if (!global.LifeOSOps) throw new Error("The rig requires LifeOSOps.");
    return global.LifeOSOps;
  }

  // Exactly how the app computes a date everywhere else, UTC-truncated.
  function isoToday() {
    return new Date().toISOString().slice(0, 10);
  }

  // Mirrors the private formatter in finance.js. Three lines, and reaching
  // into another module's IIFE for it is not possible by design.
  function money(n) {
    const v = Number(n) || 0;
    return v.toLocaleString(undefined, { style: "currency", currency: "GBP" });
  }

  /* -------------------------
     Live vocabulary
     Stands in for the vocab pack a parser would be handed. Real ids, read
     from storage, never invented.
     ------------------------- */

  function collection(name) {
    try {
      return (db().getCollection(name) || []).filter(Boolean);
    } catch (err) {
      return [];
    }
  }

  function pickAccountId() {
    const all = collection("moneyAccounts");
    if (!all.length) {
      throw new Error(
        "No money accounts exist yet. Add one in Finances, then rebuild. " +
          "Account ids are minted at random on create, so the rig cannot invent one."
      );
    }
    return all[0].id;
  }

  function pickCategoryId(preferredId) {
    const all = collection("categories");
    if (!all.length) {
      throw new Error(
        "No categories exist yet. Open Finances once so the defaults seed, then rebuild."
      );
    }
    const preferred = all.find((c) => c.id === preferredId);
    return (preferred || all[0]).id;
  }

  function nameOf(collectionName, id) {
    const found = collection(collectionName).find((x) => x.id === id);
    return found && found.name ? found.name : id;
  }

  function metricLabel(metricId) {
    const def = collection("metricDefinitions").find((d) => d.id === metricId);
    return def && def.name ? def.name : metricId;
  }

  function metricUnit(metricId) {
    const def = collection("metricDefinitions").find((d) => d.id === metricId);
    return def && def.unit ? def.unit : "";
  }

  /* -------------------------
     Fixtures
     Each build() returns { envelope, hint, injectFailureFor }. Only envelope
     is contract surface: hint is a note to the operator and injectFailureFor
     is rig metadata for the step 3 throwing wrapper, deliberately outside the
     envelope so no test scaffolding ever rides inside an operation.
     ------------------------- */

  function envelopeOf(operations, unhandled) {
    const envelope = { contract: ops().CONTRACT, operations: operations };
    if (unhandled) envelope.unhandled = unhandled;
    return envelope;
  }

  function sleepOp(opId, extra) {
    return Object.assign(
      {
        opId: opId,
        writer: "metricEntry",
        entity: { metricId: "sleep_hours", date: isoToday(), value: 7 },
        resolution: { metricId: "matched", date: "stated", value: "stated" },
        sourceText: "slept seven hours",
      },
      extra || {}
    );
  }

  function spendOp(opId, extra) {
    return Object.assign(
      {
        opId: opId,
        writer: "moneyTransaction",
        entity: {
          date: isoToday(),
          accountId: pickAccountId(),
          amount: -24,
          categoryId: pickCategoryId("cat_groceries"),
          essentiality: "essential",
          merchant: "Tesco",
        },
        resolution: {
          date: "stated",
          amount: "stated",
          merchant: "matched",
          categoryId: "matched",
          accountId: "matched",
          essentiality: "matched",
        },
        sourceText: "spent twenty-four at Tesco",
      },
      extra || {}
    );
  }

  // The merchant case is flipped on purpose: the seeded row must differ from
  // the fixture only in case, which is what puts normaliseMerchant in play.
  function duplicateHint(entity) {
    const seed = {
      date: entity.date,
      accountId: entity.accountId,
      amount: entity.amount,
      categoryId: entity.categoryId,
      essentiality: entity.essentiality,
      merchant: String(entity.merchant).toUpperCase(),
    };
    return (
      "Paste this in the console first, then Rebuild:\n" +
      "LifeOSWrite.moneyTransaction(" +
      JSON.stringify(seed) +
      ")"
    );
  }

  function mergeHint(date) {
    return (
      "Paste this in the console first, then Rebuild:\n" +
      'LifeOSWrite.metricEntry({ metricId: "sleep_hours", date: "' +
      date +
      '", value: 6, note: "restless" })\n' +
      "After committing, the value must read 7 and the note must still read restless."
    );
  }

  const FIXTURES = [
    {
      id: "clean",
      label: "Clean pair (both ready)",
      build: function () {
        return { envelope: envelopeOf([sleepOp("op_1"), spendOp("op_2")]) };
      },
    },
    {
      id: "guessed",
      label: "Guessed pair (one to check)",
      build: function () {
        const spend = spendOp("op_2", {
          resolution: {
            date: "stated",
            amount: "stated",
            merchant: "matched",
            categoryId: "guessed",
            accountId: "default",
            essentiality: "guessed",
          },
        });
        return { envelope: envelopeOf([sleepOp("op_1"), spend]) };
      },
    },
    {
      id: "duplicate",
      label: "Duplicate batch (money duplicates a seeded row)",
      build: function () {
        const spend = spendOp("op_2");
        return {
          envelope: envelopeOf([sleepOp("op_1"), spend]),
          hint: duplicateHint(spend.entity),
        };
      },
    },
    {
      id: "failure",
      label: "Failure batch (money first, its write throws)",
      build: function () {
        return {
          envelope: envelopeOf([spendOp("op_1"), sleepOp("op_2")]),
          injectFailureFor: "op_1",
        };
      },
    },
    {
      id: "unhandled",
      label: "Unhandled batch (ops plus a heard span)",
      build: function () {
        return {
          envelope: envelopeOf(
            [sleepOp("op_1"), spendOp("op_2")],
            [{ sourceText: "push day", reason: "no workout write path yet" }]
          ),
        };
      },
    },
    {
      id: "merge",
      label: "Merge proof (value only, no note)",
      build: function () {
        const date = isoToday();
        return {
          envelope: envelopeOf([
            {
              opId: "op_1",
              writer: "metricEntry",
              entity: { metricId: "sleep_hours", date: date, value: 7 },
              sourceText: "slept seven hours",
            },
          ]),
          hint: mergeHint(date),
        };
      },
    },
    {
      id: "rogue-entity",
      label: "Rogue entity (extra field inside entity)",
      build: function () {
        const op = sleepOp("op_1");
        op.entity.confidence = 0.9;
        return { envelope: envelopeOf([op]) };
      },
    },
    {
      id: "rogue-sibling",
      label: "Rogue sibling (unknown field beside entity)",
      build: function () {
        const a = sleepOp("op_1");
        a.confidence = 0.9;
        const b = spendOp("op_2");
        b.engine = "home-rig";
        return { envelope: envelopeOf([a, b]) };
      },
    },
    {
      id: "worklog",
      label: "Out of scope writer (workLog)",
      build: function () {
        return {
          envelope: envelopeOf([
            {
              opId: "op_1",
              writer: "workLog",
              entity: { date: isoToday(), minutes: 480 },
              sourceText: "worked eight hours",
            },
          ]),
        };
      },
    },
  ];

  /* -------------------------
     Human rendering
     ------------------------- */

  const FIELD_ORDER = {
    metricEntry: ["metricId", "date", "value", "note"],
    moneyTransaction: [
      "date",
      "merchant",
      "amount",
      "categoryId",
      "accountId",
      "essentiality",
      "note",
      "isPayday",
    ],
  };

  const FIELD_LABELS = {
    metricId: "Metric",
    date: "Date",
    value: "Value",
    note: "Note",
    merchant: "Merchant",
    amount: "Amount",
    categoryId: "Category",
    accountId: "Account",
    essentiality: "Essentiality",
    isPayday: "Payday",
  };

  function fieldLabel(field) {
    return FIELD_LABELS[field] || field;
  }

  function fieldValue(op, field) {
    const raw = op.entity[field];
    if (field === "categoryId") return nameOf("categories", raw);
    if (field === "accountId") return nameOf("moneyAccounts", raw);
    if (field === "metricId") return metricLabel(raw);
    if (field === "amount") return money(raw);
    return String(raw);
  }

  function humanLine(op) {
    const entity = op.entity;

    if (op.writer === "metricEntry") {
      const unit = metricUnit(entity.metricId);
      return (
        metricLabel(entity.metricId) +
        " " +
        entity.value +
        (unit ? " " + unit : "")
      );
    }

    if (op.writer === "moneyTransaction") {
      const parts = [money(entity.amount)];
      if (entity.merchant) parts.push("at " + entity.merchant);
      const line = parts.join(" ");
      const tail = [
        nameOf("categories", entity.categoryId),
        nameOf("moneyAccounts", entity.accountId),
      ]
        .filter(Boolean)
        .join(", ");
      return tail ? line + ", " + tail : line;
    }

    return op.writer;
  }

  /* -------------------------
     Screen
     ------------------------- */

  const el = {};
  let current = null;

  function cacheEls() {
    el.view = doc.getElementById("view-rig");
    el.select = doc.getElementById("rigFixture");
    el.rebuild = doc.getElementById("rigRebuild");
    el.hint = doc.getElementById("rigHint");
    el.error = doc.getElementById("rigError");
    el.count = doc.getElementById("rigCount");
    el.rows = doc.getElementById("rigRows");
    el.footer = doc.getElementById("rigFooter");
    el.commit = doc.getElementById("rigCommit");
  }

  function clearScreen() {
    current = null;
    el.hint.textContent = "";
    el.hint.hidden = true;
    el.error.textContent = "";
    el.error.hidden = true;
    el.count.textContent = "";
    el.count.hidden = true;
    el.rows.textContent = "";
    el.footer.hidden = true;
  }

  // Loud and total: an envelope that fails validation renders this and
  // nothing else, so there is never a partial screen to tap.
  function showError(title, messages) {
    el.error.hidden = false;
    const heading = doc.createElement("p");
    heading.className = "rig-error-title";
    heading.textContent = title;
    el.error.appendChild(heading);

    const list = doc.createElement("ul");
    (messages || []).forEach(function (message) {
      const item = doc.createElement("li");
      item.textContent = message;
      list.appendChild(item);
    });
    el.error.appendChild(list);
  }

  function loadFixture(id) {
    clearScreen();
    if (!id) return;

    const fixture = FIXTURES.find(function (f) {
      return f.id === id;
    });
    if (!fixture) return;

    let built;
    try {
      built = fixture.build();
    } catch (err) {
      showError("Fixture could not be built.", [err.message]);
      return;
    }

    const check = ops().validateEnvelope(built.envelope);
    if (!check.ok) {
      showError(
        "Rejected by validateEnvelope. Nothing from this envelope is committable.",
        check.errors
      );
      return;
    }

    renderEnvelope(built);
  }

  function renderEnvelope(built) {
    current = {
      envelope: built.envelope,
      injectFailureFor: built.injectFailureFor || null,
      checked: new Set(
        built.envelope.operations.map(function (op) {
          return op.opId;
        })
      ),
      corrected: new Set(),
      results: null,
      failedDismissed: false,
    };

    if (built.hint) {
      el.hint.hidden = false;
      el.hint.textContent = built.hint;
    }

    renderCount();

    built.envelope.operations.forEach(function (op) {
      el.rows.appendChild(renderOperationRow(op));
    });

    (built.envelope.unhandled || []).forEach(function (item) {
      el.rows.appendChild(renderUnhandledStrip(item));
    });

    el.footer.hidden = false;
    updateCommitButton();
  }

  function findOp(opId) {
    if (!current) return null;
    return (
      current.envelope.operations.find(function (op) {
        return op.opId === opId;
      }) || null
    );
  }

  // Redraws one row in place, so a correction does not collapse the details
  // the user has open on other rows.
  function refreshRow(opId) {
    const existing = el.rows.querySelector(
      '.rig-row[data-op-id="' + opId + '"]'
    );
    const op = findOp(opId);
    if (!existing || !op) return;

    el.rows.replaceChild(renderOperationRow(op), existing);
    renderCount();
    updateCommitButton();
  }

  function updateCommitButton() {
    const count = current ? current.checked.size : 0;
    el.commit.disabled = count === 0;
    el.commit.textContent =
      count === 0
        ? "Nothing selected"
        : "Log " + count + (count === 1 ? " entry" : " entries");
  }

  // The guarantee that a flagged row off-screen is still known about.
  // Rendered only when at least one needs-check row exists.
  function renderCount() {
    const operations = current.envelope.operations;
    const toCheck = operations.filter(function (op) {
      return ops().deriveState(op) === "needs-check";
    }).length;

    if (!toCheck) {
      el.count.hidden = true;
      el.count.textContent = "";
      return;
    }

    el.count.hidden = false;
    el.count.textContent =
      operations.length +
      (operations.length === 1 ? " entry, " : " entries, ") +
      toCheck +
      " to check";
  }

  function renderOperationRow(op) {
    const state = ops().deriveState(op);

    const row = doc.createElement("div");
    row.className = "rig-row";
    row.setAttribute("data-state", state);
    row.setAttribute("data-op-id", op.opId);

    const box = doc.createElement("input");
    box.type = "checkbox";
    box.className = "rig-check";
    box.checked = current.checked.has(op.opId);
    box.addEventListener("change", function () {
      if (box.checked) current.checked.add(op.opId);
      else current.checked.delete(op.opId);
      updateCommitButton();
    });
    row.appendChild(box);

    const body = doc.createElement("div");
    body.className = "rig-row-body";

    const line = doc.createElement("div");
    line.className = "rig-line";
    line.textContent = humanLine(op);
    body.appendChild(line);

    // A ready row stays quiet: one line and an expandable. A needs-check row
    // shows its fields, the suspect ones as chips. A row the user has already
    // corrected keeps its strip even once every field reads plain, so a
    // correction settles in place instead of vanishing.
    if (state === "needs-check" || current.corrected.has(op.opId)) {
      body.appendChild(renderFieldStrip(op));
    }

    body.appendChild(renderDetails(op));
    row.appendChild(body);
    return row;
  }

  function renderFieldStrip(op) {
    const strip = doc.createElement("div");
    strip.className = "rig-fields";
    const order = FIELD_ORDER[op.writer] || Object.keys(op.entity);
    const resolution = op.resolution || {};

    order.forEach(function (field) {
      if (!Object.prototype.hasOwnProperty.call(op.entity, field)) return;

      // The whole highlighting rule, taken from the contract as data rather
      // than reimplemented here.
      const flagged =
        ops().FLAGGED_RESOLUTIONS.indexOf(resolution[field]) >= 0;

      const node = doc.createElement(flagged ? "button" : "span");
      node.className = flagged ? "rig-chip" : "rig-plain";
      node.textContent = fieldLabel(field) + ": " + fieldValue(op, field);

      if (flagged) {
        node.type = "button";
        node.setAttribute("data-field", field);
        node.title = resolution[field];
        node.addEventListener("click", function () {
          openPicker(op, field, strip.parentNode);
        });
      }

      strip.appendChild(node);
    });

    return strip;
  }

  function renderDetails(op) {
    const details = doc.createElement("details");
    details.className = "rig-details";

    const summary = doc.createElement("summary");
    summary.textContent = "Details";
    details.appendChild(summary);

    const list = doc.createElement("dl");
    const resolution = op.resolution || {};

    addDetail(list, "writer", op.writer);

    Object.keys(op.entity).forEach(function (key) {
      const marker = resolution[key] ? "  (" + resolution[key] + ")" : "";
      addDetail(list, "entity." + key, String(op.entity[key]) + marker);
    });

    if (op.sourceText) addDetail(list, "heard", op.sourceText);

    details.appendChild(list);
    return details;
  }

  function addDetail(list, term, value) {
    const dt = doc.createElement("dt");
    dt.textContent = term;
    const dd = doc.createElement("dd");
    dd.textContent = value;
    list.appendChild(dt);
    list.appendChild(dd);
  }

  // No checkbox, ever. Heard, honestly shown, never committable.
  function renderUnhandledStrip(item) {
    const strip = doc.createElement("div");
    strip.className = "rig-unhandled";

    const span = doc.createElement("div");
    span.className = "rig-unhandled-span";
    span.textContent = item.sourceText;

    const reason = doc.createElement("div");
    reason.className = "rig-unhandled-reason";
    reason.textContent = item.reason;

    strip.appendChild(span);
    strip.appendChild(reason);
    return strip;
  }

  /* -------------------------
     Correction pickers
     Vocab pack entries only: real categories, real accounts. No inline
     create. When the right answer is not listed the guess stays committable,
     which is the pinned stance, and the note under the options says so.
     ------------------------- */

  const PICKERS = {
    categoryId: {
      title: "Category",
      options: function () {
        return collection("categories").map(function (c) {
          return { value: c.id, label: c.name || c.id };
        });
      },
    },
    accountId: {
      title: "Account",
      options: function () {
        return collection("moneyAccounts").map(function (a) {
          return { value: a.id, label: a.name || a.id };
        });
      },
    },
    essentiality: {
      title: "Essentiality",
      options: function () {
        return [
          { value: "essential", label: "Essential" },
          { value: "optional", label: "Optional" },
        ];
      },
    },
  };

  function closePicker(rowBody) {
    const open = rowBody.querySelector(".rig-picker");
    if (open) open.parentNode.removeChild(open);
  }

  function openPicker(op, field, rowBody) {
    closePicker(rowBody);

    const picker = PICKERS[field];
    if (!picker) return;

    const panel = doc.createElement("div");
    panel.className = "rig-picker";

    const title = doc.createElement("div");
    title.className = "rig-picker-title";
    title.textContent = picker.title;
    panel.appendChild(title);

    const options = doc.createElement("div");
    options.className = "rig-picker-options";

    picker.options().forEach(function (option) {
      const button = doc.createElement("button");
      button.type = "button";
      button.textContent = option.label;
      button.setAttribute(
        "aria-pressed",
        op.entity[field] === option.value ? "true" : "false"
      );
      button.addEventListener("click", function () {
        applyCorrection(op, field, option.value);
      });
      options.appendChild(button);
    });

    panel.appendChild(options);

    const note = doc.createElement("div");
    note.className = "rig-picker-note";
    note.textContent =
      "Not listed? The guess stays loggable, so keep it and fix it in the app " +
      "later, or untick this row. Creating a new one here is not in this slice.";
    panel.appendChild(note);

    const cancel = doc.createElement("button");
    cancel.type = "button";
    cancel.className = "rig-picker-cancel";
    cancel.textContent = "Cancel";
    cancel.addEventListener("click", function () {
      closePicker(rowBody);
    });
    panel.appendChild(cancel);

    rowBody.appendChild(panel);
  }

  // The user picking a value is the user stating it, so the field settles
  // plain by the contract's own render mapping rather than by a special case.
  function applyCorrection(op, field, value) {
    op.entity[field] = value;
    if (!op.resolution) op.resolution = {};
    op.resolution[field] = "stated";
    current.corrected.add(op.opId);
    refreshRow(op.opId);
  }

  /* -------------------------
     Commit
     ------------------------- */

  // Failure injection is dependency injection: a wrapper that throws for one
  // designated operation and delegates everything else. lifeos-ops.js knows
  // nothing about it, and db.js and lifeos-writers.js are untouched. The
  // designated call is spotted by entity identity, which holds because the
  // commit path passes op.entity straight through by reference.
  function buildWriters() {
    const base = global.LifeOSWrite;
    if (!base) throw new Error("LifeOSWrite is not loaded.");
    if (!current.injectFailureFor) return base;

    const target = findOp(current.injectFailureFor);
    if (!target) return base;

    const wrapped = {};
    Object.keys(base).forEach(function (name) {
      if (typeof base[name] !== "function") {
        wrapped[name] = base[name];
        return;
      }
      wrapped[name] = function (entity, opts) {
        if (entity === target.entity) {
          throw new Error(
            "Failed to write moneyTransactions to storage. Your browser " +
              "storage may be full. (thrown by the rig's failure fixture)"
          );
        }
        return base[name](entity, opts);
      };
    });
    return wrapped;
  }

  function commit() {
    if (!current || !current.checked.size) return;

    let results;
    try {
      results = ops().commitOperations(
        current.envelope,
        Array.from(current.checked),
        { writers: buildWriters() }
      ).results;
    } catch (err) {
      clearScreen();
      showError("Commit refused.", [err.message]);
      return;
    }

    current.results = results;
    current.failedDismissed = false;
    renderResults();
  }

  // "Log anyway" is a commit-time override, not a contract change: the same
  // single operation goes back through the same call with the duplicate flag
  // off. Nothing about the operation itself is edited.
  function logAnyway(opId) {
    const op = findOp(opId);
    if (!op) return;

    let results;
    try {
      results = ops().commitOperations(
        { contract: ops().CONTRACT, operations: [op] },
        [opId],
        { writers: buildWriters(), checkDuplicate: false }
      ).results;
    } catch (err) {
      showError("Commit refused.", [err.message]);
      return;
    }

    replaceResult(opId, results[0]);
  }

  function skipDuplicate(opId) {
    replaceResult(opId, { opId: opId, outcome: "skipped" });
  }

  function replaceResult(opId, next) {
    const index = current.results.findIndex(function (r) {
      return r.opId === opId;
    });
    if (index < 0) return;

    current.results[index] = next;
    // A failure arriving after an earlier block was dismissed must be shown,
    // not swallowed by the dismissal.
    if (next.outcome === "failed") current.failedDismissed = false;
    renderResults();
  }

  /* -------------------------
     Result screen
     A pure renderer over the results array. No logic, no counting rules of
     its own beyond the one the contract states: the success line counts
     written, and only written.
     ------------------------- */

  function renderResults() {
    el.rows.textContent = "";
    el.count.hidden = true;
    el.footer.hidden = true;

    const written = current.results.filter(function (r) {
      return r.outcome === "written";
    });

    const summary = doc.createElement("div");
    summary.className = "rig-summary";
    summary.textContent = written.length
      ? "Logged " +
        written.length +
        (written.length === 1 ? " entry" : " entries")
      : "Nothing logged.";
    el.rows.appendChild(summary);

    const failed = current.results.filter(function (r) {
      return r.outcome === "failed";
    });
    if (failed.length && !current.failedDismissed) {
      el.rows.appendChild(renderFailedBlock(failed));
    }

    current.results.forEach(function (result) {
      el.rows.appendChild(renderResultRow(result));
    });
  }

  // Its own block, never folded into the success count, and it stays on
  // screen until the user dismisses it rather than fading like a toast.
  function renderFailedBlock(failed) {
    const block = doc.createElement("div");
    block.className = "rig-failed";

    const title = doc.createElement("p");
    title.className = "rig-failed-title";
    title.textContent =
      failed.length === 1
        ? "This entry did not save."
        : "These " + failed.length + " entries did not save.";
    block.appendChild(title);

    const list = doc.createElement("ul");
    failed.forEach(function (result) {
      const op = findOp(result.opId);
      const item = doc.createElement("li");
      item.textContent =
        (op ? humanLine(op) : result.opId) + ": " + (result.error || "");
      list.appendChild(item);
    });
    block.appendChild(list);

    const dismiss = doc.createElement("button");
    dismiss.type = "button";
    dismiss.textContent = "Dismiss";
    dismiss.addEventListener("click", function () {
      current.failedDismissed = true;
      renderResults();
    });
    block.appendChild(dismiss);

    return block;
  }

  function renderResultRow(result) {
    const op = findOp(result.opId);

    const row = doc.createElement("div");
    row.className = "rig-result";
    row.setAttribute("data-outcome", result.outcome);

    const label = doc.createElement("div");
    label.className = "rig-outcome";
    label.textContent = result.outcome;
    row.appendChild(label);

    const body = doc.createElement("div");
    body.className = "rig-result-body";

    const line = doc.createElement("div");
    line.className = "rig-line";
    line.textContent = op ? humanLine(op) : result.opId;
    body.appendChild(line);

    const note = doc.createElement("div");
    note.className = "rig-result-note";

    if (result.outcome === "written") {
      note.textContent = "Saved as " + (result.entity && result.entity.id);
    } else if (result.outcome === "failed") {
      note.textContent = result.error || "";
    } else if (result.outcome === "skipped") {
      note.textContent = "Not logged.";
    } else if (result.outcome === "duplicate") {
      note.textContent =
        "Already logged" +
        (result.existing && result.existing.date
          ? " on " + result.existing.date
          : "") +
        ".";
    }
    body.appendChild(note);

    if (result.outcome === "duplicate") {
      body.appendChild(renderDuplicateChoice(result.opId));
    }

    row.appendChild(body);
    return row;
  }

  function renderDuplicateChoice(opId) {
    const choice = doc.createElement("div");
    choice.className = "rig-choice";

    const anyway = doc.createElement("button");
    anyway.type = "button";
    anyway.textContent = "Log anyway";
    anyway.addEventListener("click", function () {
      logAnyway(opId);
    });

    const skip = doc.createElement("button");
    skip.type = "button";
    skip.textContent = "Skip";
    skip.addEventListener("click", function () {
      skipDuplicate(opId);
    });

    choice.appendChild(anyway);
    choice.appendChild(skip);
    return choice;
  }

  /* -------------------------
     Wiring
     ------------------------- */

  function init() {
    cacheEls();
    if (!el.view || !el.select || !el.rows) return;

    FIXTURES.forEach(function (fixture) {
      const option = doc.createElement("option");
      option.value = fixture.id;
      option.textContent = fixture.label;
      el.select.appendChild(option);
    });

    el.select.addEventListener("change", function () {
      loadFixture(el.select.value);
    });

    if (el.rebuild) {
      el.rebuild.addEventListener("click", function () {
        loadFixture(el.select.value);
      });
    }

    if (el.commit) {
      el.commit.addEventListener("click", commit);
    }
  }

  doc.addEventListener("DOMContentLoaded", init);

  global.LifeOSOpsRig = {
    FIXTURES: FIXTURES,
    load: loadFixture,
  };
})(window);
