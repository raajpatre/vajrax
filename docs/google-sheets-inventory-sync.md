# VajraX Inventory Google Sheets Sync

VajraX syncs inventory request history and the live stock snapshot into one Google Sheets file.
History is split into **two tables** — non-consumable (borrowed/returned gear) and consumable
(used-up supplies) — plus a stock snapshot.

## 1. Create the Google Sheet

Create a Google Sheet named something like `VajraX Inventory Sync`. The Apps Script
automatically manages these worksheet tabs:

1. `Non-Consumable` — borrow lifecycle, one row **per unit**
2. `Consumable` — consumed/permanent items, one row per request
3. `Inventory Stocks` — full live snapshot of `inventory_items`

Each history tab keeps a hidden helper column named `Sync Key` (used for idempotent upserts).

### `Non-Consumable` columns

| Column | Source |
|---|---|
| Item Name | item name |
| Borrower | requester username |
| Reviewer | approver username |
| Date | approval date (DD/MM/YYYY, IST) |
| Time | approval time (24h, IST) |
| Status | `borrowed` → `returned` / `discarded` (color-coded) |
| Giving Condition | condition at handout: `Perfect` / `Partly damaged` / `Trash` |
| Return Condition | condition on return (blank until returned) |
| Return Date | blank until returned |
| Return Time | blank until returned |
| Qty | always `1` (one row per unit) |
| Borrower Email | requester email |
| Reviewer Email | approver email |
| Sync Key | hidden |

### `Consumable` columns

| Column | Source |
|---|---|
| Item Name | item name |
| Taken By | requester username |
| Reviewer | approver username |
| Date | approval date (DD/MM/YYYY, IST) |
| Time | approval time (24h, IST) |
| Qty | quantity given |
| Status | `given` (or `rejected`), color-coded |
| Taker Email | requester email |
| Reviewer Email | approver email |
| Sync Key | hidden |

### `Inventory Stocks` columns

1. `Component Category`
2. `Component name`
3. `available quantity`
4. `total quantity`

## 2. Add the Apps Script webhook

Open `Extensions → Apps Script` in the sheet and replace the default code with the contents of
[docs/google-apps-script-inventory-history.js](./google-apps-script-inventory-history.js).

Then:

1. Open `Project Settings`.
2. Add a script property named `VAJRAX_SYNC_SECRET`.
3. Set it to a long random secret.
4. Deploy the script as a `Web app`.
5. Grant access to `Anyone with the link`.
6. Copy the web app URL.

## 3. Configure VajraX

Add these environment variables to your local or deployed app:

```bash
GOOGLE_SHEETS_WEBHOOK_URL=https://script.google.com/macros/s/your-web-app-id/exec
GOOGLE_SHEETS_WEBHOOK_SECRET=your-shared-secret
NEXT_PUBLIC_GOOGLE_SHEET_URL=https://docs.google.com/spreadsheets/d/your-sheet-id/edit
```

## 4. Webhook payload contract

VajraX POSTs JSON to the webhook:

```jsonc
{
  "source": "vajrax",
  "sheet": "history" | "stocks",
  "mode": "append" | "replace" | "upsert",
  "sentAt": "<ISO timestamp>",
  "secret": "<shared secret>",
  "rows": [ /* see below */ ]
}
```

A **history** row (`sheet: "history"`):

```jsonc
{
  "syncKey": "borrow-unit:<id>" | "request:<id>:decision", // stable upsert key
  "itemType": "consumable" | "non_consumable",             // routes to the tab
  "date": "DD/MM/YYYY",
  "time24h": "HH:MM",
  "requesterName": "...",
  "requesterEmail": "...",
  "itemRequested": "...",
  "quantity": 1,
  "decision": "approved" | "rejected",
  "approverName": "...",
  "approverEmail": "...",
  "status": "borrowed" | "returned" | "discarded" | "permanent" | "given" | "rejected",
  "givingCondition": "" | "Perfect" | "Partly damaged" | "Trash",
  "returnCondition": "" | "Perfect" | "Partly damaged" | "Trash",
  "returnDate": "" | "DD/MM/YYYY",
  "returnTime": "" | "HH:MM",
  "lifecycleStatus": "<human-readable label>"
}
```

A **stocks** row (`sheet: "stocks"`):

```jsonc
{ "category": "...", "name": "...", "availableQuantity": 0, "totalQuantity": 0 }
```

## 5. How it works

- **Non-consumable borrow** → one row **per unit** with `status: borrowed` and the handout
  (`Giving Condition`) recorded at approval. When that unit is returned, the **same row** is
  updated (matched by `Sync Key`) to `returned` (perfect / partly damaged) or `discarded`
  (trash), and the return condition + return date/time are filled in.
- **Consumable** items (and **permanent** grants of non-consumables) get a single row —
  consumables land on the `Consumable` tab as `given`; permanent non-consumables land on
  `Non-Consumable` as `permanent`.
- **Rejections** create one row on the matching tab with `status: rejected`.
- **Status** cells are color-coded: borrowed = amber, returned = green, discarded/rejected =
  red, permanent = violet, given = cyan. Condition cells: Perfect = green, Partly damaged =
  amber, Trash = red.
- **Idempotent**: incremental events use `mode: "upsert"` keyed on `Sync Key`; the
  `Sync to Sheet` button sends the full dataset with `mode: "replace"` to rebuild both tabs.
- The `Inventory Stocks` tab is always a full snapshot, re-pushed after item edits, approvals,
  and returns that change stock.
- VajraX remains the source of truth; the sheet is a reporting / operations view.

## Notes

- The in-app admin history view is intentionally slimmer than the sheet (date, requester, item,
  decision, reviewer).
- Condition vocabulary is `Perfect` / `Partly damaged` / `Trash`; non-consumable unit status is
  `borrowed` → `returned` / `discarded`.
