"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Database } from "@/types/database";
import type { Json } from "@/types/database";

const PROJECT_MANAGER_ROLES = new Set(["faculty", "president", "vice_president", "project_manager"]);

type PermResult =
    | { ok: true; projectId: string }
    | { ok: false; error: string };

// A log is editable by its author, the project lead/creator, or club faculty/leadership.
async function authorizeLog(
    userId: string,
    logId: string,
    admin: ReturnType<typeof createAdminClient>
): Promise<PermResult> {
    const { data: log } = await admin
        .from("project_updates")
        .select("author_id, project_id")
        .eq("id", logId)
        .maybeSingle();

    if (!log) return { ok: false, error: "Log not found." };
    if (log.author_id === userId) return { ok: true, projectId: log.project_id };

    const [{ data: profile }, { data: project }, { data: membership }] = await Promise.all([
        admin.from("profiles").select("role, roles").eq("id", userId).maybeSingle(),
        admin.from("projects").select("created_by").eq("id", log.project_id).maybeSingle(),
        admin
            .from("project_members")
            .select("role")
            .eq("project_id", log.project_id)
            .eq("user_id", userId)
            .maybeSingle(),
    ]);

    const can =
        project?.created_by === userId ||
        membership?.role === "lead" ||
        (profile?.roles ? profile.roles.some((r: string) => PROJECT_MANAGER_ROLES.has(r as Database["public"]["Enums"]["user_role"])) : false);

    return can
        ? { ok: true, projectId: log.project_id }
        : { ok: false, error: "You can only edit your own logs." };
}

export async function updateProjectLog(input: {
    logId: string;
    title: string;
    content: string | null;
    versionTag: string | null;
    sourceUrls: string[] | null;
    imageUrls: string[] | null;
    videoUrls: string[] | null;
    attachments: Json | null;
    createdAt?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Not authenticated." };

    const title = input.title.trim();
    if (!title) return { ok: false, error: "Title is required." };

    const admin = createAdminClient();
    const perm = await authorizeLog(user.id, input.logId, admin);
    if (!perm.ok) return { ok: false, error: perm.error };

    const { error } = await admin
        .from("project_updates")
        .update({
            title,
            content: input.content,
            version_tag: input.versionTag,
            source_urls: input.sourceUrls,
            image_urls: input.imageUrls,
            video_urls: input.videoUrls,
            attachments: input.attachments,
            ...(input.createdAt ? { created_at: input.createdAt } : {}),
        })
        .eq("id", input.logId);

    if (error) return { ok: false, error: error.message };

    revalidatePath(`/projects/${perm.projectId}`);
    return { ok: true };
}

export async function deleteProjectLog(
    logId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Not authenticated." };

    const admin = createAdminClient();
    const perm = await authorizeLog(user.id, logId, admin);
    if (!perm.ok) return { ok: false, error: perm.error };

    const { error } = await admin.from("project_updates").delete().eq("id", logId);
    if (error) return { ok: false, error: error.message };

    revalidatePath(`/projects/${perm.projectId}`);
    return { ok: true };
}
