"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const PROJECT_MANAGER_ROLES = new Set(["faculty", "president", "vice_president"]);

export async function removeProjectMember(input: {
    projectId: string;
    memberId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { ok: false, error: "Not authenticated." };
    }

    const adminSupabase = createAdminClient();

    const [{ data: profile }, { data: project }, { data: actorMembership }] = await Promise.all([
        adminSupabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
        adminSupabase.from("projects").select("created_by").eq("id", input.projectId).maybeSingle(),
        adminSupabase
            .from("project_members")
            .select("role")
            .eq("project_id", input.projectId)
            .eq("user_id", user.id)
            .maybeSingle(),
    ]);

    const isManager =
        project?.created_by === user.id ||
        actorMembership?.role === "lead" ||
        (profile?.role ? PROJECT_MANAGER_ROLES.has(profile.role) : false);

    if (!isManager) {
        return { ok: false, error: "Not authorized to remove members from this project." };
    }

    const { data: targetMember } = await adminSupabase
        .from("project_members")
        .select("id, role, user_id")
        .eq("id", input.memberId)
        .eq("project_id", input.projectId)
        .maybeSingle();

    if (!targetMember) {
        return { ok: false, error: "Project member not found." };
    }

    if (targetMember.role === "lead" || targetMember.user_id === project?.created_by) {
        return { ok: false, error: "The project leader cannot be removed." };
    }

    const { error } = await adminSupabase
        .from("project_members")
        .delete()
        .eq("id", input.memberId)
        .eq("project_id", input.projectId);

    if (error) {
        return { ok: false, error: error.message };
    }

    return { ok: true };
}
