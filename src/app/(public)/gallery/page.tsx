import { createClient } from "@/lib/supabase/server";
import GalleryClient from "./GalleryClient";

export const metadata = {
    title: "Gallery — VajraX",
    description: "Browse our showcase of past robotics projects and builds.",
};

export default async function GalleryPage() {
    const supabase = await createClient();
    const { data: items } = await supabase
        .from("gallery_items")
        .select("*")
        .order("created_at", { ascending: false });

    return <GalleryClient items={items ?? []} />;
}
