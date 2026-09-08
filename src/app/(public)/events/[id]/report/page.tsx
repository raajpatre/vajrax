import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import EventReportClient from "./EventReportClient";

export default async function EventReportPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: event } = await supabase.from("events").select("*").eq("id", id).single();
    if (!event) notFound();

    // If event hasn't ended yet, redirect to detail page
    const isPast = new Date(event.starts_at) < new Date();
    if (!isPast) redirect(`/events/${id}`);

    // If no report summary, show a placeholder
    return <EventReportClient event={event} />;
}
