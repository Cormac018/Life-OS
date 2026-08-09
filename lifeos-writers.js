/* =========================
   lifeos-writers.js: canonical collection writers
   - One writer per collection, so every caller produces the same shape
   - Merge semantics: omit a key to leave it unchanged, pass null to clear it
   - All writes still go through LifeOSDB.upsert, which stays the single
     write primitive
   ========================= */

(function (global) {
  function db() {
    if (!global.LifeOSDB) {
      throw new Error("LifeOSWrite requires LifeOSDB to be loaded first.");
    }
    return global.LifeOSDB;
  }

  // Distinguishes "key was not supplied" from "key was supplied as undefined",
  // which is what makes the merge semantics safe.
  function has(patch, key) {
    return Object.prototype.hasOwnProperty.call(patch, key);
  }

  function findByDate(collectionName, date) {
    const all = (db().getCollection(collectionName) || []).filter(Boolean);
    return all.find((x) => x && x.date === date) || null;
  }

  /* -------------------------
     workLogs
     One record per day, id is work_<date>.
     ------------------------- */

  function workLog(patch) {
    if (!patch || typeof patch !== "object") {
      throw new Error("workLog expects an object patch");
    }

    const date = patch.date;
    if (!date) {
      throw new Error("workLog requires a date");
    }

    const existing = findByDate("workLogs", date);
    const now = db().nowISO();

    // A caller that only knows about minutes cannot wipe startTime, endTime
    // or note, which is the drift this writer exists to remove.
    const minutes = has(patch, "minutes")
      ? Number(patch.minutes) || 0
      : existing
      ? Number(existing.minutes) || 0
      : 0;

    const note = has(patch, "note")
      ? String(patch.note || "").trim()
      : existing
      ? existing.note
      : "";

    const startTime = has(patch, "startTime")
      ? patch.startTime || null
      : existing
      ? existing.startTime || null
      : null;

    const endTime = has(patch, "endTime")
      ? patch.endTime || null
      : existing
      ? existing.endTime || null
      : null;

    return db().upsert("workLogs", {
      id: `work_${date}`,
      date,
      minutes,
      note,
      startTime,
      endTime,
      createdAt: existing ? existing.createdAt || now : now,
      updatedAt: now,
    });
  }

  /* -------------------------
     metricEntries
     One record per metric per day, id is m_<metricId>_<date>.
     ------------------------- */

  function metricEntry(patch) {
    if (!patch || typeof patch !== "object") {
      throw new Error("metricEntry expects an object patch");
    }

    const metricId = patch.metricId;
    const date = patch.date;
    if (!metricId || !date) {
      throw new Error("metricEntry requires a metricId and a date");
    }

    const id = `m_${metricId}_${date}`;
    const all = (db().getCollection("metricEntries") || []).filter(Boolean);
    const existing = all.find((x) => x && x.id === id) || null;
    const now = db().nowISO();

    // Value is passed through as given, so existing callers that already
    // validate their input keep their exact behaviour.
    const value = has(patch, "value")
      ? patch.value
      : existing
      ? existing.value
      : undefined;

    if (value === undefined) {
      throw new Error("metricEntry requires a value for a new entry");
    }

    const note = has(patch, "note")
      ? String(patch.note || "").trim()
      : existing
      ? existing.note
      : "";

    return db().upsert("metricEntries", {
      id,
      metricId,
      date,
      value,
      note,
      createdAt: existing ? existing.createdAt || now : now,
      updatedAt: now,
    });
  }

  /* -------------------------
     moneyTransactions
     These keep random ids, so there is no natural guard against logging the
     same spend twice. findDuplicateTransaction answers "have I already got
     this one?" and the writer enforces it only when asked, so manual entry
     stays unblocked.
     ------------------------- */

  function normaliseMerchant(value) {
    return String(value || "").trim().toLowerCase();
  }

  function findDuplicateTransaction(tx) {
    if (!tx || typeof tx !== "object") return null;

    const all = (db().getCollection("moneyTransactions") || []).filter(Boolean);
    const amount = Number(tx.amount);
    const merchant = normaliseMerchant(tx.merchant);

    return (
      all.find((x) => {
        if (!x) return false;
        // Editing a record is never a duplicate of itself.
        if (tx.id && x.id === tx.id) return false;
        return (
          x.date === tx.date &&
          x.accountId === tx.accountId &&
          Number(x.amount) === amount &&
          x.categoryId === tx.categoryId &&
          normaliseMerchant(x.merchant) === merchant
        );
      }) || null
    );
  }

  function moneyTransaction(tx, opts) {
    if (!tx || typeof tx !== "object") {
      throw new Error("moneyTransaction expects an object");
    }
    if (!tx.date) {
      throw new Error("moneyTransaction requires a date");
    }

    const options = opts || {};

    // Off by default: manual entry writes without being blocked. The voice
    // confirm screen is the caller that will opt in.
    if (options.checkDuplicate === true) {
      const duplicate = findDuplicateTransaction(tx);
      if (duplicate) {
        return { status: "duplicate", existing: duplicate, entity: null };
      }
    }

    const all = (db().getCollection("moneyTransactions") || []).filter(Boolean);
    const existing = tx.id
      ? all.find((x) => x && x.id === tx.id) || null
      : null;
    const now = db().nowISO();

    const entity = {
      date: tx.date,
      accountId: tx.accountId,
      amount: Number(tx.amount),
      categoryId: tx.categoryId,
      essentiality: tx.essentiality === "essential" ? "essential" : "optional",
      merchant: String(tx.merchant || "").trim(),
      note: String(tx.note || "").trim(),
      createdAt: existing ? existing.createdAt || now : tx.createdAt || now,
      updatedAt: now,
    };

    // Carried only when supplied, so ordinary spends stay free of the flag.
    if (has(tx, "isPayday")) {
      entity.isPayday = tx.isPayday;
    }
    if (tx.id) {
      entity.id = tx.id;
    }

    return { status: "written", existing: null, entity: db().upsert("moneyTransactions", entity) };
  }

  /* -------------------------
     foods
     The food library. Nutrition is per 100 g of the food in the state it is
     weighed in; the collection comment in db.js is the full convention.

     Two things differ from the writers above. The id is supplied by the
     caller rather than derived, because a stable slug is the whole point of
     this collection, so the naming contract is enforced here, in the one
     place that can guarantee it. And the per-100 g nutrition is required on
     create: a food missing it is not usable by anything that computes a meal,
     so it is refused rather than stored half-built with zeros standing in for
     unknowns.
     ------------------------- */

  const FOOD_ID_PATTERN = /^food_[a-z0-9_]+$/;

  const FOOD_REQUIRED = ["kcal", "protein", "carbs", "fat", "sugar"];

  // Absent means unknown, never zero, so these are carried only when supplied.
  const FOOD_OPTIONAL = ["satFat", "fibre", "salt"];

  function foodNumber(value, field, id) {
    // Number("") and Number(null) are both 0, so an unchecked coerce is how a
    // blank cell becomes a stored reading of zero. Only a real number or a
    // non-blank numeric string counts as a stated value.
    const stated =
      typeof value === "number" ||
      (typeof value === "string" && value.trim() !== "");
    const n = stated ? Number(value) : NaN;

    if (!Number.isFinite(n)) {
      throw new Error(`food ${id} has a non-numeric ${field}`);
    }
    if (n < 0) {
      throw new Error(`food ${id} has a negative ${field}`);
    }
    return n;
  }

  function food(patch) {
    if (!patch || typeof patch !== "object") {
      throw new Error("food expects an object patch");
    }

    const id = patch.id;
    if (typeof id !== "string" || !FOOD_ID_PATTERN.test(id)) {
      throw new Error(
        `food requires a stable id of the form food_<slug>, got ${JSON.stringify(
          id
        )}`
      );
    }

    const all = (db().getCollection("foods") || []).filter(Boolean);
    const existing = all.find((x) => x && x.id === id) || null;
    const now = db().nowISO();

    const name = has(patch, "name")
      ? String(patch.name || "").trim()
      : existing
      ? existing.name
      : "";
    if (!name) {
      throw new Error(`food ${id} requires a name`);
    }

    const entity = {
      id,
      name,
      createdAt: existing ? existing.createdAt || now : now,
      updatedAt: now,
    };

    // Merge semantics still apply, so an update that only moves kcal keeps the
    // rest, but a new food must state all five.
    FOOD_REQUIRED.forEach((field) => {
      if (has(patch, field)) {
        entity[field] = foodNumber(patch[field], field, id);
        return;
      }
      if (existing && has(existing, field)) {
        entity[field] = existing[field];
        return;
      }
      throw new Error(`food ${id} requires ${field} for a new entry`);
    });

    // A key never supplied stays absent, which is what makes "blank means
    // unknown" survive a round trip. null clears one that was there.
    FOOD_OPTIONAL.forEach((field) => {
      if (has(patch, field)) {
        if (patch[field] === null) return;
        entity[field] = foodNumber(patch[field], field, id);
        return;
      }
      if (existing && has(existing, field)) {
        entity[field] = existing[field];
      }
    });

    // The countable unit is a pair or it is nothing: a unitName without
    // unitGrams cannot resolve "a packet" to a weight. Clearing either clears
    // both, for the same reason.
    const clearingUnit =
      (has(patch, "unitName") && patch.unitName === null) ||
      (has(patch, "unitGrams") && patch.unitGrams === null);

    if (!clearingUnit) {
      const unitName = has(patch, "unitName")
        ? patch.unitName
        : existing
        ? existing.unitName
        : undefined;
      const unitGrams = has(patch, "unitGrams")
        ? patch.unitGrams
        : existing
        ? existing.unitGrams
        : undefined;

      const hasName = unitName !== undefined;
      const hasGrams = unitGrams !== undefined;

      if (hasName !== hasGrams) {
        throw new Error(
          `food ${id} needs unitName and unitGrams together, or neither`
        );
      }

      if (hasName) {
        const trimmed = String(unitName).trim();
        if (!trimmed) {
          throw new Error(`food ${id} has an empty unitName`);
        }
        const grams = foodNumber(unitGrams, "unitGrams", id);
        if (grams <= 0) {
          throw new Error(`food ${id} has a unitGrams of ${grams}`);
        }
        entity.unitName = trimmed;
        entity.unitGrams = grams;
      }
    }

    return db().upsert("foods", entity);
  }

  global.LifeOSWrite = {
    workLog,
    metricEntry,
    moneyTransaction,
    findDuplicateTransaction,
    food,
  };
})(window);
