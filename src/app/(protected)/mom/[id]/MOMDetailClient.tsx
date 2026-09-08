"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
    ArrowLeft, Calendar, Users, Tag, Pencil, Trash2,
    CheckSquare, Link2, ImageIcon, ClipboardList,
    ExternalLink, ChevronLeft, ChevronRight, X, Maximize2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import dynamic from "next/dynamic";
import MOMComments from "@/components/mom/MOMComments";
import { Tables } from "@/types/database";

const MOMEditor = dynamic(() => import("@/components/mom/MOMEditor"), { ssr: false });

// ─── Circuit-trace decoration (same as Innovators page) ───
type CircuitTraceProps = { which?: number; className?: string; style?: React.CSSProperties };
function CircuitTrace({ which = 0, className = "", style }: CircuitTraceProps) {
    const paths = [
        {
            viewBox: "0 0 600 400",
            d: ["M 0 200 L 120 200 L 140 220 L 280 220 L 300 240 L 600 240","M 80 200 L 80 60  M 240 220 L 240 100","M 380 240 L 380 360"],
            nodes: [[120,200],[280,220],[80,60],[240,100],[380,360]] as [number,number][],
        },
        {
            viewBox: "0 0 500 400",
            d: ["M 500 80 L 380 80 L 360 100 L 220 100 L 200 120 L 80 120 L 0 120","M 360 100 L 360 240","M 200 120 L 200 300 L 0 300","M 100 120 L 100 60"],
            nodes: [[380,80],[220,100],[80,120],[360,240],[200,300],[100,60]] as [number,number][],
        },
        {
            viewBox: "0 0 400 300",
            d: ["M 0 50 L 80 50 L 90 60 L 200 60 L 210 70 L 320 70 L 330 80 L 400 80","M 0 200 L 120 200 L 130 210 L 280 210 L 290 220 L 400 220","M 200 60 L 200 200 M 290 220 L 290 80"],
            nodes: [[80,50],[200,60],[320,70],[120,200],[280,210]] as [number,number][],
        },
    ];
    const p = paths[which % paths.length];
    return (
        <svg className={className} style={style} viewBox={p.viewBox} preserveAspectRatio="none" fill="none" stroke="#00e5ff" strokeWidth="1.2">
            {p.d.map((d, i) => <path key={i} d={d} />)}
            {p.nodes.map(([cx, cy], i) => <circle key={i} cx={cx} cy={cy} r="2.5" fill="#00e5ff" />)}
        </svg>
    );
}

type MOM = Tables<"meeting_minutes">;
type Profile = Pick<Tables<"profiles">, "id" | "display_name" | "avatar_url" | "role">;

const CAN_WRITE_ROLES = ["faculty", "president", "vice_president"];

const TYPE_COLORS: Record<string, { fg: string; bg: string; bd: string }> = {
    "General Body Meeting": { fg: "#00e5ff", bg: "rgba(0,229,255,0.08)", bd: "rgba(0,229,255,0.28)" },
    "Faculty Review":       { fg: "#f59e0b", bg: "rgba(245,158,11,0.08)", bd: "rgba(245,158,11,0.28)" },
    "Core Team":            { fg: "#a78bfa", bg: "rgba(167,139,250,0.08)", bd: "rgba(167,139,250,0.28)" },
    "Emergency":            { fg: "#ef4444", bg: "rgba(239,68,68,0.08)", bd: "rgba(239,68,68,0.28)" },
    "Workshop Debrief":     { fg: "#22c55e", bg: "rgba(34,197,94,0.08)", bd: "rgba(34,197,94,0.28)" },
};

function getTypeColor(type: string) {
    return TYPE_COLORS[type] ?? TYPE_COLORS["General Body Meeting"];
}

function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-GB", {
        weekday: "long", day: "2-digit", month: "long", year: "numeric"
    });
}

function getInitials(name: string) {
    return name.split(" ").map((w) => w[0] ?? "").join("").slice(0, 2).toUpperCase();
}

/* ─── Lightbox Modal (Gallery-styled card) ────────────────────────── */

interface MOMLightboxModalProps {
    photos: { url: string; title?: string }[];
    initialIndex: number;
    momTitle: string;
    meetingDate: string;
    onClose: () => void;
}

function MOMLightboxModal({
    photos,
    initialIndex,
    momTitle,
    meetingDate,
    onClose,
}: MOMLightboxModalProps) {
    const [index, setIndex] = useState(initialIndex);
    const [imgAspect, setImgAspect] = useState<number | null>(null);

    const currentPhoto = photos[index];

    const onNav = (delta: number) => {
        setIndex((prev) => (prev + delta + photos.length) % photos.length);
    };

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
            if (e.key === "ArrowLeft") onNav(-1);
            if (e.key === "ArrowRight") onNav(1);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [photos.length]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "";
        };
    }, []);

    useEffect(() => {
        setImgAspect(null);
        const url = currentPhoto?.url;
        if (!url) return;
        const probe = new window.Image();
        probe.onload = () => {
            if (probe.naturalWidth && probe.naturalHeight) {
                setImgAspect(probe.naturalWidth / probe.naturalHeight);
            }
        };
        probe.src = url;
        return () => {
            probe.onload = null;
        };
    }, [currentPhoto?.url]);

    if (!currentPhoto) return null;

    const clampedAspect = imgAspect ? Math.min(Math.max(imgAspect, 0.6), 2.4) : null;

    return (
        <div className="fixed inset-0 z-[110]" style={{ animation: "fadeIn 160ms ease-out" }}>
            {/* Backdrop */}
            <div
                className="absolute inset-0 backdrop-blur-md cursor-pointer"
                style={{ background: "rgba(7,9,15,0.92)" }}
                onClick={onClose}
            />

            {/* Content zone — mirrors sidebar offset */}
            <div className="absolute inset-0 lg:left-[260px] [.sidebar-collapsed_&]:lg:left-[68px] transition-[left] duration-300 pointer-events-none">
                {/* Nav arrows */}
                {photos.length > 1 && (
                    <>
                        <button
                            onClick={() => onNav(-1)}
                            aria-label="previous photo"
                            className="absolute left-4 top-1/2 -translate-y-1/2 grid place-items-center w-11 h-11 border border-edge rounded-sm text-fg2 hover:text-cyan2 hover:border-cyan2/50 backdrop-blur-sm z-20 transition-colors pointer-events-auto cursor-pointer"
                            style={{ background: "rgba(7,9,15,0.6)" }}
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <button
                            onClick={() => onNav(1)}
                            aria-label="next photo"
                            className="absolute right-4 top-1/2 -translate-y-1/2 grid place-items-center w-11 h-11 border border-edge rounded-sm text-fg2 hover:text-cyan2 hover:border-cyan2/50 backdrop-blur-sm z-20 transition-colors pointer-events-auto cursor-pointer"
                            style={{ background: "rgba(7,9,15,0.6)" }}
                        >
                            <ChevronRight size={18} />
                        </button>
                    </>
                )}

                {/* Main panel */}
                <div className="absolute inset-0 px-4 sm:px-16 py-8 flex items-center justify-center pointer-events-none">
                    <div
                        className="relative w-full border border-edgeStrong rounded-md shadow-2xl corner-ticks overflow-hidden pointer-events-auto"
                        style={{
                            background: "rgba(7,9,15,0.98)",
                            animation: "fadeIn 220ms ease-out",
                            maxHeight: "calc(100vh - 4rem)",
                            maxWidth: clampedAspect
                                ? `min(56rem, calc(72vh * ${clampedAspect}))`
                                : "56rem",
                        }}
                    >
                        <span className="ct-tr" />
                        <span className="ct-bl" />

                        {/* Image area */}
                        <div
                            className="relative overflow-hidden"
                            style={{
                                aspectRatio: clampedAspect ? String(clampedAspect) : "16/9",
                            }}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={currentPhoto.url}
                                alt={currentPhoto.title || "Meeting Attachment"}
                                className="w-full h-full object-cover"
                            />

                            {/* Gradient overlay */}
                            <div
                                className="absolute inset-0 pointer-events-none"
                                style={{
                                    background:
                                        "linear-gradient(to bottom, rgba(7,9,15,0.10) 0%, rgba(7,9,15,0.30) 45%, rgba(7,9,15,0.82) 100%)",
                                }}
                            />

                            {/* Diagonal hatch */}
                            <div
                                className="absolute inset-0 pointer-events-none"
                                style={{
                                    backgroundImage:
                                        "repeating-linear-gradient(45deg, rgba(0,229,255,0.06) 0px, rgba(0,229,255,0.06) 1px, transparent 1px, transparent 14px)",
                                    opacity: 0.6,
                                }}
                            />

                            {/* Corner brackets */}
                            <svg
                                className="absolute inset-0 w-full h-full pointer-events-none"
                                viewBox="0 0 100 100"
                                preserveAspectRatio="none"
                            >
                                <path d="M2 11 L2 2 L11 2" stroke="#00e5ff" strokeWidth="0.6" fill="none" opacity="0.65" />
                                <path d="M89 2 L98 2 L98 11" stroke="#00e5ff" strokeWidth="0.6" fill="none" opacity="0.65" />
                                <path d="M2 89 L2 98 L11 98" stroke="#00e5ff" strokeWidth="0.6" fill="none" opacity="0.65" />
                                <path d="M89 98 L98 98 L98 89" stroke="#00e5ff" strokeWidth="0.6" fill="none" opacity="0.65" />
                            </svg>

                            {/* Circuit path decoration */}
                            <svg
                                className="absolute inset-0 w-full h-full pointer-events-none"
                                viewBox="0 0 800 350"
                                preserveAspectRatio="none"
                            >
                                <path d="M0 70 L55 70 L75 90 L130 90" stroke="rgba(0,229,255,0.22)" strokeWidth="1" fill="none" />
                                <circle cx="130" cy="90" r="2.5" fill="rgba(0,229,255,0.55)" />
                                <circle cx="55"  cy="70" r="1.5" fill="rgba(0,229,255,0.35)" />
                                <path d="M800 280 L745 280 L725 260 L670 260" stroke="rgba(0,229,255,0.22)" strokeWidth="1" fill="none" />
                                <circle cx="670" cy="260" r="2.5" fill="rgba(0,229,255,0.55)" />
                                <circle cx="745" cy="280" r="1.5" fill="rgba(0,229,255,0.35)" />
                                <path d="M195 0 L195 38 L215 58" stroke="rgba(0,229,255,0.15)" strokeWidth="1" fill="none" />
                                <circle cx="215" cy="58" r="2" fill="rgba(0,229,255,0.45)" />
                                <path d="M605 350 L605 312 L585 292" stroke="rgba(0,229,255,0.15)" strokeWidth="1" fill="none" />
                                <circle cx="585" cy="292" r="2" fill="rgba(0,229,255,0.45)" />
                            </svg>

                            {/* Top-right controls */}
                            <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                                <a
                                    href={currentPhoto.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="grid place-items-center w-8 h-8 border border-edge rounded-sm text-fg2 hover:text-cyan2 hover:border-cyan2/50 transition-colors backdrop-blur-sm"
                                    style={{ background: "rgba(7,9,15,0.75)" }}
                                    title="Open full resolution in new tab"
                                >
                                    <ExternalLink size={12} />
                                </a>
                                <button
                                    onClick={onClose}
                                    className="grid place-items-center w-8 h-8 border border-edge rounded-sm text-fg2 hover:text-fg hover:border-cyan2/50 transition-colors backdrop-blur-sm cursor-pointer"
                                    style={{ background: "rgba(7,9,15,0.75)" }}
                                >
                                    <X size={13} />
                                </button>
                            </div>

                            {/* Top-left: item counter */}
                            <div
                                className="absolute top-3 left-3 inline-flex items-center gap-1.5 h-7 px-2.5 rounded-sm border border-edge font-mono text-[10px] tabular-nums backdrop-blur-sm z-10"
                                style={{ background: "rgba(7,9,15,0.75)", color: "rgba(0,229,255,0.8)" }}
                            >
                                <span style={{ color: "rgba(0,229,255,0.4)" }}>//</span>
                                {String(index + 1).padStart(2, "0")}
                                <span className="text-fg3">·</span>
                                {String(photos.length).padStart(2, "0")}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function MOMDetailClient({
    mom,
    author,
    currentUserId,
    currentUserRole,
}: {
    mom: MOM;
    author: Profile | null;
    currentUserId: string;
    currentUserRole: string;
}) {
    const router = useRouter();
    const supabase = createClient();
    const tc = getTypeColor(mom.meeting_type);
    const canWrite = CAN_WRITE_ROLES.includes(currentUserRole);

    const [deleting, setDeleting] = useState(false);
    const [selectedPhotoIdx, setSelectedPhotoIdx] = useState<number | null>(null);

    const photoResources = (mom.resources ?? []).filter((r) => r.type === "photo");
    const linkResources = (mom.resources ?? []).filter((r) => r.type === "url");

    // Drift animation for circuit traces
    const [t, setT] = useState(0);
    useEffect(() => {
        let raf: number;
        const start = performance.now();
        const tick = () => { setT((performance.now() - start) / 1000); raf = requestAnimationFrame(tick); };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, []);
    const drift = (k: number) =>
        `translate(${Math.sin(t * 0.08 + k) * 6}px, ${Math.cos(t * 0.07 + k * 1.3) * 4}px)`;

    const handleDelete = async () => {
        if (!confirm("Delete this MOM? This cannot be undone.")) return;
        setDeleting(true);
        await supabase.from("meeting_minutes").delete().eq("id", mom.id);
        router.push("/mom");
    };

    return (
        <div className="relative min-h-screen bg-[#07090f] overflow-hidden pt-[calc(var(--nav-height,0px)+2.5rem)] pb-24">
            {/* Animated grid with radial fade mask */}
            <div
                className="absolute inset-0 pointer-events-none animate-grid-pan"
                style={{
                    backgroundImage:
                        "linear-gradient(rgba(0,229,255,0.04) 1px,transparent 1px)," +
                        "linear-gradient(90deg, rgba(0,229,255,0.04) 1px,transparent 1px)",
                    backgroundSize: "40px 40px",
                    maskImage: "radial-gradient(ellipse 80% 70% at 50% 50%, #000 30%, transparent 90%)",
                    WebkitMaskImage: "radial-gradient(ellipse 80% 70% at 50% 50%, #000 30%, transparent 90%)",
                }}
            />
            {/* Radial cyan glows */}
            <div className="absolute -bottom-32 -left-32 w-[640px] h-[640px] pointer-events-none z-0"
                style={{ background: "radial-gradient(circle, rgba(0,229,255,0.13) 0%, transparent 70%)" }} />
            <div className="absolute -top-40 -right-40 w-[560px] h-[560px] pointer-events-none z-0"
                style={{ background: "radial-gradient(circle, rgba(0,229,255,0.08) 0%, transparent 70%)" }} />
            {/* Scanlines */}
            <div className="absolute inset-0 pointer-events-none scanline animate-scanline-pan opacity-50 z-0" />
            {/* Drifting circuit-trace SVG decorations */}
            <div className="absolute top-[6%] right-[-4%] w-[42vw] h-[40vh] pointer-events-none z-0" style={{ opacity: 0.06, transform: drift(0) }}>
                <CircuitTrace which={0} className="w-full h-full" />
            </div>
            <div className="absolute bottom-[12%] left-[-4%] w-[36vw] h-[44vh] pointer-events-none z-0" style={{ opacity: 0.06, transform: drift(2) }}>
                <CircuitTrace which={1} className="w-full h-full" />
            </div>
            <div className="absolute top-[44%] right-[10%] w-[26vw] h-[28vh] pointer-events-none z-0" style={{ opacity: 0.05, transform: drift(4) }}>
                <CircuitTrace which={2} className="w-full h-full" />
            </div>

            <div className="relative z-10 max-w-[860px] mx-auto px-4 sm:px-8">
                {/* ── Back + Actions ── */}
                <div className="flex items-center justify-between mb-8 gap-4">
                    <button
                        type="button"
                        onClick={() => router.push("/mom")}
                        className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] transition-colors"
                        style={{ color: "#4a5568" }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = "#00e5ff"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = "#4a5568"; }}
                    >
                        <ArrowLeft size={13} /> All Minutes
                    </button>
                    {canWrite && (
                        <div className="flex items-center gap-2">
                            <Link
                                href={`/mom/${mom.id}/edit`}
                                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-sm font-mono text-[10px] uppercase tracking-[0.12em] transition-colors"
                                style={{ border: "1px solid rgba(0,229,255,0.25)", color: "#8b9ab0" }}
                                onMouseEnter={(e) => { e.currentTarget.style.color = "#f0f4ff"; e.currentTarget.style.borderColor = "rgba(0,229,255,0.5)"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.color = "#8b9ab0"; e.currentTarget.style.borderColor = "rgba(0,229,255,0.25)"; }}
                            >
                                <Pencil size={11} /> Edit
                            </Link>
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={deleting}
                                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-sm font-mono text-[10px] uppercase tracking-[0.12em] transition-colors disabled:opacity-50"
                                style={{ border: "1px solid rgba(239,68,68,0.28)", color: "#ef4444" }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                            >
                                <Trash2 size={11} /> {deleting ? "Deleting…" : "Delete"}
                            </button>
                        </div>
                    )}
                </div>

                {/* ── Hero card ── */}
                <div
                    className="rounded-sm mb-6 overflow-hidden"
                    style={{ border: "1px solid rgba(0,229,255,0.14)", background: "#0d1117" }}
                >
                    {/* Glowing top line */}
                    <div className="h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${tc.fg}55, transparent)` }} />

                    <div className="px-6 py-6">
                        {/* Type + Date */}
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                            <span
                                className="inline-flex items-center gap-1 h-[20px] px-2.5 rounded-sm font-mono text-[9px] uppercase tracking-[0.14em]"
                                style={{ color: tc.fg, background: tc.bg, border: `1px solid ${tc.bd}` }}
                            >
                                <Tag size={9} /> {mom.meeting_type}
                            </span>
                            <span className="font-mono text-[11px] text-[#4a5568] flex items-center gap-1">
                                <Calendar size={11} /> {fmtDate(mom.meeting_date)}
                            </span>
                            {mom.attendees != null && (
                                <span className="font-mono text-[11px] text-[#4a5568] flex items-center gap-1">
                                    <Users size={11} /> {mom.attendees} attendees
                                </span>
                            )}
                        </div>

                        <h1 className="font-sans font-extrabold text-[#f0f4ff] text-[26px] sm:text-[30px] tracking-tight leading-tight mb-4">
                            {mom.title}
                        </h1>

                        {/* Author */}
                        {author && (
                            <div className="flex items-center gap-2.5">
                                <span
                                    className="relative rounded-full overflow-hidden w-8 h-8 shrink-0"
                                    style={{ border: "1px solid rgba(0,229,255,0.35)" }}
                                >
                                    {author.avatar_url ? (
                                        <Image src={author.avatar_url} alt={author.display_name} width={32} height={32} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="grid place-items-center w-full h-full font-mono text-[10px]" style={{ background: "rgba(0,229,255,0.08)", color: "#00e5ff" }}>
                                            {getInitials(author.display_name)}
                                        </span>
                                    )}
                                </span>
                                <div>
                                    <div className="text-[12.5px] font-semibold text-[#f0f4ff]">{author.display_name}</div>
                                    <div className="font-mono text-[10px] text-[#00e5ff] uppercase tracking-[0.14em]">
                                        {author.role.replace("_", " ")}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Minutes Body ── */}
                <section
                    className="rounded-sm mb-5 px-6 py-5"
                    style={{ border: "1px solid rgba(0,229,255,0.10)", background: "#0d1117" }}
                >
                    <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#4a5568] mb-4 flex items-center gap-2">
                        <ClipboardList size={11} style={{ color: "#00e5ff" }} /> Minutes
                    </div>
                    <MOMEditor content={mom.content} onChange={() => {}} readOnly />
                </section>

                {/* ── Action Items ── */}
                {mom.action_items && mom.action_items.length > 0 && (
                    <section
                        className="rounded-sm mb-5 px-6 py-5"
                        style={{ border: "1px solid rgba(0,229,255,0.10)", background: "#0d1117" }}
                    >
                        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#4a5568] mb-4 flex items-center gap-2">
                            <CheckSquare size={11} style={{ color: "#22c55e" }} /> Action Items
                        </div>
                        <div className="space-y-2">
                            {mom.action_items.map((item, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-start gap-3 rounded-sm px-3 py-2.5"
                                    style={{ border: "1px solid rgba(0,229,255,0.08)", background: "#07090f" }}
                                >
                                    <span
                                        className="shrink-0 font-mono text-[10px] w-5 h-5 grid place-items-center rounded-sm mt-0.5"
                                        style={{ background: "rgba(34,197,94,0.10)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.25)" }}
                                    >
                                        {idx + 1}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13.5px] text-[#f0f4ff] leading-snug">{item.task}</p>
                                        <div className="flex flex-wrap gap-3 mt-1">
                                            {item.assignee && (
                                                <span className="font-mono text-[10px] text-[#8b9ab0]">
                                                    → {item.assignee}
                                                </span>
                                            )}
                                            {item.due_date && (
                                                <span className="font-mono text-[10px] text-[#f59e0b]">
                                                    Due: {new Date(item.due_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* ── Resources ── */}
                {mom.resources && mom.resources.length > 0 && (
                    <section
                        className="rounded-sm mb-5 px-6 py-5"
                        style={{ border: "1px solid rgba(0,229,255,0.10)", background: "#0d1117" }}
                    >
                        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#4a5568] mb-4 flex items-center gap-2">
                            <ImageIcon size={11} style={{ color: "#a78bfa" }} /> Resources
                        </div>

                        {/* Photos */}
                        {photoResources.length > 0 && (
                            <div className="mb-4">
                                <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#4a5568] mb-2">Photos</div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                    {photoResources.map((r, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => setSelectedPhotoIdx(idx)}
                                            className="group relative aspect-video block rounded-sm overflow-hidden text-left w-full cursor-pointer transition-all border border-edgeStrong hover:border-cyan2/50"
                                            style={{ background: "#07090f" }}
                                        >
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={r.url}
                                                alt={r.title ?? `Photo ${idx + 1}`}
                                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                            />
                                            <div className="absolute inset-0 bg-cyan2/0 group-hover:bg-cyan2/10 transition-colors pointer-events-none" />

                                            {/* Expand icon on hover */}
                                            <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-sm bg-[#07090f]/80 backdrop-blur-sm border border-edgeStrong grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity text-cyan2 pointer-events-none">
                                                <Maximize2 size={11} />
                                            </div>

                                            {r.title && (
                                                <div
                                                    className="absolute bottom-0 left-0 right-0 px-2.5 py-1 text-[11px] text-[#f0f4ff] truncate font-sans"
                                                    style={{ background: "rgba(7,9,15,0.85)", borderTop: "1px solid rgba(0,229,255,0.08)" }}
                                                >
                                                    {r.title}
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Links */}
                        {linkResources.length > 0 && (
                            <div>
                                <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#4a5568] mb-2">Links</div>
                                <div className="space-y-1.5">
                                    {linkResources.map((r, idx) => (
                                        <a
                                            key={idx}
                                            href={r.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex items-center gap-2.5 rounded-sm px-3 py-2 transition-colors group"
                                            style={{ border: "1px solid rgba(0,229,255,0.10)", background: "#07090f" }}
                                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(0,229,255,0.3)"; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(0,229,255,0.10)"; }}
                                        >
                                            <Link2 size={12} style={{ color: "#00e5ff" }} className="shrink-0" />
                                            <span className="text-[13px] text-[#c8d3e0] group-hover:text-[#f0f4ff] transition-colors flex-1 min-w-0 truncate">
                                                {r.title || r.url}
                                            </span>
                                            <ExternalLink size={11} style={{ color: "#4a5568" }} className="shrink-0" />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </section>
                )}

                {/* ── Comments ── */}
                <section
                    className="rounded-sm mb-5 px-6 py-5"
                    style={{ border: "1px solid rgba(0,229,255,0.10)", background: "#0d1117" }}
                >
                    <MOMComments
                        momId={mom.id}
                        currentUserId={currentUserId}
                        currentUserRole={currentUserRole}
                    />
                </section>
            </div>

            {/* ── Photo Lightbox Modal ── */}
            {selectedPhotoIdx !== null && photoResources.length > 0 && (
                <MOMLightboxModal
                    photos={photoResources}
                    initialIndex={selectedPhotoIdx}
                    momTitle={mom.title}
                    meetingDate={mom.meeting_date}
                    onClose={() => setSelectedPhotoIdx(null)}
                />
            )}
        </div>
    );
}
