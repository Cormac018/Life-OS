/* =========================
   lifeos-export.js — Export/Import UI helpers
   - Uses LifeOSDB
   - Keeps things explicit and user-controlled
   ========================= */

(function (global) {
  function downloadJSON(filename, obj) {
    const json = JSON.stringify(obj, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  }

  async function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Failed to read file."));
      reader.onload = () => resolve(String(reader.result || ""));
      reader.readAsText(file);
    });
  }

  function wireExportButton(btnId) {
    const btn = document.getElementById(btnId);
    if (!btn) return;

    btn.addEventListener("click", async () => {
      await global.UIHelpers.withButtonLoading(btn, async () => {
        // Small delay to show loading state
        await new Promise(resolve => setTimeout(resolve, 300));

        const payload = global.LifeOSDB.exportAll();
        const d = new Date();
        const stamp = d.toISOString().slice(0, 10);
        const time = d.toISOString().slice(11, 16).replace(":", ""); // HHMM
        downloadJSON(`lifeos-export-${stamp}-${time}.json`, payload);

        // Record backup date in appMeta
        const meta = global.LifeOSDB.getCollection("appMeta");
        const currentMeta = meta[0] || { id: "meta" };
        const updatedMeta = { ...currentMeta, lastBackupDate: stamp };
        global.LifeOSDB.setCollection("appMeta", [updatedMeta]);
        global.LifeOSDB.touchMeta();

        // Hide backup reminder if visible
        const banner = document.getElementById("backupReminderBanner");
        if (banner) banner.style.display = "none";

        // Show success toast
        Toast.success("Data exported successfully! File downloaded.");
      });
    });
  }

  function validateImportPayload(payload) {
    const errors = [];

    // Basic structure checks
    if (!payload || typeof payload !== "object") {
      errors.push("Invalid file: Not a JSON object");
      return errors;
    }

    if (payload.app !== "LifeOS") {
      errors.push("Invalid file: Not a LifeOS export (expected app: 'LifeOS')");
    }

    if (!payload.schemaVersion || typeof payload.schemaVersion !== "number") {
      errors.push("Invalid file: Missing or invalid schemaVersion");
    }

    if (!payload.collections || typeof payload.collections !== "object") {
      errors.push("Invalid file: Missing collections object");
      return errors;
    }

    // Validate critical collections exist and are arrays
    const criticalCollections = ["appMeta", "metricDefinitions", "metricEntries"];
    criticalCollections.forEach(colName => {
      if (payload.collections[colName] && !Array.isArray(payload.collections[colName])) {
        errors.push(`Invalid collection: ${colName} must be an array`);
      }
    });

    // Validate sample entries have required fields
    if (Array.isArray(payload.collections.metricEntries)) {
      const sampleEntries = payload.collections.metricEntries.slice(0, 5);
      sampleEntries.forEach((entry, i) => {
        if (!entry.metricId || !entry.date || entry.value === undefined) {
          errors.push(`Invalid metricEntry at index ${i}: missing required fields (metricId, date, value)`);
        }
      });
    }

    if (Array.isArray(payload.collections.dietLogs)) {
      const sampleLogs = payload.collections.dietLogs.slice(0, 5);
      sampleLogs.forEach((log, i) => {
        if (!log.date || !Array.isArray(log.items)) {
          errors.push(`Invalid dietLog at index ${i}: missing date or items array`);
        }
      });
    }

    return errors;
  }

  /* -------------------------
     Import result reporting
     describeImportResult is a thin render over the object importAll returns.
     It reads nothing else, so that object stays the single source of truth
     for what happened and any other client could render it differently.
     ------------------------- */

  const WORKOUT_LABELS = {
    logs: "training history",
    restLogs: "rest days",
    sessionState: "session position",
    workoutInstanceId: "workout counter",
    expandedExerciseIds: "expanded exercises",
    theme: "theme",
  };

  function labelFor(key) {
    return WORKOUT_LABELS[key] || key;
  }

  function labelList(keys) {
    return keys.map(labelFor).join(", ");
  }

  function describeImportResult(result, fileName) {
    // Older builds returned a bare true. Anything that is not the summary
    // object is treated as a plain success with nothing to report, rather
    // than as a failure.
    const workout = result && typeof result === "object" ? result.workout : null;
    const restored = workout && Array.isArray(workout.restored) ? workout.restored : [];
    const skipped = workout && Array.isArray(workout.skipped) ? workout.skipped : [];
    const failed = workout && Array.isArray(workout.failed) ? workout.failed : [];

    // Loudest case first. A restore that half succeeded must never be able to
    // read as a clean one, which is the false confidence this whole fix exists
    // to remove.
    if (failed.length > 0) {
      const names = labelList(failed);
      return {
        severity: "error",
        message: `Restore incomplete. These did not come back: ${names}. Everything else was imported. Reload and check before you rely on this backup.`,
        statusText: `RESTORE INCOMPLETE (${fileName}). Did not come back: ${names}. Everything else was imported.`,
        promptReload: false,
      };
    }

    if (restored.length > 0) {
      const names = labelList(restored);
      return {
        severity: "success",
        message: `Data imported, workout data restored: ${names}.`,
        statusText: `Imported successfully (${fileName}). Workout data restored: ${names}.`,
        promptReload: true,
      };
    }

    // Nothing came back and nothing was lost. Either the file predates workout
    // backup, or this device already had its workout data. Neither is a
    // problem, so neither gets a warning.
    if (skipped.length > 0) {
      return {
        severity: "success",
        message: "Data imported successfully!",
        statusText: `Imported successfully (${fileName}). Workout data already on this device, left untouched.`,
        promptReload: false,
      };
    }

    return {
      severity: "success",
      message: "Data imported successfully!",
      statusText: `Imported successfully (${fileName}).`,
      promptReload: false,
    };
  }

  function wireImportInput(inputId, statusId, opts = {}) {
    const input = document.getElementById(inputId);
    const status = document.getElementById(statusId);
    if (!input) return;

    input.addEventListener("change", async () => {
      const file = input.files && input.files[0];
      if (!file) return;

      try {
        const text = await readFileAsText(file);
        const payload = JSON.parse(text);

        // Comprehensive validation
        const validationErrors = validateImportPayload(payload);
        if (validationErrors.length > 0) {
          Toast.error(`Import validation failed: ${validationErrors[0]}`);
          if (status) {
            status.textContent = `Validation failed: ${validationErrors[0]}`;
          }
          return;
        }

        if (opts && opts.overwrite === true) {
          const ok = confirm("This will OVERWRITE your current LifeOS data on this device. Continue?");
          if (!ok) {
            if (status) status.textContent = "Import cancelled.";
            return;
          }
        }

        const result = global.LifeOSDB.importAll(payload, opts);

        // Let the app re-render based on new data (modules can listen to this)
        document.dispatchEvent(new Event("lifeos:data-imported"));

        const report = describeImportResult(result, file.name);

        if (status) {
          status.textContent = report.statusText;
          // Set inline so a failed restore is visually distinct from a clean
          // one without needing a stylesheet change.
          const failedLook = report.severity === "error";
          status.style.color = failedLook ? "#dc2626" : "var(--muted)";
          status.style.fontWeight = failedLook ? "700" : "normal";
        }

        if (report.severity === "error") {
          Toast.error(report.message, 12000);
        } else {
          Toast.success(report.message);
        }

        // app.js owns the workout keys and does not listen for
        // lifeos:data-imported, so the Health view keeps showing stale data
        // until the page reloads. Ask, never force.
        if (report.promptReload) {
          const reload = confirm(
            `${report.message}\n\nReload now so the Health view shows it?`
          );
          if (reload) location.reload();
        }

      } catch (err) {
        Toast.error(`Import failed: ${err.message}`);
        if (status) {
          status.textContent = `Import failed: ${err.message}`;
        }
      } finally {
        // Allow re-importing same file
        input.value = "";
      }
    });
  }

  global.LifeOSExport = {
    wireExportButton,
    wireImportInput,
    // Pure, no DOM. Exposed so the same outcome can be rendered elsewhere
    // without duplicating the rules for what counts as an incomplete restore.
    describeImportResult,
  };
})(window);
