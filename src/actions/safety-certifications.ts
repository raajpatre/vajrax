"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

const GRANTER_ROLES = new Set<Database["public"]["Enums"]["user_role"]>([
    "faculty",
    "president",
    "vice_president",
]);

export async function grantSafetyCertification(params: {
    userId: string;
    certification: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Not authenticated" };

    const cert = params.certification.trim();
    if (!cert) return { ok: false, error: "Certification cannot be empty" };

    const { data: me, error: meError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (meError || !me || !GRANTER_ROLES.has(me.role)) {
        return { ok: false, error: "Only faculty/leadership can grant certifications" };
    }

    const { data: target, error: targetError } = await supabase
        .from("profiles")
        .select("safety_certifications")
        .eq("id", params.userId)
        .single();

    if (targetError || !target) return { ok: false, error: targetError?.message ?? "Member not found" };

    const next = Array.from(new Set([...(target.safety_certifications || []), cert]));
    const { error: updateError } = await supabase
        .from("profiles")
        .update({ safety_certifications: next })
        .eq("id", params.userId);

    if (updateError) return { ok: false, error: updateError.message };

    revalidatePath("/admin/members");
    revalidatePath(`/profile/${params.userId}`);
    return { ok: true };
}

export async function revokeSafetyCertification(params: {
    userId: string;
    certification: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Not authenticated" };

    const cert = params.certification.trim();
    if (!cert) return { ok: false, error: "Certification cannot be empty" };

    const { data: me, error: meError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (meError || !me || !GRANTER_ROLES.has(me.role)) {
        return { ok: false, error: "Only faculty/leadership can revoke certifications" };
    }

    const { data: target, error: targetError } = await supabase
        .from("profiles")
        .select("safety_certifications")
        .eq("id", params.userId)
        .single();

    if (targetError || !target) return { ok: false, error: targetError?.message ?? "Member not found" };

    const next = (target.safety_certifications || []).filter((c) => c !== cert);
    const { error: updateError } = await supabase
        .from("profiles")
        .update({ safety_certifications: next })
        .eq("id", params.userId);

    if (updateError) return { ok: false, error: updateError.message };

    revalidatePath("/admin/members");
    revalidatePath(`/profile/${params.userId}`);
    return { ok: true };
}

