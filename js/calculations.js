"use strict";

/* ============================================================
   CALCULATIONS MODULE
   Pure functions deriving stats from a transaction list.
   ============================================================ */
const Calculations = (function(){

  function totals(list){
    let income = 0, expense = 0;
    list.forEach(t => {
      if(t.type === "income") income += t.amount;
      else expense += t.amount;
    });
    return {
      income: round2(income),
      expense: round2(expense),
      balance: round2(income - expense),
      count: list.length
    };
  }

  function isSameMonth(dateStr, year, month){
    const d = new Date(dateStr + "T00:00:00");
    return d.getFullYear() === year && d.getMonth() === month;
  }

  function currentMonthTotals(list){
    const now = new Date();
    const inMonth = list.filter(t => isSameMonth(t.date, now.getFullYear(), now.getMonth()));
    return totals(inMonth);
  }

  function categoryBreakdown(list, type){
    const map = {};
    let total = 0;
    list.filter(t => t.type === type).forEach(t => {
      map[t.category] = (map[t.category] || 0) + t.amount;
      total += t.amount;
    });
    const rows = Object.keys(map).map(name => ({
      name,
      amount: round2(map[name]),
      pct: total > 0 ? round1((map[name] / total) * 100) : 0,
      color: categoryColor(name)
    }));
    rows.sort((a,b) => b.amount - a.amount);
    return { rows, total: round2(total) };
  }

  // Last N months of income/expense totals, oldest -> newest
  function monthlySeries(list, months){
    const now = new Date();
    const series = [];
    for(let i = months - 1; i >= 0; i--){
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const inMonth = list.filter(t => isSameMonth(t.date, d.getFullYear(), d.getMonth()));
      const t = totals(inMonth);
      series.push({
        label: d.toLocaleDateString(undefined, { month: "short" }),
        income: t.income,
        expense: t.expense
      });
    }
    return series;
  }

  function balanceTrend(list){
    // chronological running balance across all transactions
    const sorted = list.slice().sort((a,b) => new Date(a.date) - new Date(b.date));
    let running = 0;
    return sorted.map(t => {
      running += (t.type === "income" ? t.amount : -t.amount);
      return round2(running);
    });
  }

  function round2(n){ return Math.round((n + Number.EPSILON) * 100) / 100; }
  function round1(n){ return Math.round((n + Number.EPSILON) * 10) / 10; }

  return { totals, currentMonthTotals, categoryBreakdown, monthlySeries, balanceTrend, round2 };
})();

/* ============================================================
   UTILITIES
   ============================================================ */
function formatCurrency(n){
  const sign = n < 0 ? "-" : "";
  return sign + "\u20B9" + Math.abs(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function formatDate(dateStr){
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
function escapeHtml(str){
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}
function todayISO(){
  const d = new Date();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  return `${d.getFullYear()}-${m}-${day}`;
}
