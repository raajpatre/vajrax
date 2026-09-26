import { createClient } from "@/lib/supabase/server";
import GalleryClient from "./GalleryClient";

export const metadata = {
    title: "Gallery — VajraX",
    description: "Browse our showcase of past robotics projects and builds.",
};

import { Suspense } from "react";
import { ListRowSkeleton } from "@/components/ui/skeletons/ListRowSkeleton";

export default async function GalleryPage() {
    const supabase = await createClient();
    const { data: items } = await supabase
        .from("gallery_items")
        .select("*")
        .order("created_at", { ascending: false });

    return (
        <Suspense fallback={
            <div className="min-h-screen bg-base pt-[calc(var(--nav-height)+1.5rem)] px-6">
                <div className="max-w-[1480px] mx-auto">
                    <div className="mb-14 h-40" />
                    <ListRowSkeleton count={8} />
                </div>
            </div>
        }>
            <GalleryClient items={items ?? []} />
        </Suspense>
    );
}
