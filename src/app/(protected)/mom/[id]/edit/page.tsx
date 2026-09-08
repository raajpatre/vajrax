import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import EditMOMClient from "./EditMOMClient";

export const metadata = { title: "Edit Minutes Of Meeting — VajraX" };

const CAN_WRITE_ROLES = ["faculty", "president", "vice_president"];

export default async function EditMOMPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (!CAN_WRITE_ROLES.includes(profile?.role ?? "")) redirect(`/mom/${id}`);

    const { data: mom } = await supabase.from("meeting_minutes").select("*").eq("id", id).single();
    if (!mom) notFound();

    return <EditMOMClient mom={mom} userId={user.id} />;
}
