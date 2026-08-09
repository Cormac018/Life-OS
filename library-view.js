/* =========================
   library-view.js: the food library verification screen
   - Renderer only. Every fact on this screen comes from LifeOSFoodLibrary:
     the table is toSheetRows(), the import result and the verify result are
     rendered exactly as those functions return them. No counting rule, no
     comparison and no data lives here.
   - Reachable only by typing #library. No nav link, no title-map entry.
   - Nothing runs on load beyond drawing the table, which is literal data and
     touches no storage. Writing happens only when Import is tapped.
   ========================= */

(function (global) {
  const doc = global.document;

  function library() {
    if (!global.LifeOSFoodLibrary) {
      throw new Error("The library view requires LifeOSFoodLibrary.");
    }
    return global.LifeOSFoodLibrary;
  }

  const COLUMNS = [
    { key: "row", label: "Row" },
    { key: "name", label: "Name" },
    { key: "kcal", label: "kcal" },
    { key: "protein", label: "Protein" },
    { key: "carbs", label: "Carbs" },
    { key: "fat", label: "Fat" },
    { key: "sugar", label: "Sugar" },
    { key: "satFat", label: "Sat fat" },
    { key: "fibre", label: "Fibre" },
    { key: "salt", label: "Salt" },
    { key: "unitName", label: "Unit" },
    { key: "unitGrams", label: "g/unit" },
    { key: "id", label: "id" },
  ];

  const el = {};

  function cacheEls() {
    el.view = doc.getElementById("view-library");
    el.source = doc.getElementById("libSource");
    el.importBtn = doc.getElementById("libImport");
    el.verifyBtn = doc.getElementById("libVerify");
    el.printBtn = doc.getElementById("libPrint");
    el.result = doc.getElementById("libResult");
    el.table = doc.getElementById("libTable");
    el.excluded = doc.getElementById("libExcluded");
  }

  /* -------------------------
     Building blocks
     ------------------------- */

  function block(className, title) {
    const node = doc.createElement("div");
    node.className = className;
    if (title) {
      const heading = doc.createElement("p");
      heading.className = "lib-block-title";
      heading.textContent = title;
      node.appendChild(heading);
    }
    return node;
  }

  function line(text, className) {
    const node = doc.createElement("div");
    if (className) node.className = className;
    node.textContent = text;
    return node;
  }

  function list(items) {
    const ul = doc.createElement("ul");
    items.forEach(function (text) {
      const li = doc.createElement("li");
      li.textContent = text;
      ul.appendChild(li);
    });
    return ul;
  }

  function clearResult() {
    el.result.textContent = "";
    el.result.hidden = true;
  }

  function showResult(node) {
    el.result.textContent = "";
    el.result.hidden = false;
    el.result.appendChild(node);
  }

  /* -------------------------
     The table
     A blank cell means the label did not state the value. A 0 means the label
     stated zero. The two must stay visibly different, which is why absent
     renders as nothing at all rather than as a dash or a zero.
     ------------------------- */

  function renderTable() {
    const rows = library().toSheetRows();

    const table = doc.createElement("table");
    table.className = "lib-table";

    const head = doc.createElement("thead");
    const headRow = doc.createElement("tr");
    COLUMNS.forEach(function (column) {
      const th = doc.createElement("th");
      th.textContent = column.label;
      headRow.appendChild(th);
    });
    head.appendChild(headRow);
    table.appendChild(head);

    const body = doc.createElement("tbody");
    rows.forEach(function (row) {
      const tr = doc.createElement("tr");
      COLUMNS.forEach(function (column) {
        const td = doc.createElement("td");
        const value = row[column.key];
        td.textContent = value === "" ? "" : String(value);
        if (value === "") td.className = "lib-blank";
        if (column.key === "id") td.className = "lib-id";
        tr.appendChild(td);
      });
      body.appendChild(tr);
    });
    table.appendChild(body);

    el.table.textContent = "";
    el.table.appendChild(table);
  }

  function renderProvenance() {
    const source = library().SOURCE;
    el.source.textContent =
      `${source.imported} foods from ${source.file}, sheet ${source.sheet}, ` +
      `rows ${source.firstDataRow} to ${source.lastDataRow}, ` +
      `read on ${source.extractedOn}. ` +
      `A blank cell means the label did not state the value, never zero.`;
  }

  // The omission is on screen rather than only in the file, for the same
  // reason the rig shows unhandled spans: what was left out is part of the
  // result, not a footnote.
  function renderExcluded() {
    const excluded = library().EXCLUDED;
    el.excluded.textContent = "";

    if (!excluded.length) {
      el.excluded.hidden = true;
      return;
    }

    el.excluded.hidden = false;
    const node = block(
      "lib-excluded",
      excluded.length === 1
        ? "One row on the sheet was not imported."
        : `${excluded.length} rows on the sheet were not imported.`
    );
    node.appendChild(
      list(
        excluded.map(function (item) {
          return `Row ${item.sheetRow}, ${item.name} (${item.id}): ${item.reason}`;
        })
      )
    );
    el.excluded.appendChild(node);
  }

  /* -------------------------
     Import
     ------------------------- */

  function runImport() {
    let result;
    try {
      result = library().importFoods();
    } catch (err) {
      showResult(renderFatal("Import could not run.", err.message));
      return;
    }
    showResult(renderImportResult(result));
  }

  function renderImportResult(result) {
    const wrap = doc.createElement("div");

    wrap.appendChild(
      line(
        result.written.length
          ? `Imported ${result.written.length} of ${result.total} foods.`
          : "Nothing imported.",
        "lib-summary"
      )
    );

    // Its own block, never folded into the count above, the M6 rule.
    if (result.failed.length) {
      const failed = block(
        "lib-failed",
        result.failed.length === 1
          ? "One food did not save."
          : `${result.failed.length} foods did not save.`
      );
      failed.appendChild(
        list(
          result.failed.map(function (item) {
            return `${item.id}: ${item.error}`;
          })
        )
      );
      wrap.appendChild(failed);
    } else {
      wrap.appendChild(
        line("Now tap Verify to read the collection back.", "lib-note")
      );
    }

    return wrap;
  }

  /* -------------------------
     Verify
     ------------------------- */

  function runVerify() {
    let result;
    try {
      result = library().verify();
    } catch (err) {
      showResult(renderFatal("Verify could not run.", err.message));
      return;
    }
    showResult(renderVerifyResult(result));
  }

  function renderVerifyResult(result) {
    const wrap = doc.createElement("div");

    wrap.appendChild(
      line(
        result.ok
          ? `All ${result.total} foods in storage match the file.`
          : `${result.matched} of ${result.total} foods match the file.`,
        result.ok ? "lib-summary lib-pass" : "lib-summary lib-fail"
      )
    );

    if (result.missing.length) {
      const missing = block(
        "lib-failed",
        result.missing.length === 1
          ? "One food is not in storage."
          : `${result.missing.length} foods are not in storage.`
      );
      missing.appendChild(list(result.missing));
      wrap.appendChild(missing);
    }

    if (result.mismatched.length) {
      const bad = block(
        "lib-failed",
        result.mismatched.length === 1
          ? "One field does not match."
          : `${result.mismatched.length} fields do not match.`
      );
      bad.appendChild(
        list(
          result.mismatched.map(function (item) {
            return `${item.id}, ${item.field}: file says ${item.expected}, storage has ${item.actual}`;
          })
        )
      );
      wrap.appendChild(bad);
    }

    // Not a failure. A food added in the app is the user's, not a bad import.
    if (result.unexpected.length) {
      const extra = block(
        "lib-note-block",
        result.unexpected.length === 1
          ? "One food in storage is not from the sheet. That is not an error."
          : `${result.unexpected.length} foods in storage are not from the sheet. That is not an error.`
      );
      extra.appendChild(list(result.unexpected));
      wrap.appendChild(extra);
    }

    if (!result.ok) {
      wrap.appendChild(
        line(
          "Import is authoritative, so tapping Import again restores the file's values.",
          "lib-note"
        )
      );
    }

    return wrap;
  }

  function renderFatal(title, message) {
    const node = block("lib-failed", title);
    node.appendChild(line(message));
    return node;
  }

  /* -------------------------
     Console print
     The one check that can catch a bad transcription, because it is the only
     one a human can hold against the workbook.
     ------------------------- */

  function runPrint() {
    let rows;
    try {
      rows = library().printSheetOrder();
    } catch (err) {
      showResult(renderFatal("Print could not run.", err.message));
      return;
    }

    const wrap = doc.createElement("div");
    wrap.appendChild(
      line(`${rows.length} rows printed to the console.`, "lib-summary")
    );
    wrap.appendChild(
      line(
        "Open DevTools, Console, and check them against the workbook row by row.",
        "lib-note"
      )
    );
    showResult(wrap);
  }

  /* -------------------------
     Wiring
     ------------------------- */

  function init() {
    cacheEls();
    if (!el.view || !el.table || !el.result) return;

    clearResult();
    renderProvenance();
    renderTable();
    renderExcluded();

    if (el.importBtn) el.importBtn.addEventListener("click", runImport);
    if (el.verifyBtn) el.verifyBtn.addEventListener("click", runVerify);
    if (el.printBtn) el.printBtn.addEventListener("click", runPrint);
  }

  doc.addEventListener("DOMContentLoaded", init);

  global.LifeOSLibraryView = {
    runImport: runImport,
    runVerify: runVerify,
    runPrint: runPrint,
  };
})(window);
