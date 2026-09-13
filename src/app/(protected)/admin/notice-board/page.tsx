import { listAllNoticesAdmin } from "@/actions/notice-board";
import AdminNoticeBoardClient from "@/components/notice-board/AdminNoticeBoardClient";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Notice Board Control | VajraX Admin",
};

const NOTICE_WRITER_ROLES = ["faculty", "president", "vice_president"];

export default async function AdminNoticeBoardPage() {
    const supabase = await createClient();

    // Auth guard
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: profile } = await supabase
        .from("profiles")
        .select("role, roles")
        .eq("id", user.id)
        .single();

    const roles: string[] = profile?.roles?.length
        ? profile.roles
        : profile?.role ? [profile.role] : [];

    const isAuthorised = roles.some((r) => NOTICE_WRITER_ROLES.includes(r));
    if (!isAuthorised) redirect("/admin");

    const result = await listAllNoticesAdmin();
    const notices = result.ok ? result.data : [];

    return <AdminNoticeBoardClient initialNotices={notices} />;
}
