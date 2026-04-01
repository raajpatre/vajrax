"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
    formatSheetDateTime,
    getLifecycleStatusLabel,
    getPreferredName,
    getSyncKeyForRequestDecision,
    getSyncKeyForReturnUnit,
    type ReturnCondition,
    type ReturnLifecycleStatus,
} from "@/lib/inventory-requests";
import {
    isInventoryHistorySheetSyncConfigured,
    syncInventoryHistoryRowsToGoogleSheets,
    type InventoryHistorySyncRow,
} from "@/lib/inventory-history-sync";
import type { Database } from "@/types/database";

const INVENTORY_SYNC_ROLES = new Set<Database["public"]["Enums"]["user_role"]>([
    "faculty",
    "president",
    "vice_president",
    "inventory_manager",
]);

type EmailMap = Record<string, string>;

type DecisionRequestRow = {
    id: string;
    status: "approved" | "rejected";
    request_type: "borrow" | "permanent";
    reviewed_at: string | null;
    requester_id: string;
    approved_by: string | null;
    item: {
        name: string;
    } | null;
    requester: {
        display_name: string;
        username: string | null;
    } | null;
    approver: {
        display_name: string;
        username: string | null;
    } | null;
};

type BorrowUnitRow = {
    id: string;
    unit_index: number;
    lifecycle_status: ReturnLifecycleStatus;
    return_condition: ReturnCondition | null;
    request: {
        id: string;
        reviewed_at: string | null;
        requester_id: string;
        approved_by: string | null;
        item: {
            name: string;
        } | null;
        requester: {
            display_name: string;
            username: string | null;
        } | null;
        approver: {
            display_name: string;
            username: string | null;
        } | null;
    } | null;
};

function getName(input: { display_name?: string | null; username?: string | null } | null) {
    return getPreferredName(input);
}

async function getUserEmailMap(userIds: string[]) {
    const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
    if (uniqueUserIds.length === 0) {
        return {} as EmailMap;
    }

    const adminSupabase = createAdminClient();
    const emailMap: EmailMap = {};

    await Promise.all(
        uniqueUserIds.map(async (userId) => {
            const { data, error } = await adminSupabase.auth.admin.getUserById(userId);
            if (!error && data.user?.email) {
                emailMap[userId] = data.user.email;
            }
        })
    );

    return emailMap;
}

function mapDecisionRows(rows: DecisionRequestRow[], emailMap: EmailMap) {
    return rows
        .map((row): InventoryHistorySyncRow | null => {
            if (!row.item || !row.requester || !row.approver || !row.approved_by || !row.reviewed_at) {
                return null;
            }

            const { date, time24h } = formatSheetDateTime(row.reviewed_at);

            return {
                syncKey: getSyncKeyForRequestDecision(row.id),
                date,
                time24h,
                requesterName: getName(row.requester),
                requesterEmail: emailMap[row.requester_id] || "",
                itemRequested: row.item.name,
                decision: row.status,
                approverName: getName(row.approver),
                approverEmail: emailMap[row.approved_by] || "",
                lifecycleStatus: getLifecycleStatusLabel({
                    decision: row.status,
                    requestType: row.request_type,
                }),
            };
        })
        .filter((row): row is InventoryHistorySyncRow => Boolean(row));
}

function mapBorrowUnitRows(rows: BorrowUnitRow[], emailMap: EmailMap) {
    return rows
        .map((row): InventoryHistorySyncRow | null => {
            if (
                !row.request ||
                !row.request.item ||
                !row.request.requester ||
                !row.request.approver ||
                !row.request.approved_by ||
                !row.request.reviewed_at
            ) {
                return null;
            }

            const { date, time24h } = formatSheetDateTime(row.request.reviewed_at);

            return {
                syncKey: getSyncKeyForReturnUnit(row.id),
                date,
                time24h,
                requesterName: getName(row.request.requester),
                requesterEmail: emailMap[row.request.requester_id] || "",
                itemRequested: row.request.item.name,
                decision: "approved",
                approverName: getName(row.request.approver),
                approverEmail: emailMap[row.request.approved_by] || "",
                lifecycleStatus: getLifecycleStatusLabel({
                    decision: "approved",
                    requestType: "borrow",
                    lifecycleStatus: row.lifecycle_status,
                    returnCondition: row.return_condition,
                }),
            };
        })
        .filter((row): row is InventoryHistorySyncRow => Boolean(row));
}

export async function syncInventoryHistoryToGoogleSheets(): Promise<
    { ok: true; count: number; sheetUrl: string | null } | { ok: false; error: string }
> {
    if (!isInventoryHistorySheetSyncConfigured()) {
        return { ok: false, error: "Google Sheets sync is not configured on the server." };
    }

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { ok: false, error: "Not authenticated" };
    }

    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profileError || !profile || !INVENTORY_SYNC_ROLES.has(profile.role)) {
        return { ok: false, error: "Not authorized" };
    }

    const [{ data: decisionData, error: decisionError }, { data: borrowUnitData, error: borrowUnitError }] =
        await Promise.all([
            supabase
                .from("equipment_requests")
                .select(
                    `
                    id,
                    status,
                    request_type,
                    reviewed_at,
                    requester_id,
                    approved_by,
                    item:inventory_items!equipment_requests_item_id_fkey(
                        name
                    ),
                    requester:profiles!equipment_requests_requester_id_fkey(
                        display_name,
                        username
                    ),
                    approver:profiles!equipment_requests_approved_by_fkey(
                        display_name,
                        username
                    )
                `
                )
                .in("status", ["approved", "rejected", "returned"])
                .not("approved_by", "is", null)
                .order("reviewed_at", { ascending: true }),
            supabase
                .from("equipment_request_return_units")
                .select(
                    `
                    id,
                    unit_index,
                    lifecycle_status,
                    return_condition,
                    request:equipment_requests!equipment_request_return_units_request_id_fkey(
                        id,
                        reviewed_at,
                        requester_id,
                        approved_by,
                        item:inventory_items!equipment_requests_item_id_fkey(
                            name
                        ),
                        requester:profiles!equipment_requests_requester_id_fkey(
                            display_name,
                            username
                        ),
                        approver:profiles!equipment_requests_approved_by_fkey(
                            display_name,
                            username
                        )
                    )
                `
                )
                .order("created_at", { ascending: true })
                .order("unit_index", { ascending: true }),
        ]);

    if (decisionError) {
        return { ok: false, error: decisionError.message };
    }

    if (borrowUnitError) {
        return { ok: false, error: borrowUnitError.message };
    }

    const decisionRows = (decisionData as unknown as DecisionRequestRow[]).filter((row) => {
        if (row.status === "rejected") {
            return true;
        }

        return row.request_type === "permanent";
    });

    const borrowUnitRows = (borrowUnitData as unknown as BorrowUnitRow[]).filter((row) => Boolean(row.request));

    const emailMap = await getUserEmailMap([
        ...decisionRows.flatMap((row) => [row.requester_id, row.approved_by || ""]),
        ...borrowUnitRows.flatMap((row) => {
            if (!row.request) {
                return [];
            }

            return [row.request.requester_id, row.request.approved_by || ""];
        }),
    ]);

    const rows = [...mapDecisionRows(decisionRows, emailMap), ...mapBorrowUnitRows(borrowUnitRows, emailMap)];

    try {
        await syncInventoryHistoryRowsToGoogleSheets({
            mode: "replace",
            rows,
        });
    } catch (syncError) {
        return {
            ok: false,
            error:
                syncError instanceof Error
                    ? syncError.message
                    : "Failed to sync inventory history to Google Sheets.",
        };
    }

    return {
        ok: true,
        count: rows.length,
        sheetUrl: process.env.NEXT_PUBLIC_GOOGLE_SHEET_URL?.trim() || null,
    };
}
