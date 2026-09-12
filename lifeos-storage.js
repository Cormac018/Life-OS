/* Durable workspace adapter. Only db.js calls this write contract. */
(function (global) {
  'use strict';
  const DATABASE = 'lifeos-private-workspace';
  const FORMAT = 'lifeos-workspace/1';
  let opening;
  function open() {
    if (!opening) opening = new Promise((resolve, reject) => {
      if (!global.indexedDB) { reject(new Error('This browser does not provide local database storage.')); return; }
      const request = indexedDB.open(DATABASE, 1);
      request.onupgradeneeded = () => request.result.createObjectStore('workspaces', { keyPath: 'id' });
      request.onerror = () => { opening = null; reject(request.error); };
      request.onblocked = () => reject(new Error('Close other Life OS windows, then reopen this app.'));
      request.onsuccess = () => {
        request.result.onversionchange = () => { request.result.close(); opening = null; };
        resolve(request.result);
      };
    });
    return opening;
  }
  async function read() {
    const database = await open();
    return new Promise((resolve, reject) => {
      const tx = database.transaction('workspaces', 'readonly');
      const request = tx.objectStore('workspaces').get('primary');
      let value = null;
      request.onsuccess = () => { value = request.result || null; };
      tx.oncomplete = () => resolve(value);
      tx.onerror = tx.onabort = () => reject(tx.error || new Error('The local database could not be read.'));
    });
  }
  async function upsert(entity) {
    if (!entity || entity.id !== 'primary' || entity.format !== FORMAT || !entity.payload || !Number.isSafeInteger(entity.expectedRevision) || entity.expectedRevision < 0) throw new Error('Invalid workspace write.');
    // Clone before awaiting so a caller cannot change a queued transaction.
    const input = JSON.parse(JSON.stringify(entity));
    const database = await open();
    return new Promise((resolve, reject) => {
      const tx = database.transaction('workspaces', 'readwrite');
      const store = tx.objectStore('workspaces');
      const request = store.get('primary');
      let written, failure;
      request.onsuccess = () => {
        const current = request.result;
        if ((current ? current.revision : 0) !== input.expectedRevision) {
          failure = new Error('Another Life OS window saved changes. Export your unsaved work here, then reload this window before continuing.');
          failure.code = 'CONFLICT'; tx.abort(); return;
        }
        written = { id: 'primary', format: FORMAT, revision: input.expectedRevision + 1, savedAt: new Date().toISOString(), payload: input.payload };
        store.put(written);
      };
      tx.oncomplete = () => resolve(written);
      tx.onerror = tx.onabort = () => reject(failure || tx.error || new Error('The local database could not save this change.'));
    });
  }
  global.LifeOSPersistentDB = Object.freeze({ read, upsert, FORMAT });
})(window);
