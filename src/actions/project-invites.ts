"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface ProjectInviteDTO {
    id: string;
    status: string;
    created_at: string;
    project: { id: string; title: string; status: string } | null;
    inviter: { id: string; display_name: string; avatar_url: string | null } | null;
}

/**
 * Fetch the current user's project invites. Uses the service-role client for the
 * joined project/inviter reads so RLS on `profiles`/`projects` can't null them out
 * (which previously crashed the invites page for newly onboarded members).
 * Scoped strictly to the authenticated user's own invitee_id.
 */
export async function getMyProjectInvites(): Promise<{
    ok: boolean;
    error?: string;
    invites: ProjectInviteDTO[];
}> {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { ok: false, error: "Not authenticated.", invites: [] };

    const admin = createAdminClient();
    const { data, error } = await admin
        .from("project_invites")
        .select(
            "id, status, created_at, project:projects!project_invites_project_id_fkey(id, title, status), inviter:profiles!project_invites_inviter_id_fkey(id, display_name, avatar_url)"
        )
        .eq("invitee_id", user.id)
        .order("created_at", { ascending: false });

    if (error) return { ok: false, error: error.message, invites: [] };

    const invites: ProjectInviteDTO[] = (data ?? []).map((inv) => ({
        id: inv.id,
        status: inv.status,
        created_at: inv.created_at,
        project: (inv.project as unknown as ProjectInviteDTO["project"]) ?? null,
        inviter: (inv.inviter as unknown as ProjectInviteDTO["inviter"]) ?? null,
    }));

    return { ok: true, invites };
}

/**
 * Accept or decline a project invite. Verifies the invite belongs to the caller,
 * updates its status, and (on accept) adds the user as a project member — all via
 * the service-role client so RLS can't silently block the membership insert.
 */
export async function respondToProjectInvite(input: {
    inviteId: string;
    action: "accepted" | "rejected";
}): Promise<{ ok: true } | { ok: false; error: string }> {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { ok: false, error: "Not authenticated." };

    const admin = createAdminClient();

    const { data: invite, error: inviteError } = await admin
        .from("project_invites")
        .select("id, project_id, invitee_id, status, inviter_id, project:projects(title)")
        .eq("id", input.inviteId)
        .maybeSingle();

    if (inviteError) return { ok: false, error: inviteError.message };
    if (!invite || invite.invitee_id !== user.id) {
        return { ok: false, error: "Invite not found." };
    }
    if (invite.status !== "pending") {
        // Already responded — nothing to do.
        return { ok: true };
    }

    const { error: updateError } = await admin
        .from("project_invites")
        .update({ status: input.action })
        .eq("id", input.inviteId)
        .eq("invitee_id", user.id);

    if (updateError) return { ok: false, error: updateError.message };

    if (input.action === "accepted") {
        // Avoid duplicate membership if the user is somehow already a member.
        const { data: existing } = await admin
            .from("project_members")
            .select("id")
            .eq("project_id", invite.project_id)
            .eq("user_id", user.id)
            .maybeSingle();

        if (!existing) {
            const { error: memberError } = await admin.from("project_members").insert({
                project_id: invite.project_id,
                user_id: user.id,
                role: "member",
            });
            if (memberError) return { ok: false, error: memberError.message };
        }
    }

    // Send notification to the inviter
    const projectObj = Array.isArray(invite.project) ? invite.project[0] : invite.project;
    const projectTitle = projectObj?.title || "a project";
    const actionVerb = input.action === "accepted" ? "accepted" : "declined";
    
    // Fetch user's profile to get their display name
    const { data: profile } = await admin.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
    const displayName = profile?.display_name || user.user_metadata?.display_name || user.email || "Someone";
    
    await admin.from("notifications").insert({
        user_id: invite.inviter_id,
        type: `project_invite_${input.action}`,
        message: `${displayName} ${actionVerb} your invite to join ${projectTitle}.`,
        related_entity_id: invite.project_id,
    });
    revalidatePath("/project-invites");
    revalidatePath("/projects");
    return { ok: true };
}
