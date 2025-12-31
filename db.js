/* =========================
   db.js — Life OS Storage Layer (v1)
   - localStorage-backed collections
   - schemaVersioned export/import
   - designed to migrate to IndexedDB later
   ========================= */

(function (global) {
  const SCHEMA_VERSION = 1;
  const KEY_PREFIX = "lifeos.";

  const COLLECTIONS = [
  "people",
  "goals",
  "metricDefinitions",
  "metricEntries",
  "planItems",

  "mealTemplates",
  "mealPlans",

  "notes",
  "moneyAccounts",
  "moneyTransactions",
  "categories",
  "appMeta",
];

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
    return Array.isArray(arr) ? arr : [];
  }

  function setCollection(collectionName, arr) {
    if (!COLLECTIONS.includes(collectionName)) {
      throw new Error(`Unknown collection: ${collectionName}`);
    }
    if (!Array.isArray(arr)) {
      throw new Error(`setCollection expects an array for ${collectionName}`);
    }
    localStorage.setItem(getKey(collectionName), JSON.stringify(arr));
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
    return next;
  }

  function remove(collectionName, id) {
    const arr = getCollection(collectionName);
    const next = arr.filter((x) => x && x.id !== id);
    setCollection(collectionName, next);
    return next.length !== arr.length;
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
    return true;
  }

  // Initialize meta on load
  initAppMeta();

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
  };
})(window);
