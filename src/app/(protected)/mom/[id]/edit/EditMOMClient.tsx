"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, ClipboardList, Lock, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import dynamic from "next/dynamic";
import ActionItemsBuilder from "@/components/mom/ActionItemsBuilder";
import MOMResourceUploader from "@/components/mom/MOMResourceUploader";
import { Tables } from "@/types/database";
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

type MOM = Tables<"meeting_minutes">;

const MEETING_TYPES = [
    "General Body Meeting",
    "Faculty Review",
    "Core Team",
    "Emergency",
    "Workshop Debrief",
];

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

export default function EditMOMClient({ mom, userId }: { mom: MOM; userId: string }) {
    const router = useRouter();
    const supabase = createClient();

    const [title, setTitle] = useState(mom.title);
    const [meetingDate, setMeetingDate] = useState(mom.meeting_date);
    const [meetingType, setMeetingType] = useState(mom.meeting_type);
    const [content, setContent] = useState(mom.content);
    const [actionItems, setActionItems] = useState<MomActionItem[]>(mom.action_items ?? []);
    const [resources, setResources] = useState<MomResource[]>(mom.resources ?? []);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [attendeeProfiles, setAttendeeProfiles] = useState<{ id: string; display_name: string; avatar_url: string | null }[]>([]);

    // Fetch attendee profiles for read-only display
    useEffect(() => {
        if (!mom.attendee_ids || mom.attendee_ids.length === 0) return;
        supabase
            .from("profiles")
            .select("id, display_name, avatar_url")
            .in("id", mom.attendee_ids)
            .then(({ data }) => setAttendeeProfiles(data ?? []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mom.attendee_ids]);

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

        const { error: updateError } = await supabase
            .from("meeting_minutes")
            .update({
                title: title.trim(),
                meeting_date: meetingDate,
                meeting_type: meetingType,
                content,
                action_items: actionItems,
                resources,
            })
            .eq("id", mom.id);
        // NOTE: attendee_ids, session_scope, counts_attendance are intentionally locked after publish

        setSaving(false);

        if (updateError) {
            setError(updateError.message);
            return;
        }

        router.push(`/mom/${mom.id}`);
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
                            <ClipboardList size={22} style={{ color: "#f59e0b" }} />
                            Edit Minutes Of Meeting
                        </h1>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
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

                    {/* ── Attendees (read-only) ── */}
                    <div
                        className="rounded-sm p-5"
                        style={{ border: "1px solid rgba(245,158,11,0.15)", background: "#0d1117" }}
                    >
                        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#4a5568] mb-3 flex items-center gap-2">
                            <Lock size={10} style={{ color: "#f59e0b" }} />
                            <span>Attendees</span>
                            <span className="font-mono text-[9.5px] ml-auto" style={{ color: "rgba(245,158,11,0.6)" }}>Locked after publish</span>
                        </div>
                        {(mom.attendee_ids ?? []).length === 0 ? (
                            <p className="text-[12px] text-[#4a5568]">No attendees recorded.</p>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {attendeeProfiles.map((p) => (
                                    <div key={p.id} className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-sm" style={{ background: "rgba(0,229,255,0.06)", border: "1px solid rgba(0,229,255,0.18)" }}>
                                        <span className="w-5 h-5 rounded-full overflow-hidden shrink-0" style={{ border: "1px solid rgba(0,229,255,0.25)" }}>
                                            {p.avatar_url ? (
                                                <Image src={p.avatar_url} alt={p.display_name} width={20} height={20} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="grid place-items-center w-full h-full font-mono text-[8px]" style={{ background: "rgba(0,229,255,0.08)", color: "#00e5ff" }}>
                                                    {p.display_name.slice(0, 2).toUpperCase()}
                                                </span>
                                            )}
                                        </span>
                                        <span className="text-[12px] font-medium" style={{ color: "#f0f4ff" }}>{p.display_name}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="flex items-center gap-3 mt-3 pt-3" style={{ borderTop: "1px solid rgba(0,229,255,0.08)" }}>
                            <span className="inline-flex items-center gap-1 font-mono text-[9.5px] uppercase tracking-[0.12em]" style={{ color: mom.session_scope === 'closed_session' ? '#a78bfa' : '#00e5ff' }}>
                                <Users size={9} />
                                {mom.session_scope === 'closed_session' ? 'Closed Session' : 'Open Session'}
                            </span>
                            {mom.counts_attendance && (
                                <span className="font-mono text-[9.5px] uppercase tracking-[0.12em]" style={{ color: '#22c55e' }}>Counts Attendance</span>
                            )}
                        </div>
                    </div>

                    <FormSection title="Minutes / Body">
                        <MOMEditor
                            content={content}
                            onChange={setContent}
                            placeholder="Write the minutes of the meeting here…"
                        />
                    </FormSection>

                    <FormSection title="Action Items">
                        <ActionItemsBuilder items={actionItems} onChange={setActionItems} />
                    </FormSection>

                    <FormSection title="Extra Resources">
                        <MOMResourceUploader resources={resources} onChange={setResources} />
                    </FormSection>

                    {error && (
                        <div
                            className="rounded-sm px-4 py-3 font-mono text-[12px]"
                            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.28)", color: "#ef4444" }}
                        >
                            {error}
                        </div>
                    )}

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
                            className="inline-flex items-center gap-2 h-9 px-6 rounded-sm font-mono text-[11px] uppercase tracking-[0.14em] text-[#07090f] bg-[#f59e0b] hover:bg-[#f59e0b]/90 transition-colors disabled:opacity-60"
                        >
                            <Save size={13} />
                            {saving ? "Saving…" : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
