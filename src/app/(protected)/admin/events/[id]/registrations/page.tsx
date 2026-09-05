import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import RegistrationsClient from "./RegistrationsClient";

export default async function AdminRegistrationsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    const adminRoles = ["faculty", "president", "vice_president", "website_manager"];
    if (!adminRoles.includes(profile?.role ?? "")) redirect("/");

    const { data: event } = await supabase.from("events").select("id, title, registration_mode, team_size_min, team_size_max, custom_fields").eq("id", id).single();
    if (!event) notFound();

    const adminSupabase = await import("@/lib/supabase/admin").then(m => m.createAdminClient());
    const { data: registrations } = await adminSupabase
        .from("event_registrations")
        .select(`*, event_team_members(id, registration_id, member_name, member_email, member_phone, member_college, position)`)
        .eq("event_id", id)
        .is("_hp", null)
        .order("created_at", { ascending: true });

    return (
        <RegistrationsClient
            event={event}
            registrations={registrations ?? []}
        />
    );
}
