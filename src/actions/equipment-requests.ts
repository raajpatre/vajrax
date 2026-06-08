"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
    formatSheetDateTime,
    getConditionLabel,
    getLifecycleStatusLabel,
    getPreferredName,
    getSheetItemStatus,
    getSyncKeyForRequestDecision,
    getSyncKeyForReturnUnit,
    isRestockableCondition,
    type GivingCondition,
    type ReturnCondition,
    type ReturnLifecycleStatus,
} from "@/lib/inventory-requests";
import type { InventoryHistorySyncRow } from "@/lib/inventory-history-sync";
import {
    syncInventoryHistoryRowsToGoogleSheets,
    syncInventoryStockRowsToGoogleSheets,
} from "@/lib/inventory-history-sync";
import { getInventoryStockRows } from "@/actions/inventory-history";
import type { Database } from "@/types/database";

const MODERATOR_ROLES = new Set<Database["public"]["Enums"]["user_role"]>([
    "faculty",
    "president",
    "vice_president",
]);

export type EquipmentRequestType = "borrow" | "permanent";
export type EquipmentRequestReviewAction = "approved" | "rejected";

type EquipmentRequestRow = {
    id: string;
    quantity: number;
    approved_quantity: number | null;
    approved_by: string | null;
    reviewed_at: string | null;
    request_type: EquipmentRequestType;
    status: Database["public"]["Enums"]["request_status"];
    requester: {
        id: string;
        display_name: string;
        username: string | null;
    };
    approver?: {
        id?: string;
        display_name: string;
        username: string | null;
    } | null;
    item: {
        id: string;
        name: string;
        category: string;
        total_quantity: number;
        available_quantity: number;
        is_consumable: boolean;
    };
};

type ReturnUnitRow = {
    id: string;
    unit_index: number;
    lifecycle_status: "return_pending" | "returned";
    giving_condition: GivingCondition | null;
};

type ReviewRequestInput = {
    requestId: string;
    action: EquipmentRequestReviewAction;
    approvedQuantity?: number;
    // Per-unit handout condition for non-consumable borrow approvals.
    // Length should equal approvedQuantity; defaults to all "perfect".
    givingConditions?: GivingCondition[];
};

type BorrowReturnInput = {
    requestId: string;
    returns: Array<{
        unitId: string;
        condition: ReturnCondition;
    }>;
};

async function createNotification(input: {
    userId: string;
    type: string;
    message: string;
    relatedEntityId?: string | null;
}) {
    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase.from("notifications").insert({
        user_id: input.userId,
        type: input.type,
        message: input.message,
        related_entity_id: input.relatedEntityId ?? null,
    });

    if (error) {
        console.error("Notification insert failed:", error.message);
    }
}

async function notifyInventoryManagers(input: {
    message: string;
    relatedEntityId?: string | null;
}) {
    const reviewerRoles: Array<Database["public"]["Enums"]["user_role"]> = [
        "inventory_manager",
        "faculty",
        "president",
        "vice_president",
    ];

    const adminSupabase = createAdminClient();
    const { data: inventoryManagers, error } = await adminSupabase
        .from("profiles")
        .select("id")
        .in("role", reviewerRoles);

    if (error || !inventoryManagers?.length) {
        if (error) {
            console.error("Failed to load inventory managers for notifications:", error.message);
        }
        return;
    }

    const { error: notificationError } = await adminSupabase.from("notifications").insert(
        inventoryManagers.map((manager) => ({
            user_id: manager.id,
            type: "inventory_request_received",
            message: input.message,
            related_entity_id: input.relatedEntityId ?? null,
        }))
    );

    if (notificationError) {
        console.error("Inventory manager notification insert failed:", notificationError.message);
    }
}

async function getModeratorContext() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { ok: false as const, error: "Not authenticated" };
    }

    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, display_name, username")
        .eq("id", user.id)
        .single();

    if (profileError || !profile || !MODERATOR_ROLES.has(profile.role)) {
        return { ok: false as const, error: "Not authorized" };
    }

    return {
        ok: true as const,
        supabase,
        user,
        profile,
    };
}

async function getUserEmails(userIds: string[]) {
    const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
    if (uniqueUserIds.length === 0) {
        return {} as Record<string, string>;
    }

    const adminSupabase = createAdminClient();
    const emailMap: Record<string, string> = {};

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

function buildReviewStatusNote(req: EquipmentRequestRow, input: ReviewRequestInput) {
    if (input.action === "rejected") {
        return "Rejected";
    }

    if (!input.approvedQuantity) {
        return null;
    }

    if (input.approvedQuantity === req.quantity) {
        return req.request_type === "permanent" ? "Approved for permanent use." : "Approved in full.";
    }

    const rejectedRemainder = req.quantity - input.approvedQuantity;
    return `Approved ${input.approvedQuantity} of ${req.quantity}; ${rejectedRemainder} not approved.`;
}

function buildReturnStatusNote(approvedQuantity: number, returnedCount: number) {
    return returnedCount >= approvedQuantity
        ? "All approved borrowed items were returned."
        : `${returnedCount} of ${approvedQuantity} approved borrowed items returned.`;
}

function buildReturnHistoryNote(returns: BorrowReturnInput["returns"]) {
    const counts = returns.reduce<Record<ReturnCondition, number>>(
        (acc, item) => {
            acc[item.condition] += 1;
            return acc;
        },
        {
            perfect: 0,
            partly_damaged: 0,
            trash: 0,
        }
    );

    const summary = Object.entries(counts)
        .filter(([, count]) => count > 0)
        .map(([condition, count]) => `${count} ${getConditionLabel(condition as ReturnCondition).toLowerCase()}`)
        .join(", ");

    return summary ? `Returned items logged: ${summary}.` : "Returned items logged.";
}

type SheetIdentity = {
    requesterName: string;
    requesterEmail: string;
    itemRequested: string;
    approverName: string;
    approverEmail: string;
};

// Per-request row: used for rejected items, permanent grants, and consumables.
function buildRequestSheetRow(
    input: SheetIdentity & {
        requestId: string;
        decision: EquipmentRequestReviewAction;
        requestType: EquipmentRequestType;
        isConsumable: boolean;
        quantity: number;
        reviewedAt: string | null;
    }
): InventoryHistorySyncRow {
    const { date, time24h } = formatSheetDateTime(input.reviewedAt);
    const status = getSheetItemStatus({
        decision: input.decision,
        isConsumable: input.isConsumable,
        requestType: input.requestType,
    });

    return {
        syncKey: getSyncKeyForRequestDecision(input.requestId),
        itemType: input.isConsumable ? "consumable" : "non_consumable",
        date,
        time24h,
        requesterName: input.requesterName,
        requesterEmail: input.requesterEmail,
        itemRequested: input.itemRequested,
        quantity: input.quantity,
        decision: input.decision,
        approverName: input.approverName,
        approverEmail: input.approverEmail,
        status,
        givingCondition: "",
        returnCondition: "",
        returnDate: "",
        returnTime: "",
        lifecycleStatus: getLifecycleStatusLabel({
            decision: input.decision,
            requestType: input.requestType,
        }),
    };
}

// Per-unit row for a non-consumable borrow unit (status borrowed / returned / discarded).
function buildBorrowUnitSheetRow(
    input: SheetIdentity & {
        unitId: string;
        reviewedAt: string | null;
        givingCondition: GivingCondition;
        lifecycleStatus: ReturnLifecycleStatus;
        returnCondition: ReturnCondition | null;
        returnedAt: string | null;
    }
): InventoryHistorySyncRow {
    const { date, time24h } = formatSheetDateTime(input.reviewedAt);
    const ret = input.returnedAt
        ? formatSheetDateTime(input.returnedAt)
        : { date: "", time24h: "" };
    const status = getSheetItemStatus({
        decision: "approved",
        isConsumable: false,
        requestType: "borrow",
        lifecycleStatus: input.lifecycleStatus,
        returnCondition: input.returnCondition,
    });

    return {
        syncKey: getSyncKeyForReturnUnit(input.unitId),
        itemType: "non_consumable",
        date,
        time24h,
        requesterName: input.requesterName,
        requesterEmail: input.requesterEmail,
        itemRequested: input.itemRequested,
        quantity: 1,
        decision: "approved",
        approverName: input.approverName,
        approverEmail: input.approverEmail,
        status,
        givingCondition: getConditionLabel(input.givingCondition),
        returnCondition: input.returnCondition ? getConditionLabel(input.returnCondition) : "",
        returnDate: ret.date,
        returnTime: ret.time24h,
        lifecycleStatus: getLifecycleStatusLabel({
            decision: "approved",
            requestType: "borrow",
            lifecycleStatus: input.lifecycleStatus,
            returnCondition: input.returnCondition,
        }),
    };
}

async function revalidateInventoryPaths() {
    revalidatePath("/admin/requests");
    revalidatePath("/my-requests");
    revalidatePath("/inventory");
}

async function syncInventoryStocksSnapshot() {
    try {
        const rows = await getInventoryStockRows();
        await syncInventoryStockRowsToGoogleSheets({
            mode: "replace",
            rows,
        });
    } catch (syncError) {
        console.error("Failed to sync inventory stocks to Google Sheets:", syncError);
    }
}

export async function reviewEquipmentRequest(
    input: ReviewRequestInput
): Promise<{ ok: true } | { ok: false; error: string }> {
    const context = await getModeratorContext();
    if (!context.ok) {
        return { ok: false, error: context.error };
    }

    const { supabase, user, profile } = context;

    const { data: raw, error: fetchError } = await supabase
        .from("equipment_requests")
        .select(
            `
            id,
            quantity,
            approved_quantity,
            approved_by,
            reviewed_at,
            request_type,
            status,
            requester:profiles!equipment_requests_requester_id_fkey (
                id,
                display_name,
                username
            ),
            item:inventory_items!equipment_requests_item_id_fkey (
                id,
                name,
                category,
                total_quantity,
                available_quantity,
                is_consumable
            )
        `
        )
        .eq("id", input.requestId)
        .single();

    if (fetchError || !raw) {
        return { ok: false, error: fetchError?.message ?? "Request not found" };
    }

    const req = raw as unknown as EquipmentRequestRow;

    if (req.status !== "pending") {
        return { ok: false, error: "Only pending requests can be reviewed." };
    }

    if (input.action === "approved") {
        if (!Number.isInteger(input.approvedQuantity) || !input.approvedQuantity) {
            return { ok: false, error: "Approved quantity is required." };
        }
        if (input.approvedQuantity < 1 || input.approvedQuantity > req.quantity) {
            return { ok: false, error: "Approved quantity must be between 1 and requested quantity." };
        }
        if (input.approvedQuantity > req.item.available_quantity) {
            return { ok: false, error: "Approved quantity exceeds available stock." };
        }
    }

    const reviewedAt = new Date().toISOString();
    const approvedQuantity = input.action === "approved" ? input.approvedQuantity! : 0;
    const statusNote = buildReviewStatusNote(req, input);
    const isConsumable = req.item.is_consumable;
    // Consumables are used up; permanent grants leave inventory for good. Either
    // way no return units are created. Only non-consumable borrows are tracked back.
    const consumeStock = isConsumable || req.request_type === "permanent";
    const givingConditions: GivingCondition[] =
        input.givingConditions && input.givingConditions.length === approvedQuantity
            ? input.givingConditions
            : Array.from({ length: approvedQuantity }, () => "perfect" as GivingCondition);

    const { error: updateReqError } = await supabase
        .from("equipment_requests")
        .update({
            status: input.action,
            approved_by: user.id,
            approved_quantity: approvedQuantity,
            reviewed_at: reviewedAt,
            status_note: statusNote,
        })
        .eq("id", input.requestId);

    if (updateReqError) {
        return { ok: false, error: updateReqError.message };
    }

    const historyNote =
        input.action === "approved" && approvedQuantity < req.quantity
            ? `Approved ${approvedQuantity} of ${req.quantity} requested.`
            : statusNote;

    const { error: historyError } = await supabase.from("inventory_history").insert({
        request_id: input.requestId,
        item_id: req.item.id,
        actor_id: user.id,
        action: input.action,
        quantity: input.action === "approved" ? approvedQuantity : req.quantity,
        note: historyNote,
    });

    if (historyError) {
        return { ok: false, error: historyError.message };
    }

    if (input.action === "approved") {
        if (consumeStock) {
            const { error: inventoryError } = await supabase
                .from("inventory_items")
                .update({
                    total_quantity: req.item.total_quantity - approvedQuantity,
                    available_quantity: req.item.available_quantity - approvedQuantity,
                })
                .eq("id", req.item.id);

            if (inventoryError) {
                return { ok: false, error: inventoryError.message };
            }
        } else {
            const { error: inventoryError } = await supabase
                .from("inventory_items")
                .update({
                    available_quantity: req.item.available_quantity - approvedQuantity,
                })
                .eq("id", req.item.id);

            if (inventoryError) {
                return { ok: false, error: inventoryError.message };
            }

            const returnUnits = Array.from({ length: approvedQuantity }, (_, index) => ({
                request_id: input.requestId,
                item_id: req.item.id,
                unit_index: index + 1,
                lifecycle_status: "return_pending" as const,
                giving_condition: givingConditions[index],
                updated_at: reviewedAt,
            }));

            const { data: createdUnits, error: returnUnitError } = await supabase
                .from("equipment_request_return_units")
                .insert(returnUnits)
                .select("id, giving_condition");

            if (returnUnitError) {
                return { ok: false, error: returnUnitError.message };
            }

            try {
                const emailMap = await getUserEmails([req.requester.id, user.id]);
                const identity = {
                    requesterName: getPreferredName(req.requester),
                    requesterEmail: emailMap[req.requester.id] || "",
                    itemRequested: req.item.name,
                    approverName: getPreferredName(profile),
                    approverEmail: emailMap[user.id] || "",
                };
                await syncInventoryHistoryRowsToGoogleSheets({
                    mode: "upsert",
                    rows: (createdUnits || []).map((unit) =>
                        buildBorrowUnitSheetRow({
                            unitId: unit.id,
                            reviewedAt,
                            givingCondition: (unit.giving_condition ?? "perfect") as GivingCondition,
                            lifecycleStatus: "return_pending",
                            returnCondition: null,
                            returnedAt: null,
                            ...identity,
                        })
                    ),
                });
            } catch (syncError) {
                console.error("Failed to sync borrow approval rows to Google Sheets:", syncError);
            }
        }

        await syncInventoryStocksSnapshot();
    }

    // Per-request row: rejections, plus approved consumables/permanent grants (no units).
    if (input.action === "rejected" || (input.action === "approved" && consumeStock)) {
        try {
            const emailMap = await getUserEmails([req.requester.id, user.id]);
            await syncInventoryHistoryRowsToGoogleSheets({
                mode: "upsert",
                rows: [
                    buildRequestSheetRow({
                        requestId: input.requestId,
                        decision: input.action,
                        requestType: req.request_type,
                        isConsumable,
                        quantity: input.action === "approved" ? approvedQuantity : req.quantity,
                        reviewedAt,
                        requesterName: getPreferredName(req.requester),
                        requesterEmail: emailMap[req.requester.id] || "",
                        itemRequested: req.item.name,
                        approverName: getPreferredName(profile),
                        approverEmail: emailMap[user.id] || "",
                    }),
                ],
            });
        } catch (syncError) {
            console.error("Failed to sync request decision to Google Sheets:", syncError);
        }
    }

    await createNotification({
        userId: req.requester.id,
        type: input.action === "approved" ? "equipment_request_approved" : "equipment_request_rejected",
        message:
            input.action === "approved"
                ? "Your inventory request has been approved."
                : "Your inventory request has been rejected.",
        relatedEntityId: req.id,
    });

    await revalidateInventoryPaths();
    return { ok: true };
}

export async function logBorrowedEquipmentReturns(
    input: BorrowReturnInput
): Promise<{ ok: true } | { ok: false; error: string }> {
    const context = await getModeratorContext();
    if (!context.ok) {
        return { ok: false, error: context.error };
    }

    const { supabase, user, profile } = context;

    if (input.returns.length === 0) {
        return { ok: false, error: "Select at least one returned item." };
    }

    const { data: rawRequest, error: requestError } = await supabase
        .from("equipment_requests")
        .select(
            `
            id,
            quantity,
            approved_quantity,
            approved_by,
            reviewed_at,
            request_type,
            status,
            requester:profiles!equipment_requests_requester_id_fkey (
                id,
                display_name,
                username
            ),
            approver:profiles!equipment_requests_approved_by_fkey (
                id,
                display_name,
                username
            ),
            item:inventory_items!equipment_requests_item_id_fkey (
                id,
                name,
                category,
                total_quantity,
                available_quantity,
                is_consumable
            )
        `
        )
        .eq("id", input.requestId)
        .single();

    if (requestError || !rawRequest) {
        return { ok: false, error: requestError?.message ?? "Request not found" };
    }

    const req = rawRequest as unknown as EquipmentRequestRow;

    if (req.request_type !== "borrow") {
        return { ok: false, error: "Only borrowing requests can be returned." };
    }

    if (req.status !== "approved") {
        return { ok: false, error: "Only approved borrowing requests can log returns." };
    }

    const unitIds = input.returns.map((item) => item.unitId);
    const { data: units, error: unitsError } = await supabase
        .from("equipment_request_return_units")
        .select("id, unit_index, lifecycle_status, giving_condition")
        .eq("request_id", input.requestId)
        .in("id", unitIds);

    if (unitsError) {
        return { ok: false, error: unitsError.message };
    }

    const pendingUnits = (units || []) as ReturnUnitRow[];
    if (pendingUnits.length !== unitIds.length) {
        return { ok: false, error: "Some returned items could not be found." };
    }

    if (pendingUnits.some((unit) => unit.lifecycle_status !== "return_pending")) {
        return { ok: false, error: "One or more selected items were already returned." };
    }

    // Usable returns (perfect / partly damaged) go back into stock; trash is written off.
    const availableIncrement = input.returns.filter((entry) =>
        isRestockableCondition(entry.condition)
    ).length;
    const totalDecrement = input.returns.length - availableIncrement;
    const returnedAt = new Date().toISOString();
    const conditionsByUnitId = Object.fromEntries(input.returns.map((item) => [item.unitId, item.condition]));
    const givingByUnitId = Object.fromEntries(
        pendingUnits.map((unit) => [unit.id, (unit.giving_condition ?? "perfect") as GivingCondition])
    );

    const { error: itemUpdateError } = await supabase
        .from("inventory_items")
        .update({
            available_quantity: req.item.available_quantity + availableIncrement,
            total_quantity: req.item.total_quantity - totalDecrement,
        })
        .eq("id", req.item.id);

    if (itemUpdateError) {
        return { ok: false, error: itemUpdateError.message };
    }

    const unitUpdates = input.returns.map((entry) =>
        supabase
            .from("equipment_request_return_units")
            .update({
                lifecycle_status: "returned",
                return_condition: entry.condition,
                returned_at: returnedAt,
                returned_by: user.id,
                updated_at: returnedAt,
            })
            .eq("id", entry.unitId)
            .eq("request_id", input.requestId)
    );

    const unitResults = await Promise.all(unitUpdates);
    const unitError = unitResults.find((result) => result.error)?.error;
    if (unitError) {
        return { ok: false, error: unitError.message };
    }

    const { count: remainingPendingCount, error: pendingCountError } = await supabase
        .from("equipment_request_return_units")
        .select("*", { count: "exact", head: true })
        .eq("request_id", input.requestId)
        .eq("lifecycle_status", "return_pending");

    if (pendingCountError) {
        return { ok: false, error: pendingCountError.message };
    }

    const approvedQuantity = req.approved_quantity || 0;
    const returnedCount = approvedQuantity - (remainingPendingCount || 0);
    const nextStatus = (remainingPendingCount || 0) === 0 ? "returned" : "approved";

    const { error: requestUpdateError } = await supabase
        .from("equipment_requests")
        .update({
            status: nextStatus,
            status_note: buildReturnStatusNote(approvedQuantity, returnedCount),
        })
        .eq("id", input.requestId);

    if (requestUpdateError) {
        return { ok: false, error: requestUpdateError.message };
    }

    const { error: historyError } = await supabase.from("inventory_history").insert({
        request_id: input.requestId,
        item_id: req.item.id,
        actor_id: user.id,
        action: "returned",
        quantity: input.returns.length,
        note: buildReturnHistoryNote(input.returns),
    });

    if (historyError) {
        return { ok: false, error: historyError.message };
    }

    await syncInventoryStocksSnapshot();

    try {
        const emailMap = await getUserEmails([req.requester.id, req.approved_by || ""]);
        const identity = {
            requesterName: getPreferredName(req.requester),
            requesterEmail: emailMap[req.requester.id] || "",
            itemRequested: req.item.name,
            approverName: getPreferredName(req.approver || profile),
            approverEmail: emailMap[req.approved_by || ""] || "",
        };
        await syncInventoryHistoryRowsToGoogleSheets({
            mode: "upsert",
            rows: unitIds.map((unitId) =>
                buildBorrowUnitSheetRow({
                    unitId,
                    reviewedAt: req.reviewed_at,
                    givingCondition: givingByUnitId[unitId] ?? "perfect",
                    lifecycleStatus: "returned",
                    returnCondition: conditionsByUnitId[unitId],
                    returnedAt,
                    ...identity,
                })
            ),
        });
    } catch (syncError) {
        console.error("Failed to sync returned unit rows to Google Sheets:", syncError);
    }

    await revalidateInventoryPaths();
    return { ok: true };
}

export async function submitEquipmentRequest(input: {
    itemId: string;
    quantity: number;
    reason: string;
    requestType: EquipmentRequestType;
}): Promise<{ ok: true } | { ok: false; error: string }> {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { ok: false, error: "Not authenticated" };

    const reason = input.reason.trim();
    if (!reason) return { ok: false, error: "Reason is required" };
    if (!input.itemId) return { ok: false, error: "Invalid item" };
    if (input.quantity < 1) return { ok: false, error: "Quantity must be at least 1" };

    const { data: item, error: itemError } = await supabase
        .from("inventory_items")
        .select("id, available_quantity, required_safety_certification")
        .eq("id", input.itemId)
        .single();

    if (itemError || !item) return { ok: false, error: itemError?.message ?? "Item not found" };
    if (input.quantity > item.available_quantity) {
        return { ok: false, error: "Requested quantity exceeds available stock" };
    }

    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("safety_certifications")
        .eq("id", user.id)
        .single();

    if (profileError || !profile) {
        return { ok: false, error: profileError?.message ?? "Profile not found" };
    }

    const requiredCert = item.required_safety_certification?.trim();
    if (requiredCert && requiredCert.length > 0) {
        const hasCert = (profile.safety_certifications || []).includes(requiredCert);
        if (!hasCert) {
            return {
                ok: false,
                error: `This item requires "${requiredCert}" certification.`,
            };
        }
    }

    const { data: requestRow, error: insertError } = await supabase
        .from("equipment_requests")
        .insert({
            item_id: item.id,
            requester_id: user.id,
            quantity: input.quantity,
            reason,
            request_type: input.requestType,
        })
        .select("id")
        .single();

    if (insertError || !requestRow) return { ok: false, error: insertError?.message || "Failed to submit request" };

    await notifyInventoryManagers({
        message: "A new inventory request has been submitted.",
        relatedEntityId: requestRow.id,
    });

    revalidatePath("/inventory");
    revalidatePath("/my-requests");
    return { ok: true };
}

// ── Cart-based equipment request ──────────────────────────────────────────────

export type CartItemInput = {
    itemId: string;
    quantity: number;
    requestType: EquipmentRequestType;
};

export type CartReviewItemInput = {
    cartItemId: string;
    action: "approved" | "rejected";
    approvedQuantity?: number;
    note?: string;
    // Per-unit handout condition for approved non-consumable borrow items.
    // Length should equal approvedQuantity; defaults to all "perfect".
    givingConditions?: GivingCondition[];
};

export async function submitEquipmentCart(input: {
    items: CartItemInput[];
    reason: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { ok: false, error: "Not authenticated" };

    const reason = input.reason.trim();
    if (!reason) return { ok: false, error: "Reason is required" };
    if (!input.items.length) return { ok: false, error: "Cart is empty" };

    // Fetch user profile for safety cert checks
    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("safety_certifications")
        .eq("id", user.id)
        .single();

    if (profileError || !profile) {
        return { ok: false, error: profileError?.message ?? "Profile not found" };
    }

    // Validate each item
    const itemIds = input.items.map((i) => i.itemId);
    const { data: inventoryItems, error: itemsError } = await supabase
        .from("inventory_items")
        .select("id, name, available_quantity, required_safety_certification")
        .in("id", itemIds);

    if (itemsError || !inventoryItems) {
        return { ok: false, error: itemsError?.message ?? "Failed to load items" };
    }

    const itemMap = new Map(inventoryItems.map((i) => [i.id, i]));

    for (const cartItem of input.items) {
        const item = itemMap.get(cartItem.itemId);
        if (!item) return { ok: false, error: `Item not found: ${cartItem.itemId}` };
        if (cartItem.quantity < 1) return { ok: false, error: `Quantity must be at least 1 for ${item.name}` };
        if (cartItem.quantity > item.available_quantity) {
            return { ok: false, error: `Requested quantity exceeds available stock for ${item.name}` };
        }

        const requiredCert = item.required_safety_certification?.trim();
        if (requiredCert && requiredCert.length > 0) {
            const hasCert = (profile.safety_certifications || []).includes(requiredCert);
            if (!hasCert) {
                return {
                    ok: false,
                    error: `${item.name} requires "${requiredCert}" certification.`,
                };
            }
        }
    }

    // Create cart
    const { data: cartRow, error: cartInsertError } = await supabase
        .from("equipment_carts")
        .insert({
            requester_id: user.id,
            reason,
        })
        .select("id")
        .single();

    if (cartInsertError || !cartRow) {
        return { ok: false, error: cartInsertError?.message ?? "Failed to create cart" };
    }

    // Create cart items
    const cartItemRows = input.items.map((ci) => ({
        cart_id: cartRow.id,
        item_id: ci.itemId,
        quantity: ci.quantity,
        request_type: ci.requestType,
    }));

    const { error: cartItemsError } = await supabase
        .from("equipment_cart_items")
        .insert(cartItemRows);

    if (cartItemsError) {
        return { ok: false, error: cartItemsError.message };
    }

    await notifyInventoryManagers({
        message: "A new equipment cart has been submitted for review.",
        relatedEntityId: cartRow.id,
    });

    revalidatePath("/inventory");
    revalidatePath("/my-requests");
    revalidatePath("/admin/requests");
    return { ok: true };
}

export async function reviewEquipmentCart(input: {
    cartId: string;
    action: "approve_all" | "reject_all" | "manual";
    items?: CartReviewItemInput[];
    cartNote?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
    const context = await getModeratorContext();
    if (!context.ok) {
        return { ok: false, error: context.error };
    }

    const { supabase, user, profile } = context;

    // Fetch the cart
    const { data: cart, error: cartFetchError } = await supabase
        .from("equipment_carts")
        .select(`
            id,
            requester_id,
            reason,
            status,
            requester:profiles!equipment_carts_requester_id_fkey(
                id, display_name, username
            )
        `)
        .eq("id", input.cartId)
        .single();

    if (cartFetchError || !cart) {
        return { ok: false, error: cartFetchError?.message ?? "Cart not found" };
    }

    if (cart.status !== "pending") {
        return { ok: false, error: "This cart has already been reviewed." };
    }

    // Fetch cart items with inventory info
    const { data: cartItems, error: cartItemsFetchError } = await supabase
        .from("equipment_cart_items")
        .select(`
            id,
            item_id,
            quantity,
            request_type,
            item:inventory_items!equipment_cart_items_item_id_fkey(
                id, name, category, total_quantity, available_quantity, is_consumable
            )
        `)
        .eq("cart_id", input.cartId);

    if (cartItemsFetchError || !cartItems || cartItems.length === 0) {
        return { ok: false, error: cartItemsFetchError?.message ?? "Cart items not found" };
    }

    const adminSupabase = createAdminClient();
    const reviewedAt = new Date().toISOString();
    const requester = cart.requester as unknown as { id: string; display_name: string; username: string | null };

    // Build decisions for each cart item
    type ItemDecision = {
        cartItemId: string;
        itemId: string;
        itemName: string;
        itemCategory: string;
        totalQuantity: number;
        availableQuantity: number;
        isConsumable: boolean;
        requestedQuantity: number;
        requestType: EquipmentRequestType;
        action: "approved" | "rejected";
        approvedQuantity: number;
        givingConditions: GivingCondition[];
        note: string | null;
        createdRequestId?: string;
    };

    const decisions: ItemDecision[] = [];

    const resolveGivingConditions = (count: number, provided?: GivingCondition[]): GivingCondition[] =>
        provided && provided.length === count
            ? provided
            : Array.from({ length: count }, () => "perfect" as GivingCondition);

    for (const ci of cartItems) {
        const item = ci.item as unknown as {
            id: string;
            name: string;
            category: string;
            total_quantity: number;
            available_quantity: number;
            is_consumable: boolean;
        };

        if (input.action === "approve_all") {
            decisions.push({
                cartItemId: ci.id,
                itemId: item.id,
                itemName: item.name,
                itemCategory: item.category,
                totalQuantity: item.total_quantity,
                availableQuantity: item.available_quantity,
                isConsumable: item.is_consumable,
                requestedQuantity: ci.quantity,
                requestType: ci.request_type as EquipmentRequestType,
                action: "approved",
                approvedQuantity: ci.quantity,
                givingConditions: resolveGivingConditions(ci.quantity),
                note: null,
            });
        } else if (input.action === "reject_all") {
            decisions.push({
                cartItemId: ci.id,
                itemId: item.id,
                itemName: item.name,
                itemCategory: item.category,
                totalQuantity: item.total_quantity,
                availableQuantity: item.available_quantity,
                isConsumable: item.is_consumable,
                requestedQuantity: ci.quantity,
                requestType: ci.request_type as EquipmentRequestType,
                action: "rejected",
                approvedQuantity: 0,
                givingConditions: [],
                note: null,
            });
        } else {
            // Manual: find matching input item
            const manualItem = input.items?.find((mi) => mi.cartItemId === ci.id);
            if (!manualItem) {
                return { ok: false, error: `No decision provided for ${item.name}` };
            }
            const approvedQty = manualItem.action === "approved"
                ? (manualItem.approvedQuantity ?? ci.quantity)
                : 0;
            decisions.push({
                cartItemId: ci.id,
                itemId: item.id,
                itemName: item.name,
                itemCategory: item.category,
                totalQuantity: item.total_quantity,
                availableQuantity: item.available_quantity,
                isConsumable: item.is_consumable,
                requestedQuantity: ci.quantity,
                requestType: ci.request_type as EquipmentRequestType,
                action: manualItem.action,
                approvedQuantity: approvedQty,
                givingConditions: manualItem.action === "approved"
                    ? resolveGivingConditions(approvedQty, manualItem.givingConditions)
                    : [],
                note: manualItem.note?.trim() || null,
            });
        }
    }

    // Validate approved quantities
    for (const decision of decisions) {
        if (decision.action === "approved") {
            if (decision.approvedQuantity < 1 || decision.approvedQuantity > decision.requestedQuantity) {
                return { ok: false, error: `Invalid approved quantity for ${decision.itemName}` };
            }
            if (decision.approvedQuantity > decision.availableQuantity) {
                return { ok: false, error: `Approved quantity exceeds available stock for ${decision.itemName}` };
            }
        }
    }

    // Process each decision: create equipment_requests rows + update inventory
    for (const decision of decisions) {
        const approvedQuantity = decision.action === "approved" ? decision.approvedQuantity : 0;
        const statusNote = decision.action === "rejected"
            ? (decision.note || "Rejected")
            : decision.approvedQuantity === decision.requestedQuantity
                ? (decision.requestType === "permanent" ? "Approved for permanent use." : "Approved in full.")
                : `Approved ${decision.approvedQuantity} of ${decision.requestedQuantity}; ${decision.requestedQuantity - decision.approvedQuantity} not approved.`;

        // Create an equipment_request row (unpacking the cart item)
        const { data: requestRow, error: requestInsertError } = await adminSupabase
            .from("equipment_requests")
            .insert({
                item_id: decision.itemId,
                requester_id: requester.id,
                quantity: decision.requestedQuantity,
                reason: cart.reason + (decision.note ? ` — Note: ${decision.note}` : ""),
                request_type: decision.requestType,
                status: decision.action,
                approved_by: user.id,
                approved_quantity: approvedQuantity,
                reviewed_at: reviewedAt,
                status_note: statusNote,
            })
            .select("id")
            .single();

        if (requestInsertError || !requestRow) {
            return { ok: false, error: requestInsertError?.message ?? `Failed to create request for ${decision.itemName}` };
        }

        decision.createdRequestId = requestRow.id;

        // Insert inventory history
        const historyNote =
            decision.action === "approved" && approvedQuantity < decision.requestedQuantity
                ? `Approved ${approvedQuantity} of ${decision.requestedQuantity} requested (from cart).`
                : `${statusNote} (from cart)`;

        await adminSupabase.from("inventory_history").insert({
            request_id: requestRow.id,
            item_id: decision.itemId,
            actor_id: user.id,
            action: decision.action,
            quantity: decision.action === "approved" ? approvedQuantity : decision.requestedQuantity,
            note: historyNote,
        });

        // Update cart item status
        await adminSupabase
            .from("equipment_cart_items")
            .update({
                item_status: decision.action,
                approved_quantity: approvedQuantity,
                admin_note: decision.note,
            })
            .eq("id", decision.cartItemId);

        // Update inventory and create return units for approved items
        if (decision.action === "approved") {
            // Consumables are used up; permanent grants leave inventory for good.
            const consumeStock = decision.isConsumable || decision.requestType === "permanent";
            if (consumeStock) {
                await adminSupabase
                    .from("inventory_items")
                    .update({
                        total_quantity: decision.totalQuantity - approvedQuantity,
                        available_quantity: decision.availableQuantity - approvedQuantity,
                    })
                    .eq("id", decision.itemId);
            } else {
                await adminSupabase
                    .from("inventory_items")
                    .update({
                        available_quantity: decision.availableQuantity - approvedQuantity,
                    })
                    .eq("id", decision.itemId);

                // Create return units for non-consumable borrows, with handout condition
                const returnUnits = Array.from({ length: approvedQuantity }, (_, index) => ({
                    request_id: requestRow.id,
                    item_id: decision.itemId,
                    unit_index: index + 1,
                    lifecycle_status: "return_pending" as const,
                    giving_condition: decision.givingConditions[index] ?? "perfect",
                    updated_at: reviewedAt,
                }));

                await adminSupabase
                    .from("equipment_request_return_units")
                    .insert(returnUnits);
            }
        }
    }

    // ── Batch sync to Google Sheets ──────────────────────────────────────
    try {
        const emailMap = await getUserEmails([requester.id, user.id]);
        const identity = {
            requesterName: getPreferredName(requester),
            requesterEmail: emailMap[requester.id] || "",
            approverName: getPreferredName(profile),
            approverEmail: emailMap[user.id] || "",
        };
        const allSheetRows: InventoryHistorySyncRow[] = [];

        for (const decision of decisions) {
            if (!decision.createdRequestId) {
                continue;
            }

            const isBorrowUnit =
                decision.action === "approved" &&
                !decision.isConsumable &&
                decision.requestType === "borrow";

            if (isBorrowUnit) {
                // Per-unit rows carrying handout condition
                const { data: createdUnits } = await adminSupabase
                    .from("equipment_request_return_units")
                    .select("id, giving_condition")
                    .eq("request_id", decision.createdRequestId);

                allSheetRows.push(
                    ...(createdUnits || []).map((u) =>
                        buildBorrowUnitSheetRow({
                            unitId: u.id,
                            reviewedAt,
                            givingCondition: (u.giving_condition ?? "perfect") as GivingCondition,
                            lifecycleStatus: "return_pending",
                            returnCondition: null,
                            returnedAt: null,
                            itemRequested: decision.itemName,
                            ...identity,
                        })
                    )
                );
            } else {
                // Rejected, consumable, or permanent → one per-request row
                allSheetRows.push(
                    buildRequestSheetRow({
                        requestId: decision.createdRequestId,
                        decision: decision.action,
                        requestType: decision.requestType,
                        isConsumable: decision.isConsumable,
                        quantity: decision.action === "approved" ? decision.approvedQuantity : decision.requestedQuantity,
                        reviewedAt,
                        itemRequested: decision.itemName,
                        ...identity,
                    })
                );
            }
        }

        if (allSheetRows.length > 0) {
            await syncInventoryHistoryRowsToGoogleSheets({
                mode: "upsert",
                rows: allSheetRows,
            });
        }
    } catch (syncError) {
        console.error("Failed to sync cart to Google Sheets:", syncError);
    }

    // Determine overall cart status
    const hasApproved = decisions.some((d) => d.action === "approved");
    const hasRejected = decisions.some((d) => d.action === "rejected");
    let cartStatus: string;
    if (hasApproved && hasRejected) {
        cartStatus = "partially_approved";
    } else if (hasApproved) {
        cartStatus = "approved";
    } else {
        cartStatus = "rejected";
    }

    await adminSupabase
        .from("equipment_carts")
        .update({
            status: cartStatus,
            reviewed_by: user.id,
            reviewed_at: reviewedAt,
            status_note: input.cartNote?.trim() || null,
        })
        .eq("id", input.cartId);

    // Sync inventory stocks snapshot
    await syncInventoryStocksSnapshot();

    // Notify the requester
    const notificationMessage = cartStatus === "approved"
        ? "Your equipment cart has been fully approved."
        : cartStatus === "partially_approved"
            ? "Your equipment cart has been partially approved. Some items were rejected."
            : "Your equipment cart has been rejected.";

    await createNotification({
        userId: requester.id,
        type: cartStatus === "rejected" ? "equipment_request_rejected" : "equipment_request_approved",
        message: notificationMessage,
        relatedEntityId: input.cartId,
    });

    await revalidateInventoryPaths();
    return { ok: true };
}
