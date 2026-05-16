"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
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
