const VISIBLE_HEADER_ROW = [
  "Date",
  "Time (24h)",
  "Requester Username",
  "Requester Email",
  "Item Requested",
  "Approved/Rejected",
  "Reviewed By",
  "Reviewer Email",
  "Lifecycle Status",
];

const INTERNAL_HEADER_ROW = [...VISIBLE_HEADER_ROW, "Sync Key"];
const LIFECYCLE_COLUMN_INDEX = 9;
const SYNC_KEY_COLUMN_INDEX = 10;

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
  const mode = payload.mode === "replace" ? "replace" : payload.mode === "upsert" ? "upsert" : "append";

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  ensureHeader(sheet);

  if (mode === "replace") {
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow - 1, INTERNAL_HEADER_ROW.length).clearContent();
      clearLifecycleFormatting(sheet, lastRow - 1);
    }
  }

  if (rows.length > 0) {
    if (mode === "append" || mode === "replace") {
      appendRows(sheet, rows);
    } else {
      upsertRows(sheet, rows);
    }
  }

  hideSyncKeyColumn(sheet);

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, count: rows.length }))
    .setMimeType(ContentService.MimeType.JSON);
}

function appendRows(sheet, rows) {
  const values = rows.map(toSheetRow);
  const startRow = sheet.getLastRow() + 1;
  sheet.getRange(startRow, 1, values.length, INTERNAL_HEADER_ROW.length).setValues(values);
  applyLifecycleFormatting(sheet, rows, startRow);
}

function upsertRows(sheet, rows) {
  const syncKeyMap = getSyncKeyRowMap(sheet);
  const rowsToAppend = [];

  rows.forEach((row) => {
    const existingRowNumber = syncKeyMap[row.syncKey];
    const values = [toSheetRow(row)];

    if (existingRowNumber) {
      sheet.getRange(existingRowNumber, 1, 1, INTERNAL_HEADER_ROW.length).setValues(values);
      applyLifecycleFormatting(sheet, [row], existingRowNumber);
    } else {
      rowsToAppend.push(row);
    }
  });

  if (rowsToAppend.length > 0) {
    appendRows(sheet, rowsToAppend);
  }
}

function getSyncKeyRowMap(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return {};
  }

  const values = sheet.getRange(2, SYNC_KEY_COLUMN_INDEX, lastRow - 1, 1).getValues();
  const map = {};

  values.forEach(([syncKey], index) => {
    if (syncKey) {
      map[String(syncKey)] = index + 2;
    }
  });

  return map;
}

function toSheetRow(row) {
  return [
    row.date || "",
    row.time24h || "",
    row.requesterName || "",
    row.requesterEmail || "",
    row.itemRequested || "",
    row.decision || "",
    row.approverName || "",
    row.approverEmail || "",
    row.lifecycleStatus || "",
    row.syncKey || "",
  ];
}

function ensureHeader(sheet) {
  const current = sheet.getRange(1, 1, 1, INTERNAL_HEADER_ROW.length).getValues()[0];
  const needsHeader = INTERNAL_HEADER_ROW.some((value, index) => current[index] !== value);

  if (needsHeader) {
    sheet.getRange(1, 1, 1, INTERNAL_HEADER_ROW.length).setValues([INTERNAL_HEADER_ROW]);
    sheet.getRange(1, 1, 1, INTERNAL_HEADER_ROW.length).setFontWeight("bold");
  }
}

function hideSyncKeyColumn(sheet) {
  sheet.hideColumns(SYNC_KEY_COLUMN_INDEX);
}

function clearLifecycleFormatting(sheet, rowCount) {
  if (rowCount <= 0) {
    return;
  }

  sheet
    .getRange(2, LIFECYCLE_COLUMN_INDEX, rowCount, 1)
    .setBackground(null)
    .setFontColor(null);
}

function applyLifecycleFormatting(sheet, rows, startRow) {
  rows.forEach((row, index) => {
    const range = sheet.getRange(startRow + index, LIFECYCLE_COLUMN_INDEX, 1, 1);
    const style = getLifecycleStyle(row.lifecycleStatus || "");
    range.setBackground(style.background);
    range.setFontColor(style.color);
  });
}

function getLifecycleStyle(status) {
  if (status === "Permanent use") {
    return { background: "#4a3419", color: "#fbbf24" };
  }
  if (status === "Return pending") {
    return { background: "#0f2942", color: "#7dd3fc" };
  }
  if (status === "Returned in Perfect condition") {
    return { background: "#143126", color: "#86efac" };
  }
  if (status === "Returned in Moderate condition") {
    return { background: "#3b2d0d", color: "#fcd34d" };
  }
  if (status === "Returned in Poor condition") {
    return { background: "#3f1d0f", color: "#fdba74" };
  }
  if (status === "Returned in Disposable condition") {
    return { background: "#1f2937", color: "#cbd5e1" };
  }
  if (status === "Rejected") {
    return { background: "#3a1115", color: "#fda4af" };
  }

  return { background: "#111827", color: "#e5e7eb" };
}
