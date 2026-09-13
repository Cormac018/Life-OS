/* Durable workspace adapter. Only db.js calls this write contract. */
(function (global) {
  'use strict';
  const DATABASE = 'lifeos-private-workspace';
  const FORMAT = 'lifeos-workspace/1';
  const CHECKPOINT_LIMIT = 5;
  const RECORD_FIELDS = ['id', 'format', 'revision', 'savedAt', 'payload'];
  let opening;
  function open() {
    if (!opening) opening = new Promise((resolve, reject) => {
      if (!global.indexedDB) { reject(new Error('This browser does not provide local database storage.')); return; }
      const request = indexedDB.open(DATABASE, 2);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains('workspaces')) database.createObjectStore('workspaces', { keyPath: 'id' });
        if (!database.objectStoreNames.contains('recovery')) database.createObjectStore('recovery', { keyPath: 'id' });
      };
      request.onerror = () => { opening = null; reject(request.error); };
      request.onblocked = () => reject(new Error('Close other Life OS windows, then reopen this app.'));
      request.onsuccess = () => {
        request.result.onversionchange = () => { request.result.close(); opening = null; };
        resolve(request.result);
      };
    });
    return opening;
  }
  async function readStore(name, id) {
    const database = await open();
    return new Promise((resolve, reject) => {
      const tx = database.transaction(name, 'readonly');
      const request = tx.objectStore(name).get(id);
      let value = null;
      request.onsuccess = () => { value = request.result || null; };
      tx.oncomplete = () => resolve(value);
      tx.onerror = tx.onabort = () => reject(tx.error || new Error('The local database could not be read.'));
    });
  }
  const read = () => readStore('workspaces', 'primary');
  function rawText(record) {
    // A malformed revision may contain undefined or a non-finite number. Keep
    // those distinct from omitted fields and null when comparing raw records.
    const seen = new Map();
    function visit(value) {
      if (value === null) return ['null'];
      const type = typeof value;
      if (type !== 'object') return [type, type === 'number' && Object.is(value, -0) ? '-0' : String(value)];
      if (seen.has(value)) return ['reference', seen.get(value)];
      const id = seen.size; seen.set(value, id);
      if (Array.isArray(value)) return ['array', id, value.length, Object.keys(value).map(key => [key, visit(value[key])])];
      if (Object.prototype.toString.call(value) !== '[object Object]') throw new Error('This saved record contains a format that this version cannot safely compare. It has not been replaced.');
      return ['object', id, Object.keys(value).map(key => [key, visit(value[key])])];
    }
    return JSON.stringify(visit(record));
  }
  async function tokenFor(record) {
    const bytes = new TextEncoder().encode(rawText(record));
    return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), byte => byte.toString(16).padStart(2, '0')).join('');
  }
  async function inspectRecovery() {
    const record = await read();
    return { present: record !== null, token: await tokenFor(record), record };
  }
  function recoveryMetadata(entry) {
    const record = entry.record;
    return { id: entry.id, kind: entry.kind, preservedAt: entry.preservedAt, savedAt: typeof record?.savedAt === 'string' ? record.savedAt : null, revision: Number.isSafeInteger(record?.revision) ? record.revision : null, format: typeof record?.format === 'string' ? record.format : null };
  }
  async function listRecovery() {
    const database = await open();
    return new Promise((resolve, reject) => {
      const tx = database.transaction('recovery', 'readonly'), entries = [];
      const request = tx.objectStore('recovery').openCursor();
      request.onsuccess = () => { const cursor = request.result; if (cursor) { entries.push(recoveryMetadata(cursor.value)); cursor.continue(); } };
      tx.oncomplete = () => resolve(entries.sort((a, b) => b.preservedAt.localeCompare(a.preservedAt) || b.id.localeCompare(a.id)));
      tx.onerror = tx.onabort = () => reject(tx.error || new Error('Recovery copies could not be read.'));
    });
  }
  function readRecovery(id) {
    if (typeof id !== 'string' || !/^(checkpoint|rescue):[a-z0-9-]{1,80}$/.test(id)) throw new Error('Choose a saved recovery copy.');
    return readStore('recovery', id);
  }
  function conflict() {
    const error = new Error('Another Life OS window saved changes. Export your unsaved work here, then reload this window before continuing.');
    error.code = 'CONFLICT'; return error;
  }
  async function upsert(entity) {
    const recovery = typeof entity?.recoveryToken === 'string';
    if (!entity || entity.id !== 'primary' || entity.format !== FORMAT || !entity.payload || (recovery ? !/^[a-f0-9]{64}$/.test(entity.recoveryToken) : !Number.isSafeInteger(entity.expectedRevision) || entity.expectedRevision < 0 || entity.expectedRevision === Number.MAX_SAFE_INTEGER)) throw new Error('Invalid workspace write.');
    // Clone before awaiting so a caller cannot change a queued transaction.
    const input = JSON.parse(JSON.stringify(entity));
    // Hash outside the transaction, then compare the exact inspected bytes inside
    // it. An intervening save cannot be overwritten, even with a broken revision.
    let expectedRaw;
    if (recovery) {
      const inspected = await read();
      if (await tokenFor(inspected) !== input.recoveryToken) throw conflict();
      expectedRaw = rawText(inspected);
    }
    const database = await open();
    return new Promise((resolve, reject) => {
      const tx = database.transaction(['workspaces', 'recovery'], 'readwrite', { durability: 'strict' });
      const store = tx.objectStore('workspaces');
      const request = store.get('primary');
      let written, failure, rescueId = null;
      request.onsuccess = () => {
        try {
        const current = request.result;
        if (!recovery && current && (current.format !== FORMAT || !Number.isSafeInteger(current.revision) || current.revision < 1 || Object.keys(current).some(key => !RECORD_FIELDS.includes(key)))) {
          failure = new Error('This saved workspace needs recovery before it can be replaced.');
          failure.code = 'NEEDS_RECOVERY'; tx.abort(); return;
        }
        if (recovery ? rawText(current || null) !== expectedRaw : (current ? current.revision : 0) !== input.expectedRevision) {
          failure = conflict(); tx.abort(); return;
        }
        const savedAt = new Date().toISOString();
        const nextRevision = recovery ? (Number.isSafeInteger(current?.revision) && current.revision >= 0 && current.revision < Number.MAX_SAFE_INTEGER ? current.revision + 1 : Date.now()) : input.expectedRevision + 1;
        if (current) {
          const preserve = recovery || input.preservePrevious === true;
          const id = preserve ? 'rescue:' + crypto.randomUUID() : 'checkpoint:' + ((current.revision - 1) % CHECKPOINT_LIMIT);
          tx.objectStore('recovery').put({ id, kind: preserve ? 'rescue' : 'checkpoint', preservedAt: savedAt, record: current });
          if (preserve) rescueId = id;
        }
        written = { id: 'primary', format: FORMAT, revision: nextRevision, savedAt, payload: input.payload };
        store.put(written);
        } catch (error) { failure = error; tx.abort(); }
      };
      tx.oncomplete = () => resolve(rescueId ? { ...written, rescueId } : written);
      tx.onerror = tx.onabort = () => reject(failure || tx.error || new Error('The local database could not save this change.'));
    });
  }
  global.LifeOSPersistentDB = Object.freeze({ read, upsert, inspectRecovery, listRecovery, readRecovery, FORMAT, CHECKPOINT_LIMIT });
})(window);
