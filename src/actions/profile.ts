"use server";

import { createAdminClient } from "@/lib/supabase/admin";

// Active statuses — kept in sync with ProjectsClient.tsx filter logic
const ACTIVE_STATUSES = new Set(["in_progress", "ongoing", "planning", "on_hold"]);

export async function getProfileProjectCounts(
    userId: string
): Promise<{ active: number; completed: number }> {
    const supabase = createAdminClient();

    // Step 1: get all project IDs for this user (service role bypasses RLS)
    const { data: memberships, error: memberErr } = await supabase
        .from("project_members")
        .select("project_id")
        .eq("user_id", userId);

    if (memberErr || !memberships || memberships.length === 0) {
        return { active: 0, completed: 0 };
    }

    const projectIds = memberships.map((m) => m.project_id as string);

    // Step 2: get project statuses for those IDs
    const { data: projects, error: projErr } = await supabase
        .from("projects")
        .select("status")
        .in("id", projectIds);

    if (projErr || !projects) return { active: 0, completed: 0 };

    let active = 0;
    let completed = 0;
    for (const p of projects) {
        const s = p.status as string;
        if (s === "completed") completed++;
        else if (ACTIVE_STATUSES.has(s)) active++;
    }

    return { active, completed };
}
