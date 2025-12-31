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

    btn.addEventListener("click", () => {
      const payload = global.LifeOSDB.exportAll();
      const stamp = new Date().toISOString().slice(0, 10);
      downloadJSON(`lifeos-export-${stamp}.json`, payload);
    });
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

        global.LifeOSDB.importAll(payload, opts);

        if (status) {
          status.textContent = `Imported successfully (${file.name}).`;
        }
      } catch (err) {
        if (status) {
          status.textContent = `Import failed: ${err.message}`;
        } else {
          alert(`Import failed: ${err.message}`);
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
