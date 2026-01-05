// =====================
// Element references
// =====================
const themeToggle = document.getElementById("themeToggle");
const form = document.getElementById("logForm");
const logFormDock = document.getElementById("logFormDock");
const historyList = document.getElementById("history");
const clearAllBtn = document.getElementById("clearAll");
const backBtn = document.getElementById("backBtn");
const exportDataBtn = document.getElementById("exportDataBtn");
const importDataInput = document.getElementById("importDataInput");
const historyTitle = document.getElementById("historyTitle");
const summaryDiv = document.getElementById("summary");

const patternSelect = document.getElementById("pattern");
const weightInput = document.getElementById("weight");
const repsInput = document.getElementById("reps");

const variantSelect = document.getElementById("variantSelect");
const variantCustomLabel = document.getElementById("variantCustomLabel");
const variantCustom = document.getElementById("variantCustom");

const currentSessionEl = document.getElementById("currentSession");
const completeSessionBtn = document.getElementById("completeSessionBtn");

const logRestDayBtn = document.getElementById("logRestDayBtn");
const restNoticeEl = document.getElementById("restNotice");

const upperCContainer = document.getElementById("upperCContainer");
const startUpperCBtn = document.getElementById("startUpperCBtn");
const skipUpperCBtn = document.getElementById("skipUpperCBtn");

const workoutPlanTitle = document.getElementById("workoutPlanTitle");
const workoutPlanEl = document.getElementById("workoutPlan");

const progressExerciseSelect = document.getElementById("progressExerciseSelect");
const progressSummaryEl = document.getElementById("progressSummary");
const progressTableEl = document.getElementById("progressTable");
const progressVariantSelect = document.getElementById("progressVariantSelect");
const progressChart = document.getElementById("progressChart");
const progressChartHint = document.getElementById("progressChartHint");

const CFG = window.WORKOUT_CONFIG;

// =====================
// Pattern display names
// =====================
const PATTERN_NAMES = {
  incline_press: "Incline Press",
  horizontal_pull: "Horizontal Pull",
  vertical_pull: "Vertical Pull",
  lateral_raise: "Lateral Raise",
  rear_delt: "Rear Delt / Face Pull",
  vertical_press: "Vertical Press",
  triceps: "Triceps",
  biceps: "Biceps",
  knee_dominant: "Knee-Dominant (Quads)",
  single_leg_quad: "Single-Leg Quads",
  hip_hinge: "Hip Hinge",
  glute_unilateral: "Glute-Biased Unilateral",
  hamstring_accessory: "Hamstring Accessory",
  calves: "Calves",
  core: "Core (Abs)",
};

let activePattern = null;
let selectedCardExerciseId = null;
let expandedExerciseIds = new Set(JSON.parse(localStorage.getItem("expandedExerciseIds") || "[]"));

function persistExpanded() {
  localStorage.setItem("expandedExerciseIds", JSON.stringify(Array.from(expandedExerciseIds)));
}

let activeExerciseId = null;
let selectedExerciseIdForLogging = null;

// =====================
// Storage helpers
// =====================
function getLogs() {
  return JSON.parse(localStorage.getItem("logs") || "[]");
}

function saveLogs(logs) {
  localStorage.setItem("logs", JSON.stringify(logs));
}
// =====================
// Backup (Export / Import)
// =====================
function buildExportPayload() {
  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    data: {
      logs: getLogs(),
      restLogs: getRestLogs(),
      sessionState: getSessionState(),
      workoutInstanceId: getWorkoutInstanceId(),

      // UI/UX prefs + expansion state
      expandedExerciseIds: JSON.parse(localStorage.getItem("expandedExerciseIds") || "[]"),
      theme: localStorage.getItem("theme") || "dark",
    },
  };
}

function applyImportedPayload(payload) {
  // Basic validation
  if (!payload || typeof payload !== "object") throw new Error("Invalid file: not an object.");
  if (!payload.data || typeof payload.data !== "object") throw new Error("Invalid file: missing data.");

  const { logs, restLogs, sessionState, workoutInstanceId, expandedExerciseIds, theme } = payload.data;

  if (!Array.isArray(logs)) throw new Error("Invalid file: logs must be an array.");
  if (!Array.isArray(restLogs)) throw new Error("Invalid file: restLogs must be an array.");

  // Write back to storage
  saveLogs(logs);
  saveRestLogs(restLogs);

  if (sessionState && typeof sessionState === "object") {
    saveSessionState(sessionState);
  }

  if (workoutInstanceId != null) {
    localStorage.setItem("workoutInstanceId", String(workoutInstanceId));
  }

  if (Array.isArray(expandedExerciseIds)) {
    localStorage.setItem("expandedExerciseIds", JSON.stringify(expandedExerciseIds));
    expandedExerciseIds = new Set(expandedExerciseIds);
  }

  if (theme === "light" || theme === "dark") {
    localStorage.setItem("theme", theme);
  }
}

// =====================
// Variant helpers
// =====================
function setVariantOptionsForPattern(patternId) {
  variantSelect.innerHTML = "";

  const variants = (CFG.variantsByPattern[patternId] || []).map(v => v.name);

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select a variant...";
  variantSelect.appendChild(placeholder);

  variants.forEach(name => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    variantSelect.appendChild(opt);
  });

  const custom = document.createElement("option");
  custom.value = "__custom__";
  custom.textContent = "Custom...";
  variantSelect.appendChild(custom);

  variantCustomLabel.style.display = "none";
  variantCustom.value = "";
}

function getSelectedVariant() {
  if (variantSelect.value === "__custom__") {
    return (variantCustom.value || "").trim();
  }
  return (variantSelect.value || "").trim();
}

// =====================
// Session helpers
// =====================
function getSessionState() {
  return JSON.parse(
    localStorage.getItem("sessionState") ||
      JSON.stringify({
        index: 0,
        consecutiveSessions: 0,
      })
  );
}

function saveSessionState(state) {
  localStorage.setItem("sessionState", JSON.stringify(state));
}

function getWorkoutInstanceId() {
  return Number(localStorage.getItem("workoutInstanceId") || "1");
}

function incrementWorkoutInstanceId() {
  const next = getWorkoutInstanceId() + 1;
  localStorage.setItem("workoutInstanceId", String(next));
}

function getRestLogs() {
  return JSON.parse(localStorage.getItem("restLogs") || "[]");
}

function saveRestLogs(restLogs) {
  localStorage.setItem("restLogs", JSON.stringify(restLogs));
}

function logRestDay() {
  const state = getSessionState();
  const restLogs = getRestLogs();

  restLogs.push({
    date: new Date().toISOString(),
  });

  // Reset consecutive session counter, but do NOT change session index
  state.consecutiveSessions = 0;

  saveRestLogs(restLogs);
  saveSessionState(state);

  renderRestNotice();
}

function renderRestNotice() {
  const state = getSessionState();
  const threshold = CFG.settings.restRecommendAfterConsecutiveSessions;

  // If user has trained a lot consecutively, recommend rest (but never force)
  if (state.consecutiveSessions >= threshold) {
    restNoticeEl.innerHTML =
      `<p><strong>Recovery check:</strong> You’ve completed ${state.consecutiveSessions} sessions in a row. Consider logging a rest day.</p>`;
    return;
  }

  // Otherwise show last rest day (if any), or nothing
  const restLogs = getRestLogs();
  if (restLogs.length > 0) {
    const last = restLogs[restLogs.length - 1];
    const d = new Date(last.date);
    restNoticeEl.innerHTML =
      `<p style="opacity:0.85;">Last rest day logged: ${d.toLocaleString()}</p>`;
    return;
  }

  restNoticeEl.innerHTML = "";
}

function getCurrentSessionId() {
  const state = getSessionState();
  return CFG.cycle[state.index];
}

function getCurrentSessionName() {
  const id = getCurrentSessionId();
  return CFG.templates[id]?.name || "Unknown Session";
}

// Upper C state helpers
function shouldOfferUpperC() {
  return localStorage.getItem("pendingUpperC") === "true";
}

function showUpperCOption() {
  upperCContainer.style.display = "block";
  completeSessionBtn.style.display = "none";
}

function hideUpperCOption() {
  upperCContainer.style.display = "none";
  completeSessionBtn.style.display = "inline-block";
}

// "Effective" session for rendering plan:
// - if Upper C has started, render Upper C
// - else render the normal current session
function getEffectiveSessionId() {
  const active = localStorage.getItem("activeSessionId");
  if (active) return active;
  return getCurrentSessionId();
}

function renderCurrentSession() {
  const active = localStorage.getItem("activeSessionId");

  // If Upper C is pending and not started, show optional prompt
  if (shouldOfferUpperC() && !active) {
    currentSessionEl.textContent = "Current session: Optional — Upper C";
    showUpperCOption();
    renderWorkoutPlan(); // preview Upper C plan
    renderRestNotice();
    return;
  }

  // If Upper C is actively started
  if (active === "upper_c") {
    hideUpperCOption();
    currentSessionEl.textContent = "Current session: Upper C — Delts & Arms Pump";
    renderWorkoutPlan();
    renderRestNotice();
    return;
  }

  // Normal cycle session
  hideUpperCOption();
  currentSessionEl.textContent = "Current session: " + getCurrentSessionName();
  renderWorkoutPlan();
  renderRestNotice();
}

function completeCurrentSession() {
  const state = getSessionState();
  const active = localStorage.getItem("activeSessionId");

  // If currently doing Upper C, completing it returns to Upper A
  if (active === "upper_c") {
    localStorage.removeItem("activeSessionId");
    localStorage.removeItem("pendingUpperC"); // just in case
    state.index = 0;
    state.consecutiveSessions++;
    saveSessionState(state);
    incrementWorkoutInstanceId();
    renderCurrentSession();
    return;
  }

  // Normal cycle completion
  state.index++;

  // If we just completed the last cycle session (Lower B),
  // offer Upper C (optional) and loop back to Upper A.
  if (state.index >= CFG.cycle.length) {
    if (CFG.settings.offerUpperC) {
      localStorage.setItem("pendingUpperC", "true");
    }
    state.index = 0;
  }

  state.consecutiveSessions++;
  saveSessionState(state);
  incrementWorkoutInstanceId();
  renderCurrentSession();
}

// =====================
// Progression helpers
// =====================
function estimate1RM(weight, reps) {
  return weight * (1 + reps / 30);
}

function renderSummary(logs) {
  if (!activePattern || logs.length === 0) {
    summaryDiv.innerHTML = "";
    return;
  }

  const last = logs[logs.length - 1];

  let best = logs[0];
  logs.forEach(log => {
    if (estimate1RM(log.weight, log.reps) > estimate1RM(best.weight, best.reps)) {
      best = log;
    }
  });

  const lastV = last.variant ? ` (${last.variant})` : "";
  const bestV = best.variant ? ` (${best.variant})` : "";

  summaryDiv.innerHTML = `
    <p><strong>Last time:</strong> ${last.weight}kg × ${last.reps}${lastV}</p>
    <p><strong>Best set:</strong> ${best.weight}kg × ${best.reps}${bestV}</p>
  `;
}

function mountLogFormToSelection() {
  // If the selected card exists and has a host, mount the form there.
  const selectedId = selectedCardExerciseId;

  if (selectedId) {
    const host = workoutPlanEl.querySelector(
      `[data-exercise-id="${selectedId}"] [data-inline-log-host="1"]`
    );

    if (host) {
      host.appendChild(form);
      form.classList.add("is-inline");
      return;
    }
  }

  // Otherwise, return the form to its dock.
  logFormDock.appendChild(form);
  form.classList.remove("is-inline");
}
function selectSlotForLogging({ exerciseId, patternId }) {
  selectedCardExerciseId = exerciseId || null;
  activeExerciseId = exerciseId || null;
  selectedExerciseIdForLogging = exerciseId || null;
  activePattern = patternId || null;

  // Keep the form in sync with the selected slot
  if (patternId) {
    patternSelect.value = patternId;
    setVariantOptionsForPattern(patternId);
  }

  loadLogs();
  renderWorkoutPlan();
}
function getNextIncompleteSlotInCurrentSession(currentExerciseId) {
  const sessionId = getEffectiveSessionId();
  const template = CFG.templates[sessionId];
  if (!template || !Array.isArray(template.items)) return null;

  // Build slot list in template order
  const slots = template.items.map((item, idx) => ({
    exerciseId: item.exerciseId || `${sessionId}__${item.patternId}__${idx + 1}`,
    patternId: item.patternId,
    targetSets: Number(item.sets) || 0,
  }));

  const startIdx = Math.max(
    0,
    slots.findIndex(s => s.exerciseId === currentExerciseId)
  );

  // Look forward first
  for (let i = startIdx + 1; i < slots.length; i++) {
    const s = slots[i];
    if (s.targetSets <= 0) continue;

    const logged = getLoggedSetCountForSlotInSession(s.exerciseId, sessionId);
    if (logged < s.targetSets) return s;
  }

  // Then wrap to the beginning (optional but useful)
  for (let i = 0; i < startIdx; i++) {
    const s = slots[i];
    if (s.targetSets <= 0) continue;

    const logged = getLoggedSetCountForSlotInSession(s.exerciseId, sessionId);
    if (logged < s.targetSets) return s;
  }

  return null;
}

// =====================
// Workout plan rendering
// =====================
function getLoggedSetCountForSlotInSession(slotExerciseId, sessionId) {
  if (!slotExerciseId || !sessionId) return 0;

  const currentWorkoutInstanceId = getWorkoutInstanceId();

  return getLogs().filter(l =>
    l.exerciseId === slotExerciseId &&
    String(l.sessionId) === String(sessionId) &&
    Number(l.workoutInstanceId) === Number(currentWorkoutInstanceId)
  ).length;
}

function getCurrentSessionSetsForSlot(slotExerciseId, sessionId) {
  if (!slotExerciseId || !sessionId) return [];

  const currentWorkoutInstanceId = getWorkoutInstanceId();

  return getLogs()
    .filter(l =>
      l.exerciseId === slotExerciseId &&
      String(l.sessionId) === String(sessionId) &&
      Number(l.workoutInstanceId) === Number(currentWorkoutInstanceId)
    )
    .slice()
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

function getLastLogForPattern(patternId) {
  const logs = getLogs().filter(l => l.pattern === patternId);
  if (logs.length === 0) return null;
  return logs[logs.length - 1];
}

function getLastWorkoutBlockForPattern(patternId) {
  const logs = getLogs().filter(l => l.pattern === patternId);

  if (logs.length === 0) return null;

  // Prefer grouping by workoutInstanceId (new logs)
  const withInstance = logs.filter(l => l.workoutInstanceId != null);
  if (withInstance.length > 0) {
    // Find the highest workoutInstanceId for this pattern
    const lastId = Math.max(...withInstance.map(l => Number(l.workoutInstanceId)));
    const block = withInstance
      .filter(l => Number(l.workoutInstanceId) === lastId)
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));
    return { key: `workout-${lastId}`, logs: block };
  }

  // Fallback for legacy logs (no workoutInstanceId): use latest day
  const lastDate = logs.reduce((m, x) => (x.date > m ? x.date : m), logs[0].date);
  const dayKey = String(lastDate).slice(0, 10);

  const block = logs
    .filter(l => String(l.date).slice(0, 10) === dayKey)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));

  return { key: `legacy-${dayKey}`, logs: block };
}

function getLastWorkoutBlockForExercise(exerciseId, patternIdFallback) {
  if (!exerciseId) return getLastWorkoutBlockForPattern(patternIdFallback);

  const logs = getLogs().filter(l => l.exerciseId === exerciseId);

  if (logs.length === 0) return null;

  // Prefer workoutInstanceId grouping
  const withInstance = logs.filter(l => l.workoutInstanceId != null);
  if (withInstance.length > 0) {
    const lastId = Math.max(...withInstance.map(l => Number(l.workoutInstanceId)));
    const block = withInstance
      .filter(l => Number(l.workoutInstanceId) === lastId)
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));
    return { key: `workout-${lastId}`, logs: block };
  }

  // Legacy fallback: latest day
  const lastDate = logs.reduce((m, x) => (x.date > m ? x.date : m), logs[0].date);
  const dayKey = String(lastDate).slice(0, 10);

  const block = logs
    .filter(l => String(l.date).slice(0, 10) === dayKey)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));

  return { key: `legacy-${dayKey}`, logs: block };
}

function renderWorkoutPlan() {
  const active = localStorage.getItem("activeSessionId");
  const showUpperCPreview = shouldOfferUpperC() && !active;

  const sessionIdToRender = showUpperCPreview ? "upper_c" : getEffectiveSessionId();
  const template = CFG.templates[sessionIdToRender];

  if (!template) {
    workoutPlanTitle.textContent = "Workout Plan";
    workoutPlanEl.innerHTML = "<p>No template found for this session.</p>";
    return;
  }

  workoutPlanTitle.textContent = template.name;

  const itemsHtml = template.items
    .map((item, idx) => {
      const patternName = PATTERN_NAMES[item.patternId] || item.patternId;

      const slotExerciseId =
        item.exerciseId || `${sessionIdToRender}__${item.patternId}__${idx + 1}`;

      const isExpanded = expandedExerciseIds.has(slotExerciseId);
      const isSelected = selectedCardExerciseId === slotExerciseId;

      const variantsExpandedKey = `variants__${slotExerciseId}`;
      const expandedVariants = expandedExerciseIds.has(variantsExpandedKey);

      const lastBlock = getLastWorkoutBlockForExercise(slotExerciseId, null);

      let lastLoggedSetText = "—";
      let lastSetsHtml = `<div style="opacity:0.85;">No previous sets logged for this slot.</div>`;

      if (lastBlock && lastBlock.logs.length > 0) {
        const sets = lastBlock.logs;

        const lastSet = sets[sets.length - 1];
        lastLoggedSetText = `${lastSet.weight}kg × ${lastSet.reps}${
          lastSet.variant ? ` (${lastSet.variant})` : ""
        }`;

        lastSetsHtml = sets
          .map((l, i) => {
            const v = l.variant ? ` (${l.variant})` : "";
            return `<div class="set-line">Last workout — Set ${i + 1}: ${l.weight}kg × ${l.reps}${v}</div>`;
          })
          .join("");
      }

      const variants = (CFG.variantsByPattern[item.patternId] || []).map(v => v.name);
      const variantsText = variants.length ? variants.join(", ") : "—";

      const coreTag = item.core ? "Core" : "Flexible/Optional";

      // Per-slot set progress for the current session instance
      const showSetProgress = !showUpperCPreview;

      const loggedSets = showSetProgress
        ? getLoggedSetCountForSlotInSession(slotExerciseId, sessionIdToRender)
        : 0;

      const targetSets = Number(item.sets) || 0;
      const cappedLogged = targetSets > 0 ? Math.min(loggedSets, targetSets) : loggedSets;
      const isComplete = showSetProgress && targetSets > 0 && loggedSets >= targetSets;
      // NEW: show set-by-set performance for THIS session on the selected card
      const currentSets = isSelected && showSetProgress
        ? getCurrentSessionSetsForSlot(slotExerciseId, sessionIdToRender)
        : [];

      const nextSetNumber =
        targetSets > 0 ? Math.min(loggedSets + 1, targetSets) : loggedSets + 1;

      const progressHtml = showSetProgress
        ? `This session: <strong>${cappedLogged}</strong> / <strong>${targetSets}</strong> sets`
        : `<span style="opacity:0.75;">(Upper C preview — no sets tracked yet)</span>`;

      const nextSetHtml = showSetProgress
        ? `<span class="badge">${isComplete ? "Done" : `Next set: ${nextSetNumber}`}</span>`
        : "";

      const completeBadge = isComplete ? `<span class="badge badge--complete">Completed</span>` : "";

      return `
        <div class="workout-card ${isSelected ? "selected" : ""} ${isComplete ? "is-complete" : ""}"
             data-pattern-id="${item.patternId}"
             data-exercise-id="${slotExerciseId}">

          <div class="workout-card__top">
            <div>
              <div class="workout-card__title">
                <strong>${idx + 1}. ${patternName}</strong>
                <span class="tag">${coreTag}</span>
                ${nextSetHtml}
                ${completeBadge}
              </div>

              <div class="workout-card__meta">
                Target: <strong>${item.sets}</strong> sets × <strong>${item.repMin}–${item.repMax}</strong> reps
              </div>

              <div class="workout-card__progress">
                ${progressHtml}
              </div>
            </div>

            <div class="card-actions">
              <button type="button"
                      class="btn-small btn-ghost"
                      data-action="toggleLast"
                      data-exercise-id="${slotExerciseId}">
                ${isExpanded ? "Hide last workout" : "Show last workout"}
              </button>
            </div>
          </div>

          <div class="workout-card__last">
            Last logged set: <strong>${lastLoggedSetText}</strong>
          </div>

          <div class="details" data-last-details="1" style="display:${isExpanded ? "block" : "none"};">
            ${lastSetsHtml}
          </div>

          <div class="card-actions">
            <button type="button"
                    class="btn-small btn-ghost"
                    data-action="toggleVariants"
                    data-exercise-id="${slotExerciseId}">
              ${expandedVariants ? "Hide variants" : "Show variants"}
            </button>
          </div>

          <div class="details" data-variants-details="1" style="display:${expandedVariants ? "block" : "none"};">
            Suggested variants: ${variantsText}
          </div>

                    <!-- NEW: Inline logger host (the #logForm will be moved into this div when selected) -->
          <div data-inline-log-host="1"></div>

          ${
            isSelected && showSetProgress
              ? `
                <div class="details">
                  <div style="font-weight:700; margin-bottom:8px;">This session sets</div>
                  ${
                    currentSets.length === 0
                      ? `<div style="opacity:0.8;">No sets logged yet.</div>`
                      : currentSets
                          .map((s, i) => {
                            const v = s.variant ? ` (${s.variant})` : "";
                            return `<div class="set-line">Set ${i + 1}: <strong>${s.weight}kg × ${s.reps}</strong>${v}</div>`;
                          })
                          .join("")
                  }
                </div>
              `
              : ""
          }

          <div class="hint"><em>Click card to select for logging & history</em></div>
        </div>
      `;
    })
    .join("");

  const note = showUpperCPreview
    ? `<div class="panel" style="margin:12px 0;"><strong>Note:</strong> Upper C is optional. Start it or skip it above.</div>`
    : "";

  workoutPlanEl.innerHTML = `<div class="workout-list">${note}${itemsHtml}</div>`;

  // NEW: after re-rendering, mount the log form into the selected card (or dock)
  mountLogFormToSelection();
}

// =====================
// History rendering
// =====================
function loadLogs() {
  const logs = getLogs();
  historyList.innerHTML = "";

  // No selection: neutral history state
  if (!activePattern) {
    historyTitle.textContent = "History";
    backBtn.style.display = "none";
    summaryDiv.innerHTML = "";
    historyList.innerHTML = `<li style="opacity:0.8;">Click an exercise in the workout plan to view its history.</li>`;
    return;
  }

  // Selection exists: ensure back button is visible
  backBtn.style.display = "inline-block";

  const filteredLogs = activeExerciseId
    ? logs.filter(l => l.exerciseId === activeExerciseId)
    : logs.filter(l => l.pattern === activePattern);

  const baseName = PATTERN_NAMES[activePattern] || activePattern;
  historyTitle.textContent = activeExerciseId
    ? `History – ${baseName} (slot)`
    : `History – ${baseName}`;

  renderSummary(filteredLogs);

  // Group logs by workoutInstanceId (fallback to date prefix for old logs)
  const groups = new Map();

  filteredLogs.forEach(log => {
    const key =
      log.workoutInstanceId != null
        ? String(log.workoutInstanceId)
        : "legacy-" + String(log.date || "").slice(0, 10);

    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(log);
  });

  // Sort groups by most recent log date
  const grouped = Array.from(groups.entries()).sort((a, b) => {
    const aLast = a[1].reduce((m, x) => (x.date > m ? x.date : m), a[1][0].date);
    const bLast = b[1].reduce((m, x) => (x.date > m ? x.date : m), b[1][0].date);
    return bLast.localeCompare(aLast);
  });

  historyList.innerHTML = "";

  grouped.forEach(([key, logsInWorkout]) => {
    // Sort sets in this workout by time (oldest -> newest)
    logsInWorkout.sort((x, y) => String(x.date).localeCompare(String(y.date)));

    const first = logsInWorkout[0];
    const when = first?.date ? new Date(first.date).toLocaleString() : "Unknown time";
    const sessionName = first?.sessionName || first?.sessionId || "Session";

    // Best set in this workout by estimated 1RM
    let best = logsInWorkout[0];
    logsInWorkout.forEach(l => {
      if (estimate1RM(l.weight, l.reps) > estimate1RM(best.weight, best.reps)) best = l;
    });

    const bestV = best.variant ? ` (${best.variant})` : "";
    const setsHtml = logsInWorkout
      .map((l, idx) => {
        const v = l.variant ? ` (${l.variant})` : "";
        const isBest = l === best;
        return `<div style="margin:2px 0; ${isBest ? "font-weight:700;" : ""}">
          Set ${idx + 1}: ${l.weight}kg × ${l.reps}${v}
        </div>`;
      })
      .join("");

    const li = document.createElement("li");
li.className = "history-card";

li.innerHTML = `
  <div class="history-card__top">
    <div><strong>${sessionName}</strong></div>
    <div class="history-card__when">${when}</div>
  </div>

  <div class="history-card__best">
    <strong>Best:</strong> ${best.weight}kg × ${best.reps}${bestV}
  </div>

  <div class="history-card__sets">
    ${logsInWorkout
      .map((l, idx) => {
        const v = l.variant ? ` (${l.variant})` : "";
        const isBest = l === best;
        return `<div class="set-line ${isBest ? "best" : ""}">
          Set ${idx + 1}: ${l.weight}kg × ${l.reps}${v}
        </div>`;
      })
      .join("")}
  </div>
`;

    historyList.appendChild(li);
  });
}

// =====================
// Progress tab helpers
// =====================
function getFriendlySlotLabel(sessionId, template, item, idx) {
  const patternName = PATTERN_NAMES[item.patternId] || item.patternId;

  // Short session name (e.g. "Upper B")
  const sessionShort = (template.name || sessionId).split("—")[0].trim();

  // Count how many times this pattern appears in the session
  const samePatternCount = template.items.filter(
    i => i.patternId === item.patternId
  ).length;

  if (samePatternCount > 1) {
    // Human-friendly naming for duplicates
    const order =
      template.items
        .filter(i => i.patternId === item.patternId)
        .indexOf(item);

    const suffix =
      order === 0
        ? "Main"
        : order === 1
        ? "Pump"
        : `Variation ${order + 1}`;

    return `${sessionShort} — ${patternName} (${suffix})`;
  }

  return `${sessionShort} — ${patternName}`;
}

function getAllExerciseSlotsFromTemplates() {
  const slots = [];

  // Include all sessions in templates (including optional Upper C)
  Object.entries(CFG.templates).forEach(([sessionId, template]) => {
    if (!template || !Array.isArray(template.items)) return;

    template.items.forEach((item, idx) => {
      const slotExerciseId =
        item.exerciseId || `${sessionId}__${item.patternId}__${idx + 1}`;

      const patternName = PATTERN_NAMES[item.patternId] || item.patternId;
      const sessionName = template.name || sessionId;

      slots.push({
        exerciseId: slotExerciseId,
        patternId: item.patternId,
        displayName: getFriendlySlotLabel(sessionId, template, item, idx),
      });
    });
  });

  // De-duplicate by exerciseId
  const unique = new Map();
  slots.forEach(s => unique.set(s.exerciseId, s));
  return Array.from(unique.values());
}

function renderProgressExerciseOptions() {
  const slots = getAllExerciseSlotsFromTemplates();

  progressExerciseSelect.innerHTML = "";

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select an exercise slot...";
  progressExerciseSelect.appendChild(placeholder);

  slots.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s.exerciseId;
    opt.textContent = s.displayName;
    progressExerciseSelect.appendChild(opt);
  });
}
function getLogsForExerciseId(exerciseId) {
  return getLogs()
    .filter(l => l.exerciseId === exerciseId)
    .slice()
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

function getBestSet(logs) {
  if (logs.length === 0) return null;

  let best = logs[0];
  logs.forEach(l => {
    if (estimate1RM(l.weight, l.reps) > estimate1RM(best.weight, best.reps)) {
      best = l;
    }
  });
  return best;
}

function groupLogsIntoWorkouts(logs) {
  // Group by workoutInstanceId when available; otherwise group by day
  const groups = new Map();

  logs.forEach(l => {
    const key =
      l.workoutInstanceId != null
        ? `workout-${l.workoutInstanceId}`
        : `legacy-${String(l.date || "").slice(0, 10)}`;

    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(l);
  });

  // Sort each group by time
  groups.forEach(arr => arr.sort((a, b) => String(a.date).localeCompare(String(b.date))));

  // Return groups sorted by most recent log date in that group (newest first)
  return Array.from(groups.entries()).sort((a, b) => {
    const aLast = a[1][a[1].length - 1]?.date || "";
    const bLast = b[1][b[1].length - 1]?.date || "";
    return String(bLast).localeCompare(String(aLast));
  });
}
function getLoggedVariantsForExerciseId(exerciseId) {
  const logs = getLogsForExerciseId(exerciseId);
  const set = new Set();

  logs.forEach(l => {
    const v = (l.variant || "").trim();
    if (v) set.add(v);
  });

  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

function renderProgressVariantOptions(exerciseId) {
  if (!progressVariantSelect) return;

  progressVariantSelect.innerHTML = "";
  const allOpt = document.createElement("option");
  allOpt.value = "";
  allOpt.textContent = "All variants";
  progressVariantSelect.appendChild(allOpt);

  if (!exerciseId) {
    progressVariantSelect.disabled = true;
    return;
  }

  const variants = getLoggedVariantsForExerciseId(exerciseId);

  if (variants.length === 0) {
    progressVariantSelect.disabled = true;
    return;
  }

  variants.forEach(v => {
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    progressVariantSelect.appendChild(opt);
  });

  progressVariantSelect.disabled = false;
}

function populateProgressPatternSelect() {
  if (!progressPatternSelect) return;

  progressPatternSelect.innerHTML = '<option value="">Select a lift type...</option>';

  const patterns = WORKOUT_CONFIG.patterns || [];
  console.log('[populateProgressPatternSelect] Available patterns:', patterns);

  patterns.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.name;
    progressPatternSelect.appendChild(opt);
  });
}

function getLogsForPatternId(patternId) {
  if (!patternId) return [];

  const all = getLogs(); // Use the existing getLogs() function instead of LifeOSDB
  console.log('[getLogsForPatternId] Looking for patternId:', patternId);
  console.log('[getLogsForPatternId] Total logs in DB:', all.length);

  // Sample first 3 logs to see structure
  if (all.length > 0) {
    console.log('[getLogsForPatternId] Sample logs:', all.slice(0, 3).map(l => ({ exerciseId: l.exerciseId, variant: l.variant, weight: l.weight, reps: l.reps })));
  }

  // Show all unique exerciseIds in the logs
  const uniqueExerciseIds = [...new Set(all.map(l => l.exerciseId))];
  console.log('[getLogsForPatternId] Unique exerciseIds in logs:', uniqueExerciseIds);

  // Show what templates we're checking against
  console.log('[getLogsForPatternId] Available templates:', Object.keys(WORKOUT_CONFIG.templates));

  const matched = all.filter(log => {
    if (!log || !log.exerciseId) return false;

    // Find the exercise slot config to get its patternId
    for (const templateKey in WORKOUT_CONFIG.templates) {
      const template = WORKOUT_CONFIG.templates[templateKey];
      const item = template.items?.find(it => it.exerciseId === log.exerciseId);
      if (item && item.patternId === patternId) {
        console.log('[getLogsForPatternId] MATCH found! Log exerciseId:', log.exerciseId, '-> item patternId:', item.patternId);
        return true;
      }
    }
    return false;
  });

  console.log('[getLogsForPatternId] Matched logs:', matched.length);
  return matched;
}

function getLoggedVariantsForPattern(patternId) {
  const logs = getLogsForPatternId(patternId);
  const set = new Set();

  logs.forEach(l => {
    const v = (l.variant || "").trim();
    if (v) set.add(v);
  });

  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

function renderProgressForPattern(patternId, variantFilter = "") {
  console.log('[Progress] renderProgressForPattern called with:', { patternId, variantFilter });

  if (!patternId) {
    progressSummaryEl.innerHTML = `<p style="opacity:0.8;">Select a lift type to view progress.</p>`;
    progressTableEl.innerHTML = "";
    if (progressChartHint) progressChartHint.textContent = "";
    drawProgressChart([]);
    if (progressPatternVariantSelect) {
      progressPatternVariantSelect.disabled = true;
      progressPatternVariantSelect.innerHTML = `<option value="">All variants</option>`;
    }
    return;
  }

  // Get logs for this pattern FIRST
  let logs = getLogsForPatternId(patternId);
  console.log('[Progress] Found logs for pattern:', logs.length, logs);

  // Populate variant filter for this pattern
  const variants = getLoggedVariantsForPattern(patternId);
  console.log('[Progress] Found variants:', variants);

  if (progressPatternVariantSelect) {
    progressPatternVariantSelect.innerHTML = '<option value="">All variants</option>';
    if (variants.length > 0) {
      variants.forEach(v => {
        const opt = document.createElement("option");
        opt.value = v;
        opt.textContent = v;
        progressPatternVariantSelect.appendChild(opt);
      });
      progressPatternVariantSelect.disabled = false;
    } else {
      progressPatternVariantSelect.disabled = true;
    }
  }

  const vf = (variantFilter || "").trim();
  if (vf) {
    logs = logs.filter(l => String(l.variant || "").trim() === vf);
  }

  if (logs.length === 0) {
    progressSummaryEl.innerHTML = `<p style="opacity:0.8;">No data logged for this lift type yet${vf ? " (for this variant)." : "."}</p>`;
    progressTableEl.innerHTML = "";
    if (progressChartHint) progressChartHint.textContent = "";
    drawProgressChart([]);
    return;
  }

  const best = getBestSet(logs);
  const bestV = best.variant ? ` (${best.variant})` : "";
  const bestDate = best.date ? new Date(best.date).toLocaleString() : "Unknown";

  const workouts = groupLogsIntoWorkouts(logs);
  const totalWorkouts = workouts.length;

  const lastWorkoutDate =
    workouts.length > 0
      ? new Date(workouts[0][1][0].date).toLocaleDateString()
      : "—";

  // Best set per workout (by estimated 1RM)
  const rows = workouts.map(([key, arr]) => {
    const bestInWorkout = getBestSet(arr);
    const when = arr[0]?.date ? new Date(arr[0].date).toLocaleDateString() : "—";
    const v = bestInWorkout.variant ? ` (${bestInWorkout.variant})` : "";
    return {
      when,
      weight: bestInWorkout.weight,
      reps: bestInWorkout.reps,
      variant: v,
      e1rm: estimate1RM(bestInWorkout.weight, bestInWorkout.reps),
      key,
    };
  });

  // PB e1RM
  const pbE1RM = rows.reduce((m, r) => (r.e1rm > m ? r.e1rm : m), rows[0].e1rm);

  const patternName = WORKOUT_CONFIG.patterns.find(p => p.id === patternId)?.name || patternId;
  const vfLabel = vf ? ` • Variant: <strong>${vf}</strong>` : "";

  progressSummaryEl.innerHTML = `
    <div style="padding:14px; margin-bottom:12px;">
      <div style="font-weight:700; margin-bottom:6px;">Personal bests (${patternName})</div>
      <div style="opacity:0.85; margin-bottom:6px;">
        Last trained: <strong>${lastWorkoutDate}</strong> •
        Total workouts: <strong>${totalWorkouts}</strong>${vfLabel}
      </div>
      <div><strong>Best set:</strong> ${best.weight}kg × ${best.reps}${bestV}</div>
      <div style="opacity:0.85;">When: ${bestDate}</div>
      <div style="margin-top:8px;"><strong>Best estimated 1RM:</strong> ${pbE1RM.toFixed(1)}kg</div>
    </div>
  `;

  // Chart
  drawProgressChart(rows);

  const tableRowsHtml = rows
    .map(r => {
      return `
        <tr>
          <td>${r.when}</td>
          <td>${r.weight} × ${r.reps}${r.variant}</td>
          <td>${r.e1rm.toFixed(1)}kg</td>
        </tr>
      `;
    })
    .join("");

  progressTableEl.innerHTML = `
    <div style="overflow:hidden;">
      <table>
        <thead>
          <tr>
            <th>Workout date</th>
            <th>Best set</th>
            <th>Est. 1RM</th>
          </tr>
        </thead>
        <tbody>${tableRowsHtml}</tbody>
      </table>
    </div>
  `;
}

function drawProgressChart(rows) {
  if (!progressChart) return;

  const ctx = progressChart.getContext("2d");
  const isDark = document.documentElement.getAttribute("data-theme") !== "light";

  const gridColor = isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)";
  const textColor = isDark ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.8)";

  const w = progressChart.width;
  const h = progressChart.height;

  // Clear
  ctx.clearRect(0, 0, w, h);

  if (!rows || rows.length < 2) {
    if (progressChartHint) progressChartHint.textContent = "Log at least 2 workouts to see a trend.";
    return;
  }

  // Rows are newest-first in your table; chart should be oldest->newest
  const points = rows.slice().reverse().map(r => Number(r.e1rm));

  // Calculate trend: positive if last > first, negative if last < first
  const firstValue = points[0];
  const lastValue = points[points.length - 1];
  const trendPositive = lastValue >= firstValue;

  // Line colors based on trend
  const lineColor = trendPositive ? "#22c55e" : "#ef4444"; // green : red
  const shadowColor = trendPositive ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)";

  if (progressChartHint) {
    const direction = trendPositive ? "↗ Improving" : "↘ Declining";
    const change = ((lastValue - firstValue) / firstValue * 100).toFixed(1);
    progressChartHint.textContent = `Trend: ${direction} (${change > 0 ? '+' : ''}${change}%)`;
  }

  const padL = 44;
  const padR = 14;
  const padT = 14;
  const padB = 28;

  const minV = Math.min(...points);
  const maxV = Math.max(...points);
  const range = Math.max(1e-6, maxV - minV);

  // Axis + grid
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  ctx.moveTo(padL, padT);
  ctx.lineTo(padL, h - padB);
  ctx.lineTo(w - padR, h - padB);
  ctx.strokeStyle = gridColor;
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Labels
  ctx.font = "12px " + getComputedStyle(document.body).fontFamily;
  ctx.globalAlpha = 0.75;
  ctx.fillStyle = textColor;
  ctx.fillText(maxV.toFixed(1), 6, padT + 10);
  ctx.fillText(minV.toFixed(1), 6, h - padB);
  ctx.globalAlpha = 1;

  const xStep = (w - padL - padR) / (points.length - 1);

  function yFor(val) {
    const t = (val - minV) / range;
    return (h - padB) - t * (h - padT - padB);
  }

  // Draw shadow/fill area under line
  ctx.beginPath();
  const firstX = padL;
  const firstY = yFor(points[0]);
  ctx.moveTo(firstX, firstY);

  points.forEach((v, i) => {
    const x = padL + i * xStep;
    const y = yFor(v);
    ctx.lineTo(x, y);
  });

  // Close the path to baseline
  ctx.lineTo(padL + (points.length - 1) * xStep, h - padB);
  ctx.lineTo(firstX, h - padB);
  ctx.closePath();

  // Fill with gradient shadow
  const gradient = ctx.createLinearGradient(0, padT, 0, h - padB);
  gradient.addColorStop(0, shadowColor);
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.fill();

  // Draw main line
  ctx.beginPath();
  points.forEach((v, i) => {
    const x = padL + i * xStep;
    const y = yFor(v);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();

  // Draw points
  points.forEach((v, i) => {
    const x = padL + i * xStep;
    const y = yFor(v);

    // Outer circle (shadow)
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fillStyle = shadowColor;
    ctx.fill();

    // Inner circle
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fillStyle = lineColor;
    ctx.fill();
  });
}

function renderProgressForExercise(exerciseId, variantFilter = "") {
  if (!exerciseId) {
    progressSummaryEl.innerHTML = `<p style="opacity:0.8;">Select an exercise slot to view progress.</p>`;
    progressTableEl.innerHTML = "";
    if (progressChartHint) progressChartHint.textContent = "";
    drawProgressChart([]);
    if (progressVariantSelect) {
      progressVariantSelect.disabled = true;
      progressVariantSelect.innerHTML = `<option value="">All variants</option>`;
    }
    return;
  }

  // Ensure variant dropdown is populated for this slot
  renderProgressVariantOptions(exerciseId);

  // Pull logs and apply optional variant filter
  let logs = getLogsForExerciseId(exerciseId);

  const vf = (variantFilter || "").trim();
  if (vf) {
    logs = logs.filter(l => String(l.variant || "").trim() === vf);
  }

  if (logs.length === 0) {
    progressSummaryEl.innerHTML = `<p style="opacity:0.8;">No data logged for this slot yet${vf ? " (for this variant)." : "."}</p>`;
    progressTableEl.innerHTML = "";
    if (progressChartHint) progressChartHint.textContent = "";
    drawProgressChart([]);
    return;
  }

  const best = getBestSet(logs);
  const bestV = best.variant ? ` (${best.variant})` : "";
  const bestDate = best.date ? new Date(best.date).toLocaleString() : "Unknown";

  const workouts = groupLogsIntoWorkouts(logs);
  const totalWorkouts = workouts.length;

  const lastWorkoutDate =
    workouts.length > 0
      ? new Date(workouts[0][1][0].date).toLocaleDateString()
      : "—";

  // Best set per workout (by estimated 1RM)
  const rows = workouts.map(([key, arr]) => {
    const bestInWorkout = getBestSet(arr);
    const when = arr[0]?.date ? new Date(arr[0].date).toLocaleDateString() : "—";
    const v = bestInWorkout.variant ? ` (${bestInWorkout.variant})` : "";
    return {
      when,
      weight: bestInWorkout.weight,
      reps: bestInWorkout.reps,
      variant: v,
      e1rm: estimate1RM(bestInWorkout.weight, bestInWorkout.reps),
      key,
    };
  });

  // PB e1RM
  const pbE1RM = rows.reduce((m, r) => (r.e1rm > m ? r.e1rm : m), rows[0].e1rm);

  const vfLabel = vf ? ` • Variant: <strong>${vf}</strong>` : "";

  progressSummaryEl.innerHTML = `
    <div style="padding:14px; margin-bottom:12px;">
      <div style="font-weight:700; margin-bottom:6px;">Personal bests (this slot)</div>
      <div style="opacity:0.85; margin-bottom:6px;">
        Last trained: <strong>${lastWorkoutDate}</strong> •
        Total workouts: <strong>${totalWorkouts}</strong>${vfLabel}
      </div>
      <div><strong>Best set:</strong> ${best.weight}kg × ${best.reps}${bestV}</div>
      <div style="opacity:0.85;">When: ${bestDate}</div>
      <div style="margin-top:8px;"><strong>Best estimated 1RM:</strong> ${pbE1RM.toFixed(1)}kg</div>
    </div>
  `;

  // Chart
  drawProgressChart(rows);

  const tableRowsHtml = rows
    .map(r => {
      return `
        <tr>
          <td>${r.when}</td>
          <td>${r.weight} × ${r.reps}${r.variant}</td>
          <td>${r.e1rm.toFixed(1)}kg</td>
        </tr>
      `;
    })
    .join("");

  progressTableEl.innerHTML = `
    <div style="overflow:hidden;">
      <table>
        <thead>
          <tr>
            <th>Workout date</th>
            <th>Best set</th>
            <th>Est. 1RM</th>
          </tr>
        </thead>
        <tbody>
          ${tableRowsHtml}
        </tbody>
      </table>
    </div>
  `;
}

// =====================
// Event listeners
// =====================
patternSelect.addEventListener("change", () => {
  const newPattern = patternSelect.value;

  setVariantOptionsForPattern(newPattern);

  // Detach from any specific slot
  selectedExerciseIdForLogging = null;
  activeExerciseId = null;
  selectedCardExerciseId = null;

  // Switch active pattern to whatever the user chose
  activePattern = newPattern || null;

  // Refresh UI
  loadLogs();
  renderWorkoutPlan();
});

// Progress tracking mode switcher
const progressTrackingMode = document.getElementById("progressTrackingMode");
const progressBySlotControls = document.getElementById("progressBySlotControls");
const progressByPatternControls = document.getElementById("progressByPatternControls");
const progressPatternSelect = document.getElementById("progressPatternSelect");
const progressPatternVariantSelect = document.getElementById("progressPatternVariantSelect");

if (progressTrackingMode) {
  progressTrackingMode.addEventListener("change", () => {
    const mode = progressTrackingMode.value;

    if (mode === "by-slot") {
      progressBySlotControls.style.display = "block";
      progressByPatternControls.style.display = "none";

      // Render based on current slot selection
      const exId = progressExerciseSelect.value;
      renderProgressForExercise(exId, progressVariantSelect?.value || "");
    } else {
      progressBySlotControls.style.display = "none";
      progressByPatternControls.style.display = "block";

      // Populate pattern selector if not done yet
      if (progressPatternSelect && progressPatternSelect.options.length === 0) {
        populateProgressPatternSelect();
      }

      // Render based on current pattern selection
      const patternId = progressPatternSelect?.value || "";
      renderProgressForPattern(patternId, progressPatternVariantSelect?.value || "");
    }
  });
}

progressExerciseSelect.addEventListener("change", () => {
  const exId = progressExerciseSelect.value;
  if (progressVariantSelect) progressVariantSelect.value = "";
  renderProgressForExercise(exId, "");
});

if (progressVariantSelect) {
  progressVariantSelect.addEventListener("change", () => {
    const exId = progressExerciseSelect.value;
    renderProgressForExercise(exId, progressVariantSelect.value);
  });
}

if (progressPatternSelect) {
  progressPatternSelect.addEventListener("change", () => {
    const patternId = progressPatternSelect.value;
    console.log('[Progress] Pattern select changed to:', patternId);
    if (progressPatternVariantSelect) progressPatternVariantSelect.value = "";
    renderProgressForPattern(patternId, "");
  });
}

if (progressPatternVariantSelect) {
  progressPatternVariantSelect.addEventListener("change", () => {
    const patternId = progressPatternSelect.value;
    renderProgressForPattern(patternId, progressPatternVariantSelect.value);
  });
}

// Wire Progress section swipeable tabs
const progressTabsContainer = document.querySelector("#progressTab .dashboard-card");
if (progressTabsContainer) {
  const progressTabs = progressTabsContainer.querySelectorAll(".dashboard-tab");
  const progressPanels = progressTabsContainer.querySelectorAll(".dashboard-content-panel");
  const progressContentContainer = document.getElementById("progressContentContainer");

  progressTabs.forEach((tab, index) => {
    tab.addEventListener("click", () => {
      progressTabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");

      const panel = progressPanels[index];
      if (panel && progressContentContainer) {
        progressContentContainer.scrollTo({
          left: panel.offsetLeft,
          behavior: "smooth"
        });
      }
    });
  });

  // Scroll sync for swipe gestures
  let progressScrollTimeout;
  progressContentContainer.addEventListener("scroll", () => {
    clearTimeout(progressScrollTimeout);
    progressScrollTimeout = setTimeout(() => {
      const scrollLeft = progressContentContainer.scrollLeft;
      const containerWidth = progressContentContainer.offsetWidth;
      const activeIndex = Math.round(scrollLeft / containerWidth);

      progressTabs.forEach((tab, index) => {
        if (index === activeIndex) {
          tab.classList.add("active");
        } else {
          tab.classList.remove("active");
        }
      });
    }, 50);
  });
}

workoutPlanEl.addEventListener("click", (event) => {
      // If the user is interacting with the inline log form, do not treat it as a card click.
  if (event.target.closest("#logForm")) {
    event.stopPropagation();
    return;
  }
  // 1) Toggle "Last workout" details
  const toggleLastBtn = event.target.closest('[data-action="toggleLast"]');
  if (toggleLastBtn) {
    event.preventDefault();
    event.stopPropagation();

    const exId = toggleLastBtn.getAttribute("data-exercise-id");
    if (!exId) return;

    if (expandedExerciseIds.has(exId)) expandedExerciseIds.delete(exId);
    else expandedExerciseIds.add(exId);

    persistExpanded();
    renderWorkoutPlan();
    return;
  }

  // 2) Toggle "Variants" details
  const toggleVariantsBtn = event.target.closest('[data-action="toggleVariants"]');
  if (toggleVariantsBtn) {
    event.preventDefault();
    event.stopPropagation();

    const exId = toggleVariantsBtn.getAttribute("data-exercise-id");
    if (!exId) return;

    const key = `variants__${exId}`;
    if (expandedExerciseIds.has(key)) expandedExerciseIds.delete(key);
    else expandedExerciseIds.add(key);

    persistExpanded();
    renderWorkoutPlan();
    return;
  }

  // 3) Otherwise: card click selects the exercise slot
  const card = event.target.closest("[data-exercise-id]");
  if (!card) return;

  const patternId = card.getAttribute("data-pattern-id");
  const exerciseId = card.getAttribute("data-exercise-id") || null;

  if (!patternId) return;

  selectedCardExerciseId = exerciseId;
  activeExerciseId = exerciseId;
  selectedExerciseIdForLogging = exerciseId;
  activePattern = patternId;

  // Pre-select the logging form pattern to match what you clicked
  patternSelect.value = patternId;
  setVariantOptionsForPattern(patternId);

  loadLogs();
  renderWorkoutPlan();

  // Fast entry
  focusNextLoggingField();
});

variantSelect.addEventListener("change", () => {
  if (variantSelect.value === "__custom__") {
    variantCustomLabel.style.display = "block";
    variantCustom.focus();
  } else {
    variantCustomLabel.style.display = "none";
    variantCustom.value = "";
  }
});

form.addEventListener("submit", event => {
  event.preventDefault();

  // Guard: must have a pattern at minimum
  const patternId = (patternSelect.value || "").trim();
  if (!patternId) return;

  // Guard: slot selection is strongly expected in your UX
  // but if it isn't present, we still log pattern-level.
  const slotExerciseId = selectedExerciseIdForLogging || null;

  const weight = Number(weightInput.value);
  const reps = Number(repsInput.value);

  if (!Number.isFinite(weight) || !Number.isFinite(reps)) return;

  const logs = getLogs();

  logs.push({
    pattern: patternId,
    exerciseId: slotExerciseId,
    variant: getSelectedVariant(),
    weight,
    reps,
    date: new Date().toISOString(),

    // Group sets by session instance
    workoutInstanceId: getWorkoutInstanceId(),

    // Helpful metadata (for display)
    sessionId: getEffectiveSessionId(),
    sessionName: CFG.templates[getEffectiveSessionId()]?.name || "Session",
  });

  saveLogs(logs);

  // Ensure the UI state is coherent (important if anything cleared it)
  activePattern = patternId;
  activeExerciseId = slotExerciseId;
  selectedCardExerciseId = slotExerciseId;

  // ---- Fast logging behaviour ----
  const lastPattern = patternSelect.value;          // NEW
  const lastWeight = weightInput.value;
  const lastVariant = variantSelect.value;
  const lastCustomVariant = variantCustom.value;

  form.reset();

  // Restore pattern first (because variants depend on pattern)
  patternSelect.value = lastPattern;               // NEW
  setVariantOptionsForPattern(lastPattern);        // NEW

  // Restore previous inputs
  weightInput.value = lastWeight;

  // Restore variant selection
  variantSelect.value = lastVariant;

  if (lastVariant === "__custom__") {
    variantCustomLabel.style.display = "block";
    variantCustom.value = lastCustomVariant;
  } else {
    variantCustomLabel.style.display = "none";
    variantCustom.value = "";
  }

  repsInput.value = "";
  // (focus is handled later in your handler after re-render)


  // ---- Refresh UI (history + cards) ----
  // Do it immediately AND in the next frame to avoid any timing/paint issues.
  // ---- Refresh UI (history + cards) ----
  loadLogs();
  renderWorkoutPlan();

  requestAnimationFrame(() => {
    renderWorkoutPlan();

    // If this slot just became complete, auto-advance to next incomplete slot
    const sessionIdNow = getEffectiveSessionId();
    const targetSetsNow = (() => {
      const template = CFG.templates[sessionIdNow];
      if (!template) return 0;
      const idx = template.items.findIndex(it => (it.exerciseId || "") === slotExerciseId);
      if (idx >= 0) return Number(template.items[idx].sets) || 0;

      // Fallback if any legacy ids exist
      const found = template.items.find(it => it.patternId === patternId && it.exerciseId == null);
      return found ? Number(found.sets) || 0 : 0;
    })();

    const loggedNow =
      slotExerciseId && sessionIdNow
        ? getLoggedSetCountForSlotInSession(slotExerciseId, sessionIdNow)
        : 0;

    const isNowComplete = targetSetsNow > 0 && loggedNow >= targetSetsNow;

    if (isNowComplete) {
      const next = getNextIncompleteSlotInCurrentSession(slotExerciseId);

      if (next) {
        selectSlotForLogging({ exerciseId: next.exerciseId, patternId: next.patternId });

        // Smooth scroll to next card
        requestAnimationFrame(() => {
          const nextEl = workoutPlanEl.querySelector(`[data-exercise-id="${next.exerciseId}"]`);
          if (nextEl) nextEl.scrollIntoView({ behavior: "smooth", block: "start" });

          // After mount, focus reps
          requestAnimationFrame(() => repsInput.focus());
        });

        return; // we’re done
      }
    }

    // Default: stay on same slot and focus reps
    requestAnimationFrame(() => repsInput.focus());
  });
});


clearAllBtn.addEventListener("click", () => {
  const ok = window.confirm(
    "This will permanently delete all logs and settings on this device. This cannot be undone.\n\nTip: Export first if you want a backup.\n\nContinue?"
  );
  if (!ok) return;

  localStorage.removeItem("logs");
  localStorage.removeItem("restLogs");
  localStorage.removeItem("sessionState");
  localStorage.removeItem("workoutInstanceId");
  localStorage.removeItem("expandedExerciseIds");
  localStorage.removeItem("theme");
  localStorage.removeItem("pendingUpperC");
  localStorage.removeItem("activeSessionId");

  activePattern = null;
  activeExerciseId = null;
  selectedExerciseIdForLogging = null;
  selectedCardExerciseId = null;

  // Reset runtime expansion set
  expandedExerciseIds = new Set();

  loadLogs();
  renderCurrentSession();
  renderRestNotice();
  renderProgressExerciseOptions();
  renderProgressForExercise("");
  renderWorkoutPlan();

  window.alert("All data cleared.");
});

if (exportDataBtn) {
  exportDataBtn.addEventListener("click", () => {
    const payload = buildExportPayload();
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: "application/json" });

    const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const filename = `gym-log-backup-${ts}.json`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });
}
if (importDataInput) {
  importDataInput.addEventListener("change", async () => {
    const file = importDataInput.files && importDataInput.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const payload = JSON.parse(text);

      // Confirm before overwriting
      const ok = window.confirm(
        "Importing will overwrite your current data on this device. Continue?"
      );
      if (!ok) {
        importDataInput.value = "";
        return;
      }

      applyImportedPayload(payload);

      // Reset selection + refresh UI
      activePattern = null;
      activeExerciseId = null;
      selectedExerciseIdForLogging = null;
      selectedCardExerciseId = null;

      // Re-render everything
      loadLogs();
      renderCurrentSession();
      renderRestNotice();
      renderProgressExerciseOptions();
      renderProgressForExercise("");
      renderWorkoutPlan();

      // Re-apply theme if present
      initTheme();

      window.alert("Import complete.");
    } catch (err) {
      window.alert("Import failed: " + (err?.message || String(err)));
    } finally {
      importDataInput.value = "";
    }
  });
}

backBtn.addEventListener("click", () => {
  activePattern = null;
  activeExerciseId = null;
  selectedExerciseIdForLogging = null;
  selectedCardExerciseId = null;

  loadLogs();
  renderWorkoutPlan(); // docks the form back via mountLogFormToSelection()
});

completeSessionBtn.addEventListener("click", () => {
  completeCurrentSession();
});

logRestDayBtn.addEventListener("click", () => {
  logRestDay();
});

startUpperCBtn.addEventListener("click", () => {
  localStorage.removeItem("pendingUpperC");
  localStorage.setItem("activeSessionId", "upper_c");
  renderCurrentSession();
});

skipUpperCBtn.addEventListener("click", () => {
  localStorage.removeItem("pendingUpperC");
  localStorage.removeItem("activeSessionId");
  renderCurrentSession();
});
// =====================
// Health tabs (Workout / Sleep / Diet)
// =====================
window.addEventListener("DOMContentLoaded", () => {
  const buttons = document.querySelectorAll(".health-tab");
  const panes = {
    workout: document.getElementById("healthPaneWorkout"),
    sleep: document.getElementById("healthPaneSleep"),
    diet: document.getElementById("healthPaneDiet"),
  };

  function show(which) {
    console.log('[Health Tab] Switching to:', which);
    buttons.forEach((b) => b.classList.toggle("active", b.dataset.health === which));
    Object.entries(panes).forEach(([key, el]) => {
      if (!el) {
        console.warn('[Health Tab] Pane not found:', key);
        return;
      }
      const isActive = key === which;
      el.classList.toggle("active", isActive);

      // Detailed debugging
      const computedStyle = window.getComputedStyle(el);
      console.log('[Health Tab] Pane', key, isActive ? 'visible' : 'hidden',
        '\n  - classList:', el.className,
        '\n  - display:', computedStyle.display,
        '\n  - offsetHeight:', el.offsetHeight,
        '\n  - scrollHeight:', el.scrollHeight,
        '\n  - children:', el.children.length);
    });

    // CRITICAL FIX: Re-render Sleep/Diet content after panes become visible
    // This ensures canvas and other elements can measure themselves correctly
    if (which === 'sleep' && window.renderSleepInsights) {
      console.log('[Health Tab] Triggering sleep render...');
      requestAnimationFrame(() => {
        window.renderSleepInsights();
        if (window.renderSleepList) window.renderSleepList();
      });
    }

    if (which === 'diet') {
      console.log('[Health Tab] Triggering diet render...');
      requestAnimationFrame(() => {
        // Re-render all diet tabs
        if (window.renderDietPlanEditor) window.renderDietPlanEditor();
        if (window.renderDietChecklist) window.renderDietChecklist();
        if (window.renderDietProgressSummary) window.renderDietProgressSummary();
      });
    }
  }

  buttons.forEach((b) => {
    b.addEventListener("click", () => show(b.dataset.health));
  });

  // default
  show("workout");
});
// =====================
// Sleep tabs (Log / Progress)
// =====================
window.addEventListener("DOMContentLoaded", () => {
  const btns = document.querySelectorAll(".sleep-tab");
  const panes = {
    log: document.getElementById("sleepPaneLog"),
    progress: document.getElementById("sleepPaneProgress"),
  };

function show(which) {
  console.log('[Sleep Tab] Switching to:', which);
  btns.forEach(b => b.classList.toggle("active", b.dataset.sleep === which));

  Object.entries(panes).forEach(([key, el]) => {
    if (!el) {
      console.warn('[Sleep Tab] Pane not found:', key);
      return;
    }
    const isActive = key === which;
    el.classList.toggle("active", isActive);

    // Detailed debugging
    const computedStyle = window.getComputedStyle(el);
    console.log('[Sleep Tab] Pane', key, isActive ? 'visible' : 'hidden',
      '\n  - classList:', el.className,
      '\n  - display:', computedStyle.display,
      '\n  - offsetHeight:', el.offsetHeight,
      '\n  - scrollHeight:', el.scrollHeight);
  });

  // If we just opened Progress, re-render AFTER layout updates
  if (which === "progress" && window.renderSleepInsights) {
    console.log('[Sleep Tab] Re-rendering sleep insights...');
    requestAnimationFrame(() => window.renderSleepInsights());
  }
}

  btns.forEach(b => b.addEventListener("click", () => show(b.dataset.sleep)));

  // default
  console.log('[Sleep Tab Init] Initial pane states:',
    '\n  - sleepPaneLog:', panes.log?.className,
    '\n  - sleepPaneProgress:', panes.progress?.className);
  show("log");

  // Wire Sleep Progress swipeable dashboard
  const sleepProgressContainer = document.querySelector("#sleepPaneProgress .dashboard-card");
  if (sleepProgressContainer) {
    const sleepProgressTabs = sleepProgressContainer.querySelectorAll(".dashboard-tab");
    const sleepProgressPanels = sleepProgressContainer.querySelectorAll(".dashboard-content-panel");
    const sleepProgressContentContainer = document.getElementById("sleepProgressContentContainer");

    sleepProgressTabs.forEach((tab, index) => {
      tab.addEventListener("click", () => {
        sleepProgressTabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");

        const panel = sleepProgressPanels[index];
        if (panel && sleepProgressContentContainer) {
          sleepProgressContentContainer.scrollTo({
            left: panel.offsetLeft,
            behavior: "smooth"
          });
        }
      });
    });

    // Scroll sync for swipe gestures
    let sleepProgressScrollTimeout;
    sleepProgressContentContainer.addEventListener("scroll", () => {
      clearTimeout(sleepProgressScrollTimeout);
      sleepProgressScrollTimeout = setTimeout(() => {
        const scrollLeft = sleepProgressContentContainer.scrollLeft;
        const containerWidth = sleepProgressContentContainer.offsetWidth;
        const activeIndex = Math.round(scrollLeft / containerWidth);

        sleepProgressTabs.forEach((tab, index) => {
          if (index === activeIndex) {
            tab.classList.add("active");
          } else {
            tab.classList.remove("active");
          }
        });
      }, 50);
    });
  }
});

// =====================
// Tabs (Train / Progress)
// =====================
window.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
      // Remove active from all tabs
      document.querySelectorAll(".tab").forEach(t =>
        t.classList.remove("active")
      );

      // Hide all tab contents
      document.querySelectorAll(".tab-content").forEach(c =>
        c.classList.remove("active")
      );

      // Activate clicked tab
      tab.classList.add("active");

      // Show matching tab content
      const targetId = tab.dataset.tab + "Tab";
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        targetEl.classList.add("active");
      }
    });
  });
});
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
}

function initTheme() {
  const saved = localStorage.getItem("theme");
  if (saved === "light" || saved === "dark") {
    applyTheme(saved);
    return;
  }
  // default
  applyTheme("dark");
}

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") || "dark";
    applyTheme(current === "dark" ? "light" : "dark");
  });
}

// =====================
// Sidebar Navigation
// =====================
window.addEventListener("DOMContentLoaded", () => {
  const sidebar = document.getElementById("sidebar");
  const sidebarOverlay = document.getElementById("sidebarOverlay");
  const sidebarToggle = document.getElementById("sidebarToggle");
  const sidebarClose = document.getElementById("sidebarClose");
  const sidebarLinks = document.querySelectorAll(".sidebar-link");
  const pageTitle = document.getElementById("pageTitle");

  // Function to open sidebar
  function openSidebar() {
    sidebar.classList.add("open");
    sidebarOverlay.classList.add("open");
    sidebarToggle.classList.add("open");
  }

  // Function to close sidebar
  function closeSidebar() {
    sidebar.classList.remove("open");
    sidebarOverlay.classList.remove("open");
    sidebarToggle.classList.remove("open");
  }

  // Hamburger button click
  if (sidebarToggle) {
    sidebarToggle.addEventListener("click", () => {
      if (sidebar.classList.contains("open")) {
        closeSidebar();
      } else {
        openSidebar();
      }
    });
  }

  // Close button click
  if (sidebarClose) {
    sidebarClose.addEventListener("click", closeSidebar);
  }

  // Overlay click
  if (sidebarOverlay) {
    sidebarOverlay.addEventListener("click", closeSidebar);
  }

  // Sidebar link clicks
  sidebarLinks.forEach(link => {
    link.addEventListener("click", () => {
      // Update active state
      sidebarLinks.forEach(l => l.classList.remove("active"));
      link.classList.add("active");

      // Update page title
      const linkText = link.querySelector("span:last-child").textContent;
      if (pageTitle) {
        pageTitle.textContent = linkText;
      }

      // Close sidebar after navigation
      closeSidebar();
    });
  });

  // Update page title based on active tab
  function updatePageTitle() {
    const activeTab = document.querySelector(".tab.active");
    if (activeTab && pageTitle) {
      const tabText = activeTab.textContent.trim();
      pageTitle.textContent = tabText;
    }
  }

  // Listen for tab changes to update page title
  document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
      setTimeout(updatePageTitle, 0);
    });
  });

  // Set initial page title
  updatePageTitle();
});

// =====================
// Initial load
// =====================
loadLogs();
setVariantOptionsForPattern(patternSelect.value);
renderCurrentSession();
renderRestNotice();
renderProgressExerciseOptions();
renderProgressForExercise("");
