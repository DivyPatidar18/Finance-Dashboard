# Personal Finance Dashboard

A complete, frontend-only personal finance tracker. Add income and expenses, see
live totals and charts, search/filter/sort your history, and export or import
your data — all stored in your browser, with no backend or server required.

## File structure

```
finance-dashboard/
├── index.html          Page markup: sidebar, dashboard, transactions view, modals
├── css/
│   └── style.css        All styling: design tokens, layout, responsive rules
├── js/
│   ├── storage.js        Category reference data + LocalStorage read/write helpers
│   ├── calculations.js   Pure functions that derive totals, trends, breakdowns
│   ├── transactions.js   In-memory transaction list + CRUD (add/update/delete)
│   ├── ui.js              Toasts, dialogs, the add/edit form, and all rendering
│   └── app.js             Wires everything together: events, filters, init
└── README.md
```

The JS files are loaded as plain `<script src="...">` tags, in the order shown
above, because each later file depends on the one(s) before it (e.g. `ui.js`
calls into `Transactions` and `Calculations`). There's no build step and no
bundler — open `index.html` and it works.

## How LocalStorage is used

All data lives under two keys in the browser's `localStorage`:

- `finance.transactions.v1` — a JSON array of every transaction
- `finance.seeded.v1` — a flag so sample data is only ever inserted once, on
  first launch

`storage.js` exposes `loadTransactions()` and `saveTransactions()`. Loading is
defensive: if the stored value is missing, not valid JSON, or not an array,
the app quietly falls back to an empty list instead of breaking.
`transactions.js` calls `saveTransactions()` after every add, edit, delete,
import, or clear, so changes persist immediately and survive a page reload or
browser restart. Because it's LocalStorage, data is specific to one browser on
one device — it won't sync across devices, and clearing your browser's site
data will remove it (use Export as a backup).

## Running it locally

No install, no server, no dependencies:

1. Unzip the project if needed, keeping the folder structure intact.
2. Open `index.html` directly in any modern browser (double-click it, or
   right-click → Open With → your browser).

That's it — the relative `css/` and `js/` paths only work when the three
folders stay together, so don't move `index.html` out of this folder on its
own.

## Main features

- **Dashboard**: total balance, income, expenses, and transaction count;
  current-month income/expense summary; a 6-month income-vs-expense bar
  chart; an expense-by-category donut chart; a running balance trend line;
  and a recent-transactions list.
- **Transactions**: add, edit, and delete entries through a single reusable
  modal form with validation (description, amount > 0, category, and date
  are required). Desktop shows a sortable table; mobile switches to stacked
  cards automatically.
- **Search & filter**: full-text search by description/category, plus
  filters for type, category, and month, and sorting by date or amount —
  all update instantly with no page reload.
- **Data management**: export all transactions as JSON or CSV, import a
  JSON file back in, reset to fresh sample data, or clear everything —
  each destructive action asks for confirmation first.
- **Accessibility**: labeled form fields, keyboard-dismissible modals
  (Escape key and backdrop click), visible focus outlines, and ARIA roles
  on the navigation tabs and dialogs.
- **Responsive design**: CSS Grid/Flexbox layout that adapts from desktop
  down to mobile, including a collapsing sidebar and a table-to-cards
  switch for the transaction list.

## Notes on the sample data

On first launch the app seeds a handful of realistic transactions so the
dashboard doesn't look empty. Once you've added, edited, or deleted anything,
that sample data is treated the same as your own — use **Reset demo data**
in the sidebar at any time to wipe everything and start over with a fresh
sample set, or **Clear all data** to empty the ledger completely.
