import type { SheetItemStatus, SheetItemType } from "@/lib/inventory-requests";

export type InventoryHistorySyncMode = "append" | "replace" | "upsert";
export type GoogleSheetTarget = "history" | "stocks";

export type InventoryHistorySyncRow = {
    syncKey: string;
    // Routes the row to the consumable vs non-consumable table on the Sheet.
    itemType: SheetItemType;
    date: string;
    time24h: string;
    requesterName: string;
    requesterEmail: string;
    itemRequested: string;
    quantity: number;
    decision: "approved" | "rejected";
    approverName: string;
    approverEmail: string;
    // borrowed / returned / discarded / permanent / given / rejected
    status: SheetItemStatus;
    // Condition the unit was in when handed out (non-consumable only).
    givingCondition: string;
    // Condition the unit came back in (non-consumable, once returned).
    returnCondition: string;
    // When the unit was returned (non-consumable, once returned).
    returnDate: string;
    returnTime: string;
    // Human-readable lifecycle label (kept for the existing flat history view).
    lifecycleStatus: string;
};

export type InventoryStockSyncRow = {
    category: string;
    name: string;
    availableQuantity: number;
    totalQuantity: number;
};

function getWebhookUrl() {
    return process.env.GOOGLE_SHEETS_WEBHOOK_URL?.trim() || null;
}

export function isInventoryHistorySheetSyncConfigured() {
    return Boolean(getWebhookUrl());
}

async function postGoogleSheetsPayload(payload: {
    sheet: GoogleSheetTarget;
    mode: InventoryHistorySyncMode;
    rows: InventoryHistorySyncRow[] | InventoryStockSyncRow[];
}) {
    const webhookUrl = getWebhookUrl();

    if (!webhookUrl || payload.rows.length === 0) {
        return {
            ok: false as const,
            skipped: true as const,
            message: !webhookUrl
                ? "Google Sheets webhook URL is not configured."
                : `No ${payload.sheet} rows were provided for sync.`,
        };
    }

    const secret = process.env.GOOGLE_SHEETS_WEBHOOK_SECRET?.trim();
    const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(secret ? { "x-vajrax-sync-secret": secret } : {}),
        },
        body: JSON.stringify({
            source: "vajrax",
            sheet: payload.sheet,
            mode: payload.mode,
            sentAt: new Date().toISOString(),
            secret: secret || null,
            rows: payload.rows,
        }),
        cache: "no-store",
    });

    if (!response.ok) {
        const details = await response.text();
        console.error("[SheetSync] Response not OK:", response.status, details);
        throw new Error(details || `Google Sheets sync failed with ${response.status}`);
    }

    const responseBody = await response.text();
    console.log("[SheetSync] Response:", response.status, responseBody);

    return {
        ok: true as const,
        skipped: false as const,
    };
}

export async function syncInventoryHistoryRowsToGoogleSheets(input: {
    mode: InventoryHistorySyncMode;
    rows: InventoryHistorySyncRow[];
}) {
    return postGoogleSheetsPayload({
        sheet: "history",
        mode: input.mode,
        rows: input.rows,
    });
}

export async function syncInventoryStockRowsToGoogleSheets(input: {
    mode: InventoryHistorySyncMode;
    rows: InventoryStockSyncRow[];
}) {
    return postGoogleSheetsPayload({
        sheet: "stocks",
        mode: input.mode,
        rows: input.rows,
    });
}
