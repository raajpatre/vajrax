"use server";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type Sponsor = Tables<"sponsors">;

export async function listActiveSponsors(): Promise<
    | { ok: true; data: Sponsor[] }
    | { ok: false; error: string }
> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("sponsors")
        .select("*")
        .eq("is_active", true)
        .order("tier", { ascending: true })
        .order("name", { ascending: true });

    if (error) {
        return { ok: false, error: error.message };
    }

    return { ok: true, data: data ?? [] };
}
