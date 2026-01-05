/* =========================
   finance.js — Finances (v2 - Revolut Style)
   - Revolut-inspired design
   - Enhanced UI with cards
   - All original functionality preserved
   ========================= */

(function () {
  function isoToday() {
    return new Date().toISOString().slice(0, 10);
  }

  function escapeHTML(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function money(n) {
    const v = Number(n) || 0;
    return v.toLocaleString(undefined, { style: "currency", currency: "GBP" });
  }

  function startOfWeekMondayISO(iso) {
    const d = new Date(iso + "T00:00:00");
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    d.setDate(d.getDate() + diff);
    return toISODateLocal(d);
  }

  function addDaysISO(iso, n) {
    const d = new Date(iso + "T00:00:00");
    d.setDate(d.getDate() + n);
    return toISODateLocal(d);
  }

  function yearKey(iso) {
    return String(iso || "").slice(0, 4);
  }

  function monthKey(iso) {
    return String(iso || "").slice(0, 7);
  }

  function lastDayOfMonthDate(year, monthIndex0) {
    return new Date(year, monthIndex0 + 1, 0);
  }

  function toISODateLocal(d) {
    const x = new Date(d);
    const y = x.getFullYear();
    const m = String(x.getMonth() + 1).padStart(2, "0");
    const day = String(x.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function computePaydayISO(rule, forMonthISO) {
    const y = Number(String(forMonthISO).slice(0, 4));
    const m = Number(String(forMonthISO).slice(5, 7)) - 1;
    if (!Number.isFinite(y) || !Number.isFinite(m) || m < 0 || m > 11) return isoToday();

    let d = lastDayOfMonthDate(y, m);

    if (rule === "last_working_day") {
      while (d.getDay() === 0 || d.getDay() === 6) {
        d.setDate(d.getDate() - 1);
      }
    }
    return toISODateLocal(d);
  }

  // -------- DB helpers --------

  function getAccounts() {
    return (window.LifeOSDB?.getCollection("moneyAccounts") || []).filter(Boolean);
  }

  function getTransactions() {
    return (window.LifeOSDB?.getCollection("moneyTransactions") || []).filter(Boolean);
  }

  function getCategories() {
    return (window.LifeOSDB?.getCollection("categories") || []).filter(Boolean);
  }

  function getSettings() {
    const arr = (window.LifeOSDB?.getCollection("moneySettings") || []).filter(Boolean);
    return arr[0] || null;
  }

  function upsertSettings(patch) {
    const now = window.LifeOSDB.nowISO();
    const prev = getSettings() || { id: "money_settings", createdAt: now };
    window.LifeOSDB.upsert("moneySettings", {
      ...prev,
      ...patch,
      id: "money_settings",
      updatedAt: now,
    });
  }

  // -------- Seed categories --------

  function ensureDefaultCategories() {
    const existing = getCategories();
    if (existing.length > 0) return;

    const now = window.LifeOSDB.nowISO();
    const defaults = [
      { id: "cat_salary", name: "Salary", essentialDefault: "essential" },
      { id: "cat_rent", name: "Rent/Mortgage", essentialDefault: "essential" },
      { id: "cat_bills", name: "Bills", essentialDefault: "essential" },
      { id: "cat_groceries", name: "Groceries", essentialDefault: "essential" },
      { id: "cat_transport", name: "Transport", essentialDefault: "essential" },
      { id: "cat_debt", name: "Debt/Loan", essentialDefault: "essential" },
      { id: "cat_savings", name: "Savings", essentialDefault: "essential" },
      { id: "cat_eatingout", name: "Eating out", essentialDefault: "optional" },
      { id: "cat_fun", name: "Fun", essentialDefault: "optional" },
      { id: "cat_shopping", name: "Shopping", essentialDefault: "optional" },
      { id: "cat_other", name: "Other", essentialDefault: "optional" },
    ];

    defaults.forEach((c) => {
      window.LifeOSDB.upsert("categories", {
        ...c,
        createdAt: now,
        updatedAt: now,
      });
    });
  }

  // -------- UI renderers --------

  function computeDerivedBalances() {
    const accounts = getAccounts();
    const txs = getTransactions();

    const sumByAccount = new Map();
    txs.forEach((t) => {
      if (!t || !t.accountId) return;
      const amt = Number(t.amount) || 0;
      sumByAccount.set(t.accountId, (sumByAccount.get(t.accountId) || 0) + amt);
    });

    return accounts.map((a) => {
      const start = Number(a.startBalance) || 0;
      const delta = sumByAccount.get(a.id) || 0;
      return { ...a, derivedBalance: start + delta };
    });
  }

  function renderTopSummary(period) {
    const totalBalEl = document.getElementById("moneyTotalBalance");
    const periodNetEl = document.getElementById("moneyPeriodNet");
    const periodNetLabelEl = document.getElementById("moneyPeriodNetLabel");

    if (!totalBalEl || !periodNetEl || !periodNetLabelEl) return;

    const accounts = computeDerivedBalances();
    const total = accounts.reduce((m, a) => m + (Number(a.derivedBalance) || 0), 0);

    totalBalEl.textContent = money(total);
    totalBalEl.className = `stat-value ${total >= 0 ? "" : ""}`;

    // Calculate period net
    const today = isoToday();
    const txsAll = getTransactions();
    let txs = [];
    let label = "This Month";

    if (period === "week") {
      const start = startOfWeekMondayISO(today);
      const end = addDaysISO(start, 6);
      txs = txsAll.filter((t) => t && t.date >= start && t.date <= end);
      label = "This Week";
    } else if (period === "year") {
      const y = yearKey(today);
      txs = txsAll.filter((t) => yearKey(t.date) === y);
      label = "This Year";
    } else {
      const mk = monthKey(today);
      txs = txsAll.filter((t) => monthKey(t.date) === mk);
      label = "This Month";
    }

    const net = txs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    periodNetEl.textContent = money(net);
    periodNetEl.className = `stat-value`;
    periodNetEl.style.color = net >= 0 ? "#22c55e" : "var(--danger)";
    periodNetLabelEl.textContent = label;
  }

  function renderOverview() {
    const out = document.getElementById("moneyOverview");
    if (!out) return;

    const accounts = computeDerivedBalances();
    const total = accounts.reduce((m, a) => m + (Number(a.derivedBalance) || 0), 0);

    if (accounts.length === 0) {
      out.innerHTML = `<div style="color:var(--muted);text-align:center;">Add an account to begin</div>`;
      return;
    }

    out.innerHTML = `
      <div style="text-align:center;">
        <div style="font-size:13px; color:var(--muted); margin-bottom:4px;">Total across ${accounts.length} account${accounts.length !== 1 ? "s" : ""}</div>
        <div style="font-size:32px; font-weight:700; color:${total >= 0 ? "var(--text)" : "var(--danger)"};">${escapeHTML(money(total))}</div>
      </div>
    `;
  }

  function renderAccountsList() {
    const container = document.getElementById("moneyAccountsList");
    if (!container) return;

    const accounts = computeDerivedBalances().slice().sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
    container.innerHTML = "";

    if (accounts.length === 0) {
      container.innerHTML = `
        <div class="revolut-empty-state" style="padding:20px;">
          <div class="revolut-empty-icon">💳</div>
          <div class="revolut-empty-title">No accounts</div>
          <div class="revolut-empty-description">Click + Add to create your first account</div>
        </div>
      `;
      return;
    }

    accounts.forEach((a) => {
      const card = document.createElement("div");
      card.className = "revolut-card";

      const meta = [a.bank, a.type].filter(Boolean).join(" • ");
      card.innerHTML = `
        <div class="revolut-card-header">
          <div class="revolut-card-title">${escapeHTML(a.name || "Account")}</div>
          <div class="revolut-card-value ${a.derivedBalance >= 0 ? "positive" : "negative"}">${escapeHTML(money(a.derivedBalance))}</div>
        </div>
        ${meta ? `<div class="revolut-card-subtitle">${escapeHTML(meta)}</div>` : ""}
        <div class="revolut-card-meta">
          <span>Start: ${escapeHTML(money(a.startBalance))}</span>
          <span class="meta-separator">•</span>
          <button type="button" data-del="${escapeHTML(a.id)}" style="background:none;border:none;color:var(--danger);cursor:pointer;padding:0;font-size:13px;">Delete</button>
        </div>
      `;

      card.addEventListener("click", (e) => {
        if (e.target.hasAttribute("data-del")) return;
        enterAccountDetail(a.id);
      });

      card.querySelector("[data-del]")?.addEventListener("click", (e) => {
        e.stopPropagation();
        if (!confirm(`Delete account "${a.name}"?`)) return;
        window.LifeOSDB.remove("moneyAccounts", a.id);
        refreshAll();
      });

      container.appendChild(card);
    });
  }

  function renderAccountDetail(selectedAccountId) {
    const header = document.getElementById("moneyAccountDetailHeader");
    const nameEl = document.getElementById("moneyAccountDetailName");
    const balEl = document.getElementById("moneyAccountDetailBalance");

    if (selectedAccountId) {
      const acct = computeDerivedBalances().find((x) => x.id === selectedAccountId);
      if (acct && header) {
        header.style.display = "block";
        if (nameEl) nameEl.textContent = acct.name || "Account";
        if (balEl) {
          balEl.textContent = money(acct.derivedBalance);
          balEl.className = `revolut-card-value ${acct.derivedBalance >= 0 ? "positive" : "negative"}`;
        }
      }
    } else {
      if (header) header.style.display = "none";
    }
  }

  function renderPeriodSummary(period) {
    const out = document.getElementById("moneyMonthSummary");
    if (!out) return;

    const today = isoToday();
    const txsAll = getTransactions();

    let txs = [];

    if (period === "week") {
      const start = startOfWeekMondayISO(today);
      const end = addDaysISO(start, 6);
      txs = txsAll.filter((t) => t && t.date >= start && t.date <= end);
    } else if (period === "year") {
      const y = yearKey(today);
      txs = txsAll.filter((t) => yearKey(t.date) === y);
    } else {
      const mk = monthKey(today);
      txs = txsAll.filter((t) => monthKey(t.date) === mk);
    }

    let income = 0;
    let spend = 0;
    let essentialSpend = 0;
    let optionalSpend = 0;

    txs.forEach((t) => {
      const amt = Number(t.amount) || 0;
      if (amt >= 0) income += amt;
      else spend += amt;

      if (amt < 0) {
        if ((t.essentiality || "optional") === "essential") essentialSpend += amt;
        else optionalSpend += amt;
      }
    });

    const net = income + spend;

    out.innerHTML = `
      <div class="revolut-card" style="cursor:default;">
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:12px;">
          <div>
            <div style="font-size:13px; color:var(--muted); margin-bottom:4px;">Income</div>
            <div style="font-size:24px; font-weight:700; color:#22c55e;">${escapeHTML(money(income))}</div>
          </div>
          <div>
            <div style="font-size:13px; color:var(--muted); margin-bottom:4px;">Spending</div>
            <div style="font-size:24px; font-weight:700; color:var(--danger);">${escapeHTML(money(spend))}</div>
          </div>
        </div>
        <div style="padding-top:12px; border-top:1px solid var(--border);">
          <div style="font-size:13px; color:var(--muted); margin-bottom:4px;">Net Change</div>
          <div style="font-size:28px; font-weight:700; color:${net >= 0 ? "#22c55e" : "var(--danger)"};">${escapeHTML(money(net))}</div>
        </div>
        <div class="revolut-card-meta" style="margin-top:12px;">
          <span>Essential: ${escapeHTML(money(essentialSpend))}</span>
          <span class="meta-separator">•</span>
          <span>Optional: ${escapeHTML(money(optionalSpend))}</span>
        </div>
      </div>
    `;
  }

  function renderCategoryBreakdown(period) {
    const catContainer = document.getElementById("moneyCategorySummary");
    if (!catContainer) return;

    const today = isoToday();
    const txsAll = getTransactions();

    let txs = [];

    if (period === "week") {
      const start = startOfWeekMondayISO(today);
      const end = addDaysISO(start, 6);
      txs = txsAll.filter((t) => t && t.date >= start && t.date <= end);
    } else if (period === "year") {
      const y = yearKey(today);
      txs = txsAll.filter((t) => yearKey(t.date) === y);
    } else {
      const mk = monthKey(today);
      txs = txsAll.filter((t) => monthKey(t.date) === mk);
    }

    const byCat = new Map();
    txs.forEach((t) => {
      const key = t.categoryId || "cat_other";
      byCat.set(key, (byCat.get(key) || 0) + (Number(t.amount) || 0));
    });

    const cats = getCategories();
    const catById = new Map(cats.map((c) => [c.id, c]));

    const rows = Array.from(byCat.entries())
      .map(([catId, total]) => ({ catId, total }))
      .sort((a, b) => Math.abs(b.total) - Math.abs(a.total));

    catContainer.innerHTML = "";
    if (rows.length === 0) {
      catContainer.innerHTML = `
        <div class="revolut-empty-state" style="padding:20px;">
          <div class="revolut-empty-icon">📊</div>
          <div class="revolut-empty-description">No transactions in this period</div>
        </div>
      `;
      return;
    }

    rows.forEach((r) => {
      const c = catById.get(r.catId);
      const name = c?.name || "Other";

      const card = document.createElement("div");
      card.className = "revolut-card";
      card.style.cursor = "default";
      card.innerHTML = `
        <div class="revolut-card-header">
          <div class="revolut-card-title">${escapeHTML(name)}</div>
          <div class="revolut-card-value ${r.total >= 0 ? "positive" : "negative"}">${escapeHTML(money(r.total))}</div>
        </div>
      `;
      catContainer.appendChild(card);
    });
  }

  function renderTxHistory(period) {
    const container = document.getElementById("moneyTxList");
    if (!container) return;

    const accounts = getAccounts();
    const accById = new Map(accounts.map((a) => [a.id, a]));
    const cats = getCategories();
    const catById = new Map(cats.map((c) => [c.id, c]));

    const today = isoToday();
    const txsAll = getTransactions();

    let txsFiltered = txsAll;

    if (period === "week") {
      const start = startOfWeekMondayISO(today);
      const end = addDaysISO(start, 6);
      txsFiltered = txsFiltered.filter((t) => t && t.date >= start && t.date <= end);
    } else if (period === "year") {
      const y = yearKey(today);
      txsFiltered = txsFiltered.filter((t) => yearKey(t.date) === y);
    } else {
      const mk = monthKey(today);
      txsFiltered = txsFiltered.filter((t) => monthKey(t.date) === mk);
    }

    const txs = txsFiltered
      .slice()
      .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

    container.innerHTML = "";
    if (txs.length === 0) {
      container.innerHTML = `
        <div class="revolut-empty-state" style="padding:20px;">
          <div class="revolut-empty-icon">📝</div>
          <div class="revolut-empty-description">No transactions yet</div>
        </div>
      `;
      return;
    }

    txs.forEach((t) => {
      const acc = accById.get(t.accountId);
      const cat = catById.get(t.categoryId);

      const note = (t.note || "").trim();
      const merchant = (t.merchant || "").trim();
      const title = merchant || (cat?.name || "Transaction");

      const card = document.createElement("div");
      card.className = "revolut-card";
      card.style.cursor = "default";
      card.innerHTML = `
        <div class="revolut-card-header">
          <div style="flex:1;">
            <div class="revolut-card-title">${escapeHTML(title)}</div>
            <div class="revolut-card-subtitle">${escapeHTML(t.date)} ${acc ? "• " + escapeHTML(acc.name) : ""}</div>
            ${note ? `<div class="revolut-card-meta">${escapeHTML(note)}</div>` : ""}
          </div>
          <div style="text-align:right;">
            <div class="revolut-card-value ${t.amount >= 0 ? "positive" : "negative"}">${escapeHTML(money(t.amount))}</div>
            <button type="button" data-del="${escapeHTML(t.id)}" style="margin-top:6px; padding:6px 12px; background:none; border:1px solid var(--border); border-radius:8px; color:var(--danger); cursor:pointer; font-size:12px;">Delete</button>
          </div>
        </div>
      `;

      card.querySelector("[data-del]")?.addEventListener("click", (e) => {
        e.stopPropagation();
        if (!confirm(`Delete this transaction on ${t.date}?`)) return;
        window.LifeOSDB.remove("moneyTransactions", t.id);
        refreshAll();
      });

      container.appendChild(card);
    });
  }

  function renderAccountOptions(selectedAccountId) {
    const sel = document.getElementById("moneyTxAccount");
    if (!sel) return;

    const accounts = getAccounts().slice().sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));

    sel.innerHTML = "";
    if (accounts.length === 0) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "Add an account first";
      sel.appendChild(opt);
      sel.disabled = true;
      return;
    }

    sel.disabled = false;
    accounts.forEach((a) => {
      const opt = document.createElement("option");
      opt.value = a.id;
      opt.textContent = a.name || "Account";
      if (selectedAccountId && a.id === selectedAccountId) {
        opt.selected = true;
      }
      sel.appendChild(opt);
    });
  }

  function renderCategoryOptions() {
    const sel = document.getElementById("moneyTxCategory");
    if (!sel) return;

    const cats = getCategories().slice().sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));

    sel.innerHTML = "";
    if (cats.length === 0) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "No categories";
      sel.appendChild(opt);
      sel.disabled = true;
      return;
    }

    sel.disabled = false;
    cats.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.name || "Category";
      sel.appendChild(opt);
    });
  }

  function renderSalaryHint() {
    const hint = document.getElementById("moneySalaryHint");
    if (!hint) return;

    const s = getSettings();
    if (!s || (!Number(s.salaryNet) && !Number(s.salaryDeductions))) {
      hint.textContent = "Optional payday tracking";
      return;
    }

    const net = Number(s.salaryNet) || 0;
    hint.textContent = `Net ${money(net)} • ${(s.paydayRule || "last_working_day").replaceAll("_", " ")}`;
  }

  function setMoneyPeriodTitle(period) {
    const el = document.getElementById("moneyPeriodTitle");
    if (!el) return;

    if (period === "week") el.textContent = "This Week";
    else if (period === "year") el.textContent = "This Year";
    else el.textContent = "This Month";
  }

  function enterAccountDetail(accountId) {
    upsertSettings({ selectedAccountId: accountId });
    refreshAll();
  }

  function exitAccountDetail() {
    upsertSettings({ selectedAccountId: null });
    refreshAll();
  }

  function refreshAll() {
    const s = getSettings();
    const period = (s && s.selectedPeriod) ? s.selectedPeriod : "month";
    const selectedAccountId = s && s.selectedAccountId ? s.selectedAccountId : null;

    setMoneyPeriodTitle(period);
    renderTopSummary(period);
    renderOverview();
    renderAccountsList();
    renderAccountDetail(selectedAccountId);
    renderAccountOptions(selectedAccountId);
    renderCategoryOptions();
    renderSalaryHint();
    renderPeriodSummary(period);
    renderCategoryBreakdown(period);
    renderTxHistory(period);

    // Update period button active states
    const wk = document.getElementById("moneyPeriodWeekBtn");
    const mo = document.getElementById("moneyPeriodMonthBtn");
    const yr = document.getElementById("moneyPeriodYearBtn");
    if (wk) wk.classList.toggle("active", period === "week");
    if (mo) mo.classList.toggle("active", period === "month");
    if (yr) yr.classList.toggle("active", period === "year");
  }

  // -------- Wires --------

  function wireCollapsibles() {
    document.querySelectorAll(".revolut-collapsible-header").forEach((header) => {
      header.addEventListener("click", () => {
        const collapsible = header.closest(".revolut-collapsible");
        if (collapsible) {
          collapsible.classList.toggle("expanded");
        }
      });
    });
  }

  function wireAccountForm() {
    const form = document.getElementById("moneyAccountForm");
    const addBtn = document.getElementById("moneyAddAccountBtn");
    const cancelBtn = document.getElementById("moneyCancelAccountBtn");
    const collapsible = document.getElementById("moneyAccountCollapsible");

    if (addBtn && collapsible) {
      addBtn.addEventListener("click", () => {
        collapsible.style.display = "block";
      });
    }

    if (cancelBtn && collapsible) {
      cancelBtn.addEventListener("click", () => {
        collapsible.style.display = "none";
        form?.reset();
      });
    }

    if (!form) return;

    const nameEl = document.getElementById("moneyAccountName");
    const bankEl = document.getElementById("moneyAccountBank");
    const typeEl = document.getElementById("moneyAccountType");
    const balEl = document.getElementById("moneyAccountBalance");

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const name = (nameEl?.value || "").trim();
      if (!name) return;

      const bank = (bankEl?.value || "").trim();
      const type = typeEl?.value || "current";
      const startBalance = Number(balEl?.value);

      if (!Number.isFinite(startBalance)) return;

      window.LifeOSDB.upsert("moneyAccounts", {
        name,
        bank,
        type,
        startBalance,
        createdAt: window.LifeOSDB.nowISO(),
        updatedAt: window.LifeOSDB.nowISO(),
      });

      if (nameEl) nameEl.value = "";
      if (bankEl) bankEl.value = "";
      if (balEl) balEl.value = "";

      if (collapsible) collapsible.style.display = "none";
      refreshAll();
    });
  }

  function wireSalaryForm() {
    const form = document.getElementById("moneySalaryForm");
    if (!form) return;

    const netEl = document.getElementById("moneySalaryNet");
    const dedEl = document.getElementById("moneySalaryDeductions");
    const ruleEl = document.getElementById("moneyPaydayRule");

    const s = getSettings();
    if (s) {
      if (netEl && s.salaryNet != null) netEl.value = String(s.salaryNet);
      if (dedEl && s.salaryDeductions != null) dedEl.value = String(s.salaryDeductions);
      if (ruleEl && s.paydayRule) ruleEl.value = s.paydayRule;
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const salaryNet = netEl?.value === "" ? 0 : Number(netEl?.value);
      const salaryDeductions = dedEl?.value === "" ? 0 : Number(dedEl?.value);
      const paydayRule = ruleEl?.value || "last_working_day";

      if (!Number.isFinite(salaryNet) || !Number.isFinite(salaryDeductions)) return;

      upsertSettings({ salaryNet, salaryDeductions, paydayRule });
      refreshAll();
    });
  }

  function wireAddPaydayButton() {
    const btn = document.getElementById("moneyAddPaydayBtn");
    if (!btn) return;

    btn.addEventListener("click", () => {
      const s = getSettings();
      if (!s || !Number.isFinite(Number(s.salaryNet)) || Number(s.salaryNet) <= 0) {
        Toast.warning("Save a monthly net salary first.");
        return;
      }

      const accounts = getAccounts();
      if (accounts.length === 0) {
        Toast.warning("Add an account first.");
        return;
      }

      const today = isoToday();
      const paydayISO = computePaydayISO(s.paydayRule || "last_working_day", today);

      const mk = monthKey(paydayISO);
      const existing = getTransactions().find((t) => t && t.isPayday === true && monthKey(t.date) === mk);
      if (existing) {
        Toast.info("Payday income for this month already exists.");
        return;
      }

      const accountId = accounts[0].id;

      window.LifeOSDB.upsert("moneyTransactions", {
        date: paydayISO,
        accountId,
        amount: Number(s.salaryNet),
        categoryId: "cat_salary",
        essentiality: "essential",
        merchant: "Salary",
        note: Number(s.salaryDeductions) ? `Deductions: ${money(Number(s.salaryDeductions))}` : "",
        isPayday: true,
        createdAt: window.LifeOSDB.nowISO(),
        updatedAt: window.LifeOSDB.nowISO(),
      });

      refreshAll();
      Toast.success(`Added payday income on ${paydayISO}.`);
    });
  }

  function wirePeriodButtons() {
    const wk = document.getElementById("moneyPeriodWeekBtn");
    const mo = document.getElementById("moneyPeriodMonthBtn");
    const yr = document.getElementById("moneyPeriodYearBtn");

    function setPeriod(p) {
      upsertSettings({ selectedPeriod: p });
      refreshAll();
    }

    if (wk) wk.addEventListener("click", () => setPeriod("week"));
    if (mo) mo.addEventListener("click", () => setPeriod("month"));
    if (yr) yr.addEventListener("click", () => setPeriod("year"));
  }

  function wireAccountBackButton() {
    const btn = document.getElementById("moneyBackToAccountsBtn");
    if (!btn) return;
    btn.addEventListener("click", () => {
      exitAccountDetail();
    });
  }

  function wireTxForm() {
    const form = document.getElementById("moneyTxForm");
    const quickExpenseBtn = document.getElementById("moneyQuickAddExpenseBtn");
    const quickIncomeBtn = document.getElementById("moneyQuickAddIncomeBtn");
    const cancelBtn = document.getElementById("moneyCancelTxBtn");
    const collapsible = document.getElementById("moneyTxCollapsible");

    if (quickExpenseBtn && collapsible) {
      quickExpenseBtn.addEventListener("click", () => {
        collapsible.style.display = "block";
        const amountEl = document.getElementById("moneyTxAmount");
        if (amountEl) amountEl.value = "";
      });
    }

    if (quickIncomeBtn && collapsible) {
      quickIncomeBtn.addEventListener("click", () => {
        collapsible.style.display = "block";
        const amountEl = document.getElementById("moneyTxAmount");
        if (amountEl) amountEl.value = "";
      });
    }

    if (cancelBtn && collapsible) {
      cancelBtn.addEventListener("click", () => {
        collapsible.style.display = "none";
        form?.reset();
      });
    }

    if (!form) return;

    const dateEl = document.getElementById("moneyTxDate");
    const accountEl = document.getElementById("moneyTxAccount");
    const amountEl = document.getElementById("moneyTxAmount");
    const catEl = document.getElementById("moneyTxCategory");
    const essEl = document.getElementById("moneyTxEssential");
    const merchEl = document.getElementById("moneyTxMerchant");
    const noteEl = document.getElementById("moneyTxNote");

    if (dateEl && !dateEl.value) dateEl.value = isoToday();

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const date = dateEl?.value || "";
      const accountId = accountEl?.value || "";
      const amount = Number(amountEl?.value);
      const categoryId = catEl?.value || "";
      const essentiality = essEl?.value === "essential" ? "essential" : "optional";

      if (!date || !accountId || !categoryId) return;
      if (!Number.isFinite(amount) || amount === 0) return;

      window.LifeOSDB.upsert("moneyTransactions", {
        date,
        accountId,
        amount,
        categoryId,
        essentiality,
        merchant: (merchEl?.value || "").trim(),
        note: (noteEl?.value || "").trim(),
        createdAt: window.LifeOSDB.nowISO(),
        updatedAt: window.LifeOSDB.nowISO(),
      });

      if (amountEl) amountEl.value = "";
      if (merchEl) merchEl.value = "";
      if (noteEl) noteEl.value = "";

      if (collapsible) collapsible.style.display = "none";
      refreshAll();
    });
  }

  // -------- Boot --------

  document.addEventListener("DOMContentLoaded", () => {
    if (!window.LifeOSDB) return;
    if (!document.getElementById("view-finances")) return;

    ensureDefaultCategories();

    wireCollapsibles();
    wireAccountForm();
    wireSalaryForm();
    wireAddPaydayButton();
    wireTxForm();
    wirePeriodButtons();
    wireAccountBackButton();

    refreshAll();

    window.addEventListener("hashchange", () => {
      if ((window.location.hash || "").toLowerCase() === "#finances") {
        refreshAll();
      }
    });
  });
})();
