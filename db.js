/* =========================
   db.js — Life OS Storage Layer (v1)
   - localStorage-backed collections
   - schemaVersioned export/import
   - designed to migrate to IndexedDB later
   ========================= */

(function (global) {
  const SCHEMA_VERSION = 1;
  const KEY_PREFIX = "lifeos.";

  const COLLECTIONS = Object.freeze([
  "people",
  "goals",
  "metricDefinitions",
  "metricEntries",
  "planItems",
  "workLogs",

  "mealTemplates",
  "mealPlans",
  "dietLogs",
  "dietInventory",

  "notes",
  "moneyAccounts",
  "moneyTransactions",
  "moneySettings",
  "categories",
  "appMeta",
]);

  // Performance cache for metric entries
  let metricsCache = null;

  // Undo/deletion history (keep last 10 deletions)
  let deletionHistory = [];

  function nowISO() {
    return new Date().toISOString();
  }

  function makeId(prefix) {
    // Simple ID generator: prefix + timestamp + random
    return (
      prefix +
      "_" +
      Date.now().toString(36) +
      "_" +
      Math.random().toString(36).slice(2, 8)
    );
  }

  function getKey(collectionName) {
    return KEY_PREFIX + collectionName;
  }

  function safeParseJSON(raw, fallback) {
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function getCollection(collectionName) {
    if (!COLLECTIONS.includes(collectionName)) {
      throw new Error(`Unknown collection: ${collectionName}`);
    }
    const raw = localStorage.getItem(getKey(collectionName));
   const arr = safeParseJSON(raw, []);
if (Array.isArray(arr)) return arr;

// Repair corrupted data shape
console.warn(`Collection ${collectionName} was not an array; resetting.`);
setCollection(collectionName, []);
return [];
  }

  function setCollection(collectionName, arr) {
    if (!COLLECTIONS.includes(collectionName)) {
      throw new Error(`Unknown collection: ${collectionName}`);
    }
    if (!Array.isArray(arr)) {
      throw new Error(`setCollection expects an array for ${collectionName}`);
    }

    const key = getKey(collectionName);
    const json = JSON.stringify(arr);

    try {
      localStorage.setItem(key, json);
    } catch (err) {
      // Most common: QuotaExceededError
      const msg =
        `Failed to write ${collectionName} to storage. ` +
        `Your browser storage may be full. ` +
        `Export your data and consider clearing old data or migrating to IndexedDB.`;

      console.error(msg, { collectionName, key, bytes: json.length, err });
      throw new Error(msg);
    }
  }

  function invalidateMetricsCache() {
    metricsCache = null;
  }

  function buildMetricsCache() {
    const allEntries = getCollection("metricEntries");
    const cache = {
      byMetricId: {},
      byDate: {},
      all: allEntries
    };

    allEntries.forEach(entry => {
      if (!entry) return;

      // Index by metricId
      if (!cache.byMetricId[entry.metricId]) {
        cache.byMetricId[entry.metricId] = [];
      }
      cache.byMetricId[entry.metricId].push(entry);

      // Index by date
      if (!cache.byDate[entry.date]) {
        cache.byDate[entry.date] = [];
      }
      cache.byDate[entry.date].push(entry);
    });

    // Sort each metricId array by date descending (for latest lookups)
    Object.keys(cache.byMetricId).forEach(metricId => {
      cache.byMetricId[metricId].sort((a, b) => b.date.localeCompare(a.date));
    });

    return cache;
  }

  function getMetricEntriesByMetricId(metricId) {
    if (!metricsCache) {
      metricsCache = buildMetricsCache();
    }
    return metricsCache.byMetricId[metricId] || [];
  }

  function getMetricEntriesByDate(date) {
    if (!metricsCache) {
      metricsCache = buildMetricsCache();
    }
    return metricsCache.byDate[date] || [];
  }

  function getLatestMetricEntry(metricId) {
    const entries = getMetricEntriesByMetricId(metricId);
    return entries[0] || null; // Already sorted descending
  }

  function upsert(collectionName, entity) {
    if (!entity || typeof entity !== "object") {
      throw new Error("upsert expects an object entity");
    }
    const arr = getCollection(collectionName);

    const id = entity.id || makeId(collectionName.slice(0, 3));
    const next = { ...entity, id };

    const idx = arr.findIndex((x) => x && x.id === id);
    if (idx >= 0) {
      arr[idx] = next;
    } else {
      arr.push(next);
    }

    setCollection(collectionName, arr);

    // Invalidate metrics cache on metricEntries write
    if (collectionName === "metricEntries") {
      invalidateMetricsCache();
    }

    return next;
  }

  function remove(collectionName, id) {
    const arr = getCollection(collectionName);
    const entity = arr.find((x) => x && x.id === id);

    // Save to deletion history for undo
    if (entity) {
      deletionHistory.push({
        collectionName,
        entity: JSON.parse(JSON.stringify(entity)), // Deep clone
        timestamp: Date.now()
      });

      // Keep only last 10 deletions
      if (deletionHistory.length > 10) {
        deletionHistory.shift();
      }
    }

    const next = arr.filter((x) => x && x.id !== id);
    setCollection(collectionName, next);

    // Invalidate metrics cache on metricEntries delete
    if (collectionName === "metricEntries") {
      invalidateMetricsCache();
    }

    return next.length !== arr.length;
  }

  function undo() {
    const last = deletionHistory.pop();
    if (!last) {
      return { success: false, message: "Nothing to undo" };
    }

    try {
      upsert(last.collectionName, last.entity);
      return {
        success: true,
        message: `Restored deleted item from ${last.collectionName}`,
        entity: last.entity
      };
    } catch (err) {
      // Put it back in history if restore failed
      deletionHistory.push(last);
      return { success: false, message: `Undo failed: ${err.message}` };
    }
  }

  function getDeletionHistory() {
    return deletionHistory.slice().reverse(); // Most recent first
  }

  function clearDeletionHistory() {
    deletionHistory = [];
  }

  function initAppMeta() {
    const metaArr = getCollection("appMeta");
    if (metaArr.length === 0) {
      setCollection("appMeta", [
        {
          id: "meta",
          schemaVersion: SCHEMA_VERSION,
          createdAt: nowISO(),
          updatedAt: nowISO(),
        },
      ]);
    }
  }

  function touchMeta() {
    const metaArr = getCollection("appMeta");
    const meta = metaArr[0] || { id: "meta" };
    const next = {
      ...meta,
      schemaVersion: SCHEMA_VERSION,
      updatedAt: nowISO(),
    };
    setCollection("appMeta", [next]);
  }

  function exportAll() {
    // Export only Life OS keys (lifeos.*), not workouts.* etc.
    const payload = {
      app: "LifeOS",
      schemaVersion: SCHEMA_VERSION,
      exportedAt: nowISO(),
      collections: {},
    };

    COLLECTIONS.forEach((name) => {
      payload.collections[name] = getCollection(name);
    });

    return payload;
  }

  function importAll(payload, opts = {}) {
    const { overwrite = false } = opts;

    if (!payload || typeof payload !== "object") {
      throw new Error("Invalid import payload (not an object).");
    }
    if (payload.app !== "LifeOS") {
      throw new Error("Invalid import payload (app must be 'LifeOS').");
    }
    if (typeof payload.schemaVersion !== "number") {
      throw new Error("Invalid import payload (missing schemaVersion).");
    }
    if (!payload.collections || typeof payload.collections !== "object") {
      throw new Error("Invalid import payload (missing collections).");
    }

    // For now we support schemaVersion 1 only.
    if (payload.schemaVersion !== SCHEMA_VERSION) {
      throw new Error(
        `Schema mismatch. App expects v${SCHEMA_VERSION} but file is v${payload.schemaVersion}.`
      );
    }

    COLLECTIONS.forEach((name) => {
      const incoming = payload.collections[name];
      if (!Array.isArray(incoming)) return;

      if (overwrite) {
        setCollection(name, incoming);
      } else {
        // merge by id
        const existing = getCollection(name);
        const map = new Map();
        existing.forEach((x) => x && x.id && map.set(x.id, x));
        incoming.forEach((x) => x && x.id && map.set(x.id, x));
        setCollection(name, Array.from(map.values()));
      }
    });

    touchMeta();

    // Invalidate metrics cache after import
    invalidateMetricsCache();

    return true;
  }

  // Initialize meta on load
  initAppMeta();
  function getStorageUsage() {
    // Estimate bytes used by LifeOS keys only
    let total = 0;
    const perCollection = {};

    COLLECTIONS.forEach((name) => {
      const raw = localStorage.getItem(getKey(name)) || "";
      const bytes = raw.length; // rough but useful
      perCollection[name] = bytes;
      total += bytes;
    });

    return { totalBytes: total, perCollection };
  }

  global.LifeOSDB = {
    SCHEMA_VERSION,
    COLLECTIONS,
    makeId,
    nowISO,
    getCollection,
    setCollection,
    upsert,
    remove,
    exportAll,
    importAll,
    touchMeta,
    getStorageUsage,
    // Performance cache helpers
    getMetricEntriesByMetricId,
    getMetricEntriesByDate,
    getLatestMetricEntry,
    invalidateMetricsCache,
    // Undo helpers
    undo,
    getDeletionHistory,
    clearDeletionHistory,
  };
})(window);
