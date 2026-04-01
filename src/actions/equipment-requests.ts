"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
    formatSheetDateTime,
    getLifecycleStatusLabel,
    getPreferredName,
    getSyncKeyForRequestDecision,
    getSyncKeyForReturnUnit,
    getReturnedLifecycleLabel,
    type ReturnCondition,
} from "@/lib/inventory-requests";
import { syncInventoryHistoryRowsToGoogleSheets } from "@/lib/inventory-history-sync";
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
    };
};

type ReturnUnitRow = {
    id: string;
    unit_index: number;
    lifecycle_status: "return_pending" | "returned";
};

type ReviewRequestInput = {
    requestId: string;
    action: EquipmentRequestReviewAction;
    approvedQuantity?: number;
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
            moderate: 0,
            poor: 0,
            disposable: 0,
        }
    );

    const summary = Object.entries(counts)
        .filter(([, count]) => count > 0)
        .map(([condition, count]) => `${count} ${condition}`)
        .join(", ");

    return summary ? `Returned items logged: ${summary}.` : "Returned items logged.";
}

function buildDecisionSheetRow(input: {
    requestId: string;
    decision: EquipmentRequestReviewAction;
    requestType: EquipmentRequestType;
    reviewedAt: string | null;
    requesterName: string;
    requesterEmail: string;
    itemRequested: string;
    approverName: string;
    approverEmail: string;
}) {
    const { date, time24h } = formatSheetDateTime(input.reviewedAt);

    return {
        syncKey: getSyncKeyForRequestDecision(input.requestId),
        date,
        time24h,
        requesterName: input.requesterName,
        requesterEmail: input.requesterEmail,
        itemRequested: input.itemRequested,
        decision: input.decision,
        approverName: input.approverName,
        approverEmail: input.approverEmail,
        lifecycleStatus: getLifecycleStatusLabel({
            decision: input.decision,
            requestType: input.requestType,
        }),
    };
}

function buildBorrowUnitSheetRows(input: {
    unitIds: string[];
    reviewedAt: string | null;
    requesterName: string;
    requesterEmail: string;
    itemRequested: string;
    approverName: string;
    approverEmail: string;
}) {
    const { date, time24h } = formatSheetDateTime(input.reviewedAt);

    return input.unitIds.map((unitId) => ({
        syncKey: getSyncKeyForReturnUnit(unitId),
        date,
        time24h,
        requesterName: input.requesterName,
        requesterEmail: input.requesterEmail,
        itemRequested: input.itemRequested,
        decision: "approved" as const,
        approverName: input.approverName,
        approverEmail: input.approverEmail,
        lifecycleStatus: getLifecycleStatusLabel({
            decision: "approved",
            requestType: "borrow",
        }),
    }));
}

function buildReturnedUnitSheetRows(input: {
    unitIds: string[];
    reviewedAt: string | null;
    requesterName: string;
    requesterEmail: string;
    itemRequested: string;
    approverName: string;
    approverEmail: string;
    conditionsByUnitId: Record<string, ReturnCondition>;
}) {
    const { date, time24h } = formatSheetDateTime(input.reviewedAt);

    return input.unitIds.map((unitId) => {
        const condition = input.conditionsByUnitId[unitId];
        return {
            syncKey: getSyncKeyForReturnUnit(unitId),
            date,
            time24h,
            requesterName: input.requesterName,
            requesterEmail: input.requesterEmail,
            itemRequested: input.itemRequested,
            decision: "approved" as const,
            approverName: input.approverName,
            approverEmail: input.approverEmail,
            lifecycleStatus: getReturnedLifecycleLabel(condition),
        };
    });
}

async function revalidateInventoryPaths() {
    revalidatePath("/admin/requests");
    revalidatePath("/my-requests");
    revalidatePath("/inventory");
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
                available_quantity
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
        if (req.request_type === "permanent") {
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
                updated_at: reviewedAt,
            }));

            const { data: createdUnits, error: returnUnitError } = await supabase
                .from("equipment_request_return_units")
                .insert(returnUnits)
                .select("id");

            if (returnUnitError) {
                return { ok: false, error: returnUnitError.message };
            }

            try {
                const emailMap = await getUserEmails([req.requester.id, user.id]);
                await syncInventoryHistoryRowsToGoogleSheets({
                    mode: "upsert",
                    rows: buildBorrowUnitSheetRows({
                        unitIds: (createdUnits || []).map((unit) => unit.id),
                        reviewedAt,
                        requesterName: getPreferredName(req.requester),
                        requesterEmail: emailMap[req.requester.id] || "",
                        itemRequested: req.item.name,
                        approverName: getPreferredName(profile),
                        approverEmail: emailMap[user.id] || "",
                    }),
                });
            } catch (syncError) {
                console.error("Failed to sync borrow approval rows to Google Sheets:", syncError);
            }
        }
    }

    if (input.action === "rejected" || req.request_type === "permanent") {
        try {
            const emailMap = await getUserEmails([req.requester.id, user.id]);
            await syncInventoryHistoryRowsToGoogleSheets({
                mode: "upsert",
                rows: [
                    buildDecisionSheetRow({
                        requestId: input.requestId,
                        decision: input.action,
                        requestType: req.request_type,
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
                available_quantity
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
        .select("id, unit_index, lifecycle_status")
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

    const availableIncrement = input.returns.filter(
        (entry) => entry.condition === "perfect" || entry.condition === "moderate"
    ).length;
    const totalDecrement = input.returns.length - availableIncrement;
    const returnedAt = new Date().toISOString();
    const conditionsByUnitId = Object.fromEntries(input.returns.map((item) => [item.unitId, item.condition]));

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

    try {
        const emailMap = await getUserEmails([req.requester.id, req.approved_by || ""]);
        await syncInventoryHistoryRowsToGoogleSheets({
            mode: "upsert",
            rows: buildReturnedUnitSheetRows({
                unitIds,
                reviewedAt: req.reviewed_at,
                requesterName: getPreferredName(req.requester),
                requesterEmail: emailMap[req.requester.id] || "",
                itemRequested: req.item.name,
                approverName: getPreferredName(req.approver || profile),
                approverEmail: emailMap[req.approved_by || ""] || "",
                conditionsByUnitId,
            }),
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
