import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import EventDetailClient from "./EventDetailClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: event } = await supabase.from("events").select("title, description").eq("id", id).single();
    if (!event) return { title: "Event — VajraX" };
    return {
        title: `${event.title} — VajraX`,
        description: event.description,
    };
}

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: event } = await supabase.from("events").select("*").eq("id", id).single();
    if (!event) notFound();

    // Get registration count
    const { count } = await supabase
        .from("event_registrations")
        .select("*", { count: "exact", head: true })
        .eq("event_id", id)
        .is("_hp", null);

    const isPast = new Date(event.starts_at) < new Date();

    return (
        <EventDetailClient
            event={event}
            registrationCount={count ?? 0}
            isPast={isPast}
        />
    );
}
