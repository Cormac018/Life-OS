/* =========================
   lifeos.js — Life OS bootstrapping (debug-friendly)
   ========================= */

(function () {
  function logStatus() {
    console.log("[LifeOS] boot");
    console.log("[LifeOS] LifeOSDB:", !!window.LifeOSDB, window.LifeOSDB);
    console.log("[LifeOS] LifeOSExport:", !!window.LifeOSExport, window.LifeOSExport);

    const btn = document.getElementById("lifeosExportBtn");
    const input = document.getElementById("lifeosImportInput");
    console.log("[LifeOS] lifeosExportBtn exists:", !!btn);
    console.log("[LifeOS] lifeosImportInput exists:", !!input);
  }

  document.addEventListener("DOMContentLoaded", () => {
    logStatus();

    if (!window.LifeOSDB) {
      alert("LifeOSDB missing. Check that db.js is included before lifeos.js.");
      return;
    }
    if (!window.LifeOSExport) {
      alert("LifeOSExport missing. Check that lifeos-export.js is included before lifeos.js.");
      return;
    }

    // Wire export
    const btn = document.getElementById("lifeosExportBtn");
    if (!btn) {
      alert("Export button not found. Check id='lifeosExportBtn' in Today view.");
      return;
    }

    // Wire import
    const input = document.getElementById("lifeosImportInput");
    if (!input) {
      alert("Import input not found. Check id='lifeosImportInput' in Today view.");
      return;
    }

    window.LifeOSExport.wireExportButton("lifeosExportBtn");
    window.LifeOSExport.wireImportInput("lifeosImportInput", "lifeosImportStatus", {
      overwrite: false,
    });

    console.log("[LifeOS] wiring complete");
  });
})();
