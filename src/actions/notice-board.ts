"use server";

import { createClient } from "@/lib/supabase/server";
import type { NoticeCTA } from "@/types/database";

export type NoticeRow = {
    id: string;
    title: string;
    body: string;
    is_pinned: boolean;
    is_archived: boolean;
    expires_at: string | null;
    cta_label: "Download" | "See" | "Submit" | "Apply" | "Register" | "More Info" | null;
    cta_url: string | null;
    ctas: NoticeCTA[];
    author_id: string | null;
    created_at: string;
    updated_at: string;
    author?: {
        display_name: string | null;
        role: string | null;
    } | null;
};

export type NoticeInput = {
    title: string;
    body: string;
    is_pinned: boolean;
    expires_at: string | null;
    cta_label: NoticeRow["cta_label"];
    cta_url: string | null;
    ctas: NoticeCTA[];
};

async function assertNoticeWriter() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");
    const { data: profile } = await supabase
        .from("profiles")
        .select("role, roles")
        .eq("id", user.id)
        .single();
    const roles: string[] = profile?.roles?.length
        ? profile.roles
        : profile?.role ? [profile.role] : [];
    if (!roles.some((r) => ["faculty", "president", "vice_president"].includes(r))) {
        throw new Error("Forbidden: only faculty, president, or vice_president can manage notices");
    }
    return { supabase, user };
}

/** Public: returns only live (non-archived, non-expired) notices. Pinned first. */
export async function listPublicNotices(): Promise<
    { ok: true; data: NoticeRow[] } | { ok: false; error: string }
> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("notice_board")
        .select("*, author:author_id(display_name, role)")
        .eq("is_archived", false)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: (data ?? []) as unknown as NoticeRow[] };
}

/** Public: returns a single notice by ID (even archived — for shareable links). */
export async function getNotice(id: string): Promise<
    { ok: true; data: NoticeRow } | { ok: false; error: string }
> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("notice_board")
        .select("*, author:author_id(display_name, role)")
        .eq("id", id)
        .single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: data as unknown as NoticeRow };
}

/** Admin: all notices including archived. */
export async function listAllNoticesAdmin(): Promise<
    { ok: true; data: NoticeRow[] } | { ok: false; error: string }
> {
    try { await assertNoticeWriter(); } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "Forbidden" };
    }
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("notice_board")
        .select("*, author:author_id(display_name, role)")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: (data ?? []) as unknown as NoticeRow[] };
}

export async function createNotice(input: NoticeInput): Promise<
    { ok: true; data: NoticeRow } | { ok: false; error: string }
> {
    let writer;
    try { writer = await assertNoticeWriter(); } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "Forbidden" };
    }
    const { supabase, user } = writer;
    const { data, error } = await supabase
        .from("notice_board")
        .insert({
            title: input.title.trim(),
            body: input.body.trim(),
            is_pinned: input.is_pinned,
            expires_at: input.expires_at || null,
            cta_label: input.cta_label || null,
            cta_url: input.cta_url?.trim() || null,
            ctas: (input.ctas || []) as any,
            author_id: user.id,
        })
        .select("*, author:author_id(display_name, role)")
        .single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: data as unknown as NoticeRow };
}

export async function updateNotice(id: string, input: Partial<NoticeInput> & { is_archived?: boolean }): Promise<
    { ok: true; data: NoticeRow } | { ok: false; error: string }
> {
    try { await assertNoticeWriter(); } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "Forbidden" };
    }
    const supabase = await createClient();
    const patch: Record<string, unknown> = {};
    if (input.title !== undefined) patch.title = input.title.trim();
    if (input.body !== undefined) patch.body = input.body.trim();
    if (input.is_pinned !== undefined) patch.is_pinned = input.is_pinned;
    if (input.is_archived !== undefined) patch.is_archived = input.is_archived;
    if ("expires_at" in input) patch.expires_at = input.expires_at || null;
    if ("cta_label" in input) patch.cta_label = input.cta_label || null;
    if ("cta_url" in input) patch.cta_url = input.cta_url?.trim() || null;
    if ("ctas" in input) patch.ctas = (input.ctas || []) as any;
    const { data, error } = await supabase
        .from("notice_board")
        .update(patch)
        .eq("id", id)
        .select("*, author:author_id(display_name, role)")
        .single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: data as unknown as NoticeRow };
}

export async function deleteNotice(id: string): Promise<
    { ok: true } | { ok: false; error: string }
> {
    try { await assertNoticeWriter(); } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "Forbidden" };
    }
    const supabase = await createClient();
    const { error } = await supabase.from("notice_board").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
}
