/* =========================
   Life OS Shell Router
   - Adds top-level navigation between modules
   - Does NOT modify workouts.js or app.js
   ========================= */

(function () {
  // Human-facing build marker, and the single source of truth for it. Bump this
  // alongside CACHE_NAME in sw.js on every deploy, so a glance at the badge in
  // the header confirms which build the installed PWA is actually running.
  const APP_VERSION = "v53";

  const ROUTES = ["today", "workouts", "metrics", "goals", "plan", "work", "finances", "journal", "people"];

  function getRoute() {
    const raw = (window.location.hash || "").replace("#", "").trim().toLowerCase();
    if (!raw) return "today";
    return ROUTES.includes(raw) ? raw : "today";
  }

  function setActiveNav(route) {
    const links = document.querySelectorAll(".lifeos-nav a[data-route]");
    links.forEach((a) => {
      a.classList.toggle("active", a.getAttribute("data-route") === route);
    });
  }

  function setActiveView(route) {
    const views = document.querySelectorAll(".lifeos-view");
    views.forEach((v) => v.classList.remove("active"));

    const active = document.getElementById(`view-${route}`);
    if (active) active.classList.add("active");
  }

  function updatePageTitle(route) {
    const pageTitle = document.getElementById("pageTitle");
    if (!pageTitle) return;

    // Map routes to display names
    const titleMap = {
      today: "Today",
      workouts: "Workouts",
      metrics: "Metrics",
      goals: "Goals",
      plan: "Plan",
      work: "Work",
      finances: "Finances",
      journal: "Journal",
      people: "People"
    };

    pageTitle.textContent = titleMap[route] || "Life OS";
  }

  // Written once on load, not per route. The span ships empty so this constant
  // stays the only place the version is stated.
  function renderAppVersion() {
    const el = document.getElementById("appVersion");
    if (!el) return;
    el.textContent = APP_VERSION;
  }

  function render() {
    const route = getRoute();
    setActiveNav(route);
    setActiveView(route);
    updatePageTitle(route);
  }

  document.addEventListener("DOMContentLoaded", () => {
    // Ensure initial hash exists for consistent behavior
    if (!window.location.hash) {
      window.location.hash = "#today";
    }
    window.addEventListener("hashchange", render);
    renderAppVersion();
    render();
  });
})();
