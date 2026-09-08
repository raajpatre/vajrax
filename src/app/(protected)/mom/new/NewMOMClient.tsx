"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, ClipboardList, Search, X, Check, Users, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import dynamic from "next/dynamic";
import ActionItemsBuilder from "@/components/mom/ActionItemsBuilder";
import MOMResourceUploader from "@/components/mom/MOMResourceUploader";
import type { MomActionItem, MomResource } from "@/types/database";
import Image from "next/image";

const MOMEditor = dynamic(() => import("@/components/mom/MOMEditor"), { ssr: false });

// ─── Circuit-trace (Innovators-style) ───
type CircuitTraceProps = { which?: number; className?: string; style?: React.CSSProperties };
function CircuitTrace({ which = 0, className = "", style }: CircuitTraceProps) {
    const paths = [
        { viewBox: "0 0 600 400", d: ["M 0 200 L 120 200 L 140 220 L 280 220 L 300 240 L 600 240","M 80 200 L 80 60  M 240 220 L 240 100","M 380 240 L 380 360"], nodes: [[120,200],[280,220],[80,60],[240,100],[380,360]] as [number,number][] },
        { viewBox: "0 0 500 400", d: ["M 500 80 L 380 80 L 360 100 L 220 100 L 200 120 L 80 120 L 0 120","M 360 100 L 360 240","M 200 120 L 200 300 L 0 300","M 100 120 L 100 60"], nodes: [[380,80],[220,100],[80,120],[360,240],[200,300],[100,60]] as [number,number][] },
        { viewBox: "0 0 400 300", d: ["M 0 50 L 80 50 L 90 60 L 200 60 L 210 70 L 320 70 L 330 80 L 400 80","M 0 200 L 120 200 L 130 210 L 280 210 L 290 220 L 400 220","M 200 60 L 200 200 M 290 220 L 290 80"], nodes: [[80,50],[200,60],[320,70],[120,200],[280,210]] as [number,number][] },
    ];
    const p = paths[which % paths.length];
    return (
        <svg className={className} style={style} viewBox={p.viewBox} preserveAspectRatio="none" fill="none" stroke="#00e5ff" strokeWidth="1.2">
            {p.d.map((d, i) => <path key={i} d={d} />)}
            {p.nodes.map(([cx, cy], i) => <circle key={i} cx={cx} cy={cy} r="2.5" fill="#00e5ff" />)}
        </svg>
    );
}

type MemberProfile = { id: string; display_name: string; avatar_url: string | null; role: string };

const MEETING_TYPES = [
    "General Body Meeting",
    "Faculty Review",
    "Core Team",
    "Emergency",
    "Workshop Debrief",
];

// These types count toward attendance by default
const ATTENDANCE_TYPES = ["General Body Meeting", "Faculty Review"];

const FIELD_STYLE = "w-full rounded-sm border border-[rgba(0,229,255,0.18)] bg-[#07090f] px-4 py-2.5 text-[13px] text-[#f0f4ff] placeholder:text-[#4a5568] focus:outline-none focus:border-[#00e5ff] transition-colors";

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#4a5568] mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00e5ff]" style={{ boxShadow: "0 0 6px #00e5ff" }} />
            {children}
        </div>
    );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div
            className="rounded-sm p-5"
            style={{ border: "1px solid rgba(0,229,255,0.12)", background: "#0d1117" }}
        >
            <SectionLabel>{title}</SectionLabel>
            {children}
        </div>
    );
}

function getInitials(name: string) {
    return name.split(" ").map((w) => w[0] ?? "").join("").slice(0, 2).toUpperCase();
}

// ─── Member Picker Component ───────────────────────────────────
function MemberPicker({
    selected,
    onChange,
    members,
}: {
    selected: string[];
    onChange: (ids: string[]) => void;
    members: MemberProfile[];
}) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const wrapRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const filtered = members.filter((m) =>
        m.display_name.toLowerCase().includes(search.toLowerCase())
    );

    const toggle = (id: string) => {
        onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
    };

    const selectedMembers = members.filter((m) => selected.includes(m.id));

    return (
        <div ref={wrapRef} className="relative">
            {/* Trigger */}
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="w-full flex items-center gap-2 rounded-sm border bg-[#07090f] px-3 py-2.5 text-left transition-colors"
                style={{
                    borderColor: open ? "#00e5ff" : "rgba(0,229,255,0.18)",
                    minHeight: 42,
                }}
            >
                <Users size={14} style={{ color: "#4a5568", flexShrink: 0 }} />
                <div className="flex-1 flex flex-wrap gap-1.5 min-w-0">
                    {selectedMembers.length === 0 ? (
                        <span className="text-[13px] text-[#4a5568]">Select attendees…</span>
                    ) : (
                        selectedMembers.map((m) => (
                            <span
                                key={m.id}
                                className="inline-flex items-center gap-1 h-6 px-2 rounded-sm font-mono text-[10px]"
                                style={{ background: "rgba(0,229,255,0.10)", border: "1px solid rgba(0,229,255,0.28)", color: "#00e5ff" }}
                            >
                                {m.display_name}
                                <span
                                    role="button"
                                    tabIndex={0}
                                    className="cursor-pointer opacity-60 hover:opacity-100"
                                    onClick={(e) => { e.stopPropagation(); toggle(m.id); }}
                                    onKeyDown={(e) => e.key === "Enter" && toggle(m.id)}
                                >
                                    <X size={9} />
                                </span>
                            </span>
                        ))
                    )}
                </div>
                <ChevronDown size={13} style={{ color: "#4a5568", flexShrink: 0, transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms" }} />
            </button>

            {/* Dropdown */}
            {open && (
                <div
                    className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 rounded-sm shadow-2xl overflow-hidden"
                    style={{ background: "#0d1117", border: "1px solid rgba(0,229,255,0.22)", maxHeight: 280 }}
                >
                    {/* Search */}
                    <div className="relative px-3 pt-2.5 pb-2 border-b" style={{ borderColor: "rgba(0,229,255,0.10)" }}>
                        <Search size={12} className="absolute left-5 top-1/2 -translate-y-[2px]" style={{ color: "#4a5568" }} />
                        <input
                            autoFocus
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search members…"
                            className="w-full bg-transparent pl-6 text-[12px] text-[#f0f4ff] placeholder:text-[#4a5568] focus:outline-none"
                        />
                    </div>
                    {/* List */}
                    <div className="overflow-y-auto" style={{ maxHeight: 220 }}>
                        {filtered.length === 0 && (
                            <div className="px-4 py-3 text-[12px] text-[#4a5568]">No members found</div>
                        )}
                        {filtered.map((m) => {
                            const isSelected = selected.includes(m.id);
                            return (
                                <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => toggle(m.id)}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 transition-colors text-left"
                                    style={{
                                        background: isSelected ? "rgba(0,229,255,0.06)" : "transparent",
                                    }}
                                    onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = "rgba(0,229,255,0.04)"; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = isSelected ? "rgba(0,229,255,0.06)" : "transparent"; }}
                                >
                                    <span
                                        className="relative shrink-0 w-7 h-7 rounded-full overflow-hidden"
                                        style={{ border: "1px solid rgba(0,229,255,0.25)" }}
                                    >
                                        {m.avatar_url ? (
                                            <Image src={m.avatar_url} alt={m.display_name} width={28} height={28} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="grid place-items-center w-full h-full font-mono text-[9px]" style={{ background: "rgba(0,229,255,0.08)", color: "#00e5ff" }}>
                                                {getInitials(m.display_name)}
                                            </span>
                                        )}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[12.5px] font-medium truncate" style={{ color: "#f0f4ff" }}>{m.display_name}</div>
                                        <div className="font-mono text-[9.5px] uppercase tracking-[0.10em]" style={{ color: "#4a5568" }}>{m.role.replace("_", " ")}</div>
                                    </div>
                                    {isSelected && <Check size={12} style={{ color: "#00e5ff", flexShrink: 0 }} />}
                                </button>
                            );
                        })}
                    </div>
                    {/* Footer */}
                    {selected.length > 0 && (
                        <div className="px-3 py-2 border-t flex items-center justify-between" style={{ borderColor: "rgba(0,229,255,0.10)" }}>
                            <span className="font-mono text-[10px] text-[#4a5568]">{selected.length} selected</span>
                            <button
                                type="button"
                                onClick={() => onChange([])}
                                className="font-mono text-[10px] text-[#ef4444] hover:underline"
                            >
                                Clear all
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function NewMOMClient({ userId }: { userId: string }) {
    const router = useRouter();
    const supabase = createClient();

    const [title, setTitle] = useState("");
    const [meetingDate, setMeetingDate] = useState(new Date().toISOString().split("T")[0]);
    const [meetingType, setMeetingType] = useState("General Body Meeting");
    const [sessionScope, setSessionScope] = useState<"open_session" | "closed_session">("open_session");
    const [countsAttendance, setCountsAttendance] = useState(true);
    const [attendeeIds, setAttendeeIds] = useState<string[]>([]);
    const [content, setContent] = useState("");
    const [actionItems, setActionItems] = useState<MomActionItem[]>([]);
    const [resources, setResources] = useState<MomResource[]>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [members, setMembers] = useState<MemberProfile[]>([]);

    // Auto-set counts_attendance based on meeting type
    useEffect(() => {
        setCountsAttendance(ATTENDANCE_TYPES.includes(meetingType));
    }, [meetingType]);

    // Fetch all members for the picker
    useEffect(() => {
        fetch("/api/members")
            .then((r) => r.json())
            .then((data) => setMembers(Array.isArray(data) ? data : []))
            .catch(() => {});
    }, []);

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) { setError("Meeting title is required."); return; }
        if (!meetingDate) { setError("Meeting date is required."); return; }
        if (!content || content === "<p></p>") { setError("Content cannot be empty."); return; }

        setSaving(true);
        setError(null);

        const { data: newMOM, error: insertError } = await supabase
            .from("meeting_minutes")
            .insert({
                title: title.trim(),
                meeting_date: meetingDate,
                meeting_type: meetingType,
                session_scope: sessionScope,
                counts_attendance: countsAttendance,
                attendee_ids: attendeeIds,
                content,
                action_items: actionItems,
                resources,
                created_by: userId,
            })
            .select("id")
            .single();

        setSaving(false);

        if (insertError || !newMOM) {
            setError(insertError?.message ?? "Failed to save. Please try again.");
            return;
        }

        router.push(`/mom/${newMOM.id}`);
    };

    return (
        <div className="relative min-h-screen bg-[#07090f] overflow-hidden pt-[calc(var(--nav-height,0px)+2.5rem)] pb-24">
            {/* Animated grid with radial fade mask */}
            <div
                className="absolute inset-0 pointer-events-none animate-grid-pan"
                style={{
                    backgroundImage: "linear-gradient(rgba(0,229,255,0.04) 1px,transparent 1px)," + "linear-gradient(90deg, rgba(0,229,255,0.04) 1px,transparent 1px)",
                    backgroundSize: "40px 40px",
                    maskImage: "radial-gradient(ellipse 80% 70% at 50% 50%, #000 30%, transparent 90%)",
                    WebkitMaskImage: "radial-gradient(ellipse 80% 70% at 50% 50%, #000 30%, transparent 90%)",
                }}
            />
            <div className="absolute -bottom-32 -left-32 w-[640px] h-[640px] pointer-events-none z-0" style={{ background: "radial-gradient(circle, rgba(0,229,255,0.13) 0%, transparent 70%)" }} />
            <div className="absolute -top-40 -right-40 w-[560px] h-[560px] pointer-events-none z-0" style={{ background: "radial-gradient(circle, rgba(0,229,255,0.08) 0%, transparent 70%)" }} />
            <div className="absolute inset-0 pointer-events-none scanline animate-scanline-pan opacity-50 z-0" />
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
                {/* Header */}
                <div className="flex items-center gap-3 mb-8">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="grid place-items-center w-9 h-9 rounded-sm transition-colors shrink-0"
                        style={{ border: "1px solid rgba(0,229,255,0.18)", color: "#8b9ab0" }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = "#f0f4ff"; e.currentTarget.style.borderColor = "rgba(0,229,255,0.45)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = "#8b9ab0"; e.currentTarget.style.borderColor = "rgba(0,229,255,0.18)"; }}
                    >
                        <ArrowLeft size={15} />
                    </button>
                    <div>
                        <h1 className="font-sans font-extrabold text-[#f0f4ff] text-[26px] tracking-tight flex items-center gap-2.5">
                            <ClipboardList size={22} style={{ color: "#00e5ff" }} />
                            Minutes Of Meeting
                        </h1>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* ── Meeting Info ── */}
                    <FormSection title="Meeting Info">
                        <div className="space-y-3">
                            <input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Meeting title…"
                                className={FIELD_STYLE}
                                style={{ fontSize: 16, fontWeight: 600 }}
                            />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#4a5568] mb-1 block">Date</label>
                                    <input
                                        type="date"
                                        value={meetingDate}
                                        onChange={(e) => setMeetingDate(e.target.value)}
                                        className={FIELD_STYLE}
                                        style={{ colorScheme: "dark" }}
                                    />
                                </div>
                                <div>
                                    <label className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#4a5568] mb-1 block">Type</label>
                                    <select
                                        value={meetingType}
                                        onChange={(e) => setMeetingType(e.target.value)}
                                        className={FIELD_STYLE + " appearance-none"}
                                        style={{ colorScheme: "dark" }}
                                    >
                                        {MEETING_TYPES.map((t) => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </FormSection>



                    {/* ── Minutes Body ── */}
                    <FormSection title="Minutes / Body">
                        <MOMEditor
                            content={content}
                            onChange={setContent}
                            placeholder="Write the minutes of the meeting here…"
                        />
                    </FormSection>

                    {/* ── Action Items ── */}
                    <FormSection title="Action Items">
                        <ActionItemsBuilder items={actionItems} onChange={setActionItems} />
                    </FormSection>

                    {/* ── Resources ── */}
                    <FormSection title="Extra Resources">
                        <MOMResourceUploader resources={resources} onChange={setResources} />
                    </FormSection>

                    {/* ── Attendees & Session Settings ── */}
                    <FormSection title="Attendees & Session">
                        <div className="space-y-4">
                            {/* Counts toward attendance */}
                            <div
                                className="flex items-start gap-3 rounded-sm px-3 py-2.5"
                                style={{ border: "1px solid rgba(0,229,255,0.10)", background: "#07090f" }}
                            >
                                <button
                                    type="button"
                                    onClick={() => setCountsAttendance((v) => !v)}
                                    className="mt-0.5 w-4 h-4 rounded-sm border shrink-0 grid place-items-center transition-colors"
                                    style={{
                                        borderColor: countsAttendance ? "#00e5ff" : "rgba(0,229,255,0.25)",
                                        background: countsAttendance ? "#00e5ff" : "transparent",
                                    }}
                                >
                                    {countsAttendance && <Check size={10} style={{ color: "#07090f" }} />}
                                </button>
                                <div>
                                    <div className="font-mono text-[10.5px] uppercase tracking-[0.12em]" style={{ color: "#f0f4ff" }}>
                                        Counts toward attendance
                                    </div>
                                    <div className="text-[11px] leading-snug mt-0.5" style={{ color: "#4a5568" }}>
                                        {ATTENDANCE_TYPES.includes(meetingType)
                                            ? "On by default for this meeting type. Uncheck to mark as optional."
                                            : "Off by default for this meeting type. Check to mark as mandatory."}
                                    </div>
                                </div>
                            </div>

                            {/* Wrap the rest in a div that fades out and disables interactions when not counting attendance */}
                            <div className={`space-y-4 transition-opacity duration-300 ${!countsAttendance ? "opacity-30 pointer-events-none grayscale" : ""}`}>
                                {/* Member picker */}
                                <div>
                                    <label className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#4a5568] mb-2 block">
                                        Present Members
                                    </label>
                                    <MemberPicker selected={attendeeIds} onChange={setAttendeeIds} members={members} />
                                    {attendeeIds.length > 0 && (
                                        <p className="font-mono text-[10px] text-[#4a5568] mt-1.5">
                                            {attendeeIds.length} member{attendeeIds.length !== 1 ? "s" : ""} marked present
                                        </p>
                                    )}
                                </div>

                                {/* Session Scope toggle */}
                                <div>
                                    <label className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#4a5568] mb-2 block">
                                        Session Scope
                                    </label>
                                    <div className="flex gap-2">
                                        {(["open_session", "closed_session"] as const).map((scope) => {
                                            const active = sessionScope === scope;
                                            const label = scope === "open_session" ? "Open Session" : "Closed Session";
                                            const desc = scope === "open_session"
                                                ? "All members get this session counted; absent = absent"
                                                : "Only selected attendees get this session counted; others unaffected";
                                            return (
                                                <button
                                                    key={scope}
                                                    type="button"
                                                    onClick={() => setSessionScope(scope)}
                                                    className="flex-1 rounded-sm px-3 py-2.5 text-left transition-all"
                                                    style={{
                                                        border: active ? "1px solid rgba(0,229,255,0.5)" : "1px solid rgba(0,229,255,0.14)",
                                                        background: active ? "rgba(0,229,255,0.08)" : "#07090f",
                                                    }}
                                                >
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <span
                                                            className="w-3 h-3 rounded-full shrink-0 border"
                                                            style={{
                                                                borderColor: active ? "#00e5ff" : "rgba(0,229,255,0.3)",
                                                                background: active ? "#00e5ff" : "transparent",
                                                                boxShadow: active ? "0 0 6px rgba(0,229,255,0.6)" : "none",
                                                            }}
                                                        />
                                                        <span className="font-mono text-[10.5px] uppercase tracking-[0.14em]" style={{ color: active ? "#00e5ff" : "#8b9ab0" }}>
                                                            {label}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] leading-snug ml-5" style={{ color: "#4a5568" }}>{desc}</p>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </FormSection>

                    {/* ── Error ── */}
                    {error && (
                        <div
                            className="rounded-sm px-4 py-3 font-mono text-[12px]"
                            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.28)", color: "#ef4444" }}
                        >
                            {error}
                        </div>
                    )}

                    {/* ── Submit ── */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="h-9 px-5 rounded-sm font-mono text-[11px] uppercase tracking-[0.14em] transition-colors"
                            style={{ border: "1px solid rgba(0,229,255,0.18)", color: "#8b9ab0" }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = "#f0f4ff"; e.currentTarget.style.borderColor = "rgba(0,229,255,0.4)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = "#8b9ab0"; e.currentTarget.style.borderColor = "rgba(0,229,255,0.18)"; }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex items-center gap-2 h-9 px-6 rounded-sm font-mono text-[11px] uppercase tracking-[0.14em] text-[#07090f] bg-[#00e5ff] hover:bg-[#00e5ff]/90 transition-colors disabled:opacity-60"
                        >
                            <Save size={13} />
                            {saving ? "Publishing…" : "Publish Minutes"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
