import { getNotice } from "@/actions/notice-board";
import NoticeDetailClient from "@/components/notice-board/NoticeDetailClient";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const revalidate = 60;

interface Props {
    params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;
    const result = await getNotice(id);
    if (!result.ok) return { title: "Notice | VajraX" };
    const notice = result.data;
    const preview = notice.body
        .replace(/#+\s/g, "")
        .replace(/\*\*/g, "")
        .replace(/\*/g, "")
        .slice(0, 155);
    return {
        title: `${notice.title} | VajraX Notice Board`,
        description: preview,
    };
}

export default async function NoticeDetailPage({ params }: Props) {
    const { id } = await params;
    const result = await getNotice(id);

    if (!result.ok) notFound();

    return <NoticeDetailClient notice={result.data} />;
}
