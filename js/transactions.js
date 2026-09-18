"use strict";

/* ============================================================
   TRANSACTIONS MODULE
   Owns the in-memory transaction list and all CRUD operations.
   ============================================================ */
const Transactions = (function(){
  let items = Storage.loadTransactions();

  function generateId(){
    return "t" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function all(){ return items; }

  function persist(){ Storage.saveTransactions(items); }

  function add(data){
    const txn = {
      id: generateId(),
      description: data.description.trim(),
      amount: Math.round(parseFloat(data.amount) * 100) / 100,
      type: data.type,
      category: data.category,
      date: data.date,
      notes: (data.notes || "").trim(),
      sample: false
    };
    items.unshift(txn);
    persist();
    return txn;
  }

  function update(id, data){
    const idx = items.findIndex(t => t.id === id);
    if(idx === -1) return null;
    items[idx] = Object.assign({}, items[idx], {
      description: data.description.trim(),
      amount: Math.round(parseFloat(data.amount) * 100) / 100,
      type: data.type,
      category: data.category,
      date: data.date,
      notes: (data.notes || "").trim()
    });
    persist();
    return items[idx];
  }

  function remove(id){
    items = items.filter(t => t.id !== id);
    persist();
  }

  function clearAll(){
    items = [];
    persist();
  }

  function replaceAll(newItems){
    items = newItems;
    persist();
  }

  function getById(id){
    return items.find(t => t.id === id) || null;
  }

  return { all, add, update, remove, clearAll, replaceAll, getById, generateId };
})();
