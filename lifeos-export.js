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

        global.LifeOSDB.importAll(payload, opts);

        // Let the app re-render based on new data (modules can listen to this)
        document.dispatchEvent(new Event("lifeos:data-imported"));

        if (status) {
          status.textContent = `Imported successfully (${file.name}).`;
        }
        Toast.success("Data imported successfully!");

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
  };
})(window);
