"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type ResourceBookingStatus = Database["public"]["Tables"]["resource_bookings"]["Row"]["status"];

export type CreateResourceBookingInput = {
    resourceName: string;
    startTime: string; // ISO string
    endTime: string; // ISO string
};

function parseIsoOrThrow(iso: string, fieldName: string) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
        throw new Error(`Invalid ${fieldName} ISO timestamp`);
    }
    return d.toISOString();
}

export async function createResourceBooking(
    input: CreateResourceBookingInput
): Promise<{ ok: true } | { ok: false; error: string }> {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { ok: false, error: "Not authenticated" };

    const resourceName = input.resourceName.trim();
    if (!resourceName) return { ok: false, error: "resourceName is required" };

    let startIso: string;
    let endIso: string;
    try {
        startIso = parseIsoOrThrow(input.startTime, "startTime");
        endIso = parseIsoOrThrow(input.endTime, "endTime");
    } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "Invalid time input" };
    }

    if (new Date(startIso).getTime() >= new Date(endIso).getTime()) {
        return { ok: false, error: "startTime must be before endTime" };
    }

    // Friendly pre-check (constraint still enforces correctness under concurrency).
    const { data: overlap } = await supabase
        .from("resource_bookings")
        .select("id")
        .eq("resource_name", resourceName)
        .neq("status", "cancelled")
        // Overlap condition:
        // existing.start_time < new.end_time AND existing.end_time > new.start_time
        .lt("start_time", endIso)
        .gt("end_time", startIso)
        .limit(1);

    if (overlap && overlap.length > 0) {
        return { ok: false, error: "This time slot is already booked for that resource." };
    }

    const { error: insertError } = await supabase
        .from("resource_bookings")
        .insert({
            resource_name: resourceName,
            user_id: user.id,
            start_time: startIso,
            end_time: endIso,
            status: "confirmed",
        });

    if (insertError) {
        // Likely constraint violation due to race.
        const message = insertError.message || "Unable to create booking.";
        if (message.toLowerCase().includes("resource_bookings_no_overlap")) {
            return { ok: false, error: "This time slot was just booked. Please choose another." };
        }
        return { ok: false, error: message };
    }

    revalidatePath("/lab");
    return { ok: true };
}

export async function listResourceBookings(params: {
    resourceName?: string;
    windowStart?: string; // ISO
    windowEnd?: string; // ISO
}): Promise<
    | { ok: true; data: Database["public"]["Tables"]["resource_bookings"]["Row"][] }
    | { ok: false; error: string }
> {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { ok: false, error: "Not authenticated" };

    let query = supabase
        .from("resource_bookings")
        .select("*")
        .order("start_time", { ascending: true })
        .neq("status", "cancelled");

    if (params.resourceName) {
        query = query.eq("resource_name", params.resourceName.trim());
    }

    if (params.windowStart && params.windowEnd) {
        const startIso = parseIsoOrThrow(params.windowStart, "windowStart");
        const endIso = parseIsoOrThrow(params.windowEnd, "windowEnd");

        // Overlap window:
        // booking.end_time > windowStart AND booking.start_time < windowEnd
        query = query
            .gt("end_time", startIso)
            .lt("start_time", endIso);
    }

    const { data, error } = await query;
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: data || [] };
}

export async function cancelResourceBooking(bookingId: string) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { ok: false, error: "Not authenticated" };

    const { error } = await supabase
        .from("resource_bookings")
        .update({ status: "cancelled" })
        .eq("id", bookingId)
        .eq("user_id", user.id);

    if (error) return { ok: false, error: error.message };
    revalidatePath("/lab");
    return { ok: true };
}

export async function listMyUpcomingResourceBookings(): Promise<
    | { ok: true; data: Database["public"]["Tables"]["resource_bookings"]["Row"][] }
    | { ok: false; error: string }
> {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { ok: false, error: "Not authenticated" };

    const nowIso = new Date().toISOString();

    const { data, error } = await supabase
        .from("resource_bookings")
        .select("*")
        .eq("user_id", user.id)
        .neq("status", "cancelled")
        .gte("end_time", nowIso)
        .order("start_time", { ascending: true })
        .limit(50);

    if (error) return { ok: false, error: error.message };
    return { ok: true, data: data || [] };
}

