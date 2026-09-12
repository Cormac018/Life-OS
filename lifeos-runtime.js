/* Versioned workspace lifecycle. Domain models remain independent of the UI. */
(function (global) {
  'use strict';
  let hooks, ready = false, restoring = false, revision = 0, saved = '', pending = null, draining = null, failure = null;
  let legacyArchive = null;
  const copy = value => JSON.parse(JSON.stringify(value));
  function status(kind, message) { if (hooks && hooks.status) hooks.status(kind, message); }
  async function start(callbacks) {
    hooks = callbacks;
    const record = await LifeOSDB.readWorkspace();
    if (record) {
      if (record.format !== 'lifeos-workspace/1' || !Number.isSafeInteger(record.revision) || record.revision < 1) throw new Error('This saved workspace is not supported. Its records have not been replaced.');
      hooks.restore(copy(record.payload));
      revision = record.revision;
      legacyArchive = record.payload.legacyArchive || null;
      saved = JSON.stringify(capture());
    }
    ready = true;
    status('saved', 'Saved on this device');
    if (!record) { queue(); await flush(); }
    return { existing: !!record, revision };
  }
  function capture() {
    const payload = hooks.snapshot();
    if (legacyArchive) payload.legacyArchive = legacyArchive;
    return payload;
  }
  function queue() {
    if (!ready || restoring) return false;
    const payload = capture(), text = JSON.stringify(payload);
    if (text === saved && !draining) { pending = null; return; }
    if (pending && pending.text === text) return;
    pending = { payload, text };
    status(failure ? 'error' : 'saving', failure ? failure.message : 'Saving on this device');
    if (!failure) pump();
  }
  function pump() {
    if (draining) return draining;
    draining = (async () => {
      while (pending) {
        const next = pending; pending = null;
        if (next.text === saved) continue;
        try {
          const record = await LifeOSWrite.workspaceSnapshot(next.payload, revision);
          revision = record.revision; saved = next.text; failure = null;
        } catch (error) {
          failure = error;
          if (!pending) pending = next;
          status('error', error.message || 'Changes could not be saved. Keep this window open and export a backup.');
          break;
        }
      }
      if (!failure) status('saved', 'Saved on this device');
    })().finally(() => { draining = null; if (pending && !failure) pump(); });
    return draining;
  }
  async function flush() {
    queue();
    while (draining) await draining;
    if (failure) throw failure;
  }
  async function retry() { failure = null; queue(); if (pending) pump(); await flush(); status('saved', 'Saved on this device'); }
  function backupPayload() {
    return { format: 'lifeos-backup/2', exportedAt: new Date().toISOString(), workspace: capture(), legacy: legacyArchive || LifeOSDB.exportAll() };
  }
  async function restoreBackup(backup) {
    if (!backup || backup.format !== 'lifeos-backup/2' || !backup.workspace) throw new Error('This file is not a supported Life OS workspace backup.');
    if (!ready) throw new Error('Wait for your saved workspace to open before restoring a backup.');
    if (restoring) throw new Error('A backup restore is already in progress.');
    // Capture current edits before locking. No other queue can begin after this
    // synchronous boundary until validation, the write and any rollback finish.
    queue(); restoring = true;
    let before, oldArchive, candidateText, changed = false, committed = false;
    try {
      await flush();
      before = copy(capture()); oldArchive = legacyArchive;
      changed = true;
      hooks.restore(copy(backup.workspace));
      legacyArchive = backup.legacy || backup.workspace.legacyArchive || null;
      const payload = copy(capture()); candidateText = JSON.stringify(payload);
      const record = await LifeOSWrite.workspaceSnapshot(payload, revision);
      committed = true;
      revision = record.revision; saved = candidateText; pending = null; failure = null;
      hooks.render(); status('saved', 'Backup restored on this device');
    } catch (error) {
      if (changed && !committed) {
        const current = copy(capture()), currentText = JSON.stringify(current);
        if (candidateText !== undefined && currentText !== candidateText) {
          // UI mutations are locked during restore. A separate client may still
          // change a model; retain those changes instead of silently discarding them.
          failure = new Error('The restore could not save. Newer changes are still open and unsaved. Export a backup before reloading. ' + (error.message || ''));
          if (error.code) failure.code = error.code;
          pending = { payload: current, text: currentText };
          status('error', failure.message);
          hooks.render(); throw failure;
        }
        legacyArchive = oldArchive;
        try { hooks.restore(before); }
        catch (rollbackError) {
          failure = new Error('The restore failed and the open workspace could not be recovered. Saved records have not been replaced. Reload to reopen them. ' + (rollbackError.message || ''));
          status('error', failure.message); throw failure;
        }
        hooks.render();
        if (error.code === 'CONFLICT') { failure = error; status('error', error.message); }
      }
      throw error;
    } finally {
      restoring = false;
      // A programmatic edit during a successful restore remains queued after
      // its new revision, never alongside it with an obsolete expected revision.
      if (changed && !failure) queue();
    }
  }
  global.LifeOSRuntime = Object.freeze({ start, queue, flush, retry, backupPayload, restoreBackup, get ready() { return ready; }, get restoring() { return restoring; }, get saving() { return restoring || !!draining || !!pending; }, get error() { return failure; }, get revision() { return revision; } });
})(window);
