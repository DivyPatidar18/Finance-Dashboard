"use strict";

/* ============================================================
   TOAST MODULE
   ============================================================ */
const Toast = (function(){
  const stack = document.getElementById("toast-stack");
  function show(message, kind){
    kind = kind || "success";
    const el = document.createElement("div");
    el.className = "toast " + kind;
    el.innerHTML = `<span class="dot"></span><span>${escapeHtml(message)}</span>`;
    stack.appendChild(el);
    setTimeout(() => {
      el.style.transition = "opacity 0.25s ease";
      el.style.opacity = "0";
      setTimeout(() => el.remove(), 260);
    }, 2600);
  }
  return { show };
})();

/* ============================================================
   CONFIRM DIALOG MODULE (reusable)
   ============================================================ */
const Confirm = (function(){
  const overlay = document.getElementById("confirm-overlay");
  const titleEl = document.getElementById("confirm-title");
  const bodyEl = document.getElementById("confirm-body");
  const okBtn = document.getElementById("confirm-ok");
  const cancelBtn = document.getElementById("confirm-cancel");
  let onConfirm = null;
  let lastFocused = null;

  function open(opts){
    titleEl.textContent = opts.title;
    bodyEl.textContent = opts.body;
    okBtn.textContent = opts.confirmLabel || "Confirm";
    onConfirm = opts.onConfirm;
    lastFocused = document.activeElement;
    overlay.classList.add("open");
    okBtn.focus();
  }
  function close(){
    overlay.classList.remove("open");
    onConfirm = null;
    if(lastFocused) lastFocused.focus();
  }
  okBtn.addEventListener("click", () => {
    const fn = onConfirm;
    close();
    if(fn) fn();
  });
  cancelBtn.addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if(e.target === overlay) close(); });
  document.addEventListener("keydown", (e) => {
    if(e.key === "Escape" && overlay.classList.contains("open")) close();
  });

  return { open, close };
})();

/* ============================================================
   TRANSACTION FORM MODAL MODULE
   ============================================================ */
const TxnModal = (function(){
  const overlay = document.getElementById("txn-overlay");
  const form = document.getElementById("txn-form");
  const titleEl = document.getElementById("txn-modal-title");
  const idInput = document.getElementById("f-id");
  const descInput = document.getElementById("f-desc");
  const amountInput = document.getElementById("f-amount");
  const dateInput = document.getElementById("f-date");
  const categorySelect = document.getElementById("f-category");
  const notesInput = document.getElementById("f-notes");
  const typeExpenseBtn = document.getElementById("f-type-expense");
  const typeIncomeBtn = document.getElementById("f-type-income");
  const closeBtn = document.getElementById("txn-modal-close");
  const cancelBtn = document.getElementById("txn-cancel-btn");
  let currentType = "expense";
  let lastFocused = null;

  function populateCategories(){
    const list = CATEGORIES[currentType];
    categorySelect.innerHTML = list.map(c => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join("");
  }

  function setType(type){
    currentType = type;
    typeExpenseBtn.classList.toggle("selected", type === "expense");
    typeIncomeBtn.classList.toggle("selected", type === "income");
    typeExpenseBtn.setAttribute("aria-checked", type === "expense");
    typeIncomeBtn.setAttribute("aria-checked", type === "income");
    populateCategories();
  }

  typeExpenseBtn.addEventListener("click", () => setType("expense"));
  typeIncomeBtn.addEventListener("click", () => setType("income"));

  function clearErrors(){
    ["field-desc","field-amount","field-date","field-category"].forEach(id => {
      document.getElementById(id).classList.remove("invalid");
    });
  }

  function openForCreate(){
    form.reset();
    idInput.value = "";
    titleEl.textContent = "Add transaction";
    dateInput.value = todayISO();
    setType("expense");
    clearErrors();
    lastFocused = document.activeElement;
    overlay.classList.add("open");
    descInput.focus();
  }

  function openForEdit(txn){
    idInput.value = txn.id;
    titleEl.textContent = "Edit transaction";
    setType(txn.type);
    descInput.value = txn.description;
    amountInput.value = txn.amount;
    dateInput.value = txn.date;
    categorySelect.value = txn.category;
    notesInput.value = txn.notes || "";
    clearErrors();
    lastFocused = document.activeElement;
    overlay.classList.add("open");
    descInput.focus();
  }

  function close(){
    overlay.classList.remove("open");
    if(lastFocused) lastFocused.focus();
  }

  function validate(){
    clearErrors();
    let valid = true;
    if(!descInput.value.trim()){
      document.getElementById("field-desc").classList.add("invalid");
      valid = false;
    }
    const amt = parseFloat(amountInput.value);
    if(isNaN(amt) || amt <= 0){
      document.getElementById("field-amount").classList.add("invalid");
      valid = false;
    }
    if(!dateInput.value){
      document.getElementById("field-date").classList.add("invalid");
      valid = false;
    }
    if(!categorySelect.value){
      document.getElementById("field-category").classList.add("invalid");
      valid = false;
    }
    return valid;
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if(!validate()) return;
    const data = {
      type: currentType,
      description: descInput.value,
      amount: amountInput.value,
      date: dateInput.value,
      category: categorySelect.value,
      notes: notesInput.value
    };
    if(idInput.value){
      Transactions.update(idInput.value, data);
      Toast.show("Transaction updated", "success");
    }else{
      Transactions.add(data);
      Toast.show("Transaction added", "success");
    }
    close();
    App.refresh();
  });

  closeBtn.addEventListener("click", close);
  cancelBtn.addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if(e.target === overlay) close(); });
  document.addEventListener("keydown", (e) => {
    if(e.key === "Escape" && overlay.classList.contains("open")) close();
  });

  return { openForCreate, openForEdit };
})();

/* ============================================================
   UI MODULE
   Renders dashboard stats, charts, and the transaction list/table.
   ============================================================ */
const UI = (function(){

  const els = {
    statBalance: document.getElementById("stat-balance"),
    statIncome: document.getElementById("stat-income"),
    statExpense: document.getElementById("stat-expense"),
    statCount: document.getElementById("stat-count"),
    statIncomeMonth: document.getElementById("stat-income-month"),
    statExpenseMonth: document.getElementById("stat-expense-month"),
    monthBars: document.getElementById("month-bars"),
    donutSvg: document.getElementById("donut-svg"),
    donutList: document.getElementById("donut-list"),
    trendSvg: document.getElementById("trend-svg"),
    recentList: document.getElementById("recent-list"),
    tbody: document.getElementById("txn-tbody"),
    cards: document.getElementById("txn-cards"),
    emptyState: document.getElementById("txn-empty"),
    tableWrap: document.querySelector(".txn-table-wrap"),
    resultCount: document.getElementById("result-count"),
    filterCategory: document.getElementById("filter-category"),
    filterMonth: document.getElementById("filter-month"),
    pageDate: document.getElementById("page-date")
  };

  function renderDashboard(all){
    const t = Calculations.totals(all);
    const monthT = Calculations.currentMonthTotals(all);

    els.statBalance.textContent = formatCurrency(t.balance);
    els.statBalance.classList.toggle("negative", t.balance < 0);
    els.statIncome.textContent = formatCurrency(t.income);
    els.statExpense.textContent = formatCurrency(t.expense);
    els.statCount.textContent = t.count;
    els.statIncomeMonth.textContent = "This month: " + formatCurrency(monthT.income);
    els.statExpenseMonth.textContent = "This month: " + formatCurrency(monthT.expense);

    renderMonthBars(all);
    renderDonut(all);
    renderTrend(all);
    renderRecent(all);
  }

  function renderMonthBars(all){
    const series = Calculations.monthlySeries(all, 6);
    const max = Math.max(1, ...series.map(s => Math.max(s.income, s.expense)));
    els.monthBars.innerHTML = series.map(s => `
      <div class="month-bar-col">
        <div class="month-bar-track">
          <div class="month-bar income" style="height:${(s.income/max*100).toFixed(1)}%" title="Income: ${formatCurrency(s.income)}"></div>
          <div class="month-bar expense" style="height:${(s.expense/max*100).toFixed(1)}%" title="Expenses: ${formatCurrency(s.expense)}"></div>
        </div>
        <div class="month-bar-label">${s.label}</div>
      </div>
    `).join("");
  }

  function renderDonut(all){
    const { rows, total } = Calculations.categoryBreakdown(all, "expense");
    if(rows.length === 0){
      els.donutSvg.innerHTML = `<circle cx="60" cy="60" r="50" fill="none" stroke="var(--border)" stroke-width="14"/>`;
      els.donutList.innerHTML = `<div class="empty-mini">No expenses logged yet.</div>`;
      return;
    }
    const cx = 60, cy = 60, r = 50, circumference = 2 * Math.PI * r;
    let offset = 0;
    let arcs = "";
    rows.forEach(row => {
      const frac = total > 0 ? row.amount / total : 0;
      const len = frac * circumference;
      arcs += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${row.color}" stroke-width="16"
                 stroke-dasharray="${len.toFixed(2)} ${(circumference-len).toFixed(2)}"
                 stroke-dashoffset="${(-offset).toFixed(2)}" transform="rotate(-90 ${cx} ${cy})"/>`;
      offset += len;
    });
    els.donutSvg.innerHTML = arcs;
    els.donutList.innerHTML = rows.slice(0,6).map(row => `
      <div class="donut-row">
        <span class="dot" style="background:${row.color}"></span>
        <span class="name">${escapeHtml(row.name)}</span>
        <span class="pct">${row.pct}%</span>
      </div>
    `).join("");
  }

  function renderTrend(all){
    const trend = Calculations.balanceTrend(all).slice(-24);
    const svg = els.trendSvg;
    if(trend.length < 2){
      svg.innerHTML = `<text x="300" y="70" text-anchor="middle" fill="var(--muted)" font-size="13">Add a few more transactions to see a trend line</text>`;
      return;
    }
    const w = 600, h = 130, pad = 8;
    const min = Math.min(...trend, 0);
    const max = Math.max(...trend, 0);
    const range = (max - min) || 1;
    const stepX = (w - pad*2) / (trend.length - 1);
    const points = trend.map((v, i) => {
      const x = pad + i*stepX;
      const y = h - pad - ((v - min) / range) * (h - pad*2);
      return [x,y];
    });
    const path = points.map((p,i) => (i===0?"M":"L") + p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
    const areaPath = path + ` L${points[points.length-1][0].toFixed(1)},${h-pad} L${points[0][0].toFixed(1)},${h-pad} Z`;
    const last = trend[trend.length-1];
    const strokeColor = last >= 0 ? "var(--income)" : "var(--expense)";
    svg.innerHTML = `
      <path d="${areaPath}" fill="${strokeColor}" opacity="0.08"></path>
      <path d="${path}" fill="none" stroke="${strokeColor}" stroke-width="2.2"></path>
      <circle cx="${points[points.length-1][0].toFixed(1)}" cy="${points[points.length-1][1].toFixed(1)}" r="3.5" fill="${strokeColor}"></circle>
    `;
  }

  function renderRecent(all){
    const recent = all.slice().sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0,6);
    if(recent.length === 0){
      els.recentList.innerHTML = `<div class="empty-mini">No transactions yet — add your first one to get started.</div>`;
      return;
    }
    els.recentList.innerHTML = recent.map(t => `
      <div class="recent-row">
        <div class="recent-left">
          <span class="cat-dot" style="background:${categoryColor(t.category)}"></span>
          <div>
            <div class="recent-desc">${escapeHtml(t.description)}</div>
            <div class="recent-meta">${escapeHtml(t.category)} · ${formatDate(t.date)}</div>
          </div>
        </div>
        <div class="recent-amt ${t.type}">${t.type === "income" ? "+" : "-"}${formatCurrency(t.amount)}</div>
      </div>
    `).join("");
  }

  function populateCategoryFilter(){
    const names = Array.from(new Set(CATEGORIES.expense.concat(CATEGORIES.income).map(c => c.name)));
    els.filterCategory.innerHTML = `<option value="all">All categories</option>` +
      names.map(n => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join("");
  }

  function populateMonthFilter(all){
    const months = Array.from(new Set(all.map(t => t.date.slice(0,7)))).sort().reverse();
    const current = els.filterMonth.value;
    els.filterMonth.innerHTML = `<option value="all">All time</option>` + months.map(m => {
      const d = new Date(m + "-02T00:00:00");
      const label = d.toLocaleDateString(undefined, { year:"numeric", month:"long" });
      return `<option value="${m}">${label}</option>`;
    }).join("");
    if(months.includes(current)) els.filterMonth.value = current;
  }

  function renderTransactionList(list){
    els.resultCount.textContent = list.length + (list.length === 1 ? " transaction" : " transactions");

    if(list.length === 0){
      els.tbody.innerHTML = "";
      els.cards.innerHTML = "";
      els.emptyState.style.display = "block";
      els.tableWrap.style.display = "none";
      return;
    }
    els.emptyState.style.display = "none";
    els.tableWrap.style.display = "";

    els.tbody.innerHTML = list.map(t => rowHtml(t)).join("");
    els.cards.innerHTML = list.map(t => cardHtml(t)).join("");
  }

  function rowHtml(t){
    return `
      <tr data-id="${t.id}">
        <td>${formatDate(t.date)}</td>
        <td>${escapeHtml(t.description)}${t.notes ? `<div class="recent-meta" title="${escapeHtml(t.notes)}">${escapeHtml(t.notes.slice(0,40))}${t.notes.length>40?"…":""}</div>` : ""}</td>
        <td><span class="cat-chip"><span class="cat-dot" style="background:${categoryColor(t.category)}"></span>${escapeHtml(t.category)}</span></td>
        <td><span class="type-pill ${t.type}">${t.type === "income" ? "Income" : "Expense"}</span></td>
        <td class="amt-cell ${t.type}">${t.type === "income" ? "+" : "-"}${formatCurrency(t.amount)}</td>
        <td>
          <div class="row-actions">
            <button class="icon-btn edit-btn" data-id="${t.id}" aria-label="Edit ${escapeHtml(t.description)}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            </button>
            <button class="icon-btn danger delete-btn" data-id="${t.id}" aria-label="Delete ${escapeHtml(t.description)}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m2 0v13a1 1 0 01-1 1H7a1 1 0 01-1-1V7h12z"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }

  function cardHtml(t){
    return `
      <div class="txn-card ${t.type}" data-id="${t.id}">
        <div class="txn-card-top">
          <div>
            <div class="txn-card-desc">${escapeHtml(t.description)}</div>
            <div class="txn-card-meta">${escapeHtml(t.category)} · ${formatDate(t.date)}</div>
          </div>
          <div class="txn-card-amt ${t.type === "income" ? "" : ""}" style="color:${t.type==="income" ? "var(--income)" : "var(--expense)"}">
            ${t.type === "income" ? "+" : "-"}${formatCurrency(t.amount)}
          </div>
        </div>
        ${t.notes ? `<div class="txn-card-note">${escapeHtml(t.notes)}</div>` : ""}
        <div class="txn-card-bottom">
          <span class="type-pill ${t.type}">${t.type === "income" ? "Income" : "Expense"}</span>
          <div class="row-actions">
            <button class="icon-btn edit-btn" data-id="${t.id}" aria-label="Edit ${escapeHtml(t.description)}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            </button>
            <button class="icon-btn danger delete-btn" data-id="${t.id}" aria-label="Delete ${escapeHtml(t.description)}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m2 0v13a1 1 0 01-1 1H7a1 1 0 01-1-1V7h12z"/></svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function setPageDate(){
    els.pageDate.textContent = new Date().toLocaleDateString(undefined, { weekday:"long", year:"numeric", month:"long", day:"numeric" });
  }

  return { renderDashboard, renderTransactionList, populateCategoryFilter, populateMonthFilter, setPageDate, els };
})();

/* ============================================================
   SAMPLE DATA
   ============================================================ */
function buildSampleData(){
  const today = new Date();
  function iso(daysAgo){
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().slice(0,10);
  }
  const rows = [
    ["Monthly salary", 4200, "income", "Salary", 2, "Direct deposit"],
    ["Freelance web project", 650, "income", "Freelance", 9, ""],
    ["Rent payment", 1450, "expense", "Rent", 3, ""],
    ["Whole Foods grocery run", 87.42, "expense", "Food", 1, ""],
    ["Metro card refill", 40, "expense", "Transportation", 4, ""],
    ["Electric & gas bill", 112.30, "expense", "Bills", 6, ""],
    ["Movie night", 32.5, "expense", "Entertainment", 8, ""],
    ["Dentist visit", 180, "expense", "Healthcare", 12, "Routine cleaning"],
    ["Online course", 49.99, "expense", "Education", 15, "UX design course"],
    ["New headphones", 129.99, "expense", "Shopping", 18, ""],
    ["Dividend payout", 76.20, "income", "Investment", 20, ""],
    ["Birthday gift received", 100, "income", "Gift", 22, "From family"],
    ["Coffee shop", 6.75, "expense", "Food", 25, ""],
    ["Rideshare to airport", 38, "expense", "Transportation", 30, ""],
    ["Freelance logo design", 300, "income", "Freelance", 33, ""],
    ["Rent payment", 1450, "expense", "Rent", 34, ""],
    ["Monthly salary", 4200, "income", "Salary", 33, "Direct deposit"],
    ["Streaming subscriptions", 24.97, "expense", "Entertainment", 40, ""],
    ["Pharmacy", 22.10, "expense", "Healthcare", 45, ""],
    ["Bookstore haul", 54.30, "expense", "Shopping", 52, ""],
    ["Monthly salary", 4200, "income", "Salary", 63, "Direct deposit"],
    ["Rent payment", 1450, "expense", "Rent", 64, ""],
    ["Internet bill", 65, "expense", "Bills", 70, ""],
    ["Consulting gig", 900, "income", "Business", 75, ""]
  ];
  return rows.map(([description, amount, type, category, daysAgo, notes]) => ({
    id: Transactions.generateId(),
    description, amount, type, category,
    date: iso(daysAgo),
    notes,
    sample: true
  }));
}

/* ============================================================
   EXPORT / IMPORT
   ============================================================ */
function downloadBlob(content, filename, mime){
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function exportJSON(){
  const data = Transactions.all();
  downloadBlob(JSON.stringify(data, null, 2), "finance-transactions.json", "application/json");
  Toast.show("Exported transactions as JSON", "success");
}

function exportCSV(){
  const rows = Transactions.all();
  const header = ["id","date","description","category","type","amount","notes"];
  const csvLines = [header.join(",")];
  rows.forEach(t => {
    const line = [t.id, t.date, t.description, t.category, t.type, t.amount, (t.notes||"")]
      .map(v => `"${String(v).replace(/"/g,'""')}"`).join(",");
    csvLines.push(line);
  });
  downloadBlob(csvLines.join("\n"), "finance-transactions.csv", "text/csv");
  Toast.show("Exported transactions as CSV", "success");
}

function importJSON(file){
  const reader = new FileReader();
  reader.onload = function(){
    try{
      const parsed = JSON.parse(reader.result);
      if(!Array.isArray(parsed)) throw new Error("not an array");
      const valid = parsed.filter(t => t && t.description && t.amount != null && t.date && t.type && t.category);
      if(valid.length === 0){
        Toast.show("No valid transactions found in file", "error");
        return;
      }
      const withIds = valid.map(t => ({
        id: t.id || Transactions.generateId(),
        description: String(t.description).slice(0,80),
        amount: Math.round(parseFloat(t.amount) * 100) / 100,
        type: t.type === "income" ? "income" : "expense",
        category: t.category,
        date: t.date,
        notes: t.notes || "",
        sample: false
      }));
      const merged = withIds.concat(Transactions.all());
      Transactions.replaceAll(merged);
      Toast.show(`Imported ${withIds.length} transaction${withIds.length===1?"":"s"}`, "success");
      App.refresh();
    }catch(e){
      Toast.show("Could not read that file. Expecting valid JSON.", "error");
    }
  };
  reader.readAsText(file);
}
