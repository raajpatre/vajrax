import { createClient } from "@/lib/supabase/server";
import InnovatorsClient from "./InnovatorsClient";
import { Tables } from "@/types/database";

export const metadata = {
    title: "Our Innovators — VajraX",
    description: "Meet the members and leadership driving VajraX forward.",
};

type Profile = Tables<"profiles">;

const HIDDEN_INNOVATOR_DISPLAY_NAMES = new Set(["Dr. Admin"]);

import { Suspense } from "react";
import { ListRowSkeleton } from "@/components/ui/skeletons/ListRowSkeleton";

export default async function InnovatorsPage() {
    const supabase = await createClient();
    
    // Fetch all authenticated members
    const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: true });

    const visibleProfiles =
        (profiles ?? []).filter((profile) => !HIDDEN_INNOVATOR_DISPLAY_NAMES.has(profile.display_name));

    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#07090f] pt-[calc(var(--nav-height)+1.5rem)] px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="mb-14 h-40" />
                    <ListRowSkeleton count={8} />
                </div>
            </div>
        }>
            <InnovatorsClient profiles={visibleProfiles} />
        </Suspense>
    );
}
