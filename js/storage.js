"use strict";

/* ============================================================
   CATEGORY DEFINITIONS  (shared reference data)
   ============================================================ */
const CATEGORIES = {
  expense: [
    { name: "Food", color: "#9C3B2A" },
    { name: "Transportation", color: "#4A6FA5" },
    { name: "Shopping", color: "#8B5E83" },
    { name: "Bills", color: "#A9812F" },
    { name: "Entertainment", color: "#6B8E4E" },
    { name: "Healthcare", color: "#3F8C8C" },
    { name: "Education", color: "#7A5C3E" },
    { name: "Rent", color: "#5C4A72" },
    { name: "Other", color: "#6B6B6B" }
  ],
  income: [
    { name: "Salary", color: "#2F6F4E" },
    { name: "Freelance", color: "#4A8F6B" },
    { name: "Business", color: "#3F6F8C" },
    { name: "Investment", color: "#A9812F" },
    { name: "Gift", color: "#A15C8C" },
    { name: "Other", color: "#6B8E4E" }
  ]
};

function categoryColor(name){
  const all = CATEGORIES.expense.concat(CATEGORIES.income);
  const found = all.find(c => c.name === name);
  return found ? found.color : "#6B6B6B";
}

/* ============================================================
   STORAGE MODULE
   Handles all reads/writes to LocalStorage, and tolerates
   missing or corrupted data.
   ============================================================ */
const Storage = (function(){
  const KEY = "finance.transactions.v1";
  const SEEDED_KEY = "finance.seeded.v1";

  function loadTransactions(){
    let raw;
    try{
      raw = window.localStorage.getItem(KEY);
    }catch(e){
      console.warn("LocalStorage unavailable:", e);
      return [];
    }
    if(!raw) return [];
    try{
      const parsed = JSON.parse(raw);
      if(!Array.isArray(parsed)) return [];
      // Filter out any malformed entries defensively
      return parsed.filter(t => t && typeof t === "object" && t.id && t.description !== undefined);
    }catch(e){
      console.warn("Corrupted transaction data in LocalStorage, resetting.", e);
      return [];
    }
  }

  function saveTransactions(transactions){
    try{
      window.localStorage.setItem(KEY, JSON.stringify(transactions));
      return true;
    }catch(e){
      console.error("Failed to save to LocalStorage:", e);
      return false;
    }
  }

  function hasSeeded(){
    try{ return window.localStorage.getItem(SEEDED_KEY) === "1"; }
    catch(e){ return true; }
  }
  function markSeeded(){
    try{ window.localStorage.setItem(SEEDED_KEY, "1"); }catch(e){}
  }

  return { loadTransactions, saveTransactions, hasSeeded, markSeeded };
})();
