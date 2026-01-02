/* =========================
   finance.js — Finances (v1)
   - Offline-first
   - Accounts + transactions
   - Expenses are negative numbers
   - Basic monthly summary + category totals
   - Optional salary settings (manual “Add payday” button)
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
  const day = d.getDay(); // 0 Sun ... 6 Sat
  const diff = (day === 0 ? -6 : 1) - day; // shift to Monday
  d.setDate(d.getDate() + diff);
  return toISODateLocal(d);
}

function addDaysISO(iso, n) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return toISODateLocal(d);
}

function yearKey(iso) {
  return String(iso || "").slice(0, 4); // "YYYY"
}

  function monthKey(iso) {
    // "YYYY-MM"
    return String(iso || "").slice(0, 7);
  }

  function lastDayOfMonthDate(year, monthIndex0) {
    // monthIndex0: 0..11
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
    // forMonthISO: any date in that month
    const y = Number(String(forMonthISO).slice(0, 4));
    const m = Number(String(forMonthISO).slice(5, 7)) - 1;
    if (!Number.isFinite(y) || !Number.isFinite(m) || m < 0 || m > 11) return isoToday();

    let d = lastDayOfMonthDate(y, m);

    if (rule === "last_working_day") {
      // Mon-Fri only
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

  // -------- Seed categories (safe) --------

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

  function computeDerivedBalances() {
    // balance = startingBalance + sum(tx amounts for that account)
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

  function renderOverview(period) {
    const out = document.getElementById("moneyOverview");
    const hint = document.getElementById("moneyOverviewHint");
    if (!out || !hint) return;

    const accounts = computeDerivedBalances();
    const total = accounts.reduce((m, a) => m + (Number(a.derivedBalance) || 0), 0);

    if (accounts.length === 0) {
      out.innerHTML = `<div style="color:var(--muted);">Add an account to begin.</div>`;
      hint.textContent = "Tip: expenses are negative numbers (e.g. -12.50).";
      return;
    }

    out.innerHTML = `
      <div>Total across accounts: <strong>${escapeHTML(money(total))}</strong></div>
    `;
    hint.textContent = "Balances are computed from your starting balances + your transactions.";
  }

  function renderAccountsList(selectedAccountId) {
    const header = document.getElementById("moneyAccountDetailHeader");
const title = document.getElementById("moneyAccountsTitle");
const nameEl = document.getElementById("moneyAccountDetailName");
const balEl = document.getElementById("moneyAccountDetailBalance");

if (selectedAccountId) {
  const acct = computeDerivedBalances().find((x) => x.id === selectedAccountId);
  if (acct && header && title) {
    title.textContent = "Account";
    header.style.display = "block";
    if (nameEl) nameEl.textContent = acct.name || "Account";
    if (balEl) balEl.textContent = `Balance: ${money(acct.derivedBalance)}`;
  }
} else {
  if (header) header.style.display = "none";
  if (title) title.textContent = "Accounts";
}

    const ul = document.getElementById("moneyAccountsList");
    if (!ul) return;

    const accounts = computeDerivedBalances().slice().sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
    ul.innerHTML = "";

    if (accounts.length === 0) {
      ul.innerHTML = `<li style="color:var(--muted);">No accounts yet.</li>`;
      return;
    }

    accounts.forEach((a) => {
      const li = document.createElement("li");
      li.classList.add("money-account-row");
      li.style.display = "flex";
      li.style.justifyContent = "space-between";
      li.style.alignItems = "center";
      li.style.gap = "10px";

      const meta = [a.bank, a.type].filter(Boolean).join(" • ");
      li.innerHTML = `
        <div>
          <div><strong>${escapeHTML(a.name || "Account")}</strong></div>
          <div class="meta">${escapeHTML(meta)}</div>
        </div>
        <div style="text-align:right;">
          <div><strong>${escapeHTML(money(a.derivedBalance))}</strong></div>
          <div class="meta">start: ${escapeHTML(money(a.startBalance))}</div>
        </div>
        <div style="display:flex; gap:8px;">
          <button type="button" data-del="${escapeHTML(a.id)}">Delete</button>
        </div>
      `;
li.addEventListener("click", () => {
  enterAccountDetail(a.id);
});

      li.querySelector("[data-del]")?.addEventListener("click", (e) => {
  e.stopPropagation();
        if (!confirm(`Delete account "${a.name}"? (Transactions will remain but may become orphaned.)`)) return;
        window.LifeOSDB.remove("moneyAccounts", a.id);
        refreshAll();
      });

      ul.appendChild(li);
    });
  }

  function renderSalaryHint() {
    const hint = document.getElementById("moneySalaryHint");
    if (!hint) return;

    const s = getSettings();
    if (!s || (!Number(s.salaryNet) && !Number(s.salaryDeductions))) {
      hint.textContent = "Optional: save salary info so you can add payday income with one tap (no auto-logging).";
      return;
    }

    const net = Number(s.salaryNet) || 0;
    const ded = Number(s.salaryDeductions) || 0;
    const rule = s.paydayRule || "last_working_day";
    hint.textContent = `Saved: net ${money(net)} / deductions ${money(ded)} • rule: ${rule.replaceAll("_", " ")}.`;
  }
function setMoneyPeriodTitle(period) {
  const el = document.getElementById("moneyPeriodTitle");
  if (!el) return;

  if (period === "week") el.textContent = "This week";
  else if (period === "year") el.textContent = "This year";
  else el.textContent = "This month";
}

  function renderPeriodSummary(period) {
  const out = document.getElementById("moneyMonthSummary");
  const ul = document.getElementById("moneyCategorySummary");
  if (!out || !ul) return;

  const today = isoToday();
  const txsAll = getTransactions();

  let txs = [];
  let label = "";

  if (period === "week") {
    const start = startOfWeekMondayISO(today);
    const end = addDaysISO(start, 6);
    txs = txsAll.filter((t) => t && t.date >= start && t.date <= end);
    label = `This week (${start}–${end})`;
  } else if (period === "year") {
    const y = yearKey(today);
    txs = txsAll.filter((t) => yearKey(t.date) === y);
    label = `This year (${y})`;
  } else {
    const mk = monthKey(today);
    txs = txsAll.filter((t) => monthKey(t.date) === mk);
    label = `This month (${mk})`;
  }

  let income = 0;
  let spend = 0; // negative
  let essentialSpend = 0; // negative
  let optionalSpend = 0; // negative

  const byCat = new Map();

  txs.forEach((t) => {
    const amt = Number(t.amount) || 0;
    if (amt >= 0) income += amt;
    else spend += amt;

    if (amt < 0) {
      if ((t.essentiality || "optional") === "essential") essentialSpend += amt;
      else optionalSpend += amt;
    }

    const key = t.categoryId || "cat_other";
    byCat.set(key, (byCat.get(key) || 0) + amt);
  });

  const net = income + spend;

  out.innerHTML = `
    <div style="color:var(--muted); font-size:13px; margin-bottom:8px;">${escapeHTML(label)}</div>
    <div>Income: <strong>${escapeHTML(money(income))}</strong></div>
    <div>Spending: <strong>${escapeHTML(money(spend))}</strong></div>
    <div>Net: <strong>${escapeHTML(money(net))}</strong></div>
    <div class="meta" style="margin-top:6px;">
      Essential spending: ${escapeHTML(money(essentialSpend))} • Optional spending: ${escapeHTML(money(optionalSpend))}
    </div>
  `;

  const cats = getCategories();
  const catById = new Map(cats.map((c) => [c.id, c]));

  const rows = Array.from(byCat.entries())
    .map(([catId, total]) => ({ catId, total }))
    .sort((a, b) => Math.abs(b.total) - Math.abs(a.total));

  ul.innerHTML = "";
  if (rows.length === 0) {
    ul.innerHTML = `<li style="color:var(--muted);">No transactions in this period.</li>`;
    return;
  }

  rows.forEach((r) => {
    const c = catById.get(r.catId);
    const name = c?.name || "Other";
    const li = document.createElement("li");
    li.style.display = "flex";
    li.style.justifyContent = "space-between";
    li.style.alignItems = "center";
    li.style.gap = "10px";
    li.innerHTML = `
      <span>${escapeHTML(name)}</span>
      <strong>${escapeHTML(money(r.total))}</strong>
    `;
    ul.appendChild(li);
  });
}

  function renderTxHistory(period, selectedAccountId) {
    const ul = document.getElementById("moneyTxList");
    if (!ul) return;

    const accounts = getAccounts();
    const accById = new Map(accounts.map((a) => [a.id, a]));
    const cats = getCategories();
    const catById = new Map(cats.map((c) => [c.id, c]));

    const today = isoToday();
const txsAll = getTransactions();

let txsFiltered = [];
if (selectedAccountId) {
  txsFiltered = txsFiltered.filter((t) => t.accountId === selectedAccountId);
}

if (period === "week") {
  const start = startOfWeekMondayISO(today);
  const end = addDaysISO(start, 6);
  txsFiltered = txsAll.filter((t) => t && t.date >= start && t.date <= end);
} else if (period === "year") {
  const y = yearKey(today);
  txsFiltered = txsAll.filter((t) => yearKey(t.date) === y);
} else {
  const mk = monthKey(today);
  txsFiltered = txsAll.filter((t) => monthKey(t.date) === mk);
}

const txs = txsFiltered
  .slice()
  .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

    ul.innerHTML = "";
    if (txs.length === 0) {
      ul.innerHTML = `<li style="color:var(--muted);">No transactions yet.</li>`;
      return;
    }

    txs.forEach((t) => {
      const li = document.createElement("li");
      li.style.display = "flex";
      li.style.justifyContent = "space-between";
      li.style.alignItems = "flex-start";
      li.style.gap = "10px";

      const acc = accById.get(t.accountId);
      const cat = catById.get(t.categoryId);

      const metaLeft = [
        acc?.name ? `Acct: ${acc.name}` : "Acct: (missing)",
        cat?.name ? `Cat: ${cat.name}` : "Cat: (missing)",
        t.essentiality ? `• ${t.essentiality}` : "",
      ].filter(Boolean).join(" ");

      const note = (t.note || "").trim();
      const merchant = (t.merchant || "").trim();
      const title = merchant || (cat?.name || "Transaction");

      li.innerHTML = `
        <div style="flex:1;">
          <div><strong>${escapeHTML(t.date || "")}</strong> • ${escapeHTML(title)}</div>
          <div class="meta">${escapeHTML(metaLeft)}</div>
          ${note ? `<div class="meta">${escapeHTML(note)}</div>` : ""}
        </div>
        <div style="text-align:right;">
          <div><strong>${escapeHTML(money(t.amount))}</strong></div>
          <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:6px;">
            <button type="button" data-del="${escapeHTML(t.id)}">Delete</button>
          </div>
        </div>
      `;

      li.querySelector("[data-del]")?.addEventListener("click", () => {
        if (!confirm(`Delete this transaction on ${t.date}?`)) return;
        window.LifeOSDB.remove("moneyTransactions", t.id);
        refreshAll();
      });

      ul.appendChild(li);
    });
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
// Toggle "account detail mode" UI
const createWrap = document.getElementById("moneyAccountCreateWrap");
const detailHeader = document.getElementById("moneyAccountDetailHeader");

if (selectedAccountId) {
  if (createWrap) createWrap.style.display = "none";
  if (detailHeader) detailHeader.style.display = "block";
} else {
  if (createWrap) createWrap.style.display = "";
  if (detailHeader) detailHeader.style.display = "none";
}

  setMoneyPeriodTitle(period);

  renderOverview(period);
  renderAccountsList(selectedAccountId);
  renderAccountOptions(selectedAccountId);
  renderCategoryOptions();
  renderSalaryHint();
  renderPeriodSummary(period, selectedAccountId);
  renderTxHistory(period, selectedAccountId);

  // Update chip active state
  const wk = document.getElementById("moneyPeriodWeekBtn");
  const mo = document.getElementById("moneyPeriodMonthBtn");
  const yr = document.getElementById("moneyPeriodYearBtn");
  if (wk) wk.classList.toggle("active", period === "week");
  if (mo) mo.classList.toggle("active", period === "month");
  if (yr) yr.classList.toggle("active", period === "year");
}

  // -------- Wires --------

  function wireAccountForm() {
    const form = document.getElementById("moneyAccountForm");
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

      refreshAll();
    });
  }

  function wireSalaryForm() {
    const form = document.getElementById("moneySalaryForm");
    if (!form) return;

    const netEl = document.getElementById("moneySalaryNet");
    const dedEl = document.getElementById("moneySalaryDeductions");
    const ruleEl = document.getElementById("moneyPaydayRule");

    // Load existing into inputs (nice UX)
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
        alert("Save a monthly net salary first.");
        return;
      }

      const accounts = getAccounts();
      if (accounts.length === 0) {
        alert("Add an account first.");
        return;
      }

      const today = isoToday();
      const paydayISO = computePaydayISO(s.paydayRule || "last_working_day", today);

      // Prevent duplicate payday for this month (simple guard)
      const mk = monthKey(paydayISO);
      const existing = getTransactions().find((t) => t && t.isPayday === true && monthKey(t.date) === mk);
      if (existing) {
        alert("Payday income for this month already exists.");
        return;
      }

      // Choose the first account by default (user can move/edit later by deleting/re-adding)
      const accountId = accounts[0].id;

      window.LifeOSDB.upsert("moneyTransactions", {
        date: paydayISO,
        accountId,
        amount: Number(s.salaryNet), // income is positive
        categoryId: "cat_salary",
        essentiality: "essential",
        merchant: "Salary",
        note: Number(s.salaryDeductions) ? `Deductions tracked: ${Number(s.salaryDeductions)}` : "",
        isPayday: true,
        createdAt: window.LifeOSDB.nowISO(),
        updatedAt: window.LifeOSDB.nowISO(),
      });

      refreshAll();
      alert(`Added payday income on ${paydayISO}. (No automation — you tapped the button.)`);
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
        amount, // expenses negative (your rule)
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

      refreshAll();
    });
  }

  // -------- Boot --------

  document.addEventListener("DOMContentLoaded", () => {
    if (!window.LifeOSDB) return;
    if (!document.getElementById("view-finances")) return;

    ensureDefaultCategories();

    wireAccountForm();
    wireSalaryForm();
    wireAddPaydayButton();
    wireTxForm();
    wirePeriodButtons();
    wireAccountBackButton();

    refreshAll();

    // Re-render when navigating back to Finances
    window.addEventListener("hashchange", () => {
      if ((window.location.hash || "").toLowerCase() === "#finances") {
        refreshAll();
      }
    });
  });
})();