"use client";

import { useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChevronLeft, Pin, Clock, Share2, Check, ExternalLink } from "lucide-react";
import type { NoticeRow } from "@/actions/notice-board";
import type { NoticeCTA } from "@/types/database";

const CTA_LABEL_MAP: Record<string, string> = {
    Download: "DOWNLOAD",
    See: "SEE",
    Submit: "SUBMIT",
    Apply: "APPLY",
    Register: "REGISTER",
    "More Info": "MORE INFO",
};

function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).toUpperCase();
}

function fmtDateTime(iso: string) {
    return new Date(iso).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
    }).toUpperCase();
}

function shortId(id: string) {
    return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

interface NoticeDetailClientProps {
    notice: NoticeRow;
}

export default function NoticeDetailClient({ notice }: NoticeDetailClientProps) {
    const [copied, setCopied] = useState(false);

    const isPinned = notice.is_pinned;
    const accentColor = isPinned ? "#f59e0b" : "#00e5ff";
    const accentRgb = isPinned ? "245,158,11" : "0,229,255";

    const authorName = notice.author?.display_name ?? "VajraX";
    const authorRole = (notice.author?.role ?? "member").replace(/_/g, " ").toUpperCase();

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch { /* noop */ }
    };

    const handleCtaClick = (e: React.MouseEvent<HTMLAnchorElement>, url: string) => {
        if (typeof window !== "undefined" && ("ontouchstart" in window || window.innerWidth < 768)) {
            e.preventDefault();
            setTimeout(() => {
                const newWin = window.open(url, "_blank");
                if (!newWin || newWin.closed || typeof newWin.closed === "undefined") {
                    window.location.href = url;
                }
            }, 250);
        }
    };

    const isExpired = notice.expires_at && new Date(notice.expires_at) < new Date();
    const isArchived = notice.is_archived;

    return (
        <div className="min-h-screen relative" style={{ background: "#07090f" }}>
            {/* Background */}
            <div
                className="fixed inset-0 pointer-events-none animate-grid-pan"
                style={{
                    backgroundImage:
                        "linear-gradient(rgba(0,229,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,229,255,0.03) 1px,transparent 1px)",
                    backgroundSize: "40px 40px",
                }}
            />
            <div className="fixed inset-0 pointer-events-none scanline animate-scanline-pan opacity-40" />
            <div
                className="fixed -bottom-40 -left-40 w-[500px] h-[500px] pointer-events-none"
                style={{ background: "radial-gradient(circle,rgba(0,229,255,0.07) 0%,transparent 70%)" }}
            />

            <div className="relative max-w-5xl mx-auto px-4 sm:px-8 pt-[calc(var(--nav-height)+2.5rem)] pb-24">
                {/* Back nav */}
                <Link
                    href="/notice-board"
                    className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] mb-8 transition-colors group"
                    style={{ color: "#4a5568" }}
                    onMouseOver={(e) => (e.currentTarget.style.color = "#8b9ab0")}
                    onMouseOut={(e) => (e.currentTarget.style.color = "#4a5568")}
                >
                    <ChevronLeft size={12} />
                    BACK TO NOTICE BOARD
                </Link>

                {/* ── Main grid: content + sidebar ── */}
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-6 items-start">
                    {/* ── Left: notice content ── */}
                    <div>
                        {/* Header card */}
                        <div
                            className="rounded-sm overflow-hidden mb-5"
                            style={{
                                background: "#0d1117",
                                border: `1px solid rgba(${accentRgb},0.22)`,
                                borderLeft: `3px solid ${accentColor}`,
                                boxShadow: `0 0 40px -16px rgba(${accentRgb},0.2)`,
                            }}
                        >
                            {/* Top accent stripe */}
                            <div
                                className="h-px w-full"
                                style={{
                                    background: `linear-gradient(90deg,transparent,rgba(${accentRgb},0.7),transparent)`,
                                }}
                            />

                            <div className="px-5 sm:px-7 pt-5 pb-6">
                                {/* Badges */}
                                <div className="flex items-center gap-2 mb-4 flex-wrap">
                                    {isPinned && (
                                        <span
                                            className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.14em] px-2 h-5 rounded-sm border"
                                            style={{ color: "#f59e0b", background: "rgba(245,158,11,0.10)", borderColor: "rgba(245,158,11,0.35)" }}
                                        >
                                            <Pin size={8} /> PINNED
                                        </span>
                                    )}
                                    {(isArchived || isExpired) && (
                                        <span
                                            className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.14em] px-2 h-5 rounded-sm border"
                                            style={{ color: "#8b9ab0", background: "rgba(139,154,176,0.08)", borderColor: "rgba(139,154,176,0.25)" }}
                                        >
                                            {isArchived ? "ARCHIVED" : "EXPIRED"}
                                        </span>
                                    )}
                                </div>

                                {/* Title */}
                                <h1
                                    className="font-sans font-black tracking-tight leading-tight mb-2"
                                    style={{ fontSize: "clamp(20px, 4vw, 30px)", color: "#f0f4ff" }}
                                >
                                    {notice.title}
                                </h1>


                                {/* Author + date */}
                                <div
                                    className="flex items-center justify-between gap-4 flex-wrap pt-4"
                                    style={{ borderTop: "1px solid rgba(0,229,255,0.1)" }}
                                >
                                    <div className="flex items-center gap-3">
                                        {/* Avatar placeholder */}
                                        <div
                                            className="w-8 h-8 sm:w-9 sm:h-9 rounded-sm grid place-items-center font-sans font-bold text-[13px] shrink-0"
                                            style={{
                                                background: `rgba(${accentRgb},0.12)`,
                                                border: `1px solid rgba(${accentRgb},0.3)`,
                                                color: accentColor,
                                            }}
                                        >
                                            {authorName.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="font-sans font-semibold text-[13px]" style={{ color: "#f0f4ff" }}>
                                                {authorName}
                                            </div>
                                            <div className="font-mono text-[10px] uppercase tracking-[0.12em]" style={{ color: "#4a5568" }}>
                                                {authorRole} · VAJRAX
                                            </div>
                                        </div>
                                    </div>
                                    <div className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-right" style={{ color: "#4a5568" }}>
                                        POSTED {fmtDateTime(notice.created_at)}
                                    </div>
                                </div>
                            </div>

                            {/* Bottom aurora divider */}
                            <div
                                className="h-px w-full"
                                style={{
                                    background: "linear-gradient(90deg,transparent,rgba(0,229,255,0.5),#5eead4 50%,rgba(245,158,11,0.4),transparent)",
                                }}
                            />
                        </div>

                        {/* Body card */}
                        <div
                            className="rounded-sm p-5 sm:p-7 mb-5"
                            style={{ background: "#0d1117", border: "1px solid rgba(0,229,255,0.12)" }}
                        >
                            {/* Prose styles applied via className on the wrapper */}
                            <div
                                className="notice-prose"
                                dangerouslySetInnerHTML={{ __html: notice.body }}
                            />

                            {/* CTA Buttons */}
                            {((notice.ctas as NoticeCTA[])?.length > 0 || (notice.cta_label && notice.cta_url)) && (
                                <div className="mt-8 pt-6 flex flex-wrap gap-3 relative z-0" style={{ borderTop: "1px solid rgba(0,229,255,0.10)" }}>
                                    {((notice.ctas as NoticeCTA[])?.length > 0
                                        ? (notice.ctas as NoticeCTA[])
                                        : [{ label: notice.cta_label!, url: notice.cta_url! }]
                                    ).map((cta, i) => (
                                        <a
                                            key={i}
                                            href={cta.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => handleCtaClick(e, cta.url)}
                                            className="btn-3d-cyan shrink-0"
                                            style={{ textDecoration: 'none' }}
                                        >
                                            <div className="btn-top flex items-center justify-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] font-bold">
                                                <span>{CTA_LABEL_MAP[cta.label as keyof typeof CTA_LABEL_MAP] ?? cta.label}</span>
                                                <ExternalLink size={14} />
                                            </div>
                                            <div className="btn-bottom" />
                                            <div className="btn-base" />
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Right: sidebar panels ── */}
                    <div className="flex flex-col gap-4">
                        {/* Share */}
                        <div
                            className="rounded-sm overflow-hidden"
                            style={{ background: "#0d1117", border: "1px solid rgba(0,229,255,0.12)" }}
                        >
                            <div
                                className="px-4 py-2.5 border-b font-mono text-[10px] uppercase tracking-[0.2em]"
                                style={{ borderColor: "rgba(0,229,255,0.12)", color: "#f0f4ff" }}
                            >
                                SHARE NOTICE
                            </div>
                            <div className="px-4 py-4">
                                <button
                                    onClick={handleCopy}
                                    className={`w-full h-11 inline-flex items-center justify-center gap-2 rounded-md font-mono text-[12px] uppercase tracking-[0.14em] font-semibold transition-all duration-200 border ${
                                        copied
                                            ? "border-[rgba(34,197,94,0.4)] bg-[rgba(34,197,94,0.10)] text-[#22c55e] [text-shadow:0_0_20px_rgba(34,197,94,0.4)]"
                                            : "border-[rgba(0,229,255,0.2)] bg-[rgba(0,229,255,0.08)] text-[#00e5ff] [text-shadow:0_0_20px_rgba(0,229,255,0.4)] hover:border-[rgba(0,229,255,0.6)] hover:bg-[linear-gradient(to_bottom,rgba(0,229,255,0.15),rgba(0,229,255,0.25),rgba(0,229,255,0.4))] hover:shadow-[0_6px_rgba(0,229,255,0.6)] hover:-translate-y-[6px] active:translate-y-[2px] active:shadow-none"
                                    }`}
                                >
                                    {copied ? <><Check size={14} /> COPIED!</> : <><Share2 size={14} /> COPY LINK</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
