import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import MOMListClient from "./MOMListClient";

export const metadata = { title: "Minutes Of Meeting — VajraX" };

export default async function MOMPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

    const { data: moms } = await supabase
        .from("meeting_minutes")
        .select("id, title, meeting_date, meeting_type, attendees, created_by, created_at")
        .order("meeting_date", { ascending: false });

    // Fetch author profiles
    const authorIds = [...new Set((moms ?? []).map((m) => m.created_by).filter(Boolean))] as string[];
    const { data: profiles } = authorIds.length > 0
        ? await supabase.from("profiles").select("id, display_name, avatar_url").in("id", authorIds)
        : { data: [] };

    const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));

    return (
        <MOMListClient
            moms={moms ?? []}
            profileMap={profileMap}
            userRole={profile?.role ?? "member"}
        />
    );
}
