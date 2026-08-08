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

  global.LifeOSWrite = {
    workLog,
    metricEntry,
    moneyTransaction,
    findDuplicateTransaction,
  };
})(window);
