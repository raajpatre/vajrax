"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Radio, Clock } from "lucide-react";
import type { NoticeRow } from "@/actions/notice-board";
import NoticeCard from "./NoticeCard";

function relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
}

interface NoticeBoardClientProps {
    notices: NoticeRow[];
}

export default function NoticeBoardClient({ notices }: NoticeBoardClientProps) {
    const [shown, setShown] = useState(false);
    const headerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const id = setTimeout(() => setShown(true), 60);
        return () => clearTimeout(id);
    }, []);

    const stagger = (delay: number): React.CSSProperties => ({
        opacity: shown ? 1 : 0,
        transform: shown ? "translateY(0)" : "translateY(12px)",
        transition: [
            `opacity 600ms ${delay}ms cubic-bezier(.2,.7,.2,1)`,
            `transform 600ms ${delay}ms cubic-bezier(.2,.7,.2,1)`,
        ].join(", "),
    });

    const pinned = notices.filter((n) => n.is_pinned);
    const regular = notices.filter((n) => !n.is_pinned);
    const count = notices.length;

    return (
        <div className="min-h-screen relative" style={{ background: "#07090f" }}>
            {/* Background grid */}
            <div
                className="fixed inset-0 pointer-events-none animate-grid-pan"
                style={{
                    backgroundImage:
                        "linear-gradient(rgba(0,229,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,229,255,0.03) 1px,transparent 1px)",
                    backgroundSize: "40px 40px",
                }}
            />
            {/* Scanlines */}
            <div className="fixed inset-0 pointer-events-none scanline animate-scanline-pan opacity-40" />
            {/* Ambient glow */}
            <div
                className="fixed -bottom-40 -left-40 w-[600px] h-[600px] pointer-events-none"
                style={{ background: "radial-gradient(circle,rgba(0,229,255,0.07) 0%,transparent 70%)" }}
            />
            <div
                className="fixed top-0 right-0 w-[400px] h-[400px] pointer-events-none"
                style={{ background: "radial-gradient(circle,rgba(167,139,250,0.04) 0%,transparent 70%)" }}
            />

            <div className="relative max-w-7xl mx-auto px-4 sm:px-8 pt-[calc(var(--nav-height)+2.5rem)] pb-24">
                {/* ── Header ── */}
                <div ref={headerRef} className="mb-10 sm:mb-12">

                    <h1
                        className="font-sans font-black tracking-tight leading-none mb-3"
                        style={{
                            fontSize: "clamp(30px, 6vw, 56px)",
                            color: "#f0f4ff",
                            textShadow: "0 0 40px rgba(0,229,255,0.18)",
                            ...stagger(80),
                        }}
                    >
                        Notice Board
                    </h1>



                    {/* Aurora divider */}
                    <div
                        className="mt-6 h-px w-full pointer-events-none"
                        style={{
                            background: "linear-gradient(90deg,transparent 0%,rgba(0,229,255,0) 5%,rgba(0,229,255,0.6) 30%,#5eead4 50%,rgba(245,158,11,0.5) 72%,rgba(0,229,255,0) 95%,transparent 100%)",
                            boxShadow: "0 0 16px rgba(0,229,255,0.25)",
                        }}
                    />
                </div>

                {/* ── Main layout: feed + sidebar ── */}
                <div className="flex gap-6 xl:gap-8 items-start">
                    {/* ── Notice feed ── */}
                    <div className="flex-1 min-w-0">
                        {notices.length === 0 ? (
                            /* Empty state */
                            <div
                                className="rounded-sm text-center py-20 px-6"
                                style={{ background: "#0d1117", border: "1px solid rgba(0,229,255,0.12)" }}
                            >
                                <Radio size={32} style={{ color: "#4a5568", margin: "0 auto 16px" }} />
                                <div className="font-mono text-[12px] uppercase tracking-[0.24em]" style={{ color: "#4a5568" }}>
                                    // NO ACTIVE TRANSMISSIONS · BOARD CLEAR
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Pinned notices */}
                                {pinned.length > 0 && (
                                    <div className="mb-6" style={stagger(240)}>
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: "#f59e0b" }}>
                                                ⬡ PINNED
                                            </span>
                                            <span className="flex-1 h-px" style={{ background: "rgba(245,158,11,0.18)" }} />
                                        </div>
                                        <div className="flex flex-col gap-3">
                                            {pinned.map((n) => <NoticeCard key={n.id} notice={n} />)}
                                        </div>
                                    </div>
                                )}

                                {/* Regular notices */}
                                {regular.length > 0 && (
                                    <div style={stagger(pinned.length > 0 ? 320 : 240)}>
                                        {pinned.length > 0 && (
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: "#8b9ab0" }}>
                                                    // ALL NOTICES
                                                </span>
                                                <span className="flex-1 h-px" style={{ background: "rgba(0,229,255,0.1)" }} />
                                            </div>
                                        )}
                                        <div className="flex flex-col gap-3">
                                            {regular.map((n) => <NoticeCard key={n.id} notice={n} />)}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* ── Sidebar: Transmission Log (desktop only) ── */}
                    {notices.length > 0 && (
                        <div
                            className="hidden xl:block w-64 shrink-0 sticky top-24 rounded-sm overflow-hidden"
                            style={{ background: "#0d1117", border: "1px solid rgba(0,229,255,0.12)" }}
                        >
                            {/* Header */}
                            <div
                                className="flex items-center gap-2 px-4 py-3 border-b"
                                style={{ borderColor: "rgba(0,229,255,0.12)" }}
                            >
                                <Radio size={12} style={{ color: "#00e5ff" }} />
                                <span className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: "#f0f4ff" }}>
                                    TRANSMISSION LOG
                                </span>
                            </div>

                            <div className="divide-y" style={{ borderColor: "rgba(0,229,255,0.08)" }}>
                                {notices.slice(0, 12).map((n) => (
                                    <Link
                                        key={n.id}
                                        href={`/notice-board/${n.id}`}
                                        className="flex items-start gap-2 px-4 py-2.5 transition-colors group"
                                        style={{ borderBottom: "1px solid rgba(0,229,255,0.07)" }}
                                        onMouseOver={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(0,229,255,0.03)"; }}
                                        onMouseOut={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                                    >
                                        <span
                                            className="mt-1 w-1 h-1 rounded-full shrink-0"
                                            style={{
                                                background: n.is_pinned ? "#f59e0b" : "#00e5ff",
                                                boxShadow: n.is_pinned ? "0 0 6px rgba(245,158,11,0.6)" : "0 0 6px rgba(0,229,255,0.6)",
                                            }}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div
                                                className="font-mono text-[11px] leading-snug line-clamp-2 transition-colors group-hover:text-[#f0f4ff]"
                                                style={{ color: "#8b9ab0" }}
                                            >
                                                {n.title}
                                            </div>
                                            <div className="flex items-center gap-1 mt-0.5">
                                                <Clock size={8} style={{ color: "#4a5568" }} />
                                                <span className="font-mono text-[9.5px]" style={{ color: "#4a5568" }}>
                                                    {relativeTime(n.created_at)}
                                                </span>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>

                            {notices.length > 12 && (
                                <div className="px-4 py-3 border-t" style={{ borderColor: "rgba(0,229,255,0.12)" }}>
                                    <span className="font-mono text-[10px]" style={{ color: "#4a5568" }}>
                                        + {notices.length - 12} more
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
