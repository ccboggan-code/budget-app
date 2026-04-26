/* =======================
   CONFIG
======================= */

const STORAGE_KEY = "budgetDataSandbox";

const incomeCategories = [
  "Paycheck", "Additional Income", "Other Income"
];

const expenseCategories = [
  "Mortgage","Loans","Power","Water","Internet","Subscriptions",
  "Fuel","Insurance","Giving","Groceries","Shopping","Dining",
  "Investments","Maintenance","Other Expense"
];

/* =======================
   HELPERS
======================= */

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2
});

const $ = (id) => document.getElementById(id);

function parseCurrency(val) {
  return Number(String(val).replace(/[^0-9.-]/g, "")) || 0;
}

/* =======================
   STORAGE
======================= */

let budgetData = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
let currentMonth = new Date().toISOString().slice(0, 7);

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(budgetData));
}

function getPreviousMonth(month) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 2, 1).toISOString().slice(0, 7);
}

function ensureMonth(month) {
  if (!budgetData[month]) {
    const prev = getPreviousMonth(month);

    budgetData[month] = {
      startingBalance: 4000,
      transactions: [],
      planned: budgetData[prev]
        ? structuredClone(budgetData[prev].planned)
        : {}
    };
  }

  // FIX: ensure planned exists
  if (!budgetData[month].planned) {
    budgetData[month].planned = {};
  }
}

/* =======================
   INIT
======================= */

function init() {
  ensureMonth(currentMonth);

  initPickers();
  initInputs();
  initEvents();

  render();
}

/* =======================
   INIT HELPERS
======================= */

function initPickers() {
  const year = $("yearPicker");
  const month = $("monthPicker");

  const now = new Date();
  const currentYear = now.getFullYear();

  for (let y = currentYear - 5; y <= currentYear + 5; y++) {
    year.appendChild(new Option(y, y));
  }

  for (let i = 0; i < 12; i++) {
    const m = String(i + 1).padStart(2, "0");
    const name = new Date(0, i).toLocaleString("en-US", { month: "long" });
    month.appendChild(new Option(name, m));
  }

  year.value = currentYear;
  month.value = String(now.getMonth() + 1).padStart(2, "0");

  function updateMonth() {
    currentMonth = `${year.value}-${month.value}`;
    ensureMonth(currentMonth);

    $("startingBalance").value =
      currencyFormatter.format(budgetData[currentMonth].startingBalance);

    render();
  }

  year.addEventListener("change", updateMonth);
  month.addEventListener("change", updateMonth);
}

function initInputs() {
  const start = $("startingBalance");

  start.value = currencyFormatter.format(
    budgetData[currentMonth].startingBalance
  );

  start.addEventListener("focus", () => {
    start.value = parseCurrency(start.value) || "";
  });

  start.addEventListener("blur", () => {
    const val = parseCurrency(start.value);
    budgetData[currentMonth].startingBalance = val;
    start.value = currencyFormatter.format(val);
    save();
    render();
  });

  setupAmountInput("amount");
  setupAmountInput("amountDash");
}

function setupAmountInput(id) {
  const el = $(id);
  if (!el) return;

  el.addEventListener("focus", () => {
    el.value = parseCurrency(el.value) || "";
  });

  el.addEventListener("blur", () => {
    const val = parseCurrency(el.value);
    el.value = val ? currencyFormatter.format(val) : "";
  });
}

function initEvents() {
  $("addBtn")?.addEventListener("click", () => addTransaction());

  $("addBtnDash")?.addEventListener("click", () =>
    addTransaction("dash")
  );

  $("type")?.addEventListener("change", updateCategoryOptions);
  $("typeDash")?.addEventListener("change", updateCategoryOptions);

  $("clearAll")?.addEventListener("click", clearAll);

  updateCategoryOptions();
}

/* =======================
   CATEGORY LOGIC
======================= */

function updateCategoryOptions() {
  updateSelect("type", "category");
  updateSelect("typeDash", "categoryDash");
}

function updateSelect(typeId, selectId) {
  const typeEl = $(typeId);
  const select = $(selectId);
  if (!typeEl || !select) return;

  const list =
    typeEl.value === "income" ? incomeCategories : expenseCategories;

  select.innerHTML = "";

  list.forEach(cat => {
    select.appendChild(new Option(cat, cat));
  });
}

/* =======================
   TRANSACTIONS
======================= */

function addTransaction(source = "main") {
  const ids =
    source === "dash"
      ? ["descriptionDash", "amountDash", "typeDash", "categoryDash"]
      : ["description", "amount", "type", "category"];

  const [d, a, t, c] = ids.map($);

  const description = d.value.trim();
  const amount = parseCurrency(a.value);
  const type = t.value;
  const category = c.value;

  if (!description || !amount) {
    alert("Missing fields");
    return;
  }

  budgetData[currentMonth].transactions.push({
    id: Date.now(),
    description,
    amount,
    type,
    category
  });

  d.value = "";
  a.value = "";

  save();
  render();
}

function deleteTransaction(id) {
  budgetData[currentMonth].transactions =
    budgetData[currentMonth].transactions.filter(t => t.id !== id);

  save();
  render();
}

function renderTransactions() {
  const table = $("transactionTable");
  if (!table) return;

  table.innerHTML = "";

  budgetData[currentMonth].transactions.forEach(t => {
    const amt = t.type === "expense" ? -t.amount : t.amount;

    table.innerHTML += `
      <tr>
        <td>${t.description}</td>
        <td>${t.category}</td>
        <td class="${t.type}">${t.type === "expense" ? "D" : "C"}</td>
        <td>${currencyFormatter.format(amt)}</td>
        <td><button onclick="deleteTransaction(${t.id})">Delete</button></td>
      </tr>
    `;
  });
}

/* =======================
   PLANNED
======================= */

function renderPlanned() {
  const container = $("plannedContainer");
  if (!container) return;

  const planned = budgetData[currentMonth].planned;

  [...incomeCategories, ...expenseCategories].forEach(cat => {
    if (planned[cat] === undefined) planned[cat] = 0;
  });

  let html = `<h3>Planned Budget</h3>
  <div class="planned-grid">`;

  html += `<div class="planned-column"><h4>Expenses</h4>`;
  expenseCategories.forEach(cat => {
    html += plannedRow(cat, planned[cat]);
  });
  html += `</div>`;

  html += `<div class="planned-column"><h4>Income</h4>`;
  incomeCategories.forEach(cat => {
    html += plannedRow(cat, planned[cat]);
  });
  html += `</div>`;

  html += `</div>`;

  container.innerHTML = html;
}

function plannedRow(cat, val) {
  return `
    <div class="planned-row">
      <span class="planned-label">${cat}</span>
      <input type="text"
        class="planned-input"
        value="${currencyFormatter.format(val)}"
        onfocus="this.value=parseCurrency(this.value)||''"
        onblur="updatePlanned('${cat}', this.value)">
    </div>
  `;
}

function updatePlanned(cat, val) {
  budgetData[currentMonth].planned[cat] = parseCurrency(val);
  save();
  render(); // FIX
}

/* =======================
   SUMMARY
======================= */

function renderSummary() {
  const m = budgetData[currentMonth];

  let net = 0;
  m.transactions.forEach(t => {
    net += t.type === "income" ? t.amount : -t.amount;
  });

  const end = m.startingBalance + net;

$("summary").innerHTML = `
  <div><strong>${currentMonth}</strong></div>

  <div class="summary-row">
    <span class="summary-label">Starting</span>
    <span class="summary-value">${currencyFormatter.format(m.startingBalance)}</span>
  </div>

  <div class="summary-row">
    <span class="summary-label">Net</span>
    <span class="summary-value">${currencyFormatter.format(net)}</span>
  </div>

  <div class="summary-row">
    <span class="summary-label">Ending</span>
    <span class="summary-value">${currencyFormatter.format(end)}</span>
  </div>
`;
}

/* =======================
   CATEGORY TOTALS (DASHBOARD)
======================= */

function renderCategoryTotals() {
  const container = $("categoryTotals");
  if (!container) return;

  const planned = budgetData[currentMonth].planned;

  const expenseTotals = {};
  const incomeTotals = {};

  expenseCategories.forEach(c => expenseTotals[c] = 0);
  incomeCategories.forEach(c => incomeTotals[c] = 0);

  budgetData[currentMonth].transactions.forEach(t => {
if (t.type === "expense") {
  if (expenseTotals[t.category] === undefined) expenseTotals[t.category] = 0;
  expenseTotals[t.category] += t.amount;
} else {
  if (incomeTotals[t.category] === undefined) incomeTotals[t.category] = 0;
  incomeTotals[t.category] += t.amount;
}
  });

  let html = "<h3>Dashboard</h3><div class='card-grid'>";

  // EXPENSES (LEFT)
  html += `<div class="card-column">`;
  expenseCategories.forEach(cat => {
    html += categoryCard(cat, planned[cat], expenseTotals[cat], "expense");
  });
  html += `</div>`;

  // INCOME (RIGHT)
  html += `<div class="card-column">`;
  incomeCategories.forEach(cat => {
    html += categoryCard(cat, planned[cat], incomeTotals[cat], "income");
  });
  html += `</div>`;

  html += `</div>`;

  container.innerHTML = html;
}

function categoryCard(cat, planned, actual, type) {
  planned = planned || 0;
  actual = actual || 0;

  const diff = type === "expense"
    ? planned - actual
    : actual - planned;

  const color = diff >= 0 ? "var(--accent)" : "var(--danger)";

  return `
    <div class="category-card card-flex">

      <div class="card-left">
        <div class="card-title">${cat}</div>
        <div class="card-sub">Planned: ${currencyFormatter.format(planned)}</div>
        <div class="card-sub">Actual: ${currencyFormatter.format(actual)}</div>
      </div>

      <div class="card-right" style="color:${color}">
        ${currencyFormatter.format(diff)}
      </div>

    </div>
  `;
}

/* =======================
   CORE
======================= */

function clearAll() {
  if (!confirm("Delete all data?")) return;

  budgetData = {};
  ensureMonth(currentMonth);
  save();
  render();
}

function render() {
  renderTransactions();
  renderPlanned();
  renderSummary();
  renderCategoryTotals();
}

/* =======================
   UI
======================= */

function switchTab(tab) {
  document.querySelectorAll(".tab").forEach(b =>
    b.classList.remove("active")
  );

  document.querySelectorAll(".tab-content").forEach(c =>
    c.classList.remove("active")
  );

  document
    .querySelector(`button[onclick="switchTab('${tab}')"]`)
    ?.classList.add("active");

  $(tab + "Tab")?.classList.add("active");
}

/* =======================
   START
======================= */

init();