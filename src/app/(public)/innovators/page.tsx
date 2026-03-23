import { createClient } from "@/lib/supabase/server";
import InnovatorsClient from "./InnovatorsClient";
import { Tables } from "@/types/database";

export const metadata = {
    title: "Our Innovators — VajraX",
    description: "Meet the members and leadership driving VajraX forward.",
};

type Profile = Tables<"profiles">;

export default async function InnovatorsPage() {
    const supabase = await createClient();
    
    // Fetch all authenticated members
    const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: true });

    return <InnovatorsClient profiles={profiles ?? []} />;
}
