"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

const PROJECT_REVIEWER_ROLES: Array<Database["public"]["Enums"]["user_role"]> = [
    "inventory_manager",
    "faculty",
    "president",
    "vice_president",
];

const PROJECT_APPROVER_ROLES = new Set<Database["public"]["Enums"]["user_role"]>([
    "faculty",
    "president",
    "vice_president",
]);

async function createNotification(input: {
    userIds: string[];
    type: string;
    message: string;
    relatedEntityId?: string | null;
}) {
    const uniqueUserIds = Array.from(new Set(input.userIds.filter(Boolean)));
    if (uniqueUserIds.length === 0) return;

    try {
        const adminSupabase = createAdminClient();
        const { error } = await adminSupabase.from("notifications").insert(
            uniqueUserIds.map((userId) => ({
                user_id: userId,
                type: input.type,
                message: input.message,
                related_entity_id: input.relatedEntityId ?? null,
            }))
        );
        if (error) {
            console.error("Notification insert failed:", error.message);
        }
    } catch (err) {
        console.error("createNotification threw:", err);
    }
}

export async function submitProjectRequest(input: {
    title: string;
    description: string;
    techStack: string[];
}): Promise<{ ok: true } | { ok: false; error: string }> {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { ok: false, error: "Not authenticated" };
    }

    const title = input.title.trim();
    if (!title) {
        return { ok: false, error: "Project title is required." };
    }

    const { data: requestRow, error: insertError } = await supabase
        .from("project_requests")
        .insert({
            title,
            description: input.description.trim() || null,
            tech_stack: input.techStack,
            requester_id: user.id,
        })
        .select("id")
        .single();

    if (insertError || !requestRow) {
        return { ok: false, error: insertError?.message || "Failed to submit project request." };
    }

    const { data: reviewers, error: reviewersError } = await supabase
        .from("profiles")
        .select("id")
        .in("role", PROJECT_REVIEWER_ROLES);

    if (reviewersError) {
        console.error("Failed to load project reviewers for notifications:", reviewersError.message);
    } else {
        await createNotification({
            userIds: reviewers?.map((reviewer) => reviewer.id) || [],
            type: "project_request_received",
            message: "A new project request has been submitted.",
            relatedEntityId: requestRow.id,
        });
    }

    revalidatePath("/projects");
    revalidatePath("/admin/project-requests");
    return { ok: true };
}

export async function reviewProjectRequest(input: {
    requestId: string;
    action: "approved" | "rejected";
}): Promise<{ ok: true } | { ok: false; error: string }> {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { ok: false, error: "Not authenticated" };
    }

    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profileError || !profile || !PROJECT_APPROVER_ROLES.has(profile.role)) {
        return { ok: false, error: "Not authorized" };
    }

    const { data: requestRow, error: requestError } = await supabase
        .from("project_requests")
        .select("id, title, description, tech_stack, requester_id")
        .eq("id", input.requestId)
        .single();

    if (requestError || !requestRow) {
        return { ok: false, error: requestError?.message || "Project request not found." };
    }

    // Only update if the request is still pending — prevents duplicate project creation
    // if this action is called twice (e.g. double-click or concurrent request).
    const { data: updatedRows, error: updateError } = await supabase
        .from("project_requests")
        .update({ status: input.action, reviewed_by: user.id })
        .eq("id", input.requestId)
        .eq("status", "pending")
        .select("id");

    if (updateError) {
        return { ok: false, error: updateError.message };
    }

    if (!updatedRows || updatedRows.length === 0) {
        // Request was already reviewed — nothing to do, avoid duplicate project.
        return { ok: true };
    }

    if (input.action === "approved") {
        const { data: project, error: projectError } = await supabase
            .from("projects")
            .insert({
                title: requestRow.title,
                description: requestRow.description || "",
                tech_stack: requestRow.tech_stack || [],
                status: "ongoing",
                created_by: requestRow.requester_id,
            })
            .select("id")
            .single();

        if (projectError) {
            return { ok: false, error: projectError.message };
        }

        if (project) {
            const { error: memberError } = await supabase.from("project_members").insert({
                project_id: project.id,
                user_id: requestRow.requester_id,
                role: "lead",
            });

            if (memberError) {
                return { ok: false, error: memberError.message };
            }
        }
    }

    await createNotification({
        userIds: [requestRow.requester_id],
        type: input.action === "approved" ? "project_request_approved" : "project_request_rejected",
        message:
            input.action === "approved"
                ? `Your project request "${requestRow.title}" has been approved.`
                : `Your project request "${requestRow.title}" has been rejected.`,
        relatedEntityId: requestRow.id,
    });

    revalidatePath("/projects");
    revalidatePath("/projects/request");
    revalidatePath("/admin/project-requests");
    return { ok: true };
}
