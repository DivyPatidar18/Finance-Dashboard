"use strict";

/* ============================================================
   APP MODULE — wires everything together
   ============================================================ */
const App = (function(){

  function init(){
    // Seed sample data on first launch only
    if(!Storage.hasSeeded() && Transactions.all().length === 0){
      Transactions.replaceAll(buildSampleData());
      Storage.markSeeded();
    }

    UI.setPageDate();
    UI.populateCategoryFilter();
    bindNav();
    bindGlobalButtons();
    bindTableEvents();
    bindFilters();
    refresh();
  }

  function bindNav(){
    document.querySelectorAll(".nav-item").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".nav-item").forEach(b => { b.classList.remove("active"); b.setAttribute("aria-selected","false"); });
        btn.classList.add("active");
        btn.setAttribute("aria-selected","true");
        const view = btn.dataset.view;
        document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
        document.getElementById("view-" + view).classList.add("active");
        document.getElementById("page-title").textContent = view === "dashboard" ? "Dashboard" : "Transactions";
        document.getElementById("btn-add-txn-2").style.display = view === "transactions" ? "inline-flex" : "none";
      });
    });
  }

  function bindGlobalButtons(){
    document.getElementById("btn-add-txn").addEventListener("click", () => TxnModal.openForCreate());
    document.getElementById("btn-add-txn-2").addEventListener("click", () => TxnModal.openForCreate());
    document.getElementById("empty-add-btn").addEventListener("click", () => TxnModal.openForCreate());

    document.getElementById("btn-export-json").addEventListener("click", exportJSON);
    document.getElementById("btn-export-csv").addEventListener("click", exportCSV);

    const importInput = document.getElementById("import-file");
    document.getElementById("btn-import").addEventListener("click", () => importInput.click());
    importInput.addEventListener("change", (e) => {
      if(e.target.files && e.target.files[0]) importJSON(e.target.files[0]);
      importInput.value = "";
    });

    document.getElementById("btn-reset-demo").addEventListener("click", () => {
      Confirm.open({
        title: "Reset demo data?",
        body: "This replaces all current transactions with a fresh set of sample data. This cannot be undone.",
        confirmLabel: "Reset data",
        onConfirm: () => {
          Transactions.replaceAll(buildSampleData());
          Toast.show("Demo data reset", "info");
          refresh();
        }
      });
    });

    document.getElementById("btn-clear-all").addEventListener("click", () => {
      Confirm.open({
        title: "Clear all transactions?",
        body: "This permanently deletes every transaction you've recorded. This cannot be undone.",
        confirmLabel: "Clear all",
        onConfirm: () => {
          Transactions.clearAll();
          Toast.show("All data cleared", "info");
          refresh();
        }
      });
    });
  }

  function bindTableEvents(){
    document.body.addEventListener("click", (e) => {
      const editBtn = e.target.closest(".edit-btn");
      const deleteBtn = e.target.closest(".delete-btn");
      if(editBtn){
        const txn = Transactions.getById(editBtn.dataset.id);
        if(txn) TxnModal.openForEdit(txn);
      }
      if(deleteBtn){
        const txn = Transactions.getById(deleteBtn.dataset.id);
        if(!txn) return;
        Confirm.open({
          title: "Delete this transaction?",
          body: `"${txn.description}" (${formatCurrency(txn.amount)}) will be permanently removed.`,
          confirmLabel: "Delete",
          onConfirm: () => {
            Transactions.remove(txn.id);
            Toast.show("Transaction deleted", "success");
            refresh();
          }
        });
      }
    });
  }

  let sortState = { key: "date", dir: "desc" };

  function bindFilters(){
    ["search-input","filter-type","filter-category","filter-month","sort-by"].forEach(id => {
      document.getElementById(id).addEventListener("input", renderFilteredList);
      document.getElementById(id).addEventListener("change", renderFilteredList);
    });
    document.querySelectorAll(".txn-table th.sortable").forEach(th => {
      th.addEventListener("click", () => {
        const key = th.dataset.sort;
        document.getElementById("sort-by").value = key === "date" ? "date-desc" : "amount-desc";
        renderFilteredList();
      });
    });
  }

  function getFilteredList(){
    const q = document.getElementById("search-input").value.trim().toLowerCase();
    const type = document.getElementById("filter-type").value;
    const category = document.getElementById("filter-category").value;
    const month = document.getElementById("filter-month").value;
    const sortBy = document.getElementById("sort-by").value;

    let list = Transactions.all().filter(t => {
      if(q && !(t.description.toLowerCase().includes(q) || t.category.toLowerCase().includes(q))) return false;
      if(type !== "all" && t.type !== type) return false;
      if(category !== "all" && t.category !== category) return false;
      if(month !== "all" && t.date.slice(0,7) !== month) return false;
      return true;
    });

    list.sort((a,b) => {
      switch(sortBy){
        case "date-asc": return new Date(a.date) - new Date(b.date);
        case "amount-desc": return b.amount - a.amount;
        case "amount-asc": return a.amount - b.amount;
        case "date-desc":
        default: return new Date(b.date) - new Date(a.date);
      }
    });
    return list;
  }

  function renderFilteredList(){
    UI.renderTransactionList(getFilteredList());
  }

  function refresh(){
    const all = Transactions.all();
    UI.renderDashboard(all);
    UI.populateMonthFilter(all);
    renderFilteredList();
  }

  return { init, refresh };
})();

document.addEventListener("DOMContentLoaded", App.init);
