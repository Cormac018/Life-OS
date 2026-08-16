/* =========================
   library-view.js: the food and meal library verification screen
   - Renderer only. Every fact on this screen comes from LifeOSFoodLibrary:
     the tables are toSheetRows(), toMealSheetRows() and toMealTotalsRows(),
     and the import and verify results are rendered exactly as those functions
     return them. No counting rule, no comparison and no data lives here.
   - Foods come first on the page because they must be imported first: a meal
     derives its nutrition from the library, so importMeals refuses while any
     food it names is missing, and this screen shows that refusal plainly
     rather than as a failure.
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

  // One row per component, which is how the Meals sheet reads.
  const MEAL_COLUMNS = [
    { key: "row", label: "Row" },
    { key: "mealId", label: "Meal" },
    { key: "mealName", label: "Name" },
    { key: "foodId", label: "foodId" },
    { key: "gramsPerServing", label: "g/serving" },
  ];

  // The workbook's own per-serving summary, never the app's numbers. What the
  // app derived is checked against these by verifyMeals.
  const MEAL_TOTAL_COLUMNS = [
    { key: "mealId", label: "Meal" },
    { key: "name", label: "Name" },
    { key: "components", label: "Items" },
    { key: "kcal", label: "kcal" },
    { key: "protein", label: "Protein" },
    { key: "carbs", label: "Carbs" },
    { key: "fat", label: "Fat" },
    { key: "sugar", label: "Sugar" },
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

    el.mealSource = doc.getElementById("libMealSource");
    el.mealImportBtn = doc.getElementById("libMealImport");
    el.mealVerifyBtn = doc.getElementById("libMealVerify");
    el.mealPrintBtn = doc.getElementById("libMealPrint");
    el.mealResult = doc.getElementById("libMealResult");
    el.mealTable = doc.getElementById("libMealTable");
    el.mealTotals = doc.getElementById("libMealTotals");
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

  // target defaults to the foods result panel, so the food call sites read
  // exactly as they did before the meals half existed.
  function clearResult(target) {
    const node = target || el.result;
    node.textContent = "";
    node.hidden = true;
  }

  function showResult(child, target) {
    const node = target || el.result;
    node.textContent = "";
    node.hidden = false;
    node.appendChild(child);
  }

  /* -------------------------
     The table
     A blank cell means the label did not state the value. A 0 means the label
     stated zero. The two must stay visibly different, which is why absent
     renders as nothing at all rather than as a dash or a zero.
     ------------------------- */

  function renderTableInto(container, columns, rows) {
    const table = doc.createElement("table");
    table.className = "lib-table";

    const head = doc.createElement("thead");
    const headRow = doc.createElement("tr");
    columns.forEach(function (column) {
      const th = doc.createElement("th");
      th.textContent = column.label;
      headRow.appendChild(th);
    });
    head.appendChild(headRow);
    table.appendChild(head);

    const body = doc.createElement("tbody");
    rows.forEach(function (row) {
      const tr = doc.createElement("tr");
      columns.forEach(function (column) {
        const td = doc.createElement("td");
        const value = row[column.key];
        td.textContent = value === "" ? "" : String(value);
        if (value === "") td.className = "lib-blank";
        if (column.key === "id" || column.key === "foodId") {
          td.className = "lib-id";
        }
        tr.appendChild(td);
      });
      body.appendChild(tr);
    });
    table.appendChild(body);

    container.textContent = "";
    container.appendChild(table);
  }

  function renderTable() {
    renderTableInto(el.table, COLUMNS, library().toSheetRows());
  }

  function renderMealTables() {
    if (el.mealTotals) {
      renderTableInto(
        el.mealTotals,
        MEAL_TOTAL_COLUMNS,
        library().toMealTotalsRows()
      );
    }
    if (el.mealTable) {
      renderTableInto(el.mealTable, MEAL_COLUMNS, library().toMealSheetRows());
    }
  }

  function renderProvenance() {
    const source = library().SOURCE;
    el.source.textContent =
      `${source.imported} foods from ${source.file}, sheet ${source.sheet}, ` +
      `rows ${source.firstDataRow} to ${source.lastDataRow}, ` +
      `read on ${source.extractedOn}. ` +
      `A blank cell means the label did not state the value, never zero.`;
  }

  function renderMealProvenance() {
    if (!el.mealSource) return;

    const source = library().MEALS_SOURCE;
    el.mealSource.textContent =
      `${source.imported} meals, ${source.componentRows} component rows, from ` +
      `${source.file}, sheet ${source.sheet}, rows ${source.firstDataRow} to ` +
      `${source.lastDataRow}, read on ${source.extractedOn}. ` +
      `Grams are per single serving. Nutrition is not stored here: each meal ` +
      `derives it from the food library, so import the foods first.`;
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

  /* -------------------------
     Meals: import and verify
     ------------------------- */

  function runMealImport() {
    let result;
    try {
      result = library().importMeals();
    } catch (err) {
      showResult(
        renderFatal("Meal import could not run.", err.message),
        el.mealResult
      );
      return;
    }
    showResult(renderMealImportResult(result), el.mealResult);
  }

  function renderMealImportResult(result) {
    const wrap = doc.createElement("div");

    // Not a failure and not a partial success. The import declined to run,
    // and the fix is one tap away on the same screen, so it says that instead
    // of listing seven identical errors.
    if (result.missingFoods && result.missingFoods.length) {
      const blocked = block("lib-note-block", "No meals imported yet.");
      blocked.appendChild(line(result.reason));
      blocked.appendChild(
        line("Tap Import foods above, then Import meals again.", "lib-note")
      );
      blocked.appendChild(list(result.missingFoods));
      wrap.appendChild(blocked);
      return wrap;
    }

    wrap.appendChild(
      line(
        result.written.length
          ? `Imported ${result.written.length} of ${result.total} meals.`
          : "Nothing imported.",
        "lib-summary"
      )
    );

    // Its own block, never folded into the count above, the M6 rule.
    if (result.failed.length) {
      const failed = block(
        "lib-failed",
        result.failed.length === 1
          ? "One meal did not save."
          : `${result.failed.length} meals did not save.`
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
        line(
          "Now tap Verify meals to read them back and check them against the workbook.",
          "lib-note"
        )
      );
    }

    return wrap;
  }

  function runMealVerify() {
    let result;
    try {
      result = library().verifyMeals();
    } catch (err) {
      showResult(
        renderFatal("Meal verify could not run.", err.message),
        el.mealResult
      );
      return;
    }
    showResult(renderMealVerifyResult(result), el.mealResult);
  }

  function renderMealVerifyResult(result) {
    const wrap = doc.createElement("div");

    wrap.appendChild(
      line(
        result.ok
          ? `All ${result.total} meals match the file and the workbook.`
          : `${result.matched} of ${result.total} meals match.`,
        result.ok ? "lib-summary lib-pass" : "lib-summary lib-fail"
      )
    );

    if (result.missing.length) {
      const missing = block(
        "lib-failed",
        result.missing.length === 1
          ? "One meal is not in storage."
          : `${result.missing.length} meals are not in storage.`
      );
      missing.appendChild(list(result.missing));
      wrap.appendChild(missing);
    }

    if (result.mismatched.length) {
      const bad = block(
        "lib-failed",
        result.mismatched.length === 1
          ? "One field does not match the file."
          : `${result.mismatched.length} fields do not match the file.`
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

    // The stronger check of the two. The workbook computed these itself, so a
    // disagreement means the app's derivation or the transcription is wrong,
    // not merely that storage drifted from this file.
    if (result.driftedFromSheet.length) {
      const drift = block(
        "lib-failed",
        result.driftedFromSheet.length === 1
          ? "One figure disagrees with the workbook."
          : `${result.driftedFromSheet.length} figures disagree with the workbook.`
      );
      drift.appendChild(
        list(
          result.driftedFromSheet.map(function (item) {
            return `${item.id}, ${item.field}: workbook says ${item.sheet}, app derived ${item.app} (out by ${item.diff})`;
          })
        )
      );
      wrap.appendChild(drift);
    }

    // Not a failure. A meal built in the app is the user's own.
    if (result.unexpected.length) {
      const extra = block(
        "lib-note-block",
        result.unexpected.length === 1
          ? "One meal in storage is not from the sheet. That is not an error."
          : `${result.unexpected.length} meals in storage are not from the sheet. That is not an error.`
      );
      extra.appendChild(list(result.unexpected));
      wrap.appendChild(extra);
    }

    if (!result.ok) {
      wrap.appendChild(
        line(
          "Import is authoritative, so tapping Import meals again restores the file's components.",
          "lib-note"
        )
      );
    }

    return wrap;
  }

  function runMealPrint() {
    let rows;
    try {
      rows = library().printMealSheetOrder();
    } catch (err) {
      showResult(
        renderFatal("Print could not run.", err.message),
        el.mealResult
      );
      return;
    }

    const wrap = doc.createElement("div");
    wrap.appendChild(
      line(
        `${rows.length} component rows printed to the console, with the ` +
          `workbook's per-serving totals below them.`,
        "lib-summary"
      )
    );
    wrap.appendChild(
      line(
        "Open DevTools, Console, and check them against the Meals sheet row by row.",
        "lib-note"
      )
    );
    showResult(wrap, el.mealResult);
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

    if (el.mealResult) clearResult(el.mealResult);
    renderMealProvenance();
    renderMealTables();

    if (el.mealImportBtn) {
      el.mealImportBtn.addEventListener("click", runMealImport);
    }
    if (el.mealVerifyBtn) {
      el.mealVerifyBtn.addEventListener("click", runMealVerify);
    }
    if (el.mealPrintBtn) {
      el.mealPrintBtn.addEventListener("click", runMealPrint);
    }
  }

  doc.addEventListener("DOMContentLoaded", init);

  global.LifeOSLibraryView = {
    runImport: runImport,
    runVerify: runVerify,
    runPrint: runPrint,
    runMealImport: runMealImport,
    runMealVerify: runMealVerify,
    runMealPrint: runMealPrint,
  };
})(window);
