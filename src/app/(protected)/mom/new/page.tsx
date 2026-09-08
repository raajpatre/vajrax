import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import NewMOMClient from "./NewMOMClient";

export const metadata = { title: "New Minutes Of Meeting — VajraX" };

const CAN_WRITE_ROLES = ["faculty", "president", "vice_president"];

export default async function NewMOMPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: profile } = await supabase.from("profiles").select("role, display_name").eq("id", user.id).single();
    if (!CAN_WRITE_ROLES.includes(profile?.role ?? "")) redirect("/mom");

    return <NewMOMClient userId={user.id} />;
}
