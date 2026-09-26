"use client";

import React, { useState, useCallback, useMemo, useId, useRef, useEffect } from "react";
import Link from "next/link";
import {
    ArrowLeft, Calendar, Clock, MapPin, Users, User, CheckCircle2,
    AlertCircle, Loader2, ChevronDown, Lock, ExternalLink, Plus, Minus,
    Upload, Trash2, ImageIcon, Link as LinkIcon
} from "lucide-react";
import { Tables } from "@/types/database";
import type { CustomField } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

type Event = Tables<"events">;

// ── Helpers ───────────────────────────────────────────────────────
function fmtDate(iso: string | null | undefined): string {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
}

function fmtTime(iso: string | null | undefined): string {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function normalizeYoutubeUrl(url: string): string {
    try {
        const u = new URL(url);
        let vid = u.searchParams.get("v");
        if (!vid && u.hostname === "youtu.be") vid = u.pathname.slice(1);
        if (vid) return `https://www.youtube.com/embed/${vid}`;
    } catch { /* empty */ }
    return url;
}

// ── EventCover SVG (reuse from EventsClient) ──────────────────────
const EVENT_TYPES: Record<string, { fg: string; bg: string }> = {
    hackathon:   { fg: "#f59e0b", bg: "28" },
    workshop:    { fg: "#00e5ff", bg: "192" },
    meetup:      { fg: "#22c55e", bg: "140" },
    competition: { fg: "#5eead4", bg: "168" },
    other:       { fg: "#38bdf8", bg: "210" },
};

const D3ButtonStyles = `
  .d3wrapper {
    position: relative;
    transform-style: preserve-3d;
    perspective: 400px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 64px;
    margin-top: 1.5rem;
  }
  .d3cover {
    background-color: #07090f;
    height: 64px;
    width: 100%;
    border-radius: 10px;
    transform: rotateX(13deg);
    position: absolute;
    z-index: 1;
    box-shadow: 0px 1px 1px 1px rgba(0,229,255,0.4);
    border: 1px solid rgba(0,229,255,0.15);
  }
  .d3btn {
    cursor: pointer;
    border: none;
    border-bottom: 2px solid rgba(255,255,255,0.6);
    background-color: #00e5ff;
    box-shadow: 0px 4px 0px 0.2px rgba(0,180,200,1);
    height: 56px;
    width: calc(100% - 10px);
    border-radius: 8px;
    transform: rotateX(13deg);
    z-index: 2;
    position: absolute;
    transition: 80ms;
    color: #07090f;
    font-size: 13px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
  .d3btn:hover:not(:disabled) {
    background-color: #00d0e6;
  }
  .d3btn:active:not(:disabled) {
    box-shadow: 0px 4px 0px 0.2px rgba(0,0,0,0);
    transform: rotateX(13deg) translateY(4.5px);
    transition: 80ms;
  }
  .d3btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

// ── Custom Field Renderer ─────────────────────────────────────────
function ImageUploadField({
    field,
    id,
    value,
    onChange,
}: {
    field: CustomField;
    id: string;
    value: string;
    onChange: (v: string) => void;
}) {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        setError(null);
        try {
            const fd = new FormData();
            fd.append("file", file);
            fd.append("folder", "event_custom_fields");
            const res = await fetch("/api/cloudinary/upload", { method: "POST", body: fd });
            if (!res.ok) throw new Error("Upload failed");
            const json = await res.json() as { url: string };
            onChange(json.url);
        } catch {
            setError("Image upload failed. Try again.");
        } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = "";
        }
    };

    return (
        <div className="space-y-3">
            <input
                ref={fileRef}
                id={id}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUpload}
            />
            {value ? (
                <div className="relative group rounded-sm overflow-hidden border border-[rgba(0,229,255,0.18)] inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={value} alt="Uploaded preview" className="max-h-[160px] max-w-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                            disabled={uploading}
                            className="bg-[#00e5ff] text-black px-3 py-1.5 rounded-sm text-[11px] font-mono uppercase tracking-wider hover:bg-[#33ccdd] transition-colors disabled:opacity-50"
                        >
                            {uploading ? "Uploading..." : "Replace"}
                        </button>
                        <button
                            type="button"
                            onClick={() => onChange("")}
                            className="bg-red-500/80 text-white p-1.5 rounded-sm hover:bg-red-500 transition-colors"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="w-full flex flex-col items-center justify-center gap-2 rounded-sm border border-dashed border-[rgba(0,229,255,0.3)] bg-[rgba(0,229,255,0.02)] hover:bg-[rgba(0,229,255,0.05)] transition-colors py-8 text-[#8b9ab0] hover:text-[#f0f4ff] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {uploading ? (
                        <>
                            <Loader2 size={24} className="animate-spin text-[#00e5ff]" />
                            <span className="text-[13px]">Uploading image...</span>
                        </>
                    ) : (
                        <>
                            <Upload size={24} className="text-[rgba(0,229,255,0.6)]" />
                            <span className="text-[13px]">{field.placeholder || "Click to upload an image"}</span>
                        </>
                    )}
                </button>
            )}
            {error && <p className="text-[#ef4444] text-[12px]">{error}</p>}
        </div>
    );
}

function CustomFieldInput({
    field,
    value,
    onChange,
}: {
    field: CustomField;
    value: string | string[];
    onChange: (v: string | string[]) => void;
}) {
    const id = useId();
    const base = "w-full rounded-sm border border-[rgba(0,229,255,0.18)] bg-[#07090f] px-4 py-2.5 text-[13px] text-[#f0f4ff] placeholder:text-[#4a5568] focus:outline-none focus:border-[#00e5ff] transition-colors";

    if (field.type === "short_text") {
        return (
            <input
                id={id}
                type="text"
                placeholder={field.placeholder ?? ""}
                value={(value as string) || ""}
                onChange={(e) => onChange(e.target.value)}
                className={base}
            />
        );
    }
    if (field.type === "long_text") {
        return (
            <textarea
                id={id}
                placeholder={field.placeholder ?? ""}
                value={(value as string) || ""}
                onChange={(e) => onChange(e.target.value)}
                rows={4}
                className={`${base} resize-none`}
            />
        );
    }
    if (field.type === "dropdown") {
        return (
            <div className="relative">
                <select
                    id={id}
                    value={(value as string) || ""}
                    onChange={(e) => onChange(e.target.value)}
                    className={`${base} appearance-none pr-9 cursor-pointer`}
                >
                    <option value="">Select an option...</option>
                    {(field.options ?? []).map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4a5568] pointer-events-none" />
            </div>
        );
    }
    if (field.type === "mcq") {
        return (
            <div className="space-y-2">
                {(field.options ?? []).map((opt) => (
                    <label key={opt} className="flex items-center gap-3 cursor-pointer group">
                        <span
                            className="w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center transition-all"
                            style={{
                                borderColor: value === opt ? "#00e5ff" : "rgba(0,229,255,0.3)",
                                background: value === opt ? "rgba(0,229,255,0.15)" : "transparent",
                            }}
                        >
                            {value === opt && <span className="w-1.5 h-1.5 rounded-full bg-[#00e5ff]" />}
                        </span>
                        <input
                            type="radio"
                            name={id}
                            value={opt}
                            checked={value === opt}
                            onChange={() => onChange(opt)}
                            className="sr-only"
                        />
                        <span className="text-[13px] text-[#8b9ab0] group-hover:text-[#f0f4ff] transition-colors">{opt}</span>
                    </label>
                ))}
            </div>
        );
    }
    if (field.type === "checkbox") {
        const checked = Array.isArray(value) ? value : [];
        return (
            <div className="space-y-2">
                {(field.options ?? []).map((opt) => (
                    <label key={opt} className="checkbox">
                        <input
                            type="checkbox"
                            checked={checked.includes(opt)}
                            onChange={() => {
                                if (checked.includes(opt)) onChange(checked.filter((c) => c !== opt));
                                else onChange([...checked, opt]);
                            }}
                        />
                        <span className="checkmark">
                            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="3" />
                                <polyline points="7 12 10.5 15.5 17 9" />
                            </svg>
                            {opt}
                        </span>
                    </label>
                ))}
            </div>
        );
    }
    if (field.type === "rating") {
        const safeId = id.replace(/[^a-zA-Z0-9]/g, "");
        return (
            <div className="flex">
                <style dangerouslySetInnerHTML={{ __html: `
                    .rating-container-${safeId} {
                        display: inline-flex;
                        flex-direction: row-reverse;
                    }
                    .rating-container-${safeId} input {
                        display: none;
                    }
                    .rating-container-${safeId} label {
                        cursor: pointer;
                        transition: color 0.3s;
                        color: #2d3748;
                    }
                    .rating-container-${safeId} label:before {
                        content: "\\2605";
                        font-size: 32px;
                        line-height: 1;
                    }
                    .rating-container-${safeId} input:checked ~ label,
                    .rating-container-${safeId} label:hover,
                    .rating-container-${safeId} label:hover ~ label {
                        color: #ffd700;
                        transition: color 0.3s;
                    }
                ` }} />
                <div className={`rating-container-${safeId}`}>
                    {[5, 4, 3, 2, 1].map((star) => (
                        <React.Fragment key={star}>
                            <input
                                type="radio"
                                id={`${id}-star${star}`}
                                name={id}
                                value={star.toString()}
                                checked={value === star.toString()}
                                onChange={() => onChange(star.toString())}
                            />
                            <label htmlFor={`${id}-star${star}`}></label>
                        </React.Fragment>
                    ))}
                </div>
            </div>
        );
    }
    if (field.type === "url") {
        return (
            <div className="relative">
                <LinkIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4a5568]" />
                <input
                    id={id}
                    type="url"
                    placeholder={field.placeholder || "https://..."}
                    value={(value as string) || ""}
                    onChange={(e) => onChange(e.target.value)}
                    className={`${base} pl-9`}
                />
            </div>
        );
    }
    if (field.type === "image") {
        return <ImageUploadField field={field} id={id} value={value as string} onChange={onChange} />;
    }
    return null;
}

// ── Member form row ───────────────────────────────────────────────
interface MemberEntry {
    member_name: string;
    member_email: string;
    member_phone: string;
    member_college: string;
}

function MemberRow({
    index,
    member,
    onChange,
}: {
    index: number;
    member: MemberEntry;
    onChange: (field: keyof MemberEntry, val: string) => void;
}) {
    const base = "w-full rounded-sm border border-[rgba(0,229,255,0.18)] bg-[#07090f] px-3 py-2 text-[13px] text-[#f0f4ff] placeholder:text-[#4a5568] focus:outline-none focus:border-[#00e5ff] transition-colors";
    return (
        <div
            className="rounded-sm border border-[rgba(0,229,255,0.10)] bg-[#0d1117]/60 p-4"
        >
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#00e5ff] mb-3">
                Member {index + 1}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input placeholder="Full Name *" value={member.member_name} onChange={(e) => onChange("member_name", e.target.value)} className={base} />
                <input type="email" placeholder="Email *" value={member.member_email} onChange={(e) => onChange("member_email", e.target.value)} className={base} />
                <input type="tel" placeholder="Mobile Number *" value={member.member_phone} onChange={(e) => onChange("member_phone", e.target.value)} className={base} />
                <input placeholder="College Name *" value={member.member_college} onChange={(e) => onChange("member_college", e.target.value)} className={base} />
            </div>
        </div>
    );
}

// ── Success screen ────────────────────────────────────────────────
function SuccessScreen({ code, eventTitle, type, eventType }: { code: string; eventTitle: string; type: "individual" | "team", eventType?: string }) {
    if (eventType === "feedback") {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center text-center py-10 px-6"
            >
                <div
                    className="w-20 h-20 rounded-full grid place-items-center mb-6"
                    style={{
                        background: "rgba(34,197,94,0.12)",
                        border: "1px solid rgba(34,197,94,0.45)",
                        boxShadow: "0 0 30px rgba(34,197,94,0.2)",
                    }}
                >
                    <CheckCircle2 size={36} className="text-[#22c55e]" />
                </div>
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#22c55e] mb-2">
                    // SUBMISSION SUCCESSFUL
                </div>
                <h2 className="font-sans font-bold text-[#f0f4ff] text-[22px] tracking-tight mb-3">
                    Thanks for your valuable time
                </h2>
                <p className="text-[#8b9ab0] text-[13.5px] max-w-[38ch] leading-relaxed mb-8">
                    Your feedback for <span className="text-[#f0f4ff]">{eventTitle}</span> has been securely recorded.
                </p>
                <Link
                    href="/events"
                    className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-[#8b9ab0] hover:text-[#00e5ff] transition-colors"
                >
                    <ArrowLeft size={12} />
                    Back to Events
                </Link>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center text-center py-10 px-6"
        >
            <div
                className="w-20 h-20 rounded-full grid place-items-center mb-6"
                style={{
                    background: "rgba(34,197,94,0.12)",
                    border: "1px solid rgba(34,197,94,0.45)",
                    boxShadow: "0 0 30px rgba(34,197,94,0.2)",
                }}
            >
                <CheckCircle2 size={36} className="text-[#22c55e]" />
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#22c55e] mb-2">
                REGISTRATION CONFIRMED
            </div>
            <h2 className="font-sans font-bold text-[#f0f4ff] text-[22px] tracking-tight mb-3">
                You&apos;re in!
            </h2>
            <p className="text-[#8b9ab0] text-[13.5px] max-w-[38ch] leading-relaxed mb-8">
                Your {type === "team" ? "team " : ""}registration for <span className="text-[#f0f4ff]">{eventTitle}</span> has been confirmed.
            </p>
            <div
                className="rounded-sm border px-8 py-5 mb-4"
                style={{ borderColor: "rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.04)" }}
            >
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#ef4444] mb-2">Your Verification Code</div>
                <div className="font-mono text-[32px] font-bold tracking-[0.22em] text-[#ef4444]" style={{ textShadow: "0 0 20px rgba(239,68,68,0.4)" }}>
                    {code}
                </div>
                <p className="font-mono text-[10px] text-[#ef4444] mt-2">Write it down, you only see this once</p>
            </div>
            <Link
                href="/events"
                className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-[#8b9ab0] hover:text-[#00e5ff] transition-colors"
            >
                <ArrowLeft size={12} />
                Back to Events
            </Link>
        </motion.div>
    );
}

// ── Main component ────────────────────────────────────────────────
interface Props {
    event: Event;
    registrationCount: number;
    isPast: boolean;
}

export default function EventDetailClient({ event, registrationCount, isPast }: Props) {
    const supabase = useMemo(() => createClient(), []);

    // Cover image
    const [imgFailed, setImgFailed] = useState(false);
    const coverUrl = useMemo((): string | null => {
        const raw = event.cover_image_url;
        if (!raw) return null;
        if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
        const norm = raw.replace(/^\/+/, "").replace(/^event-images\//, "");
        return supabase.storage.from("event-images").getPublicUrl(norm).data.publicUrl;
    }, [event.cover_image_url, supabase]);
    const showImg = !!coverUrl && !imgFailed;

    // Registration type toggle
    const [regType, setRegType] = useState<"individual" | "team">(
        event.registration_mode === "team" ? "team" : "individual"
    );

    // Leader form
    const [leaderName, setLeaderName] = useState("");
    const [leaderEmail, setLeaderEmail] = useState("");
    const [leaderPhone, setLeaderPhone] = useState("");
    const [leaderCollege, setLeaderCollege] = useState("");
    const [teamName, setTeamName] = useState("");

    // Team members
    const defaultMembers = useCallback((): MemberEntry[] => {
        const count = Math.max(0, (event.team_size_min ?? 2) - 1); // -1 because leader is counted
        return Array.from({ length: count }, () => ({ member_name: "", member_email: "", member_phone: "", member_college: "" }));
    }, [event.team_size_min]);
    const [teamMembers, setTeamMembers] = useState<MemberEntry[]>(defaultMembers());

    // Custom field responses
    const [customResponses, setCustomResponses] = useState<Record<string, string | string[]>>({});

    // Submit state
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successCode, setSuccessCode] = useState<string | null>(null);
    const [_hp, setHp] = useState(""); // honeypot

    // Derived state
    const totalMembers = teamMembers.length + 1; // +1 for leader
    const canAddMember = totalMembers < (event.team_size_max ?? 10);
    const canRemoveMember = totalMembers > (event.team_size_min ?? 2);

    const capacityFilled = event.max_registrations
        ? (registrationCount / event.max_registrations) * 100
        : 0;
    const isFull = event.max_registrations ? registrationCount >= event.max_registrations : false;
    const isDeadlinePassed = event.registration_deadline ? new Date(event.registration_deadline) < new Date() : false;
    const registrationClosed = isFull || isDeadlinePassed;

    const customFields = (event.custom_fields ?? []) as unknown as CustomField[];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading) return; // prevent double-submit
        setError(null);

        // ── Client-side validation ─────────────────────────────────
        // Core required fields
        if (!leaderName.trim()) { setError("Full name is required."); return; }
        if (!leaderCollege.trim()) { setError("College name is required."); return; }
        if (!leaderPhone.trim()) { setError("Mobile number is required."); return; }
        if (!leaderEmail.trim()) { setError("Email address is required."); return; }
        if (regType === "team" && !teamName.trim()) { setError("Team name is required."); return; }

        // Team member required fields
        if (regType === "team") {
            for (let i = 0; i < teamMembers.length; i++) {
                const m = teamMembers[i];
                if (!m.member_name.trim()) { setError(`Member ${i + 1}: Full name is required.`); return; }
                if (!m.member_email.trim()) { setError(`Member ${i + 1}: Email is required.`); return; }
                if (!m.member_phone.trim()) { setError(`Member ${i + 1}: Mobile number is required.`); return; }
                if (!m.member_college.trim()) { setError(`Member ${i + 1}: College name is required.`); return; }
            }
        }

        // Required custom fields
        for (const f of customFields) {
            if (!f.required) continue;
            const val = customResponses[f.id];
            const isEmpty =
                val === undefined ||
                val === null ||
                val === "" ||
                (Array.isArray(val) && val.length === 0);
            if (isEmpty) {
                setError(`"${f.label}" is required.`);
                return;
            }
        }
        // ────────────────────────────────────────────────────────────

        setLoading(true);
        try {
            const body = {
                event_id: event.id,
                registration_type: regType,
                leader_name: leaderName,
                leader_email: leaderEmail,
                leader_phone: leaderPhone,
                leader_college: leaderCollege,
                team_name: regType === "team" ? teamName : undefined,
                team_members: regType === "team" ? teamMembers : [],
                custom_responses: customResponses,
                website: _hp, // honeypot
            };
            const res = await fetch("/api/events/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error ?? "Registration failed.");
            setSuccessCode(json.registration_code);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred.");
        } finally {
            setLoading(false);
        }
    };

    const [timeLeft, setTimeLeft] = useState<{ d: number; h: number; m: number; s: number } | null>(null);

    // Clear error automatically when user edits the form
    useEffect(() => {
        if (error) setError(null);
    }, [leaderName, leaderCollege, leaderPhone, leaderEmail, teamName, teamMembers, customResponses]);

    useEffect(() => {
        if (!event.registration_deadline) {
            setTimeLeft(null);
            return;
        }
        
        const tick = () => {
            const diff = new Date(event.registration_deadline!).getTime() - new Date().getTime();
            if (diff <= 0) {
                setTimeLeft({ d: 0, h: 0, m: 0, s: 0 });
                return;
            }
            const d = Math.floor(diff / (1000 * 60 * 60 * 24));
            const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
            const m = Math.floor((diff / 1000 / 60) % 60);
            const s = Math.floor((diff / 1000) % 60);
            setTimeLeft({ d, h, m, s });
        };
        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [event.registration_deadline]);

    const inputBase = "w-full bg-[#0d1117] border border-[rgba(255,255,255,0.05)] text-[#f0f4ff] text-[13px] rounded-sm px-3.5 py-2.5 focus:outline-none focus:border-[#00e5ff] focus:ring-1 focus:ring-[#00e5ff]/20 placeholder:text-[#4a5568] transition-colors";

    return (
        <div className="relative min-h-screen bg-[#07090f] pt-[calc(var(--nav-height)+1.5rem)] pb-24">
            <style dangerouslySetInnerHTML={{ __html: D3ButtonStyles }} />
            {/* Grid bg */}
            <div
                className="fixed inset-0 pointer-events-none animate-grid-pan"
                style={{
                    backgroundImage: "linear-gradient(rgba(0,229,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,229,255,0.03) 1px,transparent 1px)",
                    backgroundSize: "40px 40px",
                }}
            />
            <div className="fixed inset-0 pointer-events-none scanline animate-scanline-pan opacity-40" />

            <div className="relative z-10 max-w-[1200px] mx-auto px-4 sm:px-8">
                {/* Back link */}
                <Link
                    href="/events"
                    className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[#4a5568] hover:text-[#00e5ff] transition-colors mb-8"
                >
                    <ArrowLeft size={12} />
                    All Events
                </Link>

                <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-8 lg:gap-12 items-start">
                    {/* ── LEFT: Event Info ─────────────────────────────────── */}
                    <div className="lg:sticky lg:top-[calc(var(--nav-height)+1.5rem)]">
                        {/* Poster */}
                        <div
                            className="w-full overflow-hidden rounded-md border"
                            style={{ borderColor: "rgba(0,229,255,0.2)" }}
                        >
                            {showImg ? (
                                <img
                                    src={coverUrl!}
                                    alt={event.title}
                                    className="w-full h-auto block"
                                    onError={() => setImgFailed(true)}
                                />
                            ) : (
                                <div
                                    className="w-full aspect-[4/3] flex items-center justify-center"
                                    style={{
                                        background: `hsl(${EVENT_TYPES[event.event_type]?.bg ?? "192"} 65% 10%)`,
                                    }}
                                >
                                    <span className="font-mono text-[13px] uppercase tracking-[0.2em]" style={{ color: EVENT_TYPES[event.event_type]?.fg ?? "#00e5ff" }}>
                                        {event.event_type}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Event meta */}
                        <div className="mt-6 space-y-1">
                            <div className="flex items-center gap-2 font-mono text-[11px] text-[#8b9ab0] tracking-[0.06em]">
                                <Calendar size={12} className="text-[#00e5ff]/80 shrink-0" />
                                <span>{fmtDate(event.starts_at)}{event.ends_at && fmtDate(event.ends_at) !== fmtDate(event.starts_at) ? ` — ${fmtDate(event.ends_at)}` : ""}</span>
                            </div>
                            <div className="flex items-center gap-2 font-mono text-[11px] text-[#8b9ab0] tracking-[0.06em]">
                                <Clock size={12} className="text-[#00e5ff]/80 shrink-0" />
                                <span>{fmtTime(event.starts_at)}{event.ends_at ? ` – ${fmtTime(event.ends_at)}` : ""}</span>
                            </div>
                            {event.location && (
                                <div className="flex items-center gap-2 font-mono text-[11px] text-[#8b9ab0] tracking-[0.06em]">
                                    <MapPin size={12} className="text-[#00e5ff]/80 shrink-0" />
                                    <span>{event.location}</span>
                                </div>
                            )}
                        </div>

                        {/* Registration capacity */}
                        {event.max_registrations && (
                            <div className="mt-5">
                                <div className="flex justify-between font-mono text-[10px] uppercase tracking-[0.14em] mb-1.5">
                                    <span className="text-[#4a5568]">Spots filled</span>
                                    <span style={{ color: isFull ? "#ef4444" : "#00e5ff" }}>
                                        {registrationCount} / {event.max_registrations}
                                    </span>
                                </div>
                                <div className="h-1 rounded-full bg-[#111820] overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all"
                                        style={{
                                            width: `${Math.min(100, capacityFilled)}%`,
                                            background: isFull
                                                ? "#ef4444"
                                                : capacityFilled > 80
                                                    ? "#f59e0b"
                                                    : "#00e5ff",
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Countdown */}
                        {timeLeft && (
                            <div className="mt-8 mb-4 p-4 rounded-lg bg-[rgba(0,229,255,0.03)] border border-[rgba(0,229,255,0.15)] w-full">
                                <div className="text-[10px] uppercase tracking-[0.2em] font-mono text-[#00e5ff] mb-3 font-semibold text-center">Registration Deadline</div>
                                <div className="flex items-center justify-center gap-6 sm:gap-8 text-center">
                                    <div className="flex flex-col">
                                        <span className="font-mono text-2xl text-[#f0f4ff] font-bold">{timeLeft.d.toString().padStart(2, '0')}</span>
                                        <span className="text-[10px] uppercase tracking-wider text-[#4a5568] mt-1">Days</span>
                                    </div>
                                    <div className="text-[#00e5ff]/30 font-mono text-2xl pb-4">:</div>
                                    <div className="flex flex-col">
                                        <span className="font-mono text-2xl text-[#f0f4ff] font-bold">{timeLeft.h.toString().padStart(2, '0')}</span>
                                        <span className="text-[10px] uppercase tracking-wider text-[#4a5568] mt-1">Hours</span>
                                    </div>
                                    <div className="text-[#00e5ff]/30 font-mono text-2xl pb-4">:</div>
                                    <div className="flex flex-col">
                                        <span className="font-mono text-2xl text-[#f0f4ff] font-bold">{timeLeft.m.toString().padStart(2, '0')}</span>
                                        <span className="text-[10px] uppercase tracking-wider text-[#4a5568] mt-1">Mins</span>
                                    </div>
                                    <div className="text-[#00e5ff]/30 font-mono text-2xl pb-4">:</div>
                                    <div className="flex flex-col">
                                        <span className="font-mono text-2xl text-[#f0f4ff] font-bold">{timeLeft.s.toString().padStart(2, '0')}</span>
                                        <span className="text-[10px] uppercase tracking-wider text-[#4a5568] mt-1">Secs</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Description */}
                        <div className="mt-6">
                            <h1 className="font-sans font-extrabold text-[#f0f4ff] text-[24px] tracking-tight leading-snug mb-3">
                                {event.title}
                            </h1>
                            <p className="text-[#8b9ab0] text-[13.5px] leading-relaxed whitespace-pre-line">
                                {event.description}
                            </p>
                        </div>
                    </div>

                    {/* ── RIGHT: Registration Form ─────────────────────────── */}
                    <div
                        className="relative w-full bg-[#111820]/90 backdrop-blur-md rounded-md corner-ticks"
                        style={{
                            border: "1px solid rgba(0,229,255,0.28)",
                            boxShadow: "0 0 0 1px rgba(0,229,255,0.06), 0 24px 60px -24px rgba(0,0,0,0.8), 0 0 40px -16px rgba(0,229,255,0.35)",
                        }}
                    >
                        <span className="ct-tr" /><span className="ct-bl" />
                        <div
                            className="absolute inset-x-0 top-0 h-px pointer-events-none rounded-t-md"
                            style={{ background: "linear-gradient(90deg, transparent, rgba(0,229,255,0.6), transparent)" }}
                        />

                        {successCode ? (
                            <SuccessScreen code={successCode} eventTitle={event.title} type={regType} eventType={event.event_type} />
                        ) : isPast ? (
                            <div className="p-8 text-center">
                                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#4a5568] mb-3">// EVENT CONCLUDED</div>
                                <p className="text-[#8b9ab0] text-[13.5px]">This event has ended. Check the event report for highlights.</p>
                                <Link
                                    href={`/events/${event.id}/report`}
                                    className="mt-5 inline-flex items-center gap-2 h-9 px-5 rounded-sm font-mono text-[11px] uppercase tracking-[0.14em] bg-[#00e5ff] text-[#07090f] hover:bg-[#00e5ff]/90 transition-colors"
                                >
                                    View Event Report
                                </Link>
                            </div>
                        ) : event.registration_mode === "external" && event.external_registration_url ? (
                            <div className="p-8 text-center">
                                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#00e5ff] mb-3">// EXTERNAL REGISTRATION</div>
                                <p className="text-[#8b9ab0] text-[13.5px] mb-5">This event uses an external registration platform.</p>
                                <a
                                    href={event.external_registration_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 h-10 px-6 rounded-sm font-mono text-[11px] uppercase tracking-[0.14em] bg-[#00e5ff] text-[#07090f] hover:bg-[#00e5ff]/90 transition-colors"
                                >
                                    {event.event_type === "feedback" ? "Submit" : "Register Now"} <ExternalLink size={12} />
                                </a>
                            </div>
                        ) : event.registration_mode === "none" ? (
                            <div className="p-8 text-center">
                                <div className="h-10 w-10 mx-auto mb-4 grid place-items-center rounded-sm border border-[rgba(34,197,94,0.4)] bg-[rgba(34,197,94,0.08)]">
                                    <CheckCircle2 size={20} className="text-[#22c55e]" />
                                </div>
                                <div className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-[#22c55e] mb-2">Open to All</div>
                                <p className="text-[#8b9ab0] text-[13px]">No registration required. Just show up!</p>
                            </div>
                        ) : registrationClosed ? (
                            <div className="p-8 text-center">
                                <div className="h-10 w-10 mx-auto mb-4 grid place-items-center rounded-sm border border-[rgba(239,68,68,0.4)] bg-[rgba(239,68,68,0.06)]">
                                    <Lock size={20} className="text-[#ef4444]" />
                                </div>
                                <div className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-[#ef4444] mb-2">
                                    {isFull ? "Registrations Full" : isDeadlinePassed ? "Registration Closed" : "Registration Closed"}
                                </div>
                                <p className="text-[#8b9ab0] text-[13px]">
                                    {isFull ? "All spots have been filled for this event." : "The registration window for this event has closed."}
                                </p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} noValidate className="p-6 sm:p-8 space-y-6">
                                <div>
                                    {event.event_type !== 'feedback' && (
                                        <div className="inline-flex items-center px-2 py-1 rounded-sm bg-[rgba(0,229,255,0.1)] border border-[rgba(0,229,255,0.3)] font-mono text-[9.5px] uppercase tracking-[0.2em] text-[#00e5ff] mb-3 font-semibold">
                                            REGISTRATION FORM
                                        </div>
                                    )}
                                    <h2 className="font-sans font-bold text-[#f0f4ff] text-[20px] tracking-tight">
                                        {event.title}
                                    </h2>
                                </div>

                                {/* Registration type toggle */}
                                {event.registration_mode === "both" && (
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            
                                            <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#8b9ab0] font-medium">Registration Type</span>
                                        </div>
                                        <div className="grid grid-cols-2 rounded-sm border border-[rgba(0,229,255,0.15)] bg-[#07090f]/60 p-1">
                                            {[
                                                { v: "individual" as const, label: "Individual", icon: User },
                                                { v: "team" as const, label: "Team", icon: Users },
                                            ].map(({ v, label, icon: Icon }) => (
                                                <button
                                                    key={v}
                                                    type="button"
                                                    onClick={() => { setRegType(v); setTeamMembers(defaultMembers()); }}
                                                    className="flex items-center justify-center gap-2 py-2.5 rounded-sm font-mono text-[11px] uppercase tracking-[0.14em] transition-all"
                                                    style={{
                                                        background: regType === v ? "rgba(0,229,255,0.15)" : "transparent",
                                                        color: regType === v ? "#00e5ff" : "#4a5568",
                                                        border: regType === v ? "1px solid rgba(0,229,255,0.4)" : "1px solid transparent",
                                                    }}
                                                >
                                                    <Icon size={13} />
                                                    {label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Team name */}
                                {regType === "team" && (
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            
                                            <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#8b9ab0] font-medium">Team Name *</span>
                                        </div>
                                        <input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="e.g. Team Vajra" className={inputBase} />
                                    </div>
                                )}

                                {/* Leader / Individual fields */}
                                <div className="space-y-3 mt-2">
                                    <div className="flex items-center gap-2 mb-1">
                                        
                                        <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#8b9ab0] font-medium">
                                            {regType === "team" ? "Team Leader Details" : "Your Details"}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <input value={leaderName} onChange={(e) => setLeaderName(e.target.value)} placeholder="Full Name *" className={inputBase} />
                                        <input value={leaderCollege} onChange={(e) => setLeaderCollege(e.target.value)} placeholder="College Name *" className={inputBase} />
                                        <input type="tel" value={leaderPhone} onChange={(e) => setLeaderPhone(e.target.value)} placeholder="Mobile Number *" className={inputBase} />
                                        <input type="email" value={leaderEmail} onChange={(e) => setLeaderEmail(e.target.value)} placeholder="Email Address *" className={inputBase} />
                                    </div>
                                </div>

                                {/* Team members */}
                                {regType === "team" && (
                                <div className="space-y-3 mt-2">
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                            
                                            <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#8b9ab0] font-medium">
                                                Team Members ({totalMembers} total, incl. leader)
                                                {event.team_size_strict
                                                    ? ` — exactly ${event.team_size_max} required`
                                                    : ` — ${event.team_size_min}–${event.team_size_max} allowed`
                                                }
                                            </span>
                                        </div>
                                            {!event.team_size_strict && (
                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => canRemoveMember && setTeamMembers((m) => m.slice(0, -1))}
                                                        disabled={!canRemoveMember}
                                                        className="w-7 h-7 rounded-sm border grid place-items-center disabled:opacity-30 transition-colors"
                                                        style={{ borderColor: "rgba(0,229,255,0.25)", color: "#8b9ab0" }}
                                                    >
                                                        <Minus size={12} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => canAddMember && setTeamMembers((m) => [...m, { member_name: "", member_email: "", member_phone: "", member_college: "" }])}
                                                        disabled={!canAddMember}
                                                        className="w-7 h-7 rounded-sm border grid place-items-center disabled:opacity-30 transition-colors"
                                                        style={{ borderColor: "rgba(0,229,255,0.25)", color: "#8b9ab0" }}
                                                    >
                                                        <Plus size={12} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <AnimatePresence>
                                            {teamMembers.map((member, i) => (
                                                <motion.div
                                                    key={i}
                                                    initial={{ opacity: 0, y: 8 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -8 }}
                                                >
                                                    <MemberRow
                                                        index={i}
                                                        member={member}
                                                        onChange={(field, val) => {
                                                            setTeamMembers((m) => {
                                                                const copy = [...m];
                                                                copy[i] = { ...copy[i], [field]: val };
                                                                return copy;
                                                            });
                                                        }}
                                                    />
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                    </div>
                                )}

                                {/* Custom fields */}
                                {customFields.length > 0 && (
                                <div className="space-y-5 border-t border-[rgba(255,255,255,0.05)] pt-6 mt-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        
                                        <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#8b9ab0] font-medium">Additional Information</span>
                                    </div>
                                        {customFields.map((field) => (
                                            <div key={field.id}>
                                                <label className="block text-[13px] font-medium text-[#8b9ab0] mb-2">
                                                    {field.label}{field.required && <span className="text-[#ef4444] ml-1">*</span>}
                                                </label>
                                                <CustomFieldInput
                                                    field={field}
                                                    value={customResponses[field.id] ?? (field.type === "checkbox" ? [] : "")}
                                                    onChange={(v) => setCustomResponses((r) => ({ ...r, [field.id]: v }))}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Honeypot — hidden from real users */}
                                <div className="absolute opacity-0 pointer-events-none h-0 overflow-hidden" aria-hidden="true">
                                    <input tabIndex={-1} autoComplete="off" value={_hp} onChange={(e) => setHp(e.target.value)} />
                                </div>

                                {/* Error */}
                                {error && (
                                    <div className="flex items-start gap-2.5 rounded-sm border border-[rgba(239,68,68,0.35)] bg-[rgba(239,68,68,0.06)] px-4 py-3">
                                        <AlertCircle size={14} className="text-[#ef4444] shrink-0 mt-0.5" />
                                        <p className="text-[#ef4444] text-[13px]">{error}</p>
                                    </div>
                                )}

                                {/* Deadline warning */}
                                {event.registration_deadline && !isDeadlinePassed && (
                                    <p className="font-mono text-[10.5px] text-[#f59e0b]" style={{ textShadow: "0 0 8px rgba(245,158,11,0.3)" }}>
                                        ⚡ Registration closes {fmtDate(event.registration_deadline)} at {fmtTime(event.registration_deadline)}
                                    </p>
                                )}

                                {/* Submit */}
                                <div className="d3wrapper">
                                    <div className="d3cover" />
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="d3btn"
                                    >
                                        {loading ? (
                                            <><Loader2 size={14} className="animate-spin" /> {event.event_type === "feedback" ? "Submitting..." : "Registering..."}</>
                                        ) : (
                                            event.event_type === "feedback" ? "Submit" : (regType === "team" ? "Register Team" : "Register Now")
                                        )}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
