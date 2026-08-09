/* =========================
   food-library.js: the food library data and its import
   - No DOM, no network, nothing on load. Data in, data out, on request only.
   - The literal below is the transcription of the Foods sheet. It is the
     shipped copy of that data; verify() proves storage matches this file, and
     printSheetOrder() exists because only an eyeball pass against the
     workbook can prove this file matches the spreadsheet.
   - Every write goes through LifeOSWrite.food, which enforces the food_<slug>
     naming contract and refuses a food missing its per-100 g nutrition.
   - Import is idempotent: the ids are stable, so a second run upserts the
     same 26 records in place. It is also authoritative, so re-importing
     overwrites any in-app edit to these foods. The sheet is the source.
   ========================= */

(function (global) {
  const SOURCE = Object.freeze({
    file: "UPDATED_FOOD_LIBRARY_TEMPLATE.xlsx",
    sheet: "Foods",
    headerRow: 8,
    firstDataRow: 9,
    lastDataRow: 35,
    rowsOnSheet: 27,
    imported: 26,
    extractedOn: "2026-08-09",
  });

  /* -------------------------
     The library

     Order is sheet order, and sheetRow is the workbook row each entry came
     from, so a printed row can be checked against the file line by line.
     sheetRow is stripped before the writer sees it and never reaches storage.

     Values are the sheet's numbers, with one normalisation: thirteen cells
     store as IEEE artefacts (carbs 9.8000000000000007) and are rounded to
     three decimals, which recovers the intended value exactly and alters no
     data.

     An absent satFat, fibre or salt means the label did not state it. Blank
     is unknown, never zero, so those keys are omitted rather than set to 0.
     Five foods have no fibre for that reason.

     food_beans_kidney_red is here despite carrying the sheet's CHECK flag:
     105 kcal against 89 derived is 15.2 percent out, which is the legitimate
     fibre-heavy case the sheet describes, at 7.8 g fibre.

     food_flour_plain (row 14) was held out of the first pass while its carbs
     read 7.01 g against 340 kcal, which the sheet's own check flagged. The
     bag reads 70.1 g, the sheet now agrees, the derived kcal is 333.7 against
     a label of 340, 1.85 percent out, and the check cell reads ok, so the row
     is imported.
     ------------------------- */

  const FOODS = Object.freeze([
    { sheetRow: 9, id: "food_rice_white_uncooked", name: "Rice, white, uncooked", kcal: 154, protein: 3.6, carbs: 32.6, fat: 0.9, sugar: 0.1, satFat: 0.1, fibre: 0.6, salt: 0.01, unitName: "portion", unitGrams: 100 },
    { sheetRow: 10, id: "food_veg_mixed_frozen", name: "Mixed vegetables, frozen", kcal: 64, protein: 2.7, carbs: 9.8, fat: 0.7, sugar: 4.7, satFat: 0.2, fibre: 3.7, salt: 0.05, unitName: "packet", unitGrams: 136 },
    { sheetRow: 11, id: "food_chicken_breast_uncooked", name: "Chicken breasts, uncooked", kcal: 137, protein: 30.6, carbs: 0.5, fat: 1.6, sugar: 0.5, satFat: 0.5, fibre: 0.5, salt: 0.14, unitName: "breast", unitGrams: 250 },
    { sheetRow: 12, id: "food_passata_italian_uncooked", name: "Italian passata, sauce", kcal: 31, protein: 1.5, carbs: 4.2, fat: 0.8, sugar: 3.7, satFat: 0.4, fibre: 0.5, salt: 0.03, unitName: "portion", unitGrams: 100 },
    { sheetRow: 13, id: "food_fruit_mixed_dried", name: "Mixed fruit, dried", kcal: 313, protein: 2.6, carbs: 73.3, fat: 0.6, sugar: 59, satFat: 0.1, fibre: 2.1, salt: 0.13, unitName: "portion", unitGrams: 30 },
    { sheetRow: 14, id: "food_flour_plain", name: "Plain Flour", kcal: 340, protein: 10.4, carbs: 70.1, fat: 1.3, sugar: 1.4, satFat: 0.2, fibre: 3.2, salt: 0, unitName: "portion", unitGrams: 100 },
    { sheetRow: 15, id: "food_pasta_fusilli_uncooked", name: "Fusilli pasta, uncooked", kcal: 158, protein: 5.8, carbs: 31.5, fat: 0.4, sugar: 0.7, satFat: 0.1, fibre: 2.2, salt: 0.02, unitName: "portion", unitGrams: 100 },
    { sheetRow: 16, id: "food_nuts_mixed", name: "Mixed nuts", kcal: 696, protein: 14.3, carbs: 3.1, fat: 68.2, sugar: 2.4, satFat: 17.4, fibre: 6.3, salt: 0.1, unitName: "portion", unitGrams: 25 },
    { sheetRow: 17, id: "food_seeds_mixed", name: "Mixed seeds", kcal: 614, protein: 26.7, carbs: 2.3, fat: 53, sugar: 2.2, satFat: 7.5, fibre: 10.3, salt: 0.12, unitName: "portion", unitGrams: 10 },
    { sheetRow: 18, id: "food_beans_kidney_red", name: "Red kidney beans, uncooked", kcal: 105, protein: 8.1, carbs: 12.8, fat: 0.6, sugar: 0.5, satFat: 0.1, fibre: 7.8, salt: 0.03, unitName: "can", unitGrams: 240 },
    { sheetRow: 19, id: "food_yeast_dried_fast_action", name: "Fast action dried yeast", kcal: 322, protein: 44.8, carbs: 17.6, fat: 3.4, sugar: 13.9, satFat: 1.2, fibre: 21.1, salt: 0.3, unitName: "portion", unitGrams: 4 },
    { sheetRow: 20, id: "food_oil_olive_extra_virgin", name: "Extra virgin olive oil", kcal: 822, protein: 0, carbs: 0, fat: 91.3, sugar: 0, satFat: 13.9, fibre: 0, salt: 0, unitName: "portion", unitGrams: 15 },
    { sheetRow: 21, id: "food_milk_whole", name: "Whole milk", kcal: 66, protein: 3.5, carbs: 4.7, fat: 3.7, sugar: 4.7, satFat: 2.4, fibre: 0, salt: 0.11, unitName: "ml", unitGrams: 100 },
    { sheetRow: 22, id: "food_cream_double", name: "Double cream,Elmlea", kcal: 295, protein: 1.8, carbs: 3.2, fat: 31, sugar: 3, satFat: 22, salt: 0.1, unitName: "portion", unitGrams: 100 },
    { sheetRow: 23, id: "food_cheese_mozzarella_grated", name: "Mozzarella cheese, grated", kcal: 317, protein: 21.4, carbs: 7.1, fat: 22.5, sugar: 1.9, satFat: 14.5, fibre: 0.5, salt: 1.46, unitName: "portion", unitGrams: 30 },
    { sheetRow: 24, id: "food_cheese_cheddar_grated", name: "Cheddar cheese, grated", kcal: 415, protein: 24.9, carbs: 2, fat: 34.2, sugar: 0.5, satFat: 21.3, fibre: 0.5, salt: 1.77, unitName: "portion", unitGrams: 30 },
    { sheetRow: 25, id: "food_cheese_parmigiano_grated", name: "Parmigiano cheese, grated", kcal: 402, protein: 32.4, carbs: 0.5, fat: 29.7, sugar: 0.5, satFat: 19.6, fibre: 0.5, salt: 1.4, unitName: "serving", unitGrams: 10 },
    { sheetRow: 26, id: "food_mushrooms_chesnut_uncooked", name: "Chesnut mushrooms, uncooked", kcal: 8, protein: 1, carbs: 0.3, fat: 0.2, sugar: 0.3, satFat: 0.1, fibre: 0.7, salt: 0.01, unitName: "portion", unitGrams: 100 },
    { sheetRow: 27, id: "food_pepper_bell_uncooked", name: "Bell Pepper, uncooked", kcal: 23, protein: 0.8, carbs: 4.1, fat: 0.5, sugar: 4, satFat: 0.1, fibre: 1, salt: 0.01, unitName: "pepper", unitGrams: 160 },
    { sheetRow: 28, id: "food_garlic_chopped_uncooked", name: "Chopped garlic, uncooked", kcal: 76, protein: 4.7, carbs: 11.3, fat: 0.1, sugar: 0.7, satFat: 0.1, salt: 0.1, unitName: "portion", unitGrams: 15 },
    { sheetRow: 29, id: "food_puree_tomato_uncooked", name: "Tomato puree, uncooked", kcal: 89, protein: 4.5, carbs: 15.6, fat: 0.4, sugar: 15.6, satFat: 0, fibre: 2.3, salt: 0.06, unitName: "tablespoon", unitGrams: 15 },
    { sheetRow: 31, id: "food_coffee_decaf_organic", name: "Organic decaf coffee, finely ground", kcal: 2, protein: 0.2, carbs: 0.3, fat: 0, sugar: 0, satFat: 0, fibre: 0, salt: 0, unitName: "cup", unitGrams: 17 },
    { sheetRow: 32, id: "food_protein_whey_powder", name: "Whey protein, powder", kcal: 372, protein: 69, carbs: 7.9, fat: 6.5, sugar: 4.7, satFat: 4, salt: 0.61, unitName: "scoop", unitGrams: 30 },
    { sheetRow: 33, id: "food_protein_collagen_powder", name: "Collagen protein, powder", kcal: 355, protein: 87, carbs: 1, fat: 0.5, sugar: 0, satFat: 0.2, salt: 0.48, unitName: "scoop", unitGrams: 30 },
    { sheetRow: 34, id: "food_oats_instant", name: "Instant oats, powder", kcal: 388, protein: 11, carbs: 69, fat: 6.9, sugar: 0.8, satFat: 1.6, fibre: 4, salt: 0.01, unitName: "serving", unitGrams: 100 },
    { sheetRow: 35, id: "food_protein_mass_gainer", name: "Mass gainer protein, powder", kcal: 361, protein: 27, carbs: 47, fat: 6.3, sugar: 9.9, satFat: 4.4, salt: 0.14, unitName: "serving", unitGrams: 125 },
  ].map(Object.freeze));

  /* -------------------------
     Deliberately not imported

     Recorded here rather than only in conversation, so the follow-up task
     starts from the reason and not from memory.
     ------------------------- */

  const EXCLUDED = Object.freeze([
    Object.freeze({
      sheetRow: 30,
      id: "food_puree_garlic_uncooked",
      name: "Garlic puree, uncooked",
      reason:
        "Every nutrition cell is blank, and blank means unknown rather than " +
        "zero, so there is nothing to import. The row is a name and an id.",
    }),
  ]);

  /* -------------------------
     Meals

     No meals are imported. The Meals sheet holds three component rows, all
     for meal_1, and two of the three name food ids that do not exist on the
     Foods sheet (food_chicken_breast_cooked and food_rice_white_cooked,
     against a library that has the uncooked entries). meal_2 through meal_6
     have no component rows at all. The batch weights are cooked weights, so
     remapping them to the uncooked ids would be wrong by a multiple rather
     than by a rounding, which is why nothing was substituted. Meals arrive as
     their own task once the sheet resolves.
     ------------------------- */

  const MEALS = Object.freeze([]);

  /* -------------------------
     Helpers
     ------------------------- */

  // The fields verify() compares. sheetRow is excluded on purpose: it is
  // provenance for the eyeball pass, not part of the stored food.
  const COMPARED_FIELDS = Object.freeze([
    "name",
    "kcal",
    "protein",
    "carbs",
    "fat",
    "sugar",
    "satFat",
    "fibre",
    "salt",
    "unitName",
    "unitGrams",
  ]);

  const ABSENT = "(absent)";

  function has(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
  }

  function isPlainObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }

  const OPTIONAL_FIELDS = Object.freeze([
    "satFat",
    "fibre",
    "salt",
    "unitName",
    "unitGrams",
  ]);

  // sheetRow is stripped explicitly rather than left for the writer to ignore,
  // so nothing here depends on how the writer treats a key it does not know.
  //
  // Every optional the sheet leaves blank is stated as null rather than
  // omitted. The writer merges, so an omitted key preserves whatever is
  // already stored, and this import is authoritative: if the sheet says a
  // value is unknown, a re-import has to be able to clear a stale one rather
  // than leave storage permanently disagreeing with the sheet. null is the
  // writer's own word for that.
  function toPatch(entry) {
    const patch = { id: entry.id, name: entry.name };

    ["kcal", "protein", "carbs", "fat", "sugar"].forEach(function (field) {
      patch[field] = entry[field];
    });

    OPTIONAL_FIELDS.forEach(function (field) {
      patch[field] = has(entry, field) ? entry[field] : null;
    });

    return patch;
  }

  function writersFrom(deps) {
    const options = isPlainObject(deps) ? deps : {};
    const writers = options.writers || global.LifeOSWrite;
    if (!writers || typeof writers.food !== "function") {
      throw new Error("importFoods requires LifeOSWrite.food.");
    }
    return writers;
  }

  function storeFrom(deps) {
    const options = isPlainObject(deps) ? deps : {};
    const store = options.db || global.LifeOSDB;
    if (!store || typeof store.getCollection !== "function") {
      throw new Error("verify requires LifeOSDB.");
    }
    return store;
  }

  /* -------------------------
     importFoods
     Records and continues, the M6 discipline: one refused food never aborts
     the other 24, and the caller is told exactly which failed and why.
     ------------------------- */

  function importFoods(deps) {
    const writers = writersFrom(deps);
    const written = [];
    const failed = [];

    FOODS.forEach(function (entry) {
      try {
        writers.food(toPatch(entry));
        written.push(entry.id);
      } catch (err) {
        failed.push({
          id: entry.id,
          error: err && err.message ? err.message : String(err),
        });
      }
    });

    return {
      ok: failed.length === 0,
      total: FOODS.length,
      written: written,
      failed: failed,
    };
  }

  /* -------------------------
     verify
     Pure: reads storage back and compares it to the literal, field by field,
     presence included, so a fibre stored as 0 where the sheet was blank is a
     mismatch rather than a near miss. It proves storage matches this file. It
     cannot prove this file matches the workbook, which is what the printed
     rows are for.
     ------------------------- */

  function verify(deps) {
    const store = storeFrom(deps);
    const stored = (store.getCollection("foods") || []).filter(Boolean);
    const byId = new Map(
      stored.map(function (f) {
        return [f.id, f];
      })
    );

    const missing = [];
    const mismatched = [];

    FOODS.forEach(function (entry) {
      const found = byId.get(entry.id);
      if (!found) {
        missing.push(entry.id);
        return;
      }

      COMPARED_FIELDS.forEach(function (field) {
        const inEntry = has(entry, field);
        const inStored = has(found, field);

        if (inEntry !== inStored) {
          mismatched.push({
            id: entry.id,
            field: field,
            expected: inEntry ? entry[field] : ABSENT,
            actual: inStored ? found[field] : ABSENT,
          });
          return;
        }

        if (inEntry && entry[field] !== found[field]) {
          mismatched.push({
            id: entry.id,
            field: field,
            expected: entry[field],
            actual: found[field],
          });
        }
      });
    });

    const expectedIds = new Set(
      FOODS.map(function (f) {
        return f.id;
      })
    );

    // Not a failure: a food you add in the app later is your business, not a
    // broken import. Reported so the screen can say so.
    const unexpected = stored
      .filter(function (f) {
        return !expectedIds.has(f.id);
      })
      .map(function (f) {
        return f.id;
      });

    const badIds = new Set(
      mismatched.map(function (m) {
        return m.id;
      })
    );

    return {
      ok: missing.length === 0 && mismatched.length === 0,
      total: FOODS.length,
      stored: stored.length,
      matched: FOODS.length - missing.length - badIds.size,
      missing: missing,
      mismatched: mismatched,
      unexpected: unexpected,
    };
  }

  /* -------------------------
     The eyeball pass
     toSheetRows is pure and is what the screen renders. printSheetOrder is
     the console convenience. An absent optional prints blank, exactly as the
     workbook shows it, so a blank here and a 0 here are visibly different.
     ------------------------- */

  function toSheetRows() {
    return FOODS.map(function (entry) {
      const row = { row: entry.sheetRow, id: entry.id, name: entry.name };
      ["kcal", "protein", "carbs", "fat", "sugar", "satFat", "fibre", "salt"].forEach(
        function (field) {
          row[field] = has(entry, field) ? entry[field] : "";
        }
      );
      row.unitName = has(entry, "unitName") ? entry.unitName : "";
      row.unitGrams = has(entry, "unitGrams") ? entry.unitGrams : "";
      return row;
    });
  }

  function printSheetOrder() {
    const rows = toSheetRows();
    console.log(
      `Food library: ${rows.length} rows in ${SOURCE.file} sheet order ` +
        `(${SOURCE.sheet} rows ${SOURCE.firstDataRow} to ${SOURCE.lastDataRow}). ` +
        `A blank cell means the label did not state it, never zero.`
    );

    if (typeof console.table === "function") {
      console.table(rows);
    } else {
      rows.forEach(function (row) {
        console.log(JSON.stringify(row));
      });
    }

    EXCLUDED.forEach(function (item) {
      console.log(`Not imported, row ${item.sheetRow}, ${item.id}: ${item.reason}`);
    });

    return rows;
  }

  global.LifeOSFoodLibrary = {
    SOURCE,
    FOODS,
    EXCLUDED,
    MEALS,
    COMPARED_FIELDS,
    importFoods,
    verify,
    toSheetRows,
    printSheetOrder,
  };
})(window);
