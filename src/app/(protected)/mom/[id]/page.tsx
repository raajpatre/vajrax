import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import MOMDetailClient from "./MOMDetailClient";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();
    const { data } = await supabase.from("meeting_minutes").select("title, meeting_date").eq("id", id).single();
    return { title: data ? `${data.title} — VajraX MOM` : "Minutes Of Meeting — VajraX" };
}

export default async function MOMDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

    const { data: mom } = await supabase
        .from("meeting_minutes")
        .select("*")
        .eq("id", id)
        .single();
    if (!mom) notFound();

    // Fetch author profile
    const { data: author } = mom.created_by
        ? await supabase.from("profiles").select("id, display_name, avatar_url, role").eq("id", mom.created_by).single()
        : { data: null };

    return (
        <MOMDetailClient
            mom={mom}
            author={author}
            currentUserId={user.id}
            currentUserRole={profile?.role ?? "member"}
        />
    );
}
