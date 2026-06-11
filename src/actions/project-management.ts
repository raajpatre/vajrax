"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

const PROJECT_MANAGER_ROLES = new Set<Database["public"]["Enums"]["user_role"]>([
    "faculty",
    "president",
    "vice_president",
]);

export async function updateProjectHeroImage(input: {
    projectId: string;
    coverImageUrl: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { ok: false, error: "Not authenticated." };
    }

    const [{ data: project }, { data: profile }, { data: membership }] = await Promise.all([
        supabase
            .from("projects")
            .select("id, created_by")
            .eq("id", input.projectId)
            .maybeSingle(),
        supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .maybeSingle(),
        supabase
            .from("project_members")
            .select("role")
            .eq("project_id", input.projectId)
            .eq("user_id", user.id)
            .maybeSingle(),
    ]);

    if (!project) {
        return { ok: false, error: "Project not found." };
    }

    const canManage =
        project.created_by === user.id ||
        membership?.role === "lead" ||
        (profile?.role ? PROJECT_MANAGER_ROLES.has(profile.role) : false);

    if (!canManage) {
        return { ok: false, error: "Not authorized to update this project." };
    }

    const { error } = await supabase
        .from("projects")
        .update({ cover_image_url: input.coverImageUrl })
        .eq("id", input.projectId);

    if (error) {
        return { ok: false, error: error.message };
    }

    revalidatePath("/projects");
    revalidatePath(`/projects/${input.projectId}`);
    revalidatePath(`/projects/${input.projectId}/manage`);

    return { ok: true };
}

export async function deleteProject(
    projectId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Not authenticated." };

    // Verify caller is a lead of this project or has club-wide authority
    const [{ data: membership }, { data: profile }] = await Promise.all([
        supabase
            .from("project_members")
            .select("role")
            .eq("project_id", projectId)
            .eq("user_id", user.id)
            .maybeSingle(),
        supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .maybeSingle(),
    ]);

    const canDelete =
        membership?.role === "lead" ||
        (profile?.role ? PROJECT_MANAGER_ROLES.has(profile.role) : false);

    if (!canDelete) return { ok: false, error: "Only the project lead or faculty can delete a project." };

    // Use service role to bypass RLS — authorization is checked above
    const admin = createAdminClient();
    const { error } = await admin.from("projects").delete().eq("id", projectId);
    if (error) return { ok: false, error: error.message };

    revalidatePath("/projects");
    return { ok: true };
}
