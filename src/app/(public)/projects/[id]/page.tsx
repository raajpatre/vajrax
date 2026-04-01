import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import ProjectDetailClient from "./ProjectDetailClient";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: project } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id)
        .single();

    if (!project) return notFound();

    const { data: members } = await supabase
        .from("project_members")
        .select("id, role, joined_at, user:profiles!project_members_user_id_fkey(id, display_name, avatar_url, username)")
        .eq("project_id", id);

    const { data: updates } = await supabase
        .from("project_updates")
        .select("id, title, content, version_tag, source_urls, image_urls, created_at, author:profiles!project_updates_author_id_fkey(id, display_name, avatar_url)")
        .eq("project_id", id)
        .order("created_at", { ascending: false });

    return (
        <ProjectDetailClient
            project={project}
            members={members || []}
            updates={updates || []}
        />
    );
}
