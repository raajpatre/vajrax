# VajraX Inventory Google Sheets Sync

VajraX can sync both inventory request history and the live stock snapshot into the same Google Sheets file.

## 1. Create the Google Sheet

Create a Google Sheet named something like `VajraX Inventory Sync`.

The Apps Script will automatically manage two worksheet tabs:

1. `Inventory History`
2. `Inventory Stocks`

`Inventory History` keeps the existing history columns plus a hidden helper column named `Sync Key`.

`Inventory Stocks` uses these columns:

1. `Component Category`
2. `Component name`
3. `available quantity`
4. `total quantity`

## 2. Add an Apps Script webhook

Open `Extensions -> Apps Script` in the sheet and replace the default code with the contents of [docs/google-apps-script-inventory-history.js](./google-apps-script-inventory-history.js)

```javascript
const HEADER_ROW = [
  "Date",
  "Time (24h)",
  "Requester Username",
  "Requester Email",
  "Item Requested",
  "Approved/Rejected",
  "Reviewed By",
  "Reviewer Email",
];

function doPost(e) {
  const secret = PropertiesService.getScriptProperties().getProperty("VAJRAX_SYNC_SECRET");
  const payload = JSON.parse(e.postData.contents || "{}");
  const requestSecret = payload.secret || "";

  if (secret && requestSecret !== secret) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: "Unauthorized" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const rows = Array.isArray(payload.rows) ? payload.rows : [];
  const mode = payload.mode === "replace" ? "replace" : "append";

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  ensureHeader(sheet);

  if (mode === "replace") {
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow - 1, HEADER_ROW.length).clearContent();
    }
  }

  if (rows.length > 0) {
    const values = rows.map((row) => [
      row.date || "",
      row.time24h || "",
      row.requesterName || "",
      row.requesterEmail || "",
      row.itemRequested || "",
      row.decision || "",
      row.approverName || "",
      row.approverEmail || "",
    ]);

    const startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, values.length, HEADER_ROW.length).setValues(values);
  }

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, count: rows.length }))
    .setMimeType(ContentService.MimeType.JSON);
}

function ensureHeader(sheet) {
  const current = sheet.getRange(1, 1, 1, HEADER_ROW.length).getValues()[0];
  const needsHeader = HEADER_ROW.some((value, index) => current[index] !== value);

  if (needsHeader) {
    sheet.getRange(1, 1, 1, HEADER_ROW.length).setValues([HEADER_ROW]);
    sheet.getRange(1, 1, 1, HEADER_ROW.length).setFontWeight("bold");
  }
}
```

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

## 4. How it works

- The `Inventory History` tab keeps the existing request decision and borrow-return history behavior.
- Every rejected request creates one history row.
- Every permanent approval creates one history row.
- Every approved borrowing unit creates one history row with `Return pending`.
- When a borrowed unit is returned, the same history row is updated to `Returned in X condition`.
- The `Inventory Stocks` tab is always a full snapshot of current `inventory_items`.
- Inventory stock sync runs automatically after item create/edit/delete, request approvals that change stock, and returns that change stock.
- The `Sync to Sheet` button in the admin history page backfills both tabs.
- VajraX remains the source of truth; the sheet is a reporting and operations view.

## Notes

- This integration syncs both history rows and the current stock table.
- The in-app admin log is intentionally slimmer than the sheet and shows only date, requester, item, decision, and reviewer.
