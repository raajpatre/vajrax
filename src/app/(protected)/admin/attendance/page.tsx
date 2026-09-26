import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import AttendanceClient from "./AttendanceClient";
import { ListRowSkeleton } from "@/components/ui/skeletons/ListRowSkeleton";

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
        <Suspense fallback={
            <div className="relative min-h-screen bg-[#07090f] pt-[calc(var(--nav-height,0px)+2.5rem)] pb-24">
                <div className="relative max-w-[1100px] mx-auto px-4 sm:px-8">
                    <div className="mb-8 h-20" />
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8 h-24" />
                    <ListRowSkeleton count={10} />
                </div>
            </div>
        }>
            <AttendanceClient
                summary={(summary as any) ?? []}
                moms={moms ?? []}
                attendanceRows={attendanceRows ?? []}
            />
        </Suspense>
    );
}
