# VajraX Inventory History Google Sheets Sync

VajraX can push the request decision history into a Google Sheet and keep borrowing rows updated as items are returned.

## 1. Create the Google Sheet

Create a Google Sheet named something like `VajraX Inventory History`.

Recommended columns in the first row:

1. `Date`
2. `Time (24h)`
3. `Requester Username`
4. `Requester Email`
5. `Item Requested`
6. `Approved/Rejected`
7. `Reviewed By`
8. `Reviewer Email`
9. `Lifecycle Status`

VajraX also uses one hidden helper column named `Sync Key` so the script can update existing borrowing rows in place.

## 2. Add an Apps Script webhook

Open `Extensions -> Apps Script` in the sheet and replace the default code with the contents of [docs/google-apps-script-inventory-history.js](/Users/raaj.dev/Documents/AntiGravity/My Projects /VajraX/vajrax/docs/google-apps-script-inventory-history.js), or paste this:

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

- Every rejected request creates one row.
- Every permanent approval creates one row.
- Every approved borrowing unit creates one row with `Return pending`.
- When a borrowed unit is returned, the same row is updated to `Returned in X condition`.
- The `Sync to Sheet` button in the admin inventory history page sends a full backfill using `replace` mode in chronological order.
- VajraX remains the source of truth; the sheet is a reporting and operations view.

## Notes

- This integration syncs rejected requests, permanent approvals, and borrowing units.
- The in-app admin log is intentionally slimmer than the sheet and shows only date, requester, item, decision, and reviewer.
