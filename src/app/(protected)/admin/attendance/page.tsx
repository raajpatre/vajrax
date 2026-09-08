import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AttendanceClient from "./AttendanceClient";

export const metadata = { title: "Attendance Tracker — VajraX Admin" };

export default async function AttendancePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    const adminRoles = ["faculty", "president", "vice_president"];
    if (!profile || !adminRoles.includes(profile.role)) redirect("/");

    // Fetch all member attendance summary from view
    const { data: summary } = await supabase
        .from("member_attendance_summary")
        .select("*")
        .order("display_name", { ascending: true });

    // Fetch all MOMs that count toward attendance, sorted by date
    const { data: moms } = await supabase
        .from("meeting_minutes")
        .select("id, title, meeting_date, meeting_type, session_scope, attendee_ids, counts_attendance")
        .eq("counts_attendance", true)
        .order("meeting_date", { ascending: false });

    // Fetch per-MOM attendance rows for the per-session drill-down
    const momIds = (moms ?? []).map((m) => m.id);
    const { data: attendanceRows } = momIds.length > 0
        ? await supabase
            .from("mom_attendances")
            .select("mom_id, member_id, present")
            .in("mom_id", momIds)
        : { data: [] };

    return (
        <AttendanceClient
            summary={summary ?? []}
            moms={moms ?? []}
            attendanceRows={attendanceRows ?? []}
        />
    );
}
