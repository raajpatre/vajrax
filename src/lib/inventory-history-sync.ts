export type InventoryHistorySyncMode = "append" | "replace" | "upsert";

export type InventoryHistorySyncRow = {
    syncKey: string;
    date: string;
    time24h: string;
    requesterName: string;
    requesterEmail: string;
    itemRequested: string;
    decision: "approved" | "rejected";
    approverName: string;
    approverEmail: string;
    lifecycleStatus: string;
};

function getWebhookUrl() {
    return process.env.GOOGLE_SHEETS_WEBHOOK_URL?.trim() || null;
}

export function isInventoryHistorySheetSyncConfigured() {
    return Boolean(getWebhookUrl());
}

export async function syncInventoryHistoryRowsToGoogleSheets(input: {
    mode: InventoryHistorySyncMode;
    rows: InventoryHistorySyncRow[];
}) {
    const webhookUrl = getWebhookUrl();

    if (!webhookUrl || input.rows.length === 0) {
        return {
            ok: false as const,
            skipped: true as const,
            message: !webhookUrl
                ? "Google Sheets webhook URL is not configured."
                : "No inventory history rows were provided for sync.",
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
            mode: input.mode,
            sentAt: new Date().toISOString(),
            secret: secret || null,
            rows: input.rows,
        }),
        cache: "no-store",
    });

    if (!response.ok) {
        const details = await response.text();
        throw new Error(details || `Google Sheets sync failed with ${response.status}`);
    }

    return {
        ok: true as const,
        skipped: false as const,
    };
}
