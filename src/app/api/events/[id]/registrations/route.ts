import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ── Admin role check ──────────────────────────────────────────────
async function isAdmin(supabase: Awaited<ReturnType<typeof createClient>>): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data: profile } = await supabase
        .from("profiles")
        .select("roles")
        .eq("id", user.id)
        .single();
    const adminRoles = ["faculty", "president", "vice_president", "lead_developer"];
    return (profile?.roles ?? []).some(r => adminRoles.includes(r));
}

// ── GET — fetch registrations for an event ────────────────────────
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: eventId } = await params;
    const supabase = await createClient();

    if (!(await isAdmin(supabase))) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const url = new URL(request.url);
    const format = url.searchParams.get("format");

    // Fetch registrations with team members
    const adminSupabase = await import("@/lib/supabase/admin").then(m => m.createAdminClient());
    const { data: registrations, error } = await adminSupabase
        .from("event_registrations")
        .select(`
            *,
            event_team_members (
                id,
                member_name,
                member_email,
                member_phone,
                member_college,
                position
            )
        `)
        .eq("event_id", eventId)
        .is("_hp", null)
        .order("created_at", { ascending: true });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch event custom fields
    const { data: event } = await adminSupabase
        .from("events")
        .select("custom_fields")
        .eq("id", eventId)
        .single();
    const customFields = (event?.custom_fields as any[]) ?? [];

    // CSV export
    if (format === "csv") {
        const rows: string[] = [];
        // Header
        const headers = [
            "Registration Code",
            "Type",
            "Team Name",
            "Leader Name",
            "Leader Email",
            "Leader Phone",
            "Leader College",
            "Registered At",
            "Team Members",
            ...customFields.map((f: any) => f.label)
        ];
        rows.push(headers.map((h) => `"${h}"`).join(","));

        for (const reg of registrations ?? []) {
            const teamStr = (reg.event_team_members ?? [])
                .sort((a: { position: number }, b: { position: number }) => a.position - b.position)
                .map((m: { member_name: string; member_email?: string | null }) => `${m.member_name}${m.member_email ? ` (${m.member_email})` : ""}`)
                .join(" | ");

            const customAnswers = customFields.map((f: any) => {
                const answer = (reg.custom_responses as Record<string, any>)?.[f.id];
                return answer ? (Array.isArray(answer) ? answer.join(", ") : String(answer)) : "";
            });

            rows.push([
                reg.registration_code,
                reg.registration_type,
                reg.team_name ?? "",
                reg.leader_name,
                reg.leader_email,
                reg.leader_phone,
                reg.leader_college,
                new Date(reg.created_at).toLocaleString("en-IN"),
                teamStr,
                ...customAnswers
            ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
        }

        return new NextResponse(rows.join("\n"), {
            headers: {
                "Content-Type": "text/csv",
                "Content-Disposition": `attachment; filename="event-${eventId}-registrations.csv"`,
            },
        });
    }

    // JSON response
    return NextResponse.json({ registrations: registrations ?? [], count: (registrations ?? []).length });
}
