// workouts.js
// All of this is editable without touching app logic.

window.WORKOUT_CONFIG = {
  settings: {
    // After this many completed sessions without logging a rest day,
    // the app will strongly recommend a rest day (never mandatory).
    restRecommendAfterConsecutiveSessions: 4,

    // If true, Upper C is offered after Lower B.
    offerUpperC: true,
  },

  // Session loop order (Upper C is handled as optional after Lower B)
  cycle: ["upper_a", "lower_a", "upper_b", "lower_b"],

  // Patterns are the "thing you progress"
  patterns: [
    { id: "incline_press", name: "Incline Press" },
    { id: "horizontal_pull", name: "Horizontal Pull" },
    { id: "vertical_pull", name: "Vertical Pull" },
    { id: "lateral_raise", name: "Lateral Raise" },
    { id: "rear_delt", name: "Rear Delt / Face Pull" },
    { id: "vertical_press", name: "Vertical Press" },
    { id: "triceps", name: "Triceps" },
    { id: "biceps", name: "Biceps" },
    { id: "knee_dominant", name: "Knee-Dominant (Quads)" },
    { id: "single_leg_quad", name: "Single-Leg Quads" },
    { id: "hip_hinge", name: "Hip Hinge" },
    { id: "glute_unilateral", name: "Glute-Biased Unilateral" },
    { id: "hamstring_accessory", name: "Hamstring Accessory" },
    { id: "calves", name: "Calves" },
    { id: "core", name: "Core (Abs)" },
  ],

  // Variants: what you select on the day
  variantsByPattern: {
    incline_press: [
      { name: "Smith Incline Press", tags: ["apartment"] },
      { name: "DB Incline Press", tags: ["commercial"] },
      { name: "Machine Incline Press", tags: ["commercial"] },
      { name: "Weighted Push-ups (Vest)", tags: ["apartment"] },
    ],
    horizontal_pull: [
      { name: "Seated Cable Row", tags: ["apartment", "commercial"] },
      { name: "Single-Arm Cable Row", tags: ["apartment", "commercial"] },
      { name: "Chest-Supported DB Row", tags: ["commercial"] },
      { name: "Smith Inverted Row", tags: ["apartment"] },
    ],
    vertical_pull: [
      { name: "Pull-ups (BW)", tags: ["apartment", "commercial"] },
      { name: "Weighted Pull-ups (Vest)", tags: ["apartment", "commercial"] },
      { name: "Neutral-Grip Pull-ups", tags: ["apartment", "commercial"] },
      { name: "Lat Pulldown", tags: ["commercial"] },
    ],
    lateral_raise: [
      { name: "Cable Lateral Raise", tags: ["apartment", "commercial"] },
      { name: "Leaning DB Lateral Raise", tags: ["apartment", "commercial"] },
      { name: "DB Lateral Raise", tags: ["apartment", "commercial"] },
      { name: "Band Lateral Raise", tags: ["home", "apartment"] },
    ],
    rear_delt: [
      { name: "Face Pulls (Cable)", tags: ["apartment", "commercial"] },
      { name: "Reverse Cable Fly", tags: ["apartment", "commercial"] },
      { name: "Chest-Supported Rear Delt Fly", tags: ["commercial"] },
    ],
    vertical_press: [
      { name: "DB Shoulder Press", tags: ["apartment", "commercial"] },
      { name: "Smith Shoulder Press", tags: ["apartment"] },
      { name: "Machine Shoulder Press", tags: ["commercial"] },
    ],
    triceps: [
      { name: "Cable Pushdown (Bar)", tags: ["apartment", "commercial"] },
      { name: "Cable Pushdown (Rope)", tags: ["apartment", "commercial"] },
      { name: "Reverse-Grip Pushdown", tags: ["apartment", "commercial"] },
      { name: "Close-Grip Smith Press", tags: ["apartment"] },
    ],
    biceps: [
      { name: "Incline DB Curl", tags: ["commercial"] },
      { name: "Cable Curl", tags: ["apartment", "commercial"] },
      { name: "Bayesian Cable Curl", tags: ["apartment", "commercial"] },
      { name: "Short Barbell Curl", tags: ["apartment", "commercial"] },
      { name: "Hammer Curl", tags: ["apartment", "commercial"] },
    ],
    knee_dominant: [
      { name: "Hack Squat", tags: ["commercial"] },
      { name: "Leg Press", tags: ["commercial"] },
      { name: "Smith Squat", tags: ["apartment"] },
      { name: "Bulgarian Split Squat (DB/Vest)", tags: ["apartment", "commercial"] },
    ],
    single_leg_quad: [
      { name: "Bulgarian Split Squat", tags: ["apartment", "commercial"] },
      { name: "Reverse Lunge", tags: ["apartment", "commercial"] },
      { name: "Heel-Elevated Goblet Squat", tags: ["apartment", "commercial"] },
      { name: "Step-ups", tags: ["apartment", "commercial"] },
    ],
    hip_hinge: [
      { name: "DB Romanian Deadlift", tags: ["apartment", "commercial"] },
      { name: "Smith Romanian Deadlift", tags: ["apartment"] },
      { name: "Barbell Romanian Deadlift", tags: ["commercial"] },
      { name: "Hip Thrust (Smith/Barbell)", tags: ["apartment", "commercial"] },
    ],
    glute_unilateral: [
      { name: "Reverse Lunge", tags: ["apartment", "commercial"] },
      { name: "Bulgarian Split Squat (Glute-lean)", tags: ["apartment", "commercial"] },
      { name: "Step-ups (High)", tags: ["apartment", "commercial"] },
      { name: "Walking Lunges (DB/Vest)", tags: ["apartment", "commercial"] },
    ],
    hamstring_accessory: [
      { name: "Cable Hamstring Curl (Heel Cuff)", tags: ["apartment", "commercial"] },
      { name: "Sliding Leg Curl (Towel/Slider)", tags: ["home", "apartment"] },
      { name: "Stability Ball Leg Curl", tags: ["home"] },
      { name: "Nordic Negatives", tags: ["home", "commercial"] },
    ],
    calves: [
      { name: "Smith Standing Calf Raise", tags: ["apartment"] },
      { name: "Single-Leg DB Calf Raise", tags: ["apartment", "commercial"] },
      { name: "Seated Calf Raise (DB on knee)", tags: ["apartment", "commercial"] },
      { name: "Step-edge Calf Raise (slow)", tags: ["apartment", "commercial"] },
    ],
    core: [
      { name: "Weighted Cable Crunch (Kneeling)", tags: ["apartment", "commercial"] },
      { name: "Hanging Knee Raise", tags: ["apartment", "commercial"] },
      { name: "Reverse Crunch", tags: ["home", "apartment"] },
    ],
  },

  // Workout templates: patterns + sets/rep ranges, plus a short label.
  // IMPORTANT: Every item has a stable exerciseId so history never breaks when you reorder/insert/remove slots.
  templates: {
    upper_a: {
      name: "Upper A — Chest & Delts",
      items: [
        { exerciseId: "upper_a_incline_press", patternId: "incline_press", sets: 4, repMin: 6, repMax: 10, core: true },
        { exerciseId: "upper_a_horizontal_pull", patternId: "horizontal_pull", sets: 3, repMin: 8, repMax: 12, core: true },
        { exerciseId: "upper_a_lateral_raise", patternId: "lateral_raise", sets: 5, repMin: 12, repMax: 20, core: true },
        { exerciseId: "upper_a_vertical_press", patternId: "vertical_press", sets: 3, repMin: 8, repMax: 12, core: false },
        { exerciseId: "upper_a_triceps", patternId: "triceps", sets: 3, repMin: 10, repMax: 15, core: true },
        { exerciseId: "upper_a_biceps", patternId: "biceps", sets: 2, repMin: 10, repMax: 15, core: false },
      ],
    },

    lower_a: {
      name: "Lower A — Quad Bias",
      items: [
        { exerciseId: "lower_a_knee_dominant", patternId: "knee_dominant", sets: 4, repMin: 6, repMax: 10, core: true },
        { exerciseId: "lower_a_single_leg_quad", patternId: "single_leg_quad", sets: 3, repMin: 8, repMax: 12, core: true },
        { exerciseId: "lower_a_hip_hinge", patternId: "hip_hinge", sets: 3, repMin: 8, repMax: 12, core: false },
        { exerciseId: "lower_a_calves", patternId: "calves", sets: 4, repMin: 10, repMax: 20, core: true },
        { exerciseId: "lower_a_core", patternId: "core", sets: 3, repMin: 8, repMax: 12, core: true },
      ],
    },

    upper_b: {
      name: "Upper B — Back Width & Arms",
      items: [
        { exerciseId: "upper_b_vertical_pull", patternId: "vertical_pull", sets: 4, repMin: 6, repMax: 10, core: true },
        { exerciseId: "upper_b_horizontal_pull", patternId: "horizontal_pull", sets: 3, repMin: 8, repMax: 12, core: true },
        { exerciseId: "upper_b_biceps_main", patternId: "biceps", sets: 4, repMin: 8, repMax: 12, core: true },
        { exerciseId: "upper_b_biceps_pump", patternId: "biceps", sets: 2, repMin: 12, repMax: 15, core: false },
        { exerciseId: "upper_b_triceps", patternId: "triceps", sets: 3, repMin: 10, repMax: 15, core: true },
        { exerciseId: "upper_b_rear_delt", patternId: "rear_delt", sets: 2, repMin: 15, repMax: 20, core: false },
      ],
    },

    lower_b: {
      name: "Lower B — Posterior Chain & Glutes",
      items: [
        { exerciseId: "lower_b_hip_hinge", patternId: "hip_hinge", sets: 4, repMin: 6, repMax: 10, core: true },
        { exerciseId: "lower_b_glute_unilateral", patternId: "glute_unilateral", sets: 3, repMin: 8, repMax: 12, core: true },
        { exerciseId: "lower_b_hamstring_accessory", patternId: "hamstring_accessory", sets: 2, repMin: 10, repMax: 15, core: false },
        { exerciseId: "lower_b_calves", patternId: "calves", sets: 4, repMin: 10, repMax: 20, core: true },
        { exerciseId: "lower_b_core", patternId: "core", sets: 3, repMin: 8, repMax: 12, core: true },
      ],
    },

    upper_c: {
      name: "Upper C (Optional) — Delts & Arms Pump",
      optional: true,
      items: [
        { exerciseId: "upper_c_lateral_raise", patternId: "lateral_raise", sets: 6, repMin: 15, repMax: 25, core: true },
        { exerciseId: "upper_c_biceps", patternId: "biceps", sets: 3, repMin: 10, repMax: 15, core: true },
        { exerciseId: "upper_c_triceps", patternId: "triceps", sets: 3, repMin: 12, repMax: 20, core: true },
        { exerciseId: "upper_c_rear_delt", patternId: "rear_delt", sets: 2, repMin: 15, repMax: 20, core: false },
      ],
    },
  },
};
