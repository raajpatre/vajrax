"use client";

import { useState, useEffect, useRef, useLayoutEffect, useMemo } from "react";
import Link from "next/link";
import {
    Search, Plus, Calendar, Users, Tag, ChevronRight, ClipboardList, ArrowRight,
} from "lucide-react";
import Image from "next/image";
import { usePageSize } from "@/hooks/usePageSize";
import { usePaginatedList } from "@/hooks/usePaginatedList";
import { Paginator } from "@/components/ui/Paginator";

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

// ─────────────────────────────────────────────────────────────
// Circuit-trace SVG decorations (mirrored from Innovators page)
// ─────────────────────────────────────────────────────────────
type CircuitTraceProps = { which?: number; className?: string; style?: React.CSSProperties };
function CircuitTrace({ which = 0, className = "", style }: CircuitTraceProps) {
    const paths = [
        {
            viewBox: "0 0 600 400",
            d: [
                "M 0 200 L 120 200 L 140 220 L 280 220 L 300 240 L 600 240",
                "M 80 200 L 80 60  M 240 220 L 240 100",
                "M 380 240 L 380 360",
            ],
            nodes: [[120,200],[280,220],[80,60],[240,100],[380,360]] as [number,number][],
        },
        {
            viewBox: "0 0 500 400",
            d: [
                "M 500 80 L 380 80 L 360 100 L 220 100 L 200 120 L 80 120 L 0 120",
                "M 360 100 L 360 240",
                "M 200 120 L 200 300 L 0 300",
                "M 100 120 L 100 60",
            ],
            nodes: [[380,80],[220,100],[80,120],[360,240],[200,300],[100,60]] as [number,number][],
        },
        {
            viewBox: "0 0 400 300",
            d: [
                "M 0 50 L 80 50 L 90 60 L 200 60 L 210 70 L 320 70 L 330 80 L 400 80",
                "M 0 200 L 120 200 L 130 210 L 280 210 L 290 220 L 400 220",
                "M 200 60 L 200 200 M 290 220 L 290 80",
            ],
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

type MOMSummary = {
    id: string;
    title: string;
    meeting_date: string;
    meeting_type: string;
    attendees: number | null;
    created_by: string | null;
    created_at: string;
};

type ProfileInfo = {
    id: string;
    display_name: string;
    avatar_url: string | null;
};

const MEETING_TYPES = [
    "All",
    "General Body Meeting",
    "Faculty Review",
    "Core Team",
    "Emergency",
    "Workshop Debrief",
];

const TYPE_COLORS: Record<string, { fg: string; bg: string; bd: string }> = {
    "General Body Meeting": { fg: "#00e5ff", bg: "rgba(0,229,255,0.08)", bd: "rgba(0,229,255,0.28)" },
    "Faculty Review":      { fg: "#f59e0b", bg: "rgba(245,158,11,0.08)", bd: "rgba(245,158,11,0.28)" },
    "Core Team":           { fg: "#a78bfa", bg: "rgba(167,139,250,0.08)", bd: "rgba(167,139,250,0.28)" },
    "Emergency":           { fg: "#ef4444", bg: "rgba(239,68,68,0.08)", bd: "rgba(239,68,68,0.28)" },
    "Workshop Debrief":    { fg: "#22c55e", bg: "rgba(34,197,94,0.08)", bd: "rgba(34,197,94,0.28)" },
};

function getTypeColor(type: string) {
    return TYPE_COLORS[type] ?? TYPE_COLORS["General Body Meeting"];
}

function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-GB", {
        day: "2-digit", month: "short", year: "numeric"
    }).toUpperCase();
}

function getInitials(name: string) {
    return name.split(" ").map((w) => w[0] ?? "").join("").slice(0, 2).toUpperCase();
}

const CAN_WRITE_ROLES = ["faculty", "president", "vice_president"];

// =============================================
// Filter pills (styled like Our Innovators cir-tabs)
// =============================================
function MOMFilterPills({
    value,
    onChange,
    counts,
}: {
    value: string;
    onChange: (v: string) => void;
    counts: Record<string, number>;
}) {
    const wrapRef = useRef<HTMLDivElement>(null);
    const btnRefs = useRef<Record<string, HTMLLabelElement | null>>({});
    const [bar, setBar] = useState({ x: 0, w: 0, ready: false });

    const measureRef = useRef<() => void>(() => {});
    const measure = () => {
        const el = btnRefs.current[value];
        const wrap = wrapRef.current;
        if (!el || !wrap) return;
        setBar({ x: el.offsetLeft, w: el.offsetWidth, ready: true });
    };
    measureRef.current = measure;

    useIsomorphicLayoutEffect(() => { measure(); }, [value]);
    useEffect(() => {
        const ro = new ResizeObserver(() => measureRef.current());
        if (wrapRef.current) {
            ro.observe(wrapRef.current);
        }
        return () => {
            ro.disconnect();
        };
    }, []);

    return (
        <div 
            className="cir-tabs h-[50px] relative"
            ref={wrapRef}
            style={{ 
                background: "rgba(13,17,23,0.8)", 
                backdropFilter: "blur(8px)", 
                borderColor: "rgba(0,229,255,0.15)",
                scrollbarWidth: "none",
                msOverflowStyle: "none",
            }}
        >
            <style>{`
                .cir-tabs::-webkit-scrollbar { display: none; }
            `}</style>

            {/* Sliding Pill Background */}
            <div 
                className="absolute rounded-full pointer-events-none"
                style={{
                    top: "6px",
                    left: 0,
                    height: "36px",
                    transform: `translateX(${bar.x - 1}px)`,
                    width: bar.w,
                    opacity: bar.ready ? 1 : 0,
                    background: "#00e5ff",
                    boxShadow: "0 1px 1px rgba(0,229,255,0.06), 0 8px 18px -10px rgba(0,229,255,0.5)",
                    transition: "transform 250ms cubic-bezier(0.22, 1, 0.36, 1), width 250ms cubic-bezier(0.22, 1, 0.36, 1), opacity 200ms",
                }}
            />

            {MEETING_TYPES.map((t) => {
                const active = value === t;
                return (
                    <label 
                        key={t} 
                        className="relative inline-flex mb-0 cursor-pointer z-10" 
                        title={t}
                        ref={(el) => { btnRefs.current[t] = el; }}
                    >
                        <input
                            type="radio"
                            className="cir-tabs__r"
                            name="momTypeFilter"
                            value={t}
                            checked={active}
                            onChange={() => onChange(t)}
                            aria-label={t}
                        />
                        <span 
                            className="cir-tabs__t transition-colors duration-200 !px-4 !bg-transparent flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] whitespace-nowrap"
                        >
                            <span>{t}</span>
                            <span
                                className="font-mono text-[9.5px] tabular-nums tracking-[0.10em] transition-colors duration-200"
                                style={{ color: active ? "rgba(0,0,0,0.6)" : "#4a5568" }}
                            >
                                {String(counts[t] ?? 0).padStart(2, "0")}
                            </span>
                        </span>
                    </label>
                );
            })}
        </div>
    );
}

export default function MOMListClient({
    moms,
    profileMap,
    userRole,
}: {
    moms: MOMSummary[];
    profileMap: Record<string, ProfileInfo>;
    userRole: string;
}) {
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("All");

    const counts = useMemo(() => {
        const c: Record<string, number> = { All: moms.length };
        MEETING_TYPES.forEach((t) => {
            if (t !== "All") {
                c[t] = moms.filter((m) => m.meeting_type === t).length;
            }
        });
        return c;
    }, [moms]);

    // Drift animation for circuit traces (matches Innovators page)
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

    const canWrite = CAN_WRITE_ROLES.includes(userRole);

    const filtered = moms.filter((m) => {
        const matchesType = typeFilter === "All" || m.meeting_type === typeFilter;
        const matchesSearch =
            !search ||
            m.title.toLowerCase().includes(search.toLowerCase()) ||
            (m.meeting_type && m.meeting_type.toLowerCase().includes(search.toLowerCase()));

        return matchesType && matchesSearch;
    });

    const pageSize = usePageSize({ desktop: 10, mobile: 6 });
    const { pageItems, page, totalPages, setPage } = usePaginatedList(filtered, pageSize);

    useEffect(() => {
        setPage(1);
    }, [search, typeFilter, setPage]);

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
            <div className="absolute top-[6%] right-[-4%] w-[42vw] h-[40vh] pointer-events-none z-0"
                style={{ opacity: 0.06, transform: drift(0) }}>
                <CircuitTrace which={0} className="w-full h-full" />
            </div>
            <div className="absolute bottom-[12%] left-[-4%] w-[36vw] h-[44vh] pointer-events-none z-0"
                style={{ opacity: 0.06, transform: drift(2) }}>
                <CircuitTrace which={1} className="w-full h-full" />
            </div>
            <div className="absolute top-[44%] right-[10%] w-[26vw] h-[28vh] pointer-events-none z-0"
                style={{ opacity: 0.05, transform: drift(4) }}>
                <CircuitTrace which={2} className="w-full h-full" />
            </div>

            <div className="relative z-10 max-w-[1100px] mx-auto px-4 sm:px-8">
                {/* ── Header ── */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="font-sans font-extrabold text-[#f0f4ff] text-[32px] tracking-tight flex items-center gap-3">
                            <ClipboardList size={28} style={{ color: "#00e5ff" }} />
                            Minutes Of Meeting
                        </h1>
                        <p className="text-[#8b9ab0] text-[13px] mt-1.5">
                            Official records of all VajraX meetings, decisions, and action items.
                        </p>
                    </div>
                    {canWrite && (
                        <Link
                            href="/mom/new"
                            className="btn-3d-cyan shrink-0"
                            style={{ textDecoration: 'none' }}
                        >
                            <div className="btn-top flex items-center justify-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] font-bold">
                                <Plus size={14} />
                                <span>New MOM</span>
                                <ArrowRight size={12} />
                            </div>
                            <div className="btn-bottom" />
                            <div className="btn-base" />
                        </Link>
                    )}
                </div>

                {/* ── Filters & Search (Innovators Style) ── */}
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 mb-5">
                    <div className="overflow-x-auto pb-1 lg:pb-0" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
                        <MOMFilterPills value={typeFilter} onChange={setTypeFilter} counts={counts} />
                    </div>

                    {/* Search */}
                    <div className="relative w-full lg:w-72 h-[50px] shrink-0">
                        <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4a5568]" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search Minutes Of Meeting…"
                            className="w-full h-[50px] rounded-full border border-[rgba(0,229,255,0.15)] bg-[rgba(13,17,23,0.8)] backdrop-blur-sm pl-10 pr-4 text-[12.5px] text-[#f0f4ff] placeholder:text-[#4a5568] focus:outline-none focus:border-[#00e5ff] transition-colors"
                        />
                    </div>
                </div>

                {/* ── Meta strip ── */}
                <div className="flex items-center justify-between mb-6 font-mono text-[10.5px] uppercase tracking-[0.18em] text-[#8b9ab0]">
                    <div className="flex items-center gap-2.5">
                        <span
                            className="w-[7px] h-[7px] rounded-full bg-[#22c55e] animate-pulse shrink-0"
                            style={{ boxShadow: "0 0 6px rgba(34,197,94,0.7)" }}
                        />
                        <span>
                            {filtered.length > 0 ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, filtered.length)} of {String(filtered.length).padStart(2, "0")} records showing
                        </span>
                    </div>
                    {search && (
                        <button
                            onClick={() => setSearch("")}
                            className="text-[#00e5ff] hover:underline cursor-pointer lowercase tracking-normal font-sans text-[12px]"
                        >
                            Clear search
                        </button>
                    )}
                </div>

                {/* ── MOM Cards ── */}
                {filtered.length === 0 ? (
                    <div
                        className="rounded-sm border px-8 py-16 text-center"
                        style={{ borderColor: "rgba(0,229,255,0.08)", background: "#0d1117" }}
                    >
                        <ClipboardList size={32} className="mx-auto mb-4" style={{ color: "#4a5568" }} />
                        <p className="text-[#4a5568] font-mono text-[13px]">
                            {search || typeFilter !== "All" ? "No matching records found." : "No Minutes Of Meeting published yet."}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="space-y-3">
                            {pageItems.map((m) => {
                                const tc = getTypeColor(m.meeting_type);
                                const author = m.created_by ? profileMap[m.created_by] : null;
                                return (
                                    <Link
                                        key={m.id}
                                        href={`/mom/${m.id}`}
                                        className="group flex items-center gap-4 rounded-sm border px-5 py-4 transition-all duration-150"
                                        style={{
                                            borderColor: "rgba(0,229,255,0.10)",
                                            background: "#0d1117",
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.borderColor = "rgba(0,229,255,0.3)";
                                            e.currentTarget.style.background = "#121824";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.borderColor = "rgba(0,229,255,0.10)";
                                            e.currentTarget.style.background = "#0d1117";
                                        }}
                                    >
                                        {/* Date column */}
                                        <div className="shrink-0 w-20 text-center">
                                            <div className="font-mono text-[18px] font-bold text-[#f0f4ff] leading-none">
                                                {new Date(m.meeting_date).getDate().toString().padStart(2, "0")}
                                            </div>
                                            <div className="font-mono text-[10px] text-[#00e5ff] uppercase tracking-[0.12em] mt-0.5">
                                                {new Date(m.meeting_date).toLocaleDateString("en-GB", { month: "short", year: "2-digit" })}
                                            </div>
                                        </div>

                                        {/* Divider */}
                                        <span className="w-px h-10 shrink-0" style={{ background: "rgba(0,229,255,0.10)" }} />

                                        {/* Main info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                <span className="font-sans font-semibold text-[#f0f4ff] text-[15px] tracking-tight truncate">
                                                    {m.title}
                                                </span>
                                                <span
                                                    className="inline-flex items-center gap-1 h-[18px] px-2 rounded-sm font-mono text-[8.5px] uppercase tracking-[0.12em] shrink-0"
                                                    style={{ color: tc.fg, background: tc.bg, border: `1px solid ${tc.bd}` }}
                                                >
                                                    <Tag size={8} />
                                                    {m.meeting_type}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 font-mono text-[11px] text-[#4a5568]">
                                                <span className="flex items-center gap-1">
                                                    <Calendar size={10} /> {fmtDate(m.meeting_date)}
                                                </span>
                                                {m.attendees != null && (
                                                    <span className="flex items-center gap-1">
                                                        <Users size={10} /> {m.attendees} present
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Author */}
                                        {author && (
                                            <div className="shrink-0 flex items-center gap-2">
                                                <span className="font-mono text-[11px] text-[#4a5568] hidden sm:block">
                                                    {author.display_name}
                                                </span>
                                                <span
                                                    className="relative rounded-full overflow-hidden w-7 h-7"
                                                    style={{ border: "1px solid rgba(0,229,255,0.3)" }}
                                                >
                                                    {author.avatar_url ? (
                                                        <Image src={author.avatar_url} alt={author.display_name} width={28} height={28} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="grid place-items-center w-full h-full font-mono text-[9px]" style={{ background: "rgba(0,229,255,0.08)", color: "#00e5ff" }}>
                                                            {getInitials(author.display_name)}
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                        )}

                                        <ChevronRight size={14} className="text-[#4a5568] group-hover:text-[#00e5ff] transition-colors shrink-0" />
                                    </Link>
                                );
                            })}
                        </div>
                        <Paginator page={page} totalPages={totalPages} onPageChange={setPage} />
                    </>
                )}
            </div>
        </div>
    );
}
