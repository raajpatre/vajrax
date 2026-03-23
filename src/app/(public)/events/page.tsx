import { createClient } from "@/lib/supabase/server";
import EventsClient from "./EventsClient";

export const metadata = {
    title: "Events — VajraX",
    description: "Upcoming hackathons, workshops, and meetups from VajraX.",
};

export default async function EventsPage() {
    const supabase = await createClient();
    const { data: events } = await supabase
        .from("events")
        .select("*")
        .order("starts_at", { ascending: true });

    return <EventsClient events={events ?? []} />;
}
