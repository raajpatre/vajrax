/**
 * VajraX → Google Sheets sync (Apps Script web app).
 *
 * History rows are split into TWO tabs by `row.itemType`:
 *   - "non_consumable" → NON_CONSUMABLE_SHEET_NAME (borrow lifecycle, conditions, returns)
 *   - "consumable"     → CONSUMABLE_SHEET_NAME     (given / used-up items)
 *
 * Stock snapshots go to STOCKS_SHEET_NAME.
 *
 * Each tab keeps a hidden "Sync Key" column used for idempotent upserts.
 */

const NON_CONSUMABLE_SHEET_NAME = "Non-Consumable";
const CONSUMABLE_SHEET_NAME = "Consumable";
const STOCKS_SHEET_NAME = "Inventory Stocks";

// ── Tab configs ───────────────────────────────────────────────────────────────

const NON_CONSUMABLE_CONFIG = {
  name: NON_CONSUMABLE_SHEET_NAME,
  header: [
    "Item Name",
    "Borrower",
    "Reviewer",
    "Date",
    "Time",
    "Status",
    "Giving Condition",
    "Return Condition",
    "Return Date",
    "Return Time",
    "Qty",
    "Borrower Email",
    "Reviewer Email",
    "Sync Key",
  ],
  statusColumnIndex: 6,
  conditionColumnIndexes: [7, 8], // Giving Condition, Return Condition
  toRow: function (row) {
    return [
      row.itemRequested || "",
      row.requesterName || "",
      row.approverName || "",
      row.date || "",
      row.time24h || "",
      row.status || "",
      row.givingCondition || "",
      row.returnCondition || "",
      row.returnDate || "",
      row.returnTime || "",
      Number(row.quantity || 0),
      row.requesterEmail || "",
      row.approverEmail || "",
      row.syncKey || "",
    ];
  },
};

const CONSUMABLE_CONFIG = {
  name: CONSUMABLE_SHEET_NAME,
  header: [
    "Item Name",
    "Taken By",
    "Reviewer",
    "Date",
    "Time",
    "Qty",
    "Status",
    "Taker Email",
    "Reviewer Email",
    "Sync Key",
  ],
  statusColumnIndex: 7,
  conditionColumnIndexes: [],
  toRow: function (row) {
    return [
      row.itemRequested || "",
      row.requesterName || "",
      row.approverName || "",
      row.date || "",
      row.time24h || "",
      Number(row.quantity || 0),
      row.status || "",
      row.requesterEmail || "",
      row.approverEmail || "",
      row.syncKey || "",
    ];
  },
};

const STOCKS_HEADER_ROW = [
  "Component Category",
  "Component name",
  "available quantity",
  "total quantity",
];

// ── Entry point ───────────────────────────────────────────────────────────────

function doPost(e) {
  const secret = PropertiesService.getScriptProperties().getProperty("VAJRAX_SYNC_SECRET");
  const payload = JSON.parse((e && e.postData && e.postData.contents) || "{}");
  const requestSecret = payload.secret || "";

  if (!secret || requestSecret !== secret) {
    return jsonOut({ ok: false, error: "Unauthorized" });
  }

  const rows = Array.isArray(payload.rows) ? payload.rows : [];
  const mode =
    payload.mode === "replace" ? "replace" : payload.mode === "upsert" ? "upsert" : "append";
  const sheetTarget = payload.sheet === "stocks" ? "stocks" : "history";
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  if (sheetTarget === "stocks") {
    syncStocksSheet(spreadsheet, rows, mode);
  } else {
    syncHistory(spreadsheet, rows, mode);
  }

  return jsonOut({ ok: true, count: rows.length, sheet: sheetTarget });
}

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── History: route by itemType into the two tabs ──────────────────────────────

function syncHistory(spreadsheet, rows, mode) {
  const consumableRows = rows.filter(function (r) {
    return r.itemType === "consumable";
  });
  const nonConsumableRows = rows.filter(function (r) {
    return r.itemType !== "consumable";
  });

  // In "replace" mode VajraX sends the full dataset, so always reset both tabs.
  processHistoryTab(spreadsheet, NON_CONSUMABLE_CONFIG, nonConsumableRows, mode);
  processHistoryTab(spreadsheet, CONSUMABLE_CONFIG, consumableRows, mode);
}

function processHistoryTab(spreadsheet, config, rows, mode) {
  const sheet = getOrCreateSheet(spreadsheet, config.name);
  ensureHeader(sheet, config.header);

  if (mode === "replace") {
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow - 1, config.header.length).clearContent();
      clearHistoryFormatting(sheet, config, lastRow - 1);
    }
  }

  if (rows.length > 0) {
    if (mode === "upsert") {
      upsertHistoryRows(sheet, config, rows);
    } else {
      appendHistoryRows(sheet, config, rows);
    }
  }

  sheet.hideColumns(config.header.length); // Sync Key is always the last column
}

function appendHistoryRows(sheet, config, rows) {
  const values = rows.map(config.toRow);
  const startRow = sheet.getLastRow() + 1;
  sheet.getRange(startRow, 1, values.length, config.header.length).setValues(values);
  applyHistoryFormatting(sheet, config, rows, startRow);
}

function upsertHistoryRows(sheet, config, rows) {
  const syncKeyMap = getSyncKeyRowMap(sheet, config);
  const rowsToAppend = [];

  rows.forEach(function (row) {
    const existingRowNumber = syncKeyMap[row.syncKey];
    if (existingRowNumber) {
      sheet
        .getRange(existingRowNumber, 1, 1, config.header.length)
        .setValues([config.toRow(row)]);
      applyHistoryFormatting(sheet, config, [row], existingRowNumber);
    } else {
      rowsToAppend.push(row);
    }
  });

  if (rowsToAppend.length > 0) {
    appendHistoryRows(sheet, config, rowsToAppend);
  }
}

function getSyncKeyRowMap(sheet, config) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return {};
  }

  const syncKeyColumn = config.header.length; // last column
  const values = sheet.getRange(2, syncKeyColumn, lastRow - 1, 1).getValues();
  const map = {};
  values.forEach(function (pair, index) {
    const key = pair[0];
    if (key) {
      map[String(key)] = index + 2;
    }
  });
  return map;
}

// ── Formatting (status + condition color codes) ───────────────────────────────

function clearHistoryFormatting(sheet, config, rowCount) {
  if (rowCount <= 0) {
    return;
  }
  const cols = [config.statusColumnIndex].concat(config.conditionColumnIndexes);
  cols.forEach(function (col) {
    sheet.getRange(2, col, rowCount, 1).setBackground(null).setFontColor(null);
  });
}

function applyHistoryFormatting(sheet, config, rows, startRow) {
  rows.forEach(function (row, index) {
    const r = startRow + index;

    const statusStyle = getStatusStyle(row.status || "");
    sheet
      .getRange(r, config.statusColumnIndex, 1, 1)
      .setBackground(statusStyle.background)
      .setFontColor(statusStyle.color);

    config.conditionColumnIndexes.forEach(function (col) {
      // Giving Condition is the first listed condition column, Return Condition the second.
      const value = col === config.conditionColumnIndexes[0]
        ? row.givingCondition
        : row.returnCondition;
      const style = getConditionStyle(value || "");
      sheet
        .getRange(r, col, 1, 1)
        .setBackground(style.background)
        .setFontColor(style.color);
    });
  });
}

function getStatusStyle(status) {
  switch (status) {
    case "borrowed":
      return { background: "#3b2d0d", color: "#fcd34d" }; // amber
    case "returned":
      return { background: "#143126", color: "#86efac" }; // green
    case "discarded":
      return { background: "#3a1115", color: "#fda4af" }; // red
    case "permanent":
      return { background: "#2a1b3d", color: "#c4b5fd" }; // violet
    case "given":
      return { background: "#0f2942", color: "#7dd3fc" }; // cyan
    case "rejected":
      return { background: "#3a1115", color: "#fda4af" }; // red
    default:
      return { background: "#111827", color: "#e5e7eb" };
  }
}

function getConditionStyle(condition) {
  switch (condition) {
    case "Perfect":
      return { background: "#143126", color: "#86efac" }; // green
    case "Partly damaged":
      return { background: "#3b2d0d", color: "#fcd34d" }; // amber
    case "Trash":
      return { background: "#3a1115", color: "#fda4af" }; // red
    default:
      return { background: null, color: null };
  }
}

// ── Stocks tab ────────────────────────────────────────────────────────────────

function syncStocksSheet(spreadsheet, rows, mode) {
  const sheet = getOrCreateSheet(spreadsheet, STOCKS_SHEET_NAME);
  ensureHeader(sheet, STOCKS_HEADER_ROW);

  if (mode === "replace") {
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow - 1, STOCKS_HEADER_ROW.length).clearContent();
    }
  }

  if (rows.length > 0) {
    const values = rows.map(function (row) {
      return [
        row.category || "",
        row.name || "",
        Number(row.availableQuantity || 0),
        Number(row.totalQuantity || 0),
      ];
    });
    const startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, values.length, STOCKS_HEADER_ROW.length).setValues(values);
  }
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function getOrCreateSheet(spreadsheet, name) {
  return spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
}

function ensureHeader(sheet, header) {
  const current = sheet.getRange(1, 1, 1, header.length).getValues()[0];
  const needsHeader = header.some(function (value, index) {
    return current[index] !== value;
  });
  if (needsHeader) {
    sheet.getRange(1, 1, 1, header.length).setValues([header]);
    sheet.getRange(1, 1, 1, header.length).setFontWeight("bold");
  }
}
