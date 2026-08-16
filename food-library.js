/* =========================
   food-library.js: the food and meal library data and their import
   - No DOM, no network, nothing on load. Data in, data out, on request only.
   - The literals below are the transcription of the Foods and Meals sheets.
     They are the shipped copy of that data; verify() and verifyMeals() prove
     storage matches this file, and printSheetOrder() and printMealSheetOrder()
     exist because only an eyeball pass against the workbook can prove this
     file matches the spreadsheet.
   - Every write goes through a canonical writer: LifeOSWrite.food, which
     enforces the food_<slug> naming contract and refuses a food missing its
     per-100 g nutrition, and LifeOSWrite.mealTemplate, which enforces
     meal_<slug> and derives a meal's nutrition from the food library.
   - Import is idempotent: the ids are stable, so a second run upserts the same
     records in place. It is also authoritative, so re-importing overwrites any
     in-app edit to these foods and meals. The sheet is the source.
   - Foods must be imported BEFORE meals. A meal derives its nutrition from the
     library at write time, so importMeals refuses to run while any food it
     names is missing rather than writing meals built on absent values.
   ========================= */

(function (global) {
  const SOURCE = Object.freeze({
    file: "UPDATED_V3_FOOD_LIBRARY_TEMPLATE.xlsx",
    sheet: "Foods",
    headerRow: 8,
    firstDataRow: 9,
    lastDataRow: 49,
    rowsOnSheet: 41,
    imported: 40,
    extractedOn: "2026-08-16",
  });

  const MEALS_SOURCE = Object.freeze({
    file: "UPDATED_V3_FOOD_LIBRARY_TEMPLATE.xlsx",
    sheet: "Meals",
    headerRow: 8,
    firstDataRow: 9,
    lastDataRow: 58,
    componentRows: 50,
    imported: 7,
    summaryFirstRow: 65,
    summaryLastRow: 71,
    extractedOn: "2026-08-16",
  });

  /* -------------------------
     The food library

     Order is sheet order, and sheetRow is the workbook row each entry came
     from, so a printed row can be checked against the file line by line.
     sheetRow is stripped before the writer sees it and never reaches storage.

     Values are the sheet's numbers as they stand. Unlike the previous version
     of this file, no cell needed rounding: the v3 workbook stores no IEEE
     artefacts.

     An absent satFat, fibre or salt means the label did not state it. Blank is
     unknown, never zero, so those keys are omitted rather than set to 0. Five
     foods have no fibre for that reason, and one (the yoghurt) has no
     countable unit.

     THIS IMPORT CORRECTS SIX FOODS THAT SHIPPED WITH WRONG VALUES. Three are
     large and are the cooked-values-under-an-uncooked-name error: rice
     (154 to 355 kcal), fusilli (158 to 352) and chicken breast (137 to 106)
     were carrying prepared numbers under dry or raw names. The v3 sheet fixes
     them and adds explicit _cooked entries alongside, which is what the meals
     actually reference. The smaller three are plain flour (carbs 70.1 to
     76.3), olive oil (822 to 900 kcal, 91.3 to 100 g fat, unit 15 to 14 g) and
     red kidney beans (renamed to "canned, drained"). Re-importing overwrites
     the stored values, which is intended: the sheet is the source. Nothing
     already logged moves, because a logged meal carries its own frozen
     snapshot.

     Two rows carry the sheet's CHECK flag and are imported anyway, both
     legitimately fibre-heavy: red kidney beans (105 kcal against 89 derived)
     and raw spinach (23 against 29.6, where the carbohydrate figure includes
     the fibre).
     ------------------------- */

  const FOODS = Object.freeze([
    { sheetRow: 9, id: "food_rice_white_uncooked", name: "Rice, white, uncooked", kcal: 355, protein: 7.3, carbs: 78, fat: 0.8, sugar: 0.1, satFat: 0.2, fibre: 1.2, salt: 0.01, unitName: "portion", unitGrams: 100 },
    { sheetRow: 10, id: "food_veg_mixed_frozen", name: "Mixed vegetables, frozen", kcal: 64, protein: 2.7, carbs: 9.8, fat: 0.7, sugar: 4.7, satFat: 0.2, fibre: 3.7, salt: 0.05, unitName: "packet", unitGrams: 136 },
    { sheetRow: 11, id: "food_chicken_breast_uncooked", name: "Chicken breasts, uncooked", kcal: 106, protein: 23.5, carbs: 0, fat: 1.4, sugar: 0, satFat: 0.4, fibre: 0, salt: 0.15, unitName: "breast", unitGrams: 250 },
    { sheetRow: 12, id: "food_passata_italian_uncooked", name: "Italian passata, sauce", kcal: 31, protein: 1.5, carbs: 4.2, fat: 0.8, sugar: 3.7, satFat: 0.4, fibre: 0.5, salt: 0.03, unitName: "portion", unitGrams: 100 },
    { sheetRow: 13, id: "food_fruit_mixed_dried", name: "Mixed fruit, dried", kcal: 313, protein: 2.6, carbs: 73.3, fat: 0.6, sugar: 59, satFat: 0.1, fibre: 2.1, salt: 0.13, unitName: "portion", unitGrams: 30 },
    { sheetRow: 14, id: "food_flour_plain", name: "Plain Flour", kcal: 340, protein: 10.4, carbs: 76.3, fat: 1.3, sugar: 1.4, satFat: 0.2, fibre: 3.2, salt: 0, unitName: "portion", unitGrams: 100 },
    { sheetRow: 15, id: "food_pasta_fusilli_uncooked", name: "Fusilli pasta, uncooked", kcal: 352, protein: 12, carbs: 71, fat: 1.5, sugar: 2.8, satFat: 0.3, fibre: 2.9, salt: 0.01, unitName: "portion", unitGrams: 100 },
    { sheetRow: 16, id: "food_nuts_mixed", name: "Mixed nuts", kcal: 696, protein: 14.3, carbs: 3.1, fat: 68.2, sugar: 2.4, satFat: 17.4, fibre: 6.3, salt: 0.1, unitName: "portion", unitGrams: 25 },
    { sheetRow: 17, id: "food_seeds_mixed", name: "Mixed seeds", kcal: 614, protein: 26.7, carbs: 2.3, fat: 53, sugar: 2.2, satFat: 7.5, fibre: 10.3, salt: 0.12, unitName: "portion", unitGrams: 10 },
    { sheetRow: 18, id: "food_beans_kidney_red", name: "Red kidney beans, canned, drained", kcal: 105, protein: 8.1, carbs: 12.8, fat: 0.6, sugar: 0.5, satFat: 0.1, fibre: 7.8, salt: 0.03, unitName: "can", unitGrams: 240 },
    { sheetRow: 19, id: "food_yeast_dried_fast_action", name: "Fast action dried yeast", kcal: 322, protein: 44.8, carbs: 17.6, fat: 3.4, sugar: 13.9, satFat: 1.2, fibre: 21.1, salt: 0.3, unitName: "portion", unitGrams: 4 },
    { sheetRow: 20, id: "food_oil_olive_extra_virgin", name: "Extra virgin olive oil", kcal: 900, protein: 0, carbs: 0, fat: 100, sugar: 0, satFat: 15.2, fibre: 0, salt: 0, unitName: "portion", unitGrams: 14 },
    { sheetRow: 21, id: "food_milk_whole", name: "Whole milk", kcal: 66, protein: 3.5, carbs: 4.7, fat: 3.7, sugar: 4.7, satFat: 2.4, fibre: 0, salt: 0.11, unitName: "ml", unitGrams: 100 },
    { sheetRow: 22, id: "food_cream_double", name: "Double cream,Elmlea", kcal: 295, protein: 1.8, carbs: 3.2, fat: 31, sugar: 3, satFat: 22, salt: 0.1, unitName: "portion", unitGrams: 100 },
    { sheetRow: 23, id: "food_cheese_mozzarella_grated", name: "Mozzarella cheese, grated", kcal: 317, protein: 21.4, carbs: 7.1, fat: 22.5, sugar: 1.9, satFat: 14.5, fibre: 0.5, salt: 1.46, unitName: "portion", unitGrams: 30 },
    { sheetRow: 24, id: "food_cheese_cheddar_grated", name: "Cheddar cheese, grated", kcal: 415, protein: 24.9, carbs: 2, fat: 34.2, sugar: 0.5, satFat: 21.3, fibre: 0.5, salt: 1.77, unitName: "portion", unitGrams: 30 },
    { sheetRow: 25, id: "food_cheese_parmigiano_grated", name: "Parmigiano cheese, grated", kcal: 402, protein: 32.4, carbs: 0.5, fat: 29.7, sugar: 0.5, satFat: 19.6, fibre: 0.5, salt: 1.4, unitName: "serving", unitGrams: 10 },
    { sheetRow: 26, id: "food_mushrooms_chesnut_uncooked", name: "Chesnut mushrooms, uncooked", kcal: 8, protein: 1, carbs: 0.3, fat: 0.2, sugar: 0.3, satFat: 0.1, fibre: 0.7, salt: 0.01, unitName: "portion", unitGrams: 100 },
    { sheetRow: 27, id: "food_pepper_bell_uncooked", name: "Bell Pepper, uncooked", kcal: 23, protein: 0.8, carbs: 4.1, fat: 0.5, sugar: 4, satFat: 0.1, fibre: 1, salt: 0.01, unitName: "pepper", unitGrams: 160 },
    { sheetRow: 28, id: "food_garlic_chopped_uncooked", name: "Chopped garlic, uncooked", kcal: 76, protein: 4.7, carbs: 11.3, fat: 0.1, sugar: 0.7, satFat: 0.1, salt: 0.1, unitName: "portion", unitGrams: 15 },
    { sheetRow: 29, id: "food_puree_tomato_uncooked", name: "Tomato puree, uncooked", kcal: 89, protein: 4.5, carbs: 15.6, fat: 0.4, sugar: 15.6, satFat: 0, fibre: 2.3, salt: 0.06, unitName: "tablespoon", unitGrams: 15 },
    { sheetRow: 30, id: "food_puree_garlic_uncooked", name: "Garlic puree, uncooked", kcal: 101, protein: 4.5, carbs: 15.5, fat: 1.8, sugar: 1, satFat: 0.3, fibre: 3, salt: 0.4, unitName: "teaspoon", unitGrams: 6 },
    { sheetRow: 31, id: "food_coffee_decaf_organic", name: "Organic decaf coffee, finely ground", kcal: 2, protein: 0.2, carbs: 0.3, fat: 0, sugar: 0, satFat: 0, fibre: 0, salt: 0, unitName: "cup", unitGrams: 17 },
    { sheetRow: 32, id: "food_protein_whey_powder", name: "Whey protein, powder", kcal: 372, protein: 69, carbs: 7.9, fat: 6.5, sugar: 4.7, satFat: 4, salt: 0.61, unitName: "scoop", unitGrams: 30 },
    { sheetRow: 33, id: "food_protein_collagen_powder", name: "Collagen protein, powder", kcal: 355, protein: 87, carbs: 1, fat: 0.5, sugar: 0, satFat: 0.2, salt: 0.48, unitName: "scoop", unitGrams: 30 },
    { sheetRow: 34, id: "food_oats_instant", name: "Instant oats, powder", kcal: 388, protein: 11, carbs: 69, fat: 6.9, sugar: 0.8, satFat: 1.6, fibre: 4, salt: 0.01, unitName: "serving", unitGrams: 100 },
    { sheetRow: 35, id: "food_protein_mass_gainer", name: "Mass gainer protein, powder", kcal: 361, protein: 27, carbs: 47, fat: 6.3, sugar: 9.9, satFat: 4.4, salt: 0.14, unitName: "serving", unitGrams: 125 },
    { sheetRow: 36, id: "food_banana_raw", name: "Banana, raw, peeled", kcal: 89, protein: 1.1, carbs: 22.8, fat: 0.3, sugar: 12.2, satFat: 0.1, fibre: 2.6, salt: 0, unitName: "banana", unitGrams: 118 },
    { sheetRow: 37, id: "food_orange_raw", name: "Orange, raw, peeled", kcal: 47, protein: 0.9, carbs: 11.8, fat: 0.1, sugar: 9.4, satFat: 0, fibre: 2.4, salt: 0, unitName: "orange", unitGrams: 130 },
    { sheetRow: 38, id: "food_onion_brown_raw", name: "Brown onion, raw, peeled", kcal: 40, protein: 1.1, carbs: 9.3, fat: 0.1, sugar: 4.2, satFat: 0, fibre: 1.7, salt: 0, unitName: "onion", unitGrams: 150 },
    { sheetRow: 39, id: "food_onion_red_raw", name: "Red onion, raw, peeled", kcal: 40, protein: 1.1, carbs: 9.3, fat: 0.1, sugar: 4.2, satFat: 0, fibre: 1.7, salt: 0, unitName: "onion", unitGrams: 150 },
    { sheetRow: 40, id: "food_spinach_raw", name: "Spinach, raw", kcal: 23, protein: 2.9, carbs: 3.6, fat: 0.4, sugar: 0.4, satFat: 0.1, fibre: 2.2, salt: 0.2, unitName: "handful", unitGrams: 30 },
    { sheetRow: 41, id: "food_sweetcorn_canned", name: "Sweetcorn, canned, drained", kcal: 81, protein: 2.6, carbs: 14.4, fat: 1.2, sugar: 4, satFat: 0.2, fibre: 2.5, salt: 0.2, unitName: "can drained", unitGrams: 165 },
    { sheetRow: 42, id: "food_yoghurt_natural", name: "Natural yoghurt (Yeo Valley)", kcal: 82, protein: 4.6, carbs: 5.5, fat: 4.2, sugar: 5.5, satFat: 2.7, fibre: 0, salt: 0.18 },
    { sheetRow: 43, id: "food_eggs", name: "Eggs, whole, raw", kcal: 131, protein: 12.6, carbs: 0.3, fat: 9, sugar: 0.3, satFat: 2.5, fibre: 0, salt: 0.35, unitName: "egg", unitGrams: 58 },
    { sheetRow: 45, id: "food_berries_frozen", name: "Mixed berries, frozen", kcal: 42, protein: 0.9, carbs: 8, fat: 0.3, sugar: 7.5, satFat: 0, fibre: 3, salt: 0, unitName: "handful", unitGrams: 80 },
    { sheetRow: 46, id: "food_salmon_red_thai", name: "Salmon fillet, Red Thai (SS)", kcal: 214, protein: 20.4, carbs: 2, fat: 13.8, sugar: 1.1, satFat: 2.2, fibre: 0.5, salt: 0.85, unitName: "fillet", unitGrams: 110 },
    { sheetRow: 47, id: "food_chicken_breast_cooked", name: "Chicken breasts, cooked", kcal: 145, protein: 32.2, carbs: 0, fat: 1.9, sugar: 0, satFat: 0.5, fibre: 0, salt: 0.21, unitName: "breast", unitGrams: 183 },
    { sheetRow: 48, id: "food_rice_white_cooked", name: "Rice, white, cooked", kcal: 129, protein: 2.7, carbs: 28.4, fat: 0.3, sugar: 0, satFat: 0.1, fibre: 0.4, salt: 0, unitName: "portion", unitGrams: 275 },
    { sheetRow: 49, id: "food_pasta_fusilli_cooked", name: "Fusilli pasta, cooked", kcal: 147, protein: 5, carbs: 29.6, fat: 0.6, sugar: 1.2, satFat: 0.1, fibre: 1.2, salt: 0, unitName: "portion", unitGrams: 240 },
  ].map(Object.freeze));

  /* -------------------------
     Deliberately not imported

     Recorded here rather than only in conversation, so the follow-up task
     starts from the reason and not from memory.

     food_puree_garlic_uncooked, excluded from the previous import for exactly
     this reason, now states its values on the v3 sheet and is imported.
     ------------------------- */

  const EXCLUDED = Object.freeze([
    Object.freeze({
      sheetRow: 44,
      id: "food_mackerel_tinned",
      name: "Mackerel, tinned",
      reason:
        "Every nutrition cell is blank, and blank means unknown rather than " +
        "zero, so there is nothing to import. The row is a name and an id. " +
        "No meal names it, so nothing else is blocked by its absence.",
    }),
  ]);

  /* -------------------------
     The meals

     One entry per meal, components in sheet order. grams is gramsPerServing,
     the weight of that component in the SINGLE serving actually eaten, which
     is the unit LifeOSWrite.mealTemplate expects. Where the sheet used the
     batch helper (batchGrams divided by batchServings) the resolved
     per-serving number is what is recorded here.

     No nutrition is stored in this literal. A meal's calories and macros are
     derived by the writer from the food library, so the numbers can never
     disagree with the foods they are made of. sheetTotals is the workbook's
     own independently computed summary, kept for verification only.
     ------------------------- */

  const MEALS = Object.freeze([
    {
      id: "meal_1",
      name: "Veg omelette",
      sheetRows: [9, 15],
      // The workbook's own per-serving summary block, row 65. Not stored:
      // verifyMeals compares our derivation against it, so an error in either
      // the transcription or the maths shows up as a disagreement.
      sheetTotals: { calories: 451, protein: 31.8, carbs: 7.1, fat: 33.5, sugar: 4 },
      components: [
        { sheetRow: 9, foodId: "food_eggs", grams: 174 },
        { sheetRow: 10, foodId: "food_cheese_cheddar_grated", grams: 30 },
        { sheetRow: 11, foodId: "food_mushrooms_chesnut_uncooked", grams: 60 },
        { sheetRow: 12, foodId: "food_pepper_bell_uncooked", grams: 40 },
        { sheetRow: 13, foodId: "food_spinach_raw", grams: 40 },
        { sheetRow: 14, foodId: "food_onion_red_raw", grams: 30 },
        { sheetRow: 15, foodId: "food_oil_olive_extra_virgin", grams: 7 },
      ],
    },
    {
      id: "meal_2",
      name: "Yoghurt berry bowl",
      sheetRows: [16, 21],
      // The workbook's own per-serving summary block, row 66. Not stored:
      // verifyMeals compares our derivation against it, so an error in either
      // the transcription or the maths shows up as a disagreement.
      sheetTotals: { calories: 552, protein: 32.1, carbs: 31.5, fat: 31.1, sugar: 28.8 },
      components: [
        { sheetRow: 16, foodId: "food_yoghurt_natural", grams: 250 },
        { sheetRow: 17, foodId: "food_protein_whey_powder", grams: 20 },
        { sheetRow: 18, foodId: "food_berries_frozen", grams: 100 },
        { sheetRow: 19, foodId: "food_nuts_mixed", grams: 20 },
        { sheetRow: 20, foodId: "food_seeds_mixed", grams: 10 },
        { sheetRow: 21, foodId: "food_fruit_mixed_dried", grams: 10 },
      ],
    },
    {
      id: "meal_3",
      name: "Chicken & rice bowl",
      sheetRows: [22, 26],
      // The workbook's own per-serving summary block, row 67. Not stored:
      // verifyMeals compares our derivation against it, so an error in either
      // the transcription or the maths shows up as a disagreement.
      sheetTotals: { calories: 704, protein: 63.9, carbs: 76, fat: 14.7, sugar: 6.6 },
      components: [
        { sheetRow: 22, foodId: "food_chicken_breast_cooked", grams: 146 },
        { sheetRow: 23, foodId: "food_rice_white_cooked", grams: 220 },
        { sheetRow: 24, foodId: "food_veg_mixed_frozen", grams: 136 },
        { sheetRow: 25, foodId: "food_eggs", grams: 58 },
        { sheetRow: 26, foodId: "food_oil_olive_extra_virgin", grams: 5 },
      ],
    },
    {
      id: "meal_4",
      name: "Salmon egg fried rice",
      sheetRows: [27, 31],
      // The workbook's own per-serving summary block, row 68. Not stored:
      // verifyMeals compares our derivation against it, so an error in either
      // the transcription or the maths shows up as a disagreement.
      sheetTotals: { calories: 770, protein: 43.4, carbs: 78.6, fat: 29.8, sugar: 8 },
      components: [
        { sheetRow: 27, foodId: "food_salmon_red_thai", grams: 130 },
        { sheetRow: 28, foodId: "food_rice_white_cooked", grams: 220 },
        { sheetRow: 29, foodId: "food_veg_mixed_frozen", grams: 136 },
        { sheetRow: 30, foodId: "food_eggs", grams: 58 },
        { sheetRow: 31, foodId: "food_oil_olive_extra_virgin", grams: 5 },
      ],
    },
    {
      id: "meal_5",
      name: "Chicken pasta, passata & parmigiano",
      sheetRows: [32, 41],
      // The workbook's own per-serving summary block, row 69. Not stored:
      // verifyMeals compares our derivation against it, so an error in either
      // the transcription or the maths shows up as a disagreement.
      sheetTotals: { calories: 787, protein: 64.6, carbs: 89.1, fat: 18.3, sugar: 16.1 },
      components: [
        { sheetRow: 32, foodId: "food_pasta_fusilli_cooked", grams: 240 },
        { sheetRow: 33, foodId: "food_chicken_breast_cooked", grams: 131 },
        { sheetRow: 34, foodId: "food_passata_italian_uncooked", grams: 150 },
        { sheetRow: 35, foodId: "food_mushrooms_chesnut_uncooked", grams: 80 },
        { sheetRow: 36, foodId: "food_pepper_bell_uncooked", grams: 60 },
        { sheetRow: 37, foodId: "food_onion_brown_raw", grams: 60 },
        { sheetRow: 38, foodId: "food_puree_tomato_uncooked", grams: 15 },
        { sheetRow: 39, foodId: "food_garlic_chopped_uncooked", grams: 10 },
        { sheetRow: 40, foodId: "food_oil_olive_extra_virgin", grams: 8 },
        { sheetRow: 41, foodId: "food_cheese_parmigiano_grated", grams: 15 },
      ],
    },
    {
      id: "meal_6",
      name: "Post-training shake",
      sheetRows: [42, 45],
      // The workbook's own per-serving summary block, row 70. Not stored:
      // verifyMeals compares our derivation against it, so an error in either
      // the transcription or the maths shows up as a disagreement.
      sheetTotals: { calories: 609, protein: 38, carbs: 77.9, fat: 17, sugar: 30.3 },
      components: [
        { sheetRow: 42, foodId: "food_protein_whey_powder", grams: 30 },
        { sheetRow: 43, foodId: "food_oats_instant", grams: 50 },
        { sheetRow: 44, foodId: "food_milk_whole", grams: 300 },
        { sheetRow: 45, foodId: "food_banana_raw", grams: 118 },
      ],
    },
    {
      id: "meal_7",
      name: "Homemade pizza",
      sheetRows: [46, 58],
      // The workbook's own per-serving summary block, row 71. Not stored:
      // verifyMeals compares our derivation against it, so an error in either
      // the transcription or the maths shows up as a disagreement.
      sheetTotals: { calories: 1051, protein: 57.7, carbs: 139.8, fat: 32.1, sugar: 15.4 },
      components: [
        { sheetRow: 46, foodId: "food_flour_plain", grams: 150 },
        { sheetRow: 47, foodId: "food_yeast_dried_fast_action", grams: 4 },
        { sheetRow: 48, foodId: "food_oil_olive_extra_virgin", grams: 10 },
        { sheetRow: 49, foodId: "food_passata_italian_uncooked", grams: 100 },
        { sheetRow: 50, foodId: "food_puree_tomato_uncooked", grams: 15 },
        { sheetRow: 51, foodId: "food_puree_garlic_uncooked", grams: 10 },
        { sheetRow: 52, foodId: "food_cheese_mozzarella_grated", grams: 75 },
        { sheetRow: 53, foodId: "food_chicken_breast_cooked", grams: 58 },
        { sheetRow: 54, foodId: "food_mushrooms_chesnut_uncooked", grams: 50 },
        { sheetRow: 55, foodId: "food_pepper_bell_uncooked", grams: 50 },
        { sheetRow: 56, foodId: "food_onion_red_raw", grams: 40 },
        { sheetRow: 57, foodId: "food_sweetcorn_canned", grams: 30 },
        { sheetRow: 58, foodId: "food_spinach_raw", grams: 25 },
      ],
    },
  ].map(Object.freeze));

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

  // The sheet rounds each component before summing, the writer sums before
  // rounding, so the two agree to within a rounding step rather than exactly.
  // Anything larger than this is a real disagreement, not arithmetic order.
  const MEAL_TOLERANCE = Object.freeze({ calories: 1.5, macro: 0.5 });

  const MEAL_SHEET_FIELDS = Object.freeze([
    "calories",
    "protein",
    "carbs",
    "fat",
    "sugar",
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

  // sheetRow, sheetRows and sheetTotals are provenance and never reach
  // storage. Nutrition is deliberately not passed: the writer derives it from
  // the food library, which is the entire point of a components meal.
  function toMealPatch(meal) {
    return {
      id: meal.id,
      name: meal.name,
      components: meal.components.map(function (component) {
        return { foodId: component.foodId, grams: component.grams };
      }),
    };
  }

  function writersFrom(deps) {
    const options = isPlainObject(deps) ? deps : {};
    const writers = options.writers || global.LifeOSWrite;
    if (!writers || typeof writers.food !== "function") {
      throw new Error("importFoods requires LifeOSWrite.food.");
    }
    return writers;
  }

  function mealWritersFrom(deps) {
    const options = isPlainObject(deps) ? deps : {};
    const writers = options.writers || global.LifeOSWrite;
    if (!writers || typeof writers.mealTemplate !== "function") {
      throw new Error("importMeals requires LifeOSWrite.mealTemplate.");
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

  function requiredFoodIds() {
    const ids = [];
    MEALS.forEach(function (meal) {
      meal.components.forEach(function (component) {
        if (ids.indexOf(component.foodId) === -1) ids.push(component.foodId);
      });
    });
    return ids;
  }

  function missingFoodIds(store) {
    const stored = (store.getCollection("foods") || [])
      .filter(Boolean)
      .map(function (food) {
        return food.id;
      });

    return requiredFoodIds().filter(function (id) {
      return stored.indexOf(id) === -1;
    });
  }

  /* -------------------------
     importFoods
     Records and continues, the M6 discipline: one refused food never aborts
     the other 39, and the caller is told exactly which failed and why.
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
     importMeals
     Foods before meals, refused rather than half done. A meal derives its
     nutrition from the library at write time, so importing into a library
     that is missing any named food would refuse meal by meal and leave the
     rest built on whatever happened to be there. One up-front check is
     clearer and safer than seven failures.
     ------------------------- */

  function importMeals(deps) {
    const writers = mealWritersFrom(deps);
    const store = storeFrom(deps);

    const missingFoods = missingFoodIds(store);
    if (missingFoods.length > 0) {
      return {
        ok: false,
        total: MEALS.length,
        written: [],
        failed: [],
        missingFoods: missingFoods,
        reason:
          "Import the foods first. " +
          missingFoods.length +
          " of the " +
          requiredFoodIds().length +
          " foods these meals are made of are not in the library yet.",
      };
    }

    const written = [];
    const failed = [];

    MEALS.forEach(function (meal) {
      try {
        writers.mealTemplate(toMealPatch(meal));
        written.push(meal.id);
      } catch (err) {
        failed.push({
          id: meal.id,
          error: err && err.message ? err.message : String(err),
        });
      }
    });

    return {
      ok: failed.length === 0,
      total: MEALS.length,
      written: written,
      failed: failed,
      missingFoods: [],
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
     verifyMeals
     Two questions at once. Does storage match this file, component for
     component? And does the nutrition the app derived match the number the
     workbook computed for itself? The second is the stronger check: the
     spreadsheet worked it out independently, so agreement means neither the
     transcription nor the derivation is wrong.
     ------------------------- */

  function verifyMeals(deps) {
    const store = storeFrom(deps);
    const stored = (store.getCollection("mealTemplates") || []).filter(Boolean);
    const byId = new Map(
      stored.map(function (t) {
        return [t.id, t];
      })
    );

    const missing = [];
    const mismatched = [];
    const driftedFromSheet = [];

    MEALS.forEach(function (meal) {
      const found = byId.get(meal.id);
      if (!found) {
        missing.push(meal.id);
        return;
      }

      if (found.name !== meal.name) {
        mismatched.push({
          id: meal.id,
          field: "name",
          expected: meal.name,
          actual: found.name,
        });
      }

      // A meal that lost its components would still hold plausible numbers,
      // frozen at whatever they were, so this is checked explicitly.
      if (found.nutritionSource !== "components") {
        mismatched.push({
          id: meal.id,
          field: "nutritionSource",
          expected: "components",
          actual: found.nutritionSource || ABSENT,
        });
      }

      const components = Array.isArray(found.components) ? found.components : [];
      if (components.length !== meal.components.length) {
        mismatched.push({
          id: meal.id,
          field: "components.length",
          expected: meal.components.length,
          actual: components.length,
        });
      } else {
        meal.components.forEach(function (component, index) {
          const actual = components[index] || {};
          if (actual.foodId !== component.foodId) {
            mismatched.push({
              id: meal.id,
              field: "components[" + index + "].foodId",
              expected: component.foodId,
              actual: actual.foodId || ABSENT,
            });
          }
          if (Number(actual.grams) !== Number(component.grams)) {
            mismatched.push({
              id: meal.id,
              field: "components[" + index + "].grams",
              expected: component.grams,
              actual: has(actual, "grams") ? actual.grams : ABSENT,
            });
          }
        });
      }

      MEAL_SHEET_FIELDS.forEach(function (field) {
        const sheetValue = meal.sheetTotals[field];
        if (sheetValue === undefined) return;

        const appValue = found[field];
        if (appValue === undefined) {
          driftedFromSheet.push({
            id: meal.id,
            field: field,
            sheet: sheetValue,
            app: ABSENT,
            diff: ABSENT,
          });
          return;
        }

        const diff = Math.abs(Number(appValue) - Number(sheetValue));
        const allowed =
          field === "calories" ? MEAL_TOLERANCE.calories : MEAL_TOLERANCE.macro;

        if (diff > allowed) {
          driftedFromSheet.push({
            id: meal.id,
            field: field,
            sheet: sheetValue,
            app: appValue,
            diff: Math.round(diff * 100) / 100,
          });
        }
      });
    });

    const expectedIds = new Set(
      MEALS.map(function (m) {
        return m.id;
      })
    );

    // Not a failure: meals you built by hand in the app are yours.
    const unexpected = stored
      .filter(function (t) {
        return !expectedIds.has(t.id);
      })
      .map(function (t) {
        return t.id;
      });

    const badIds = new Set(
      mismatched
        .map(function (m) {
          return m.id;
        })
        .concat(
          driftedFromSheet.map(function (d) {
            return d.id;
          })
        )
    );

    return {
      ok:
        missing.length === 0 &&
        mismatched.length === 0 &&
        driftedFromSheet.length === 0,
      total: MEALS.length,
      stored: stored.length,
      matched: MEALS.length - missing.length - badIds.size,
      missing: missing,
      mismatched: mismatched,
      driftedFromSheet: driftedFromSheet,
      unexpected: unexpected,
    };
  }

  /* -------------------------
     The eyeball pass
     toSheetRows and toMealSheetRows are pure and are what the screen renders.
     The print helpers are the console convenience. An absent optional prints
     blank, exactly as the workbook shows it, so a blank here and a 0 here are
     visibly different.
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

  // One row per component, in sheet order, which is how the Meals sheet reads.
  function toMealSheetRows() {
    const rows = [];

    MEALS.forEach(function (meal) {
      meal.components.forEach(function (component) {
        rows.push({
          row: component.sheetRow,
          mealId: meal.id,
          mealName: meal.name,
          foodId: component.foodId,
          gramsPerServing: component.grams,
        });
      });
    });

    return rows;
  }

  // The workbook's own per-serving summary, for checking against what the app
  // derived. These are the sheet's numbers, never the app's.
  function toMealTotalsRows() {
    return MEALS.map(function (meal) {
      return {
        mealId: meal.id,
        name: meal.name,
        components: meal.components.length,
        kcal: meal.sheetTotals.calories,
        protein: meal.sheetTotals.protein,
        carbs: meal.sheetTotals.carbs,
        fat: meal.sheetTotals.fat,
        sugar: meal.sheetTotals.sugar,
      };
    });
  }

  function printMealSheetOrder() {
    const rows = toMealSheetRows();
    console.log(
      `Meals: ${MEALS.length} meals, ${rows.length} component rows in ` +
        `${MEALS_SOURCE.file} sheet order (${MEALS_SOURCE.sheet} rows ` +
        `${MEALS_SOURCE.firstDataRow} to ${MEALS_SOURCE.lastDataRow}). ` +
        `grams is the weight in one serving.`
    );

    if (typeof console.table === "function") {
      console.table(rows);
    } else {
      rows.forEach(function (row) {
        console.log(JSON.stringify(row));
      });
    }

    console.log(
      `Per-serving totals as the workbook computes them ` +
        `(${MEALS_SOURCE.sheet} rows ${MEALS_SOURCE.summaryFirstRow} to ` +
        `${MEALS_SOURCE.summaryLastRow}). verifyMeals checks these against ` +
        `what the app derives from the food library.`
    );

    if (typeof console.table === "function") {
      console.table(toMealTotalsRows());
    } else {
      toMealTotalsRows().forEach(function (row) {
        console.log(JSON.stringify(row));
      });
    }

    return rows;
  }

  global.LifeOSFoodLibrary = {
    SOURCE,
    MEALS_SOURCE,
    FOODS,
    EXCLUDED,
    MEALS,
    COMPARED_FIELDS,
    importFoods,
    importMeals,
    verify,
    verifyMeals,
    toSheetRows,
    toMealSheetRows,
    toMealTotalsRows,
    printSheetOrder,
    printMealSheetOrder,
  };
})(window);
