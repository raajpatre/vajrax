import { listPublicNotices } from "@/actions/notice-board";
import NoticeBoardClient from "@/components/notice-board/NoticeBoardClient";
import type { Metadata } from "next";

export const revalidate = 60; // ISR — revalidate at most once per minute

export const metadata: Metadata = {
    title: "Notice Board | VajraX",
    description: "Official announcements and updates from VajraX club leadership.",
};

export default async function NoticeBoardPage() {
    const result = await listPublicNotices();
    const notices = result.ok ? result.data : [];

    return <NoticeBoardClient notices={notices} />;
}
