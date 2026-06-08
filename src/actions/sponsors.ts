"use server";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type Sponsor = Tables<"sponsors">;

async function assertSponsorAdmin() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");
    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
    if (!profile || !["faculty", "president"].includes(profile.role ?? "")) {
        throw new Error("Forbidden: only faculty and presidents can manage sponsors");
    }
    return supabase;
}

const TIER_ORDER: Record<string, number> = { Platinum: 0, Gold: 1, Silver: 2 };

function tierSort(a: Sponsor, b: Sponsor) {
    return (TIER_ORDER[a.tier] ?? 9) - (TIER_ORDER[b.tier] ?? 9) || a.name.localeCompare(b.name);
}

export async function listActiveSponsors(): Promise<
    | { ok: true; data: Sponsor[] }
    | { ok: false; error: string }
> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("sponsors")
        .select("*")
        .eq("is_active", true);
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: (data ?? []).sort(tierSort) };
}

export async function listAllSponsors(): Promise<
    | { ok: true; data: Sponsor[] }
    | { ok: false; error: string }
> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("sponsors").select("*");
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: (data ?? []).sort(tierSort) };
}

export async function createSponsor(input: {
    name: string;
    tier: string;
    logo_url: string;
    website_link?: string | null;
    is_active: boolean;
}): Promise<{ ok: true; data: Sponsor } | { ok: false; error: string }> {
    let supabase;
    try { supabase = await assertSponsorAdmin(); }
    catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Forbidden" }; }
    const { data, error } = await supabase
        .from("sponsors")
        .insert({
            name: input.name.trim(),
            tier: input.tier,
            logo_url: input.logo_url.trim(),
            website_link: input.website_link?.trim() || null,
            is_active: input.is_active,
        })
        .select("*")
        .single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, data };
}

export async function updateSponsor(
    id: string,
    input: {
        name?: string;
        tier?: string;
        logo_url?: string;
        website_link?: string | null;
        is_active?: boolean;
    }
): Promise<{ ok: true; data: Sponsor } | { ok: false; error: string }> {
    let supabase;
    try { supabase = await assertSponsorAdmin(); }
    catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Forbidden" }; }
    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch.name = input.name.trim();
    if (input.tier !== undefined) patch.tier = input.tier;
    if (input.logo_url !== undefined) patch.logo_url = input.logo_url.trim();
    if ("website_link" in input) patch.website_link = input.website_link?.trim() || null;
    if (input.is_active !== undefined) patch.is_active = input.is_active;
    const { data, error } = await supabase
        .from("sponsors")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, data };
}

export async function deleteSponsor(
    id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
    let supabase;
    try { supabase = await assertSponsorAdmin(); }
    catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Forbidden" }; }
    const { error } = await supabase.from("sponsors").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
}
