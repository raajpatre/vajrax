import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminEventsClient from "./AdminEventsClient";

export const metadata = { title: "Admin — Events — VajraX" };

export default async function AdminEventsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    const adminRoles = ["faculty", "president", "vice_president", "website_manager"];
    if (!adminRoles.includes(profile?.role ?? "")) redirect("/");

    const { data: events } = await supabase
        .from("events")
        .select("*")
        .order("starts_at", { ascending: false });

    // Get registration counts for each event
    const countMap: Record<string, number> = {};
    if (events && events.length > 0) {
        for (const ev of events) {
            const { count } = await supabase
                .from("event_registrations")
                .select("*", { count: "exact", head: true })
                .eq("event_id", ev.id)
                .is("_hp", null);
            countMap[ev.id] = count ?? 0;
        }
    }

    return <AdminEventsClient events={events ?? []} registrationCounts={countMap} />;
}
