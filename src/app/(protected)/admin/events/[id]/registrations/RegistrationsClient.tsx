"use client";

import { useState, useRef, useEffect, useLayoutEffect } from "react";
import Link from "next/link";
import {
    ArrowLeft, Download, Search, Users, User, ChevronDown, ChevronRight,
    Phone, Mail, Building2, Hash, Check, Filter, LayoutGrid, ExternalLink
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tables } from "@/types/database";

type Reg = Tables<"event_registrations"> & {
    event_team_members: Tables<"event_team_members">[];
};

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

function fmtDate(iso: string) {
    return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function RegistrationRow({ reg, eventCustomFields }: { reg: Reg, eventCustomFields?: any }) {
    const [expanded, setExpanded] = useState(false);
    const isTeam = reg.registration_type === "team";
    const members = (reg.event_team_members ?? []).sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    
    const hasCustomResponses = eventCustomFields && Array.isArray(eventCustomFields) && eventCustomFields.some(f => {
        const val = (reg.custom_responses as Record<string, any>)?.[f.id];
        return val !== undefined && val !== null && val !== "";
    });
    const canExpand = isTeam || hasCustomResponses;

    return (
        <div
            className="rounded-sm border transition-colors"
            style={{ borderColor: expanded ? "rgba(0,229,255,0.3)" : "rgba(0,229,255,0.12)", background: "rgba(13,17,23,0.6)" }}
        >
            {/* Row header */}
            <div
                className={`flex items-center gap-3 px-4 py-3.5 ${canExpand ? 'cursor-pointer' : ''}`}
                onClick={() => canExpand && setExpanded((e) => !e)}
            >
                <div
                    className="w-8 h-8 rounded-sm grid place-items-center shrink-0"
                    style={{
                        background: isTeam ? "rgba(94,234,212,0.10)" : "rgba(0,229,255,0.10)",
                        border: `1px solid ${isTeam ? "rgba(94,234,212,0.35)" : "rgba(0,229,255,0.35)"}`,
                    }}
                >
                    {isTeam ? <Users size={13} className="text-[#5eead4]" /> : <User size={13} className="text-[#00e5ff]" />}
                </div>

                <div className="min-w-0 flex-1">
                    <div className="font-sans font-semibold text-[#f0f4ff] text-[13.5px] flex items-center gap-2 flex-wrap">
                        {isTeam ? reg.team_name : reg.leader_name}
                        {isTeam && <span className="font-normal text-[#8b9ab0] text-[12px]">— {reg.leader_name}</span>}
                    </div>
                    <div className="flex items-center gap-3 font-mono text-[10.5px] text-[#4a5568] mt-0.5 flex-wrap">
                        <span className="flex items-center gap-1"><Mail size={10} />{reg.leader_email}</span>
                        <span className="flex items-center gap-1"><Phone size={10} />{reg.leader_phone}</span>
                        <span className="flex items-center gap-1"><Building2 size={10} />{reg.leader_college}</span>
                    </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    <span
                        className="font-mono text-[9px] uppercase tracking-[0.16em] px-2 py-0.5 rounded-sm border"
                        style={{ color: "#00e5ff", background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.2)" }}
                    >
                        <Hash size={9} className="inline mr-1" />{reg.registration_code}
                    </span>
                    <span className="font-mono text-[10px] text-[#4a5568] hidden sm:block">{fmtDate(reg.created_at)}</span>
                    {isTeam && (
                        <span className="font-mono text-[10px] text-[#8b9ab0]">{members.length + 1} members</span>
                    )}
                    {canExpand && (
                        expanded
                            ? <ChevronDown size={14} className="text-[#00e5ff]" />
                            : <ChevronRight size={14} className="text-[#4a5568]" />
                    )}
                </div>
            </div>

            {/* Expanded section */}
            {expanded && canExpand && (
                <div className="border-t px-4 py-4 space-y-5" style={{ borderColor: "rgba(0,229,255,0.10)" }}>
                    
                    {/* Custom Responses */}
                    {hasCustomResponses && (
                        <div className="space-y-3">
                            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#00e5ff]">Additional Information</div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {eventCustomFields.map((field: any) => {
                                    const answer = (reg.custom_responses as Record<string, any>)?.[field.id];
                                    if (answer === undefined || answer === null || answer === "") return null;
                                    
                                    let content: React.ReactNode = Array.isArray(answer) ? answer.join(", ") : String(answer);
                                    
                                    if (field.type === "url") {
                                        content = (
                                            <a href={String(answer)} target="_blank" rel="noopener noreferrer" className="text-[#00e5ff] hover:underline flex items-center gap-1">
                                                {String(answer)}
                                                <ExternalLink size={12} />
                                            </a>
                                        );
                                    } else if (field.type === "image") {
                                        const originalUrl = String(answer);
                                        const downloadUrl = originalUrl.includes('cloudinary.com') 
                                            ? originalUrl.replace('/upload/', '/upload/fl_attachment/') 
                                            : originalUrl;
                                            
                                        content = (
                                            <div className="flex flex-col gap-2">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={originalUrl} alt="User upload" className="max-h-[120px] w-fit rounded-sm object-cover border border-[rgba(0,229,255,0.18)]" />
                                                <a href={downloadUrl} download target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-widest text-[#00e5ff] hover:text-[#33ccdd] transition-colors">
                                                    <Download size={12} />
                                                    Download Image
                                                </a>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div key={field.id} className="bg-[#0d1117]/80 border border-[rgba(0,229,255,0.15)] rounded-sm px-3.5 py-2.5">
                                            <div className="font-mono text-[10px] text-[#4a5568] mb-1">{field.label}</div>
                                            <div className="font-sans text-[13px] text-[#f0f4ff]">
                                                {content}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Team Members */}
                    {isTeam && members.length > 0 && (
                        <div className="space-y-3">
                            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#00e5ff]">Team Members</div>
                            <div className="space-y-2">
                                {members.map((m) => (
                                    <div key={m.id} className="flex items-center gap-3 py-1.5">
                                        <div className="w-5 h-5 rounded-full grid place-items-center shrink-0 bg-[#0d1117] border border-[rgba(0,229,255,0.15)]">
                                            <User size={10} className="text-[#4a5568]" />
                                        </div>
                                        <div className="min-w-0 flex-1 font-mono text-[11px] text-[#8b9ab0] flex flex-wrap gap-x-4">
                                            <span className="text-[#f0f4ff] font-medium">{m.member_name}</span>
                                            {m.member_email && <span className="flex items-center gap-1"><Mail size={9} />{m.member_email}</span>}
                                            {m.member_phone && <span className="flex items-center gap-1"><Phone size={9} />{m.member_phone}</span>}
                                            {m.member_college && <span className="flex items-center gap-1"><Building2 size={9} />{m.member_college}</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Filter pills ──────────────────────────────────────────────────────────────

function RegistrationFilterPills({ value, onChange }: {
    value: "all" | "individual" | "team";
    onChange: (v: "all" | "individual" | "team") => void;
}) {
    const wrapRef = useRef<HTMLDivElement>(null);
    const btnRefs = useRef<Record<string, HTMLLabelElement | null>>({});
    const [bar, setBar] = useState({ x: 0, w: 0, ready: false });

    const measureRef = useRef<() => void>(() => {});
    const measure = () => {
        const el = btnRefs.current[value];
        const wrap = wrapRef.current;
        if (!el || !wrap) return;
        const er = el.getBoundingClientRect();
        const wr = wrap.getBoundingClientRect();
        setBar({ x: er.left - wr.left, w: er.width, ready: true });
    };
    measureRef.current = measure;

    useIsomorphicLayoutEffect(() => { measure(); }, [value]);
    useEffect(() => {
        const ro = new ResizeObserver(() => measureRef.current());
        if (wrapRef.current) ro.observe(wrapRef.current);
        return () => ro.disconnect();
    }, []);

    const FILTERS = [
        { key: "all", label: "All Registrations", icon: LayoutGrid },
        { key: "individual", label: "Individuals Only", icon: User },
        { key: "team", label: "Teams Only", icon: Users },
    ] as const;

    return (
        <div className="flex items-center gap-4">
            <div 
                className="cir-tabs relative flex items-center h-[46px] px-1 rounded-full"
                ref={wrapRef}
                style={{ 
                    background: "rgba(13,17,23,0.8)", 
                    backdropFilter: "blur(8px)", 
                    border: "1px solid rgba(0,229,255,0.15)",
                    scrollbarWidth: "none",
                    msOverflowStyle: "none",
                }}
            >
                <style>{`
                    .cir-tabs::-webkit-scrollbar { display: none; }
                    .cir-tabs__r { position: absolute; opacity: 0; width: 0; height: 0; }
                `}</style>

                {/* Sliding Pill Background */}
                <div 
                    className="absolute rounded-full pointer-events-none"
                    style={{
                        top: "4px",
                        left: 0,
                        height: "36px",
                        transform: `translateX(${bar.x}px)`,
                        width: bar.w,
                        opacity: bar.ready ? 1 : 0,
                        background: "#00e5ff",
                        boxShadow: "0 1px 1px rgba(0,229,255,0.06), 0 8px 18px -10px rgba(0,229,255,0.5)",
                        transition: "transform 250ms cubic-bezier(0.22, 1, 0.36, 1), width 250ms cubic-bezier(0.22, 1, 0.36, 1), opacity 200ms",
                    }}
                />

                {FILTERS.map((f) => {
                    const active = value === f.key;
                    const Icon = f.icon;
                    return (
                        <label 
                            key={f.key} 
                            className="relative inline-flex items-center justify-center h-9 px-4 cursor-pointer z-10 transition-colors" 
                            title={f.label}
                            ref={(el) => { btnRefs.current[f.key] = el; }}
                        >
                            <input
                                type="radio"
                                className="cir-tabs__r"
                                name="registrationsFilter"
                                value={f.key}
                                checked={active}
                                onChange={() => onChange(f.key)}
                                aria-label={f.label}
                            />
                            <div className={`flex items-center justify-center transition-colors duration-200 ${active ? "text-black" : "text-[#4a5568] hover:text-[#f0f4ff]"}`}>
                                <Icon size={16} strokeWidth={active ? 2.5 : 2} />
                            </div>
                        </label>
                    );
                })}
            </div>
        </div>
    );
}

export default function RegistrationsClient({
    event,
    registrations,
}: {
    event: { id: string; title: string; registration_mode: string; team_size_min: number; team_size_max: number; custom_fields?: any };
    registrations: Reg[];
}) {
    const [search, setSearch] = useState("");
    const [filterType, setFilterType] = useState<"all" | "individual" | "team">("all");

    const filtered = registrations.filter((r) => {
        if (filterType !== "all" && r.registration_type !== filterType) return false;
        const s = search.toLowerCase();
        return (
            r.leader_name.toLowerCase().includes(s) ||
            r.leader_email.toLowerCase().includes(s) ||
            (r.leader_college ?? "").toLowerCase().includes(s) ||
            (r.team_name ?? "").toLowerCase().includes(s)
        );
    });

    const handleExport = () => {
        window.open(`/api/events/${event.id}/registrations?format=csv`, "_blank");
    };

    return (
        <div className="relative min-h-screen bg-[#07090f] pt-[calc(var(--nav-height)+2rem)] pb-24">
            <div className="fixed inset-0 pointer-events-none animate-grid-pan" style={{ backgroundImage: "linear-gradient(rgba(0,229,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,229,255,0.03) 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
            <div className="fixed inset-0 pointer-events-none scanline animate-scanline-pan opacity-40" />

            <div className="relative z-10 max-w-[1200px] mx-auto px-4 sm:px-8">
                {/* Header */}
                <Link href="/admin/events" className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-[#4a5568] hover:text-[#00e5ff] transition-colors mb-6">
                    <ArrowLeft size={12} /> All Events
                </Link>

                <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
                    <div>
                        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#00e5ff] mb-1">Registrations for</div>
                        <h1 className="font-sans font-extrabold text-[#f0f4ff] text-[28px] tracking-tight">{event.title}</h1>
                    </div>
                    <button
                        onClick={handleExport}
                        className="btn-3d-cyan"
                    >
                        <div className="btn-top flex items-center justify-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] font-bold">
                            <Download size={13} />
                            <span>Export CSV</span>
                        </div>
                        <div className="btn-bottom" />
                        <div className="btn-base" />
                    </button>
                </div>

                {/* Search & Filter */}
                <div className="flex items-center gap-3 mb-5 max-w-2xl">
                    <div className="relative flex-1 max-w-sm">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4a5568]" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by name, email, college..."
                            className="w-full rounded-sm border border-[rgba(0,229,255,0.18)] bg-[#0d1117] pl-9 pr-4 py-2.5 text-[13px] text-[#f0f4ff] placeholder:text-[#4a5568] focus:outline-none focus:border-[#00e5ff] transition-colors"
                        />
                    </div>
                    <RegistrationFilterPills value={filterType} onChange={setFilterType} />
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                    {[
                        { label: "Total", value: registrations.length, color: "#00e5ff" },
                        { label: "Individual", value: registrations.filter((r) => r.registration_type === "individual").length, color: "#22c55e" },
                        { label: "Teams", value: registrations.filter((r) => r.registration_type === "team").length, color: "#5eead4" },
                        { label: "Total Participants", value: registrations.reduce((acc, r) => acc + (r.registration_type === "team" ? (r.event_team_members?.length ?? 0) + 1 : 1), 0), color: "#a78bfa" },
                    ].map(({ label, value, color }) => (
                        <div key={label} className="rounded-sm border px-4 py-3" style={{ borderColor: "rgba(0,229,255,0.12)", background: "rgba(13,17,23,0.6)" }}>
                            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#4a5568] mb-1">{label}</div>
                            <div className="font-sans font-bold text-[24px] tracking-tight" style={{ color }}>{value}</div>
                        </div>
                    ))}
                </div>

                {/* Registrations list */}
                {filtered.length === 0 ? (
                    <div className="text-center py-16 text-[#4a5568] font-mono text-[13px]">No registrations found</div>
                ) : (
                    <div className="space-y-2">
                        {filtered.map((reg) => (
                            <RegistrationRow key={reg.id} reg={reg} eventCustomFields={event.custom_fields} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
