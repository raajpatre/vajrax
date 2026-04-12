const HISTORY_SHEET_NAME = "Inventory History";
const STOCKS_SHEET_NAME = "Inventory Stocks";

const VISIBLE_HISTORY_HEADER_ROW = [
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

const INTERNAL_HISTORY_HEADER_ROW = [...VISIBLE_HISTORY_HEADER_ROW, "Sync Key"];
const STOCKS_HEADER_ROW = [
  "Component Category",
  "Component name",
  "available quantity",
  "total quantity",
];

const LIFECYCLE_COLUMN_INDEX = 9;
const HISTORY_SYNC_KEY_COLUMN_INDEX = 10;

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
  const mode =
    payload.mode === "replace" ? "replace" : payload.mode === "upsert" ? "upsert" : "append";
  const sheetTarget = payload.sheet === "stocks" ? "stocks" : "history";
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  if (sheetTarget === "stocks") {
    syncStocksSheet(spreadsheet, rows, mode);
  } else {
    syncHistorySheet(spreadsheet, rows, mode);
  }

  return ContentService
    .createTextOutput(
      JSON.stringify({
        ok: true,
        count: rows.length,
        sheet: sheetTarget,
      })
    )
    .setMimeType(ContentService.MimeType.JSON);
}

function syncHistorySheet(spreadsheet, rows, mode) {
  const sheet = getOrCreateSheet(spreadsheet, HISTORY_SHEET_NAME);
  ensureHistoryHeader(sheet);

  if (mode === "replace") {
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow - 1, INTERNAL_HISTORY_HEADER_ROW.length).clearContent();
      clearLifecycleFormatting(sheet, lastRow - 1);
    }
  }

  if (rows.length > 0) {
    if (mode === "append" || mode === "replace") {
      appendHistoryRows(sheet, rows);
    } else {
      upsertHistoryRows(sheet, rows);
    }
  }

  hideHistorySyncKeyColumn(sheet);
}

function syncStocksSheet(spreadsheet, rows, mode) {
  const sheet = getOrCreateSheet(spreadsheet, STOCKS_SHEET_NAME);
  ensureStocksHeader(sheet);

  if (mode === "replace") {
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow - 1, STOCKS_HEADER_ROW.length).clearContent();
    }
  }

  if (rows.length > 0) {
    const values = rows.map(toStocksSheetRow);
    const startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, values.length, STOCKS_HEADER_ROW.length).setValues(values);
  }
}

function getOrCreateSheet(spreadsheet, name) {
  const existing = spreadsheet.getSheetByName(name);
  if (existing) {
    return existing;
  }

  return spreadsheet.insertSheet(name);
}

function appendHistoryRows(sheet, rows) {
  const values = rows.map(toHistorySheetRow);
  const startRow = sheet.getLastRow() + 1;
  sheet.getRange(startRow, 1, values.length, INTERNAL_HISTORY_HEADER_ROW.length).setValues(values);
  applyLifecycleFormatting(sheet, rows, startRow);
}

function upsertHistoryRows(sheet, rows) {
  const syncKeyMap = getHistorySyncKeyRowMap(sheet);
  const rowsToAppend = [];

  rows.forEach((row) => {
    const existingRowNumber = syncKeyMap[row.syncKey];
    const values = [toHistorySheetRow(row)];

    if (existingRowNumber) {
      sheet.getRange(existingRowNumber, 1, 1, INTERNAL_HISTORY_HEADER_ROW.length).setValues(values);
      applyLifecycleFormatting(sheet, [row], existingRowNumber);
    } else {
      rowsToAppend.push(row);
    }
  });

  if (rowsToAppend.length > 0) {
    appendHistoryRows(sheet, rowsToAppend);
  }
}

function getHistorySyncKeyRowMap(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return {};
  }

  const values = sheet.getRange(2, HISTORY_SYNC_KEY_COLUMN_INDEX, lastRow - 1, 1).getValues();
  const map = {};

  values.forEach(([syncKey], index) => {
    if (syncKey) {
      map[String(syncKey)] = index + 2;
    }
  });

  return map;
}

function toHistorySheetRow(row) {
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

function toStocksSheetRow(row) {
  return [
    row.category || "",
    row.name || "",
    Number(row.availableQuantity || 0),
    Number(row.totalQuantity || 0),
  ];
}

function ensureHistoryHeader(sheet) {
  const current = sheet.getRange(1, 1, 1, INTERNAL_HISTORY_HEADER_ROW.length).getValues()[0];
  const needsHeader = INTERNAL_HISTORY_HEADER_ROW.some((value, index) => current[index] !== value);

  if (needsHeader) {
    sheet.getRange(1, 1, 1, INTERNAL_HISTORY_HEADER_ROW.length).setValues([INTERNAL_HISTORY_HEADER_ROW]);
    sheet.getRange(1, 1, 1, INTERNAL_HISTORY_HEADER_ROW.length).setFontWeight("bold");
  }
}

function ensureStocksHeader(sheet) {
  const current = sheet.getRange(1, 1, 1, STOCKS_HEADER_ROW.length).getValues()[0];
  const needsHeader = STOCKS_HEADER_ROW.some((value, index) => current[index] !== value);

  if (needsHeader) {
    sheet.getRange(1, 1, 1, STOCKS_HEADER_ROW.length).setValues([STOCKS_HEADER_ROW]);
    sheet.getRange(1, 1, 1, STOCKS_HEADER_ROW.length).setFontWeight("bold");
  }
}

function hideHistorySyncKeyColumn(sheet) {
  sheet.hideColumns(HISTORY_SYNC_KEY_COLUMN_INDEX);
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
