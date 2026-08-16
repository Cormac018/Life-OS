/* =========================
   lifeos-writers.js: canonical collection writers
   - One writer per collection, so every caller produces the same shape
   - Merge semantics: omit a key to leave it unchanged, pass null to clear it
   - All writes still go through LifeOSDB.upsert, which stays the single
     write primitive
   ========================= */

(function (global) {
  function db() {
    if (!global.LifeOSDB) {
      throw new Error("LifeOSWrite requires LifeOSDB to be loaded first.");
    }
    return global.LifeOSDB;
  }

  // Distinguishes "key was not supplied" from "key was supplied as undefined",
  // which is what makes the merge semantics safe.
  function has(patch, key) {
    return Object.prototype.hasOwnProperty.call(patch, key);
  }

  function findByDate(collectionName, date) {
    const all = (db().getCollection(collectionName) || []).filter(Boolean);
    return all.find((x) => x && x.date === date) || null;
  }

  /* -------------------------
     workLogs
     One record per day, id is work_<date>.
     ------------------------- */

  function workLog(patch) {
    if (!patch || typeof patch !== "object") {
      throw new Error("workLog expects an object patch");
    }

    const date = patch.date;
    if (!date) {
      throw new Error("workLog requires a date");
    }

    const existing = findByDate("workLogs", date);
    const now = db().nowISO();

    // A caller that only knows about minutes cannot wipe startTime, endTime
    // or note, which is the drift this writer exists to remove.
    const minutes = has(patch, "minutes")
      ? Number(patch.minutes) || 0
      : existing
      ? Number(existing.minutes) || 0
      : 0;

    const note = has(patch, "note")
      ? String(patch.note || "").trim()
      : existing
      ? existing.note
      : "";

    const startTime = has(patch, "startTime")
      ? patch.startTime || null
      : existing
      ? existing.startTime || null
      : null;

    const endTime = has(patch, "endTime")
      ? patch.endTime || null
      : existing
      ? existing.endTime || null
      : null;

    return db().upsert("workLogs", {
      id: `work_${date}`,
      date,
      minutes,
      note,
      startTime,
      endTime,
      createdAt: existing ? existing.createdAt || now : now,
      updatedAt: now,
    });
  }

  /* -------------------------
     metricEntries
     One record per metric per day, id is m_<metricId>_<date>.
     ------------------------- */

  function metricEntry(patch) {
    if (!patch || typeof patch !== "object") {
      throw new Error("metricEntry expects an object patch");
    }

    const metricId = patch.metricId;
    const date = patch.date;
    if (!metricId || !date) {
      throw new Error("metricEntry requires a metricId and a date");
    }

    const id = `m_${metricId}_${date}`;
    const all = (db().getCollection("metricEntries") || []).filter(Boolean);
    const existing = all.find((x) => x && x.id === id) || null;
    const now = db().nowISO();

    // Value is passed through as given, so existing callers that already
    // validate their input keep their exact behaviour.
    const value = has(patch, "value")
      ? patch.value
      : existing
      ? existing.value
      : undefined;

    if (value === undefined) {
      throw new Error("metricEntry requires a value for a new entry");
    }

    const note = has(patch, "note")
      ? String(patch.note || "").trim()
      : existing
      ? existing.note
      : "";

    return db().upsert("metricEntries", {
      id,
      metricId,
      date,
      value,
      note,
      createdAt: existing ? existing.createdAt || now : now,
      updatedAt: now,
    });
  }

  /* -------------------------
     moneyTransactions
     These keep random ids, so there is no natural guard against logging the
     same spend twice. findDuplicateTransaction answers "have I already got
     this one?" and the writer enforces it only when asked, so manual entry
     stays unblocked.
     ------------------------- */

  function normaliseMerchant(value) {
    return String(value || "").trim().toLowerCase();
  }

  function findDuplicateTransaction(tx) {
    if (!tx || typeof tx !== "object") return null;

    const all = (db().getCollection("moneyTransactions") || []).filter(Boolean);
    const amount = Number(tx.amount);
    const merchant = normaliseMerchant(tx.merchant);

    return (
      all.find((x) => {
        if (!x) return false;
        // Editing a record is never a duplicate of itself.
        if (tx.id && x.id === tx.id) return false;
        return (
          x.date === tx.date &&
          x.accountId === tx.accountId &&
          Number(x.amount) === amount &&
          x.categoryId === tx.categoryId &&
          normaliseMerchant(x.merchant) === merchant
        );
      }) || null
    );
  }

  function moneyTransaction(tx, opts) {
    if (!tx || typeof tx !== "object") {
      throw new Error("moneyTransaction expects an object");
    }
    if (!tx.date) {
      throw new Error("moneyTransaction requires a date");
    }

    const options = opts || {};

    // Off by default: manual entry writes without being blocked. The voice
    // confirm screen is the caller that will opt in.
    if (options.checkDuplicate === true) {
      const duplicate = findDuplicateTransaction(tx);
      if (duplicate) {
        return { status: "duplicate", existing: duplicate, entity: null };
      }
    }

    const all = (db().getCollection("moneyTransactions") || []).filter(Boolean);
    const existing = tx.id
      ? all.find((x) => x && x.id === tx.id) || null
      : null;
    const now = db().nowISO();

    const entity = {
      date: tx.date,
      accountId: tx.accountId,
      amount: Number(tx.amount),
      categoryId: tx.categoryId,
      essentiality: tx.essentiality === "essential" ? "essential" : "optional",
      merchant: String(tx.merchant || "").trim(),
      note: String(tx.note || "").trim(),
      createdAt: existing ? existing.createdAt || now : tx.createdAt || now,
      updatedAt: now,
    };

    // Carried only when supplied, so ordinary spends stay free of the flag.
    if (has(tx, "isPayday")) {
      entity.isPayday = tx.isPayday;
    }
    if (tx.id) {
      entity.id = tx.id;
    }

    return { status: "written", existing: null, entity: db().upsert("moneyTransactions", entity) };
  }

  /* -------------------------
     foods
     The food library. Nutrition is per 100 g of the food in the state it is
     weighed in; the collection comment in db.js is the full convention.

     Two things differ from the writers above. The id is supplied by the
     caller rather than derived, because a stable slug is the whole point of
     this collection, so the naming contract is enforced here, in the one
     place that can guarantee it. And the per-100 g nutrition is required on
     create: a food missing it is not usable by anything that computes a meal,
     so it is refused rather than stored half-built with zeros standing in for
     unknowns.
     ------------------------- */

  const FOOD_ID_PATTERN = /^food_[a-z0-9_]+$/;

  const FOOD_REQUIRED = ["kcal", "protein", "carbs", "fat", "sugar"];

  // Absent means unknown, never zero, so these are carried only when supplied.
  const FOOD_OPTIONAL = ["satFat", "fibre", "salt"];

  function foodNumber(value, field, id) {
    // Number("") and Number(null) are both 0, so an unchecked coerce is how a
    // blank cell becomes a stored reading of zero. Only a real number or a
    // non-blank numeric string counts as a stated value.
    const stated =
      typeof value === "number" ||
      (typeof value === "string" && value.trim() !== "");
    const n = stated ? Number(value) : NaN;

    if (!Number.isFinite(n)) {
      throw new Error(`food ${id} has a non-numeric ${field}`);
    }
    if (n < 0) {
      throw new Error(`food ${id} has a negative ${field}`);
    }
    return n;
  }

  function food(patch) {
    if (!patch || typeof patch !== "object") {
      throw new Error("food expects an object patch");
    }

    const id = patch.id;
    if (typeof id !== "string" || !FOOD_ID_PATTERN.test(id)) {
      throw new Error(
        `food requires a stable id of the form food_<slug>, got ${JSON.stringify(
          id
        )}`
      );
    }

    const all = (db().getCollection("foods") || []).filter(Boolean);
    const existing = all.find((x) => x && x.id === id) || null;
    const now = db().nowISO();

    const name = has(patch, "name")
      ? String(patch.name || "").trim()
      : existing
      ? existing.name
      : "";
    if (!name) {
      throw new Error(`food ${id} requires a name`);
    }

    const entity = {
      id,
      name,
      createdAt: existing ? existing.createdAt || now : now,
      updatedAt: now,
    };

    // Merge semantics still apply, so an update that only moves kcal keeps the
    // rest, but a new food must state all five.
    FOOD_REQUIRED.forEach((field) => {
      if (has(patch, field)) {
        entity[field] = foodNumber(patch[field], field, id);
        return;
      }
      if (existing && has(existing, field)) {
        entity[field] = existing[field];
        return;
      }
      throw new Error(`food ${id} requires ${field} for a new entry`);
    });

    // A key never supplied stays absent, which is what makes "blank means
    // unknown" survive a round trip. null clears one that was there.
    FOOD_OPTIONAL.forEach((field) => {
      if (has(patch, field)) {
        if (patch[field] === null) return;
        entity[field] = foodNumber(patch[field], field, id);
        return;
      }
      if (existing && has(existing, field)) {
        entity[field] = existing[field];
      }
    });

    // The countable unit is a pair or it is nothing: a unitName without
    // unitGrams cannot resolve "a packet" to a weight. Clearing either clears
    // both, for the same reason.
    const clearingUnit =
      (has(patch, "unitName") && patch.unitName === null) ||
      (has(patch, "unitGrams") && patch.unitGrams === null);

    if (!clearingUnit) {
      const unitName = has(patch, "unitName")
        ? patch.unitName
        : existing
        ? existing.unitName
        : undefined;
      const unitGrams = has(patch, "unitGrams")
        ? patch.unitGrams
        : existing
        ? existing.unitGrams
        : undefined;

      const hasName = unitName !== undefined;
      const hasGrams = unitGrams !== undefined;

      if (hasName !== hasGrams) {
        throw new Error(
          `food ${id} needs unitName and unitGrams together, or neither`
        );
      }

      if (hasName) {
        const trimmed = String(unitName).trim();
        if (!trimmed) {
          throw new Error(`food ${id} has an empty unitName`);
        }
        const grams = foodNumber(unitGrams, "unitGrams", id);
        if (grams <= 0) {
          throw new Error(`food ${id} has a unitGrams of ${grams}`);
        }
        entity.unitName = trimmed;
        entity.unitGrams = grams;
      }
    }

    return db().upsert("foods", entity);
  }

  /* -------------------------
     mealTemplates
     A meal template is a recipe, not a logged event: it is live and editable,
     and nothing stored here is history.

     Nutrition arrives one of two ways. A template with components derives its
     nutrition from the food library; a template without them keeps the
     hand-entered numbers it was built with. Either way the derived or entered
     values land in the same calories, protein, carbs, fat and sugar fields, so
     a reader never has to know which kind it is holding. nutritionSource says
     which it was for anything that wants to show its working.

     components are stated PER SINGLE SERVING, in grams, matching the sheet's
     gramsPerServing. Food nutrition is per 100 g, so a component contributes
     grams/100 of each of its values.

     Derived nutrition is a snapshot of the library at write time, not a live
     link. Editing a food does not silently move an existing template; the
     template moves when it is next written. What was already LOGGED never
     moves at all, which is the diet log writer's job.
     ------------------------- */

  const MEAL_ID_PATTERN = /^meal_[a-z0-9_]+$/;

  // Left of each pair is the meal field, right is the food field it comes
  // from. Only kcal is renamed: a meal has always called it calories.
  const MEAL_DERIVED_REQUIRED = Object.freeze([
    Object.freeze(["calories", "kcal"]),
    Object.freeze(["protein", "protein"]),
    Object.freeze(["carbs", "carbs"]),
    Object.freeze(["fat", "fat"]),
    Object.freeze(["sugar", "sugar"]),
  ]);

  // Same absent-means-unknown rule as foods, one level up.
  const MEAL_DERIVED_OPTIONAL = Object.freeze(["satFat", "fibre", "salt"]);

  const MEAL_MANUAL_REQUIRED = Object.freeze(["calories", "protein"]);

  const MEAL_MANUAL_OPTIONAL = Object.freeze(["carbs", "fat", "sugar"]);

  function roundTo(value, places) {
    const factor = Math.pow(10, places);
    return Math.round(value * factor) / factor;
  }

  // The same rule as foodNumber: a blank cell must never coerce to a stored
  // zero. Kept separate rather than shared so the food writer's messages stay
  // exactly as shipped and verified.
  function mealNumber(value, field, id) {
    const stated =
      typeof value === "number" ||
      (typeof value === "string" && value.trim() !== "");
    const n = stated ? Number(value) : NaN;

    if (!Number.isFinite(n)) {
      throw new Error(`mealTemplate ${id} has a non-numeric ${field}`);
    }
    if (n < 0) {
      throw new Error(`mealTemplate ${id} has a negative ${field}`);
    }
    return n;
  }

  function foodsById() {
    const all = (db().getCollection("foods") || []).filter(Boolean);
    const map = new Map();
    all.forEach(function (f) {
      if (f && f.id) map.set(f.id, f);
    });
    return map;
  }

  function normaliseComponents(list, id) {
    if (!Array.isArray(list)) {
      throw new Error(`mealTemplate ${id} components must be an array`);
    }
    if (list.length === 0) {
      throw new Error(
        `mealTemplate ${id} has an empty components array; omit components ` +
          `or pass null to use hand-entered numbers`
      );
    }

    const known = foodsById();

    return list.map(function (component, index) {
      const where = `${id} component ${index + 1}`;

      if (!component || typeof component !== "object") {
        throw new Error(`mealTemplate ${where} is not an object`);
      }

      const foodId = component.foodId;
      if (typeof foodId !== "string" || !FOOD_ID_PATTERN.test(foodId)) {
        throw new Error(
          `mealTemplate ${where} has an invalid foodId ${JSON.stringify(foodId)}`
        );
      }

      // Refused rather than stored with a hole. A meal that silently drops a
      // component under-reports every serving of it, for as long as it exists.
      if (!known.has(foodId)) {
        throw new Error(
          `mealTemplate ${where} names ${foodId}, which is not in the food library`
        );
      }

      const grams = mealNumber(component.grams, `${where} grams`, id);
      if (grams <= 0) {
        throw new Error(`mealTemplate ${where} has a grams of ${grams}`);
      }

      return { foodId: foodId, grams: grams };
    });
  }

  /* -------------------------
     deriveMealNutrition
     Pure given the food library: components in, one serving's nutrition out.
     Shared on purpose. The meal writer derives a template's stored nutrition
     with it and the diet log writer freezes a logged item's snapshot with it,
     so the two can never drift into computing the same meal differently.
     ------------------------- */

  function deriveMealNutrition(components, opts) {
    const options = opts || {};
    const byId = options.foods || foodsById();
    const list = Array.isArray(components) ? components : [];

    const totals = { calories: 0, protein: 0, carbs: 0, fat: 0, sugar: 0 };
    const optional = { satFat: 0, fibre: 0, salt: 0 };
    const optionalKnown = { satFat: true, fibre: true, salt: true };

    list.forEach(function (component) {
      const item = byId.get(component.foodId);
      if (!item) {
        throw new Error(
          `meal component names ${component.foodId}, which is not in the food library`
        );
      }

      const share = Number(component.grams) / 100;

      MEAL_DERIVED_REQUIRED.forEach(function (pair) {
        totals[pair[0]] += (Number(item[pair[1]]) || 0) * share;
      });

      // One silent component poisons the sum for that field, so the field is
      // dropped rather than published as a total that quietly counted an
      // unknown as a zero.
      MEAL_DERIVED_OPTIONAL.forEach(function (field) {
        if (!has(item, field)) {
          optionalKnown[field] = false;
          return;
        }
        optional[field] += (Number(item[field]) || 0) * share;
      });
    });

    // kcal whole, macros to one decimal, which is the spreadsheet's own
    // convention and keeps a derived meal readable next to a typed one.
    const nutrition = {
      calories: Math.round(totals.calories),
      protein: roundTo(totals.protein, 1),
      carbs: roundTo(totals.carbs, 1),
      fat: roundTo(totals.fat, 1),
      sugar: roundTo(totals.sugar, 1),
    };

    const unknown = [];
    MEAL_DERIVED_OPTIONAL.forEach(function (field) {
      if (list.length > 0 && optionalKnown[field]) {
        nutrition[field] = roundTo(optional[field], 1);
        return;
      }
      unknown.push(field);
    });

    return { nutrition: nutrition, unknown: unknown };
  }

  function mealTemplate(patch) {
    if (!patch || typeof patch !== "object") {
      throw new Error("mealTemplate expects an object patch");
    }

    // Unlike a food, a meal can legitimately be created in the app with no
    // stable id of its own, so one is minted when none is supplied. An id that
    // IS supplied is held to the naming contract, which is what lets the
    // spreadsheet's meal_1 to meal_7 stay stable across a re-import.
    let id = patch.id;
    if (id === undefined || id === null || id === "") {
      id = db().makeId("meal");
    } else if (typeof id !== "string" || !MEAL_ID_PATTERN.test(id)) {
      throw new Error(
        `mealTemplate requires an id of the form meal_<slug>, got ${JSON.stringify(
          patch.id
        )}`
      );
    }

    const all = (db().getCollection("mealTemplates") || []).filter(Boolean);
    const existing = all.find((x) => x && x.id === id) || null;
    const now = db().nowISO();

    const name = has(patch, "name")
      ? String(patch.name || "").trim()
      : existing
      ? existing.name
      : "";
    if (!name) {
      throw new Error(`mealTemplate ${id} requires a name`);
    }

    const entity = {
      id,
      name,
      createdAt: existing ? existing.createdAt || now : now,
      updatedAt: now,
    };

    // Supplied replaces, null clears back to hand-entered numbers, omitted
    // keeps whatever is stored. An existing array is already normalised.
    let components;
    if (has(patch, "components")) {
      components =
        patch.components === null ? null : normaliseComponents(patch.components, id);
    } else {
      components =
        existing && Array.isArray(existing.components) ? existing.components : null;
    }

    if (components) {
      entity.components = components;
      entity.nutritionSource = "components";

      const derived = deriveMealNutrition(components);
      Object.keys(derived.nutrition).forEach(function (field) {
        entity[field] = derived.nutrition[field];
      });
    } else {
      entity.nutritionSource = "manual";

      // Merge semantics, so an edit that only moves protein keeps the rest,
      // but a new hand-entered meal has to state what it is worth.
      MEAL_MANUAL_REQUIRED.forEach(function (field) {
        if (has(patch, field)) {
          entity[field] = mealNumber(patch[field], field, id);
          return;
        }
        if (existing && has(existing, field)) {
          entity[field] = existing[field];
          return;
        }
        throw new Error(
          `mealTemplate ${id} requires ${field} when it has no components`
        );
      });

      MEAL_MANUAL_OPTIONAL.forEach(function (field) {
        if (has(patch, field)) {
          if (patch[field] === null) return;
          entity[field] = mealNumber(patch[field], field, id);
          return;
        }
        if (existing && has(existing, field)) {
          entity[field] = existing[field];
        }
      });
    }

    // Free-text and structured ingredient notes are carried either way: a
    // components meal can still hold the prose it was written from. Stored as
    // given beyond the array check, because the ingredient builder owns that
    // shape and this writer is not the place to redefine it.
    if (has(patch, "ingredients")) {
      if (patch.ingredients !== null) {
        if (!Array.isArray(patch.ingredients)) {
          throw new Error(`mealTemplate ${id} ingredients must be an array`);
        }
        entity.ingredients = patch.ingredients.filter(Boolean);
      }
    } else if (existing && has(existing, "ingredients")) {
      entity.ingredients = existing.ingredients;
    }

    if (has(patch, "ingredientsText")) {
      if (patch.ingredientsText !== null) {
        entity.ingredientsText = String(patch.ingredientsText || "");
      }
    } else if (existing && has(existing, "ingredientsText")) {
      entity.ingredientsText = existing.ingredientsText;
    }

    return db().upsert("mealTemplates", entity);
  }

  /* -------------------------
     dietLogs
     One record per day, id is diet_<date>. This writer pins the rule that used
     to live, differently, in each caller.

     ITEMS ARE THE TRUTH. totals are derived from items on every single write
     and a totals passed in by a caller is ignored, because there is no way to
     state a total that disagrees with the items and have it stored. That is
     what dissolves the old accumulate-versus-replace split: quick-log appends
     an item and derives, the Log tab replaces the items and derives, and both
     run this same code. Neither adds to yesterday's number to get today's.

     LOGGED MEALS ARE FROZEN. A new item is stamped with snapshot.perServing,
     what one serving of that meal was worth at the moment it was logged, and
     that is never recomputed. The day's totals apply the item's servings to
     it, so correcting a miscount rescales frozen numbers instead of re-reading
     the library, and the two facts stay separate: what a serving was worth is
     history, how many you ate is a detail of the event you may fix. Editing a
     food or a meal template afterwards cannot move a meal you have already
     eaten. The library is live, the log is history.

     LEGACY ITEMS ARE NEVER BACKFILLED. An item logged before snapshots existed
     has none, and the writer refuses to stamp one, because a snapshot invented
     today from today's corrected library would be a retroactive rewrite
     wearing the costume of a record. That holds even when you edit such an
     item, since a carried item is identified by when it was logged and not by
     its contents. Those items are resolved live instead, and dietLogTotals
     reports them as legacy so a screen can say so. The absence of snapshot IS
     the marker, exactly as an absent fibre on a food means unknown rather
     than zero.

     A RECORDED TOTAL ON A PAST DAY IS ITSELF A FACT. Refusing to stamp an item
     and then overwriting the day's stored totals with a live recomputation
     would rewrite the record by the other door: after a library correction,
     every pre-snapshot day would silently restate itself the moment it was
     opened and resubmitted. So when a write leaves the items deeply identical
     to what is already stored AND any of them predates snapshots, the stored
     totals are kept verbatim and the metrics are left alone. Change an item,
     add one or remove one, and derivation resumes from that point, because
     then you are deliberately editing that day rather than merely opening it.
     The kept number is always the one that was recorded, never one invented
     now, so this preserves history rather than backfilling it.

     The consequence, stated rather than hidden: a legacy day that never had
     its diet metrics written keeps not having them until you actually edit it.
     Filling that gap is a deliberate repair, and belongs in a visible one-time
     tool like the finance sign review, not silently inside a writer.

     The two diet metrics are emitted here rather than by callers. They are a
     projection of these totals, and leaving them to each caller is precisely
     how they drifted apart in the first place.
     ------------------------- */

  const DIET_CAL_METRIC = "diet_calories_kcal";
  const DIET_PRO_METRIC = "diet_protein_g";

  const DIET_NUTRITION_FIELDS = Object.freeze([
    "calories",
    "protein",
    "carbs",
    "fat",
    "sugar",
  ]);

  function templatesById() {
    const all = (db().getCollection("mealTemplates") || []).filter(Boolean);
    const map = new Map();
    all.forEach(function (t) {
      if (t && t.id) map.set(t.id, t);
    });
    return map;
  }

  // A missing or unusable servings is one serving, which is what every caller
  // already assumes when it logs a meal with one tap.
  function servingsOf(item) {
    const n = Number(item && item.servings);
    return Number.isFinite(n) && n > 0 ? n : 1;
  }

  function addNutrition(target, source, multiplier) {
    if (!source || typeof source !== "object") return;
    DIET_NUTRITION_FIELDS.forEach(function (field) {
      target[field] += (Number(source[field]) || 0) * multiplier;
    });
  }

  // Identity of a logged item, used only to tell an item that is already in
  // storage from one being logged now. Items carry no id of their own, so this
  // is createdAt, the moment of the tap that logged it.
  //
  // Deliberately NOT the item's contents. Correcting how many servings you ate
  // does not make it a different meal, and an item identified by its contents
  // would stop matching itself the moment it was edited, be filed as new, and
  // get stamped with a snapshot dated today for a meal eaten months ago. That
  // is the backfill this writer refuses, reached through an edit instead of a
  // resubmit. The structural fallback covers a stored item old enough to have
  // no createdAt at all.
  function dietItemIdentity(item) {
    if (item.createdAt) return `at:${item.createdAt}`;

    return `shape:${JSON.stringify({
      slotId: item.slotId ?? null,
      templateId: item.templateId ?? null,
      servings: item.servings ?? null,
      source: item.source ?? null,
      customMeal: item.customMeal
        ? item.customMeal.id ?? item.customMeal.name ?? null
        : null,
    })}`;
  }

  // A multiset, so logging the same meal twice in the same millisecond still
  // counts as one carried item and one new one rather than two carried.
  function countByIdentity(items) {
    const counts = new Map();
    (Array.isArray(items) ? items : []).forEach(function (item) {
      if (!item || typeof item !== "object") return;
      const key = dietItemIdentity(item);
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }

  // A real structural comparison, because this predicate is what decides
  // whether a past day's recorded total is preserved or overwritten. A shallow
  // or reference check would be wrong in both directions at once: carried
  // items are fresh objects after a JSON round trip through storage, so
  // reference equality would call an untouched day changed and restate it,
  // while a shallow check would call an edited servings unchanged and keep a
  // total that no longer matches its items. Key order is ignored because it
  // carries no meaning; array order is not, because a reordered list is a
  // different list.
  function deepEqual(a, b) {
    if (a === b) return true;

    if (a === null || b === null) return false;
    if (typeof a !== "object" || typeof b !== "object") {
      // Only reachable for two different primitives, or NaN against itself.
      return a !== a && b !== b;
    }

    const aIsArray = Array.isArray(a);
    if (aIsArray !== Array.isArray(b)) return false;

    if (aIsArray) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!deepEqual(a[i], b[i])) return false;
      }
      return true;
    }

    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;

    for (let i = 0; i < aKeys.length; i++) {
      const key = aKeys[i];
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
      if (!deepEqual(a[key], b[key])) return false;
    }
    return true;
  }

  // What is frozen is ONE SERVING, not the multiplied total. What was true at
  // log time is what a serving of that meal was worth; how many you ate is a
  // separate fact about the event and stays editable. Correcting a miscount
  // therefore rescales frozen numbers and never reads the library again, so a
  // correction cannot drag today's values onto a past meal, and no rounding
  // drifts from dividing an already rounded total back down.
  function buildSnapshot(item, byId) {
    // A custom meal carries its own numbers, so it is its own source.
    const source = item.customMeal ? item.customMeal : byId.get(item.templateId);
    if (!source || typeof source !== "object") return null;

    const perServing = {};
    DIET_NUTRITION_FIELDS.forEach(function (field) {
      // Absent stays absent. A custom meal with no carbs stated is unknown,
      // not zero, and a snapshot must not invent the difference.
      if (!has(source, field) || source[field] === undefined) return;
      const value = Number(source[field]) || 0;
      perServing[field] =
        field === "calories" ? Math.round(value) : roundTo(value, 1);
    });

    if (!has(perServing, "calories") && !has(perServing, "protein")) return null;

    return {
      perServing: perServing,
      name: String(source.name || "").trim(),
      source: item.customMeal ? "custom" : source.nutritionSource || "manual",
    };
  }

  /* -------------------------
     dietLogTotals
     Pure: items in, the day's totals out, plus a per-item account of where
     each number came from. Shared so a screen can total a day exactly the way
     the writer does, without a second implementation to drift.

     sources entries, in order: "snapshot" (frozen at log time, the normal
     case), "legacy-custom" and "legacy-template" (logged before snapshots, so
     resolved live now), "unresolved" (nothing left to resolve against, counts
     as nothing and says so).
     ------------------------- */

  function dietLogTotals(items, opts) {
    const options = opts || {};
    const byId = options.templates || templatesById();
    const list = Array.isArray(items) ? items : [];

    const totals = { calories: 0, protein: 0, carbs: 0, fat: 0, sugar: 0 };
    const sources = [];

    list.forEach(function (item) {
      if (!item || typeof item !== "object") {
        sources.push("unresolved");
        return;
      }

      if (item.snapshot && typeof item.snapshot.perServing === "object") {
        // Frozen per serving, so the count is applied here and an edited
        // count rescales the frozen numbers rather than re-reading the
        // library.
        addNutrition(totals, item.snapshot.perServing, servingsOf(item));
        sources.push("snapshot");
        return;
      }

      if (item.customMeal) {
        // Reproduces the old behaviour exactly, servings deliberately not
        // applied, because these items were totalled that way when they were
        // logged and a legacy custom meal is always one serving anyway.
        addNutrition(totals, item.customMeal, 1);
        sources.push("legacy-custom");
        return;
      }

      const template = byId.get(item.templateId);
      if (!template) {
        sources.push("unresolved");
        return;
      }

      addNutrition(totals, template, servingsOf(item));
      sources.push("legacy-template");
    });

    return {
      totals: {
        calories: Math.round(totals.calories),
        protein: Math.round(totals.protein),
        carbs: Math.round(totals.carbs),
        fat: Math.round(totals.fat),
        sugar: Math.round(totals.sugar),
      },
      sources: sources,
    };
  }

  function dietLog(patch) {
    if (!patch || typeof patch !== "object") {
      throw new Error("dietLog expects an object patch");
    }

    const date = patch.date;
    if (!date) {
      throw new Error("dietLog requires a date");
    }

    const existing = findByDate("dietLogs", date);
    const now = db().nowISO();

    const goal = has(patch, "goal")
      ? String(patch.goal || "")
      : existing
      ? existing.goal || ""
      : "";

    let incoming;
    if (has(patch, "items")) {
      if (!Array.isArray(patch.items)) {
        throw new Error("dietLog items must be an array");
      }
      incoming = patch.items;
    } else {
      incoming = existing && Array.isArray(existing.items) ? existing.items : [];
    }

    const byId = templatesById();
    const storedItems =
      existing && Array.isArray(existing.items) ? existing.items : [];

    // Only the stored items that LACK a snapshot, because that is the only
    // question this map answers: is this one of the day's pre-snapshot items?
    // An already frozen item never reaches the lookup, it returns earlier.
    //
    // Counting frozen items here too would be an active bug, not dead weight:
    // two meals logged in the same millisecond share a createdAt, so a new
    // item could match a stored frozen one, be mistaken for something already
    // on the day, and never get its own snapshot. Taps are seconds apart, but
    // a batch commit of several meals at once is not, and that is exactly what
    // the voice layer will do.
    const carried = countByIdentity(
      storedItems.filter(function (item) {
        return !(item && item.snapshot);
      })
    );

    const items = incoming.map(function (item) {
      if (!item || typeof item !== "object") return item;

      // Already frozen. Nothing recomputes it, ever. An edited servings is
      // applied to the frozen per-serving numbers at totalling time.
      if (item.snapshot && typeof item.snapshot.perServing === "object") {
        return item;
      }

      // Already in storage without a snapshot, so it predates snapshots and is
      // left exactly as it was found, however it has since been edited. This
      // is the no-backfill rule.
      const key = dietItemIdentity(item);
      const seen = carried.get(key) || 0;
      if (seen > 0) {
        carried.set(key, seen - 1);
        return item;
      }

      // New, so freeze what one serving of it is worth right now.
      const frozen = buildSnapshot(item, byId);
      if (!frozen) {
        // Nothing to freeze against, most likely a deleted template. Stored as
        // it came rather than refused, so one bad row never blocks the day's
        // log, and dietLogTotals reports it as unresolved.
        return item;
      }

      return {
        ...item,
        snapshot: {
          perServing: frozen.perServing,
          at: now,
          name: frozen.name,
          source: frozen.source,
        },
      };
    });

    const derived = dietLogTotals(items, { templates: byId });

    // The narrow exception. Both halves are required: untouched items alone
    // are not enough, because a day made entirely of snapshots derives to the
    // same numbers anyway, and a legacy item alone is not enough, because an
    // edited day must follow its items wherever they now lead.
    const preserving =
      !!existing &&
      !!existing.totals &&
      typeof existing.totals === "object" &&
      items.some(function (item) {
        return !(item && item.snapshot);
      }) &&
      deepEqual(items, storedItems);

    const stored = db().upsert("dietLogs", {
      id: `diet_${date}`,
      date,
      goal,
      items,
      totals: preserving ? existing.totals : derived.totals,
      createdAt: existing ? existing.createdAt || now : now,
      updatedAt: now,
    });

    // The projection, written from the same derived totals every caller now
    // gets. Through the canonical writer, never a direct upsert. Skipped
    // entirely on a preserving write: that day's metrics are as much a part of
    // the record as its totals, and this write did not change the day.
    if (!preserving) {
      metricEntry({ metricId: DIET_CAL_METRIC, date, value: derived.totals.calories });
      metricEntry({ metricId: DIET_PRO_METRIC, date, value: derived.totals.protein });
    }

    return stored;
  }

  /* -------------------------
     addDietLogItem
     The append half, for quick-log. Read, add one, write, derive. It exists so
     no caller has to hand-roll the read-modify-write and get it subtly wrong,
     which is exactly what today.js did by adding to the previous metric value
     instead of totalling the items.
     ------------------------- */

  function addDietLogItem(date, item, patch) {
    if (!date) {
      throw new Error("addDietLogItem requires a date");
    }
    if (!item || typeof item !== "object") {
      throw new Error("addDietLogItem expects an item object");
    }

    const existing = findByDate("dietLogs", date);
    const items =
      existing && Array.isArray(existing.items) ? existing.items.slice() : [];

    // A caller-supplied createdAt wins, so an item logged against an earlier
    // moment keeps it.
    items.push({ createdAt: db().nowISO(), ...item });

    const rest = patch && typeof patch === "object" ? patch : {};
    return dietLog({ ...rest, date, items });
  }

  global.LifeOSWrite = {
    workLog,
    metricEntry,
    moneyTransaction,
    findDuplicateTransaction,
    food,
    mealTemplate,
    deriveMealNutrition,
    dietLog,
    addDietLogItem,
    dietLogTotals,
  };
})(window);
