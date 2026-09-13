/* Versioned workspace lifecycle. Domain models remain independent of the UI. */
(function (global) {
  'use strict';
  let hooks, ready = false, restoring = false, revision = 0, saved = '', pending = null, draining = null, failure = null;
  let legacyArchive = null;
  let recoveryDraft = false;
  const copy = value => JSON.parse(JSON.stringify(value));
  function status(kind, message) { if (hooks && hooks.status) hooks.status(kind, message); }
  function configureRecovery(callbacks) {
    if (restoring) throw new Error('Wait for the current restore to finish.');
    if (!callbacks || typeof callbacks.snapshot !== 'function' || typeof callbacks.restore !== 'function') throw new Error('Workspace recovery needs snapshot and restore callbacks.');
    hooks = callbacks;
  }
  async function start(callbacks) {
    configureRecovery(callbacks);
    const record = await LifeOSDB.readWorkspace();
    if (record) {
      if (record.format !== 'lifeos-workspace/1' || !Number.isSafeInteger(record.revision) || record.revision < 1 || Object.keys(record).some(key => !['id', 'format', 'revision', 'savedAt', 'payload'].includes(key))) throw new Error('This saved workspace is not supported. Its records have not been replaced.');
      hooks.restore(copy(record.payload));
      revision = record.revision;
      legacyArchive = record.payload.legacyArchive || null;
      saved = JSON.stringify(capture());
    } else {
      // Keep recovery available if the very first save fails. The UI must not
      // become ready before there is a durable workspace to reopen.
      const payload = copy(capture()), text = JSON.stringify(payload);
      try {
        const created = await LifeOSWrite.workspaceSnapshot(payload, 0);
        revision = created.revision; saved = text; failure = null;
      } catch (error) {
        failure = error; recoveryDraft = true;
        status('error', error.message || 'The first workspace could not be saved.'); throw error;
      }
    }
    ready = true; recoveryDraft = false;
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
  async function retry() { if (!ready) throw new Error('Use workspace recovery before retrying normal saves.'); failure = null; queue(); if (pending) pump(); await flush(); status('saved', 'Saved on this device'); }
  function backupPayload() {
    if (!ready && !recoveryDraft) throw new Error('Use an encrypted rescue copy while the workspace cannot open.');
    return { format: 'lifeos-backup/2', exportedAt: new Date().toISOString(), workspace: capture(), legacy: legacyArchive || LifeOSDB.exportLegacyArchive() };
  }
  function checkBackup(backup) {
    if (!backup || backup.format !== 'lifeos-backup/2' || !backup.workspace) throw new Error('This file is not a supported Life OS workspace backup.');
    if (Object.keys(backup).some(key => !['format', 'exportedAt', 'workspace', 'legacy'].includes(key))) throw new Error('This backup includes fields this app version does not understand. It has not been changed.');
  }
  function backupFromRecord(record, exportedAt) {
    if (!record || typeof record !== 'object' || Array.isArray(record) || record.id !== 'primary' || record.format !== 'lifeos-workspace/1' || Object.keys(record).some(key => !['id', 'format', 'revision', 'savedAt', 'payload'].includes(key))) throw new Error('This recovery copy has a record format this app cannot safely restore. Keep the encrypted copy for a compatible reader.');
    if (!record.payload) throw new Error('This recovery copy has no readable workspace. Keep the encrypted copy for repair.');
    return { format: 'lifeos-backup/2', exportedAt: typeof exportedAt === 'string' ? exportedAt : record.savedAt, workspace: copy(record.payload) };
  }
  function backupFromRescue(rescue) {
    if (!rescue || rescue.format !== 'lifeos-rescue/1' || Object.keys(rescue).some(key => !['format', 'exportedAt', 'record'].includes(key))) throw new Error('This rescue file needs a compatible app version. No fields have been discarded.');
    return backupFromRecord(rescue.record, rescue.exportedAt);
  }
  async function verifyBackup(backup) {
    checkBackup(backup);
    backup = copy(backup);
    if (!hooks || typeof hooks.validate !== 'function') throw new Error('The workspace validator is unavailable. Records have not been changed.');
    const validation = await hooks.validate(copy(backup.workspace));
    if (validation === false || validation?.ok === false) throw new Error(validation?.error || 'The backup workspace did not pass validation.');
    const domainCount = Object.keys(backup.workspace.domains || {}).length;
    return { ok: true, exportedAt: typeof backup.exportedAt === 'string' ? backup.exportedAt : null, domainCount, summary: 'Backup checked: ' + domainCount + ' workspace sections. No records have been replaced.' };
  }
  const inspectRecovery = () => LifeOSDB.inspectRecovery();
  const listRecovery = () => LifeOSDB.listRecovery();
  const readRecovery = id => LifeOSDB.readRecovery(id);
  async function rescuePayload(id) {
    const source = id ? await readRecovery(id) : await inspectRecovery();
    if (!source || !source.record) throw new Error('There is no saved workspace to rescue.');
    return { format: 'lifeos-rescue/1', exportedAt: new Date().toISOString(), record: source.record };
  }
  async function recoverBackup(backup, token) {
    if (ready) throw new Error('Use the normal backup restore while your workspace is open.');
    if (restoring) throw new Error('A backup restore is already in progress.');
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) throw new Error('Inspect the saved workspace before replacing it.');
    checkBackup(backup); backup = copy(backup);
    restoring = true;
    let before, oldArchive = legacyArchive, candidateText, changed = false, committed = false;
    try {
      await verifyBackup(backup);
      try { before = copy(capture()); } catch (_) { /* A rejected workspace may not support normal rendering. */ }
      changed = true;
      hooks.restore(copy(backup.workspace));
      legacyArchive = backup.legacy || backup.workspace.legacyArchive || null;
      const payload = copy(capture()), text = JSON.stringify(payload); candidateText = text;
      const record = await LifeOSWrite.workspaceRecovery(payload, token);
      committed = true;
      revision = record.revision; saved = text; pending = null; failure = null; ready = true; recoveryDraft = false;
      if (hooks.render) hooks.render();
      status('saved', 'Workspace recovered. The previous saved records were preserved.');
      return { revision, rescueId: record.rescueId || null };
    } catch (error) {
      if (!committed) {
        if (candidateText !== undefined) {
          let currentText;
          try { currentText = JSON.stringify(capture()); } catch (_) { /* Retain the disk recovery source when models cannot serialize. */ }
          if (currentText !== undefined && currentText !== candidateText) {
            recoveryDraft = true;
            failure = new Error('Recovery could not save. Newer changes are still open and unsaved. Export the unsaved changes before trying again. ' + (error.message || ''));
            if (error.code) failure.code = error.code;
            status('error', failure.message); throw failure;
          }
        }
        legacyArchive = oldArchive;
        if (changed && before !== undefined) {
          try { hooks.restore(before); } catch (_) { /* The original disk record remains the recovery source. */ }
        }
        failure = error; status('error', error.message || 'Recovery could not finish. The saved records have not been replaced.');
      }
      throw error;
    } finally {
      restoring = false;
      if (committed && !failure) queue();
    }
  }
  async function restoreBackup(backup) {
    checkBackup(backup);
    backup = copy(backup);
    if (!ready) throw new Error('Wait for your saved workspace to open before restoring a backup.');
    if (restoring) throw new Error('A backup restore is already in progress.');
    // Capture current edits before locking. No other queue can begin after this
    // synchronous boundary until validation, the write and any rollback finish.
    queue(); restoring = true;
    let before, oldArchive, candidateText, changed = false, committed = false;
    try {
      await flush();
      if (hooks.validate) await verifyBackup(backup);
      before = copy(capture()); oldArchive = legacyArchive;
      changed = true;
      hooks.restore(copy(backup.workspace));
      legacyArchive = backup.legacy || backup.workspace.legacyArchive || null;
      const payload = copy(capture()); candidateText = JSON.stringify(payload);
      const record = await LifeOSWrite.workspaceSnapshot(payload, revision, { preservePrevious: true });
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
  global.LifeOSRuntime = Object.freeze({ start, configureRecovery, queue, flush, retry, backupPayload, backupFromRecord, backupFromRescue, restoreBackup, verifyBackup, inspectRecovery, listRecovery, readRecovery, rescuePayload, recoverBackup, get ready() { return ready; }, get restoring() { return restoring; }, get saving() { return restoring || !!draining || !!pending; }, get hasRecoveryDraft() { return recoveryDraft; }, get error() { return failure; }, get revision() { return revision; } });
})(window);
