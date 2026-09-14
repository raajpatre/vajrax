"use client";

import Link from "next/link";
import { Pin, ArrowRight, Clock, ExternalLink } from "lucide-react";
import { useState } from "react";
import type { NoticeRow } from "@/actions/notice-board";
import type { NoticeCTA } from "@/types/database";

function relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}d ago`;
    return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
}

function fmtExpiry(iso: string): string {
    return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
}

function isExpiringSoon(iso: string): boolean {
    return new Date(iso).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000;
}

const CTA_LABEL_MAP: Record<string, string> = {
    Download: "DOWNLOAD",
    See: "SEE",
    Submit: "SUBMIT",
    Apply: "APPLY",
    Register: "REGISTER",
    "More Info": "MORE INFO",
};

interface NoticeCardProps {
    notice: NoticeRow;
}

export default function NoticeCard({ notice }: NoticeCardProps) {
    const [hovered, setHovered] = useState(false);

    const isPinned = notice.is_pinned;
    const accentColor = isPinned ? "#f59e0b" : "#00e5ff";
    const accentRgb = isPinned ? "245,158,11" : "0,229,255";

    // Short preview of body — strip HTML
    const preview = notice.body
        .replace(/<[^>]+>/g, " ") // replace HTML tags with space
        .replace(/\s+/g, " ") // collapse spaces
        .trim()
        .slice(0, 160);

    const authorName = notice.author?.display_name ?? "VajraX";
    const authorRole = (notice.author?.role ?? "member").replace(/_/g, " ").toUpperCase();

    return (
        <Link
            href={`/notice-board/${notice.id}`}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className="relative block rounded-sm overflow-hidden transition-all duration-200"
            style={{
                background: "#0d1117",
                border: `1px solid rgba(${accentRgb},${hovered ? "0.35" : "0.15"})`,
                borderLeft: `3px solid ${accentColor}`,
                transform: hovered ? "translateY(-2px)" : "translateY(0)",
                boxShadow: hovered
                    ? `0 8px 32px -8px rgba(${accentRgb},0.25), 0 0 0 1px rgba(${accentRgb},0.1)`
                    : "none",
            }}
        >


            <div className="px-5 pt-4 pb-5">
                {/* Top badge row */}
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                    {notice.expires_at && isExpiringSoon(notice.expires_at) && (
                        <span
                            className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.14em] px-2 h-5 rounded-sm border"
                            style={{
                                color: "#f59e0b",
                                background: "rgba(245,158,11,0.08)",
                                borderColor: "rgba(245,158,11,0.28)",
                            }}
                        >
                            <Clock size={8} />
                            EXPIRES {fmtExpiry(notice.expires_at)}
                        </span>
                    )}
                </div>

                {/* Title */}
                <h3
                    className="font-sans font-bold tracking-tight text-[16px] sm:text-[17px] leading-snug mb-2"
                    style={{ color: "#f0f4ff" }}
                >
                    {notice.title}
                </h3>

                {/* Body preview */}
                <p className="text-[13px] leading-relaxed line-clamp-2" style={{ color: "#8b9ab0" }}>
                    {preview}{preview.length >= 160 ? "…" : ""}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between gap-3 mt-4 flex-wrap">
                    <div className="flex items-center gap-2 min-w-0">
                        <span
                            className="font-mono text-[10.5px] tracking-tight font-medium truncate"
                            style={{ color: "#f0f4ff" }}
                        >
                            {authorName}
                        </span>
                        <span className="h-3 w-px shrink-0" style={{ background: "rgba(0,229,255,0.18)" }} />
                        <span
                            className="font-mono text-[10px] uppercase tracking-[0.12em] truncate"
                            style={{ color: "#4a5568" }}
                        >
                            {authorRole}
                        </span>
                        <span className="h-3 w-px shrink-0 hidden sm:block" style={{ background: "rgba(0,229,255,0.18)" }} />
                        <span
                            className="font-mono text-[10px] uppercase tracking-[0.12em] hidden sm:block"
                            style={{ color: "#4a5568" }}
                        >
                            {relativeTime(notice.created_at)}
                        </span>
                    </div>
                    <span
                        className="inline-flex items-center gap-1 font-mono text-[10.5px] uppercase tracking-[0.14em] shrink-0 transition-colors duration-150"
                        style={{ color: hovered ? accentColor : "#4a5568" }}
                    >
                        READ MORE <ArrowRight size={11} />
                    </span>
                </div>
            </div>
        </Link>
    );
}
