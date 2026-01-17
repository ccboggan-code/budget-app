/* =======================
   CATEGORIES
======================= */

const incomeCategories = [
  "Paycheck",
  "Additional Income",
  "Other"
];

const expenseCategories = [
  "Mortgage",
  "Loans",
  "Power",
  "Water",
  "Internet",
  "Subscriptions",
  "Fuel",
  "Insurance",
  "Giving",
  "Groceries",
  "Shopping",
  "Dining",
  "Investments",
  "Maintenance",
  "Other"
];

/* =======================
   CURRENCY HELPERS
======================= */

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2
});

function parseCurrency(value) {
  return Number(String(value).replace(/[^0-9.-]/g, "")) || 0;
}

/* =======================
   STORAGE
======================= */

let budgetData = JSON.parse(localStorage.getItem("budgetData")) || {};
let currentMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"

function getCurrentMonth() {
  return new Date().toISOString().slice(0, 7);
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
}

function save() {
  localStorage.setItem("budgetData", JSON.stringify(budgetData));
}

/* =======================
   INIT
======================= */

function init() {
  const picker = document.getElementById("monthPicker");
  picker.value = currentMonth;

initMonthYearPickers();

  ensureMonth(currentMonth);

  const startingInput = document.getElementById("startingBalance");
  startingInput.value = currencyFormatter.format(
    budgetData[currentMonth].startingBalance
  );

  startingInput.addEventListener("focus", () => {
    startingInput.value = parseCurrency(startingInput.value) || "";
  });

  startingInput.addEventListener("blur", () => {
    const val = parseCurrency(startingInput.value);
    budgetData[currentMonth].startingBalance = val;
    startingInput.value = currencyFormatter.format(val);
    save();
    renderSummary();
  });

  const amountInput = document.getElementById("amount");

  amountInput.addEventListener("focus", () => {
    amountInput.value = parseCurrency(amountInput.value) || "";
  });

  amountInput.addEventListener("blur", () => {
    const val = parseCurrency(amountInput.value);
    amountInput.value = val ? currencyFormatter.format(val) : "";
  });

  updateCategoryOptions();

document.getElementById("type").addEventListener("change", () => {
  updateCategoryOptions();
});

document.querySelector("button").addEventListener("click", addTransaction);

// Populate year and month dropdowns
function initMonthYearPickers() {
  const yearSelect = document.getElementById("yearPicker");
  const monthSelect = document.getElementById("monthPicker");

  const currentYear = new Date().getFullYear();

  // Allow 5 years past and 5 years future
  for (let y = currentYear - 5; y <= currentYear + 5; y++) {
    const opt = document.createElement("option");
    opt.value = y;
    opt.textContent = y;
    yearSelect.appendChild(opt);
  }

  const months = [
    "01", "02", "03", "04", "05", "06",
    "07", "08", "09", "10", "11", "12"
  ];
  months.forEach((m, idx) => {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = new Date(0, idx).toLocaleString("en-US", { month: "long" });
    monthSelect.appendChild(opt);
  });

  // Default to current month/year
  yearSelect.value = currentYear;
  monthSelect.value = String(new Date().getMonth() + 1).padStart(2, "0");

  // Event listener to switch month
  function onChange() {
    currentMonth = `${yearSelect.value}-${monthSelect.value}`;
    ensureMonth(currentMonth);
    document.getElementById("startingBalance").value =
      currencyFormatter.format(budgetData[currentMonth].startingBalance);
    render();
  }

  yearSelect.addEventListener("change", onChange);
  monthSelect.addEventListener("change", onChange);
}

  render();
}

/* =======================
   CATEGORY LOGIC
======================= */

function updateCategoryOptions() {
  const type = document.getElementById("type").value;
  const select = document.getElementById("category");
  select.innerHTML = "";

  const list = type === "income" ? incomeCategories : expenseCategories;

  list.forEach(cat => {
    const option = document.createElement("option");
    option.value = cat;
    option.textContent = cat;
    select.appendChild(option);
  });
}

/* =======================
   MONTH SWITCH
======================= */

function changeMonth() {
  currentMonth = document.getElementById("monthPicker").value;
  ensureMonth(currentMonth);

  const startingInput = document.getElementById("startingBalance");
  startingInput.value = currencyFormatter.format(
    budgetData[currentMonth].startingBalance
  );

  save();
  render();
}

/* =======================
   TRANSACTIONS
======================= */

function addTransaction() {
  const description = document.getElementById("description").value.trim();
  const amount = parseCurrency(document.getElementById("amount").value);
  const type = document.getElementById("type").value;
  const category = document.getElementById("category").value;

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

  document.getElementById("description").value = "";
  document.getElementById("amount").value = "";

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
  const table = document.getElementById("transactionTable");
  table.innerHTML = "";

  budgetData[currentMonth].transactions.forEach(t => {
    const row = document.createElement("tr");
    const signedAmount =
      t.type === "expense" ? -t.amount : t.amount;

    row.innerHTML = `
      <td>${t.description}</td>
      <td>${t.category}</td>
      <td class="${t.type}">${t.type}</td>
      <td>${currencyFormatter.format(signedAmount)}</td>
      <td><button onclick="deleteTransaction(${t.id})">Delete</button></td>
    `;
    table.appendChild(row);
  });
}

/* =======================
   PLANNED BUDGET
======================= */

function renderPlanned() {
  const table = document.getElementById("plannedTable");
  table.innerHTML = "";

  const planned = budgetData[currentMonth].planned;
  const rows = Math.max(incomeCategories.length, expenseCategories.length);

  for (let i = 0; i < rows; i++) {
    const inc = incomeCategories[i] || "";
    const exp = expenseCategories[i] || "";

    if (inc && planned[inc] === undefined) planned[inc] = 0;
    if (exp && planned[exp] === undefined) planned[exp] = 0;

    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${inc}</td>
      <td>
        ${inc ? `<input type="text" inputmode="decimal"
          value="${currencyFormatter.format(planned[inc])}"
          onfocus="this.value=parseCurrency(this.value)||''"
          onblur="updatePlanned('${inc}', this.value)">` : ""}
      </td>
      <td>${exp}</td>
      <td>
        ${exp ? `<input type="text" inputmode="decimal"
          value="${currencyFormatter.format(planned[exp])}"
          onfocus="this.value=parseCurrency(this.value)||''"
          onblur="updatePlanned('${exp}', this.value)">` : ""}
      </td>
    `;

    table.appendChild(row);
  }
}

function updatePlanned(cat, value) {
  const num = parseCurrency(value);
  budgetData[currentMonth].planned[cat] = num;
  save();
  renderSummary();
}

/* =======================
   SUMMARY
======================= */

function renderSummary() {
  const month = budgetData[currentMonth];
  let netActivity = 0;

  month.transactions.forEach(t => {
    netActivity += t.type === "income" ? t.amount : -t.amount;
  });

  const starting = month.startingBalance;
  const ending = starting + netActivity;
  const transfer = ending - starting;

  document.getElementById("summary").innerHTML = `
    <strong>${currentMonth}</strong><br>
    Starting Balance: ${currencyFormatter.format(starting)}<br>
    Net Activity: ${currencyFormatter.format(netActivity)}<br>
    Ending Balance: ${currencyFormatter.format(ending)}<br><br>
    <strong>
      ${transfer >= 0 ? "Transfer to Savings:" : "Transfer from Savings:"}
    </strong>
    ${currencyFormatter.format(Math.abs(transfer))}
  `;
}

/* =======================
   CORE
======================= */

function clearAll() {
  if (!confirm("Delete all months?")) return;
  budgetData = {};
  ensureMonth(currentMonth);
  save();
  render();
}

function render() {
  renderTransactions();
  renderPlanned();
  renderSummary();
}

init();
