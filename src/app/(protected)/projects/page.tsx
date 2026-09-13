import { createClient } from "@/lib/supabase/server";
import ProjectsClient from "./ProjectsClient";

export const metadata = {
    title: "Projects — VajraX",
    description: "Explore our cutting-edge robotics R&D projects.",
};

export default async function ProjectsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const [ { data: projects }, { data: memberships } ] = await Promise.all([
        supabase
            .from("projects")
            .select("*")
            .order("created_at", { ascending: false }),
        user ? supabase.from("project_members").select("project_id").eq("user_id", user.id) : Promise.resolve({ data: [] })
    ]);

    const myProjectIds = Array.from(new Set([
        ...(memberships ?? []).map(m => m.project_id),
        ...(projects ?? []).filter(p => p.created_by === user?.id).map(p => p.id)
    ]));

    return <ProjectsClient projects={projects ?? []} myProjectIds={myProjectIds} />;
}
