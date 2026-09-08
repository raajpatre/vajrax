import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/attendance/me — returns current user's attendance stats
export async function GET() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
        .rpc("get_member_attendance_stats", { p_member_id: user.id });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = Array.isArray(data) ? data : [];
    const stats = rows[0] ?? { sessions_eligible: 0, sessions_attended: 0, attendance_pct: 100 };
    return NextResponse.json(stats);
}
