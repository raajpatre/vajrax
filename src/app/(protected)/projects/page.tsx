import { createClient } from "@/lib/supabase/server";
import ProjectsClient from "./ProjectsClient";

export const metadata = {
    title: "Projects — VajraX",
    description: "Explore our cutting-edge robotics R&D projects.",
};

export default async function ProjectsPage() {
    const supabase = await createClient();
    const { data: projects } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

    return <ProjectsClient projects={projects ?? []} />;
}
