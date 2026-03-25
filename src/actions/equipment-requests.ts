"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

const MODERATOR_ROLES = new Set<Database["public"]["Enums"]["user_role"]>([
    "faculty",
    "president",
    "vice_president",
]);

export type EquipmentRequestModerationAction = Exclude<
    Database["public"]["Enums"]["request_status"],
    "pending"
>;

export type EquipmentRequestType = "borrow" | "permanent";

type EquipmentRequestRow = {
    id: string;
    quantity: number;
    status: Database["public"]["Enums"]["request_status"];
    item: {
        id: string;
        is_consumable: boolean;
        total_quantity: number;
        available_quantity: number;
    };
};

/**
 * Faculty / club leads: approve, reject, mark returned, or revoke equipment requests.
 * Consumables: on approve, deducts both total_quantity and available_quantity and
 * closes the request as `returned` so no return step is required.
 */
export async function processEquipmentRequestModeration(
    requestId: string,
    action: EquipmentRequestModerationAction
): Promise<{ ok: true } | { ok: false; error: string }> {
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

    if (profileError || !profile || !MODERATOR_ROLES.has(profile.role)) {
        return { ok: false, error: "Not authorized" };
    }

    const { data: raw, error: fetchError } = await supabase
        .from("equipment_requests")
        .select(
            `
      id,
      quantity,
      status,
      item:inventory_items!equipment_requests_item_id_fkey (
        id,
        is_consumable,
        total_quantity,
        available_quantity
      )
    `
        )
        .eq("id", requestId)
        .single();

    if (fetchError || !raw) {
        return { ok: false, error: fetchError?.message ?? "Request not found" };
    }

    const req = raw as unknown as EquipmentRequestRow;

    if (action === "approved" && req.status !== "pending") {
        return { ok: false, error: "Only pending requests can be approved" };
    }
    if (action === "rejected" && req.status !== "pending") {
        return { ok: false, error: "Only pending requests can be rejected" };
    }
    if (action === "returned" && req.status !== "approved") {
        return { ok: false, error: "Only approved requests can be marked returned" };
    }
    if (req.item.is_consumable && action === "returned") {
        return { ok: false, error: "Consumable items do not use the return flow" };
    }

    if (action === "approved") {
        if (req.quantity > req.item.available_quantity) {
            return { ok: false, error: "Insufficient available quantity" };
        }
        if (req.item.is_consumable && req.quantity > req.item.total_quantity) {
            return { ok: false, error: "Insufficient total quantity" };
        }
    }

    const finalStatus: Database["public"]["Enums"]["request_status"] =
        action === "approved" && req.item.is_consumable ? "returned" : action;

    const { error: updateReqError } = await supabase
        .from("equipment_requests")
        .update({
            status: finalStatus,
            approved_by: user.id,
            status_note: null,
        })
        .eq("id", requestId);

    if (updateReqError) {
        return { ok: false, error: updateReqError.message };
    }

    const historyNote =
        action === "approved" && req.item.is_consumable
            ? "Consumable approved — total and available stock reduced"
            : null;

    const { error: historyError } = await supabase.from("inventory_history").insert({
        request_id: requestId,
        item_id: req.item.id,
        actor_id: user.id,
        action,
        quantity: req.quantity,
        note: historyNote,
    });

    if (historyError) {
        return { ok: false, error: historyError.message };
    }

    if (action === "approved") {
        if (req.item.is_consumable) {
            const { error: invError } = await supabase
                .from("inventory_items")
                .update({
                    total_quantity: req.item.total_quantity - req.quantity,
                    available_quantity: req.item.available_quantity - req.quantity,
                })
                .eq("id", req.item.id);

            if (invError) {
                return { ok: false, error: invError.message };
            }
        } else {
            const { error: invError } = await supabase
                .from("inventory_items")
                .update({
                    available_quantity: req.item.available_quantity - req.quantity,
                })
                .eq("id", req.item.id);

            if (invError) {
                return { ok: false, error: invError.message };
            }
        }
    } else if (action === "returned") {
        const { data: item, error: itemFetchError } = await supabase
            .from("inventory_items")
            .select("available_quantity")
            .eq("id", req.item.id)
            .single();

        if (itemFetchError || !item) {
            return { ok: false, error: itemFetchError?.message ?? "Item not found" };
        }

        const { error: invError } = await supabase
            .from("inventory_items")
            .update({ available_quantity: item.available_quantity + req.quantity })
            .eq("id", req.item.id);

        if (invError) {
            return { ok: false, error: invError.message };
        }
    }

    revalidatePath("/admin/requests");
    revalidatePath("/my-requests");
    revalidatePath("/inventory");

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

    const { error: insertError } = await supabase.from("equipment_requests").insert({
        item_id: item.id,
        requester_id: user.id,
        quantity: input.quantity,
        reason,
        request_type: input.requestType,
    });

    if (insertError) return { ok: false, error: insertError.message };

    revalidatePath("/inventory");
    revalidatePath("/my-requests");
    return { ok: true };
}
