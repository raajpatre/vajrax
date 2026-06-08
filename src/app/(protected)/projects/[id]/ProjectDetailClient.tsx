"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
    ArrowLeft, Settings2, ExternalLink, X, Plus, Check,
    UserPlus, Loader2, Mail, AlertCircle, CheckCircle2, ImagePlus,
} from "lucide-react";
import Link from "next/link";
import { useUser } from "@/lib/hooks/useUser";
import { createClient } from "@/lib/supabase/client";
import { removeProjectMember } from "@/actions/project-members";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProjectMember {
    id: string;
    role: string | null;
    joined_at: string | null;
    user: { id: string; display_name: string; avatar_url: string | null; username: string | null };
}

interface ProjectUpdate {
    id: string;
    title: string;
    content: string | null;
    version_tag: string | null;
    source_urls: string[] | null;
    image_urls: string[] | null;
    video_urls: string[] | null;
    created_at: string | null;
    author: { id: string; display_name: string; avatar_url: string | null };
}

interface ProjectData {
    id: string;
    title: string;
    description: string;
    tech_stack: string[] | null;
    status: string;
    cover_image_url: string | null;
    created_at: string;
    created_by: string | null;
    creator?: { id: string; display_name: string; avatar_url: string | null; username: string | null } | null;
}

// ─── Status config ─────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; bg: string; border: string; fg: string }> = {
    in_progress: { label: "IN PROGRESS", bg: "rgba(245,158,11,0.15)",  border: "rgba(245,158,11,0.55)",  fg: "#f59e0b" },
    ongoing:     { label: "IN PROGRESS", bg: "rgba(245,158,11,0.15)",  border: "rgba(245,158,11,0.55)",  fg: "#f59e0b" },
    completed:   { label: "COMPLETED",   bg: "rgba(34,197,94,0.12)",   border: "rgba(34,197,94,0.50)",   fg: "#22c55e" },
    planning:    { label: "PLANNING",    bg: "rgba(0,229,255,0.10)",   border: "rgba(0,229,255,0.50)",   fg: "#00e5ff" },
    archived:    { label: "ARCHIVED",    bg: "rgba(139,154,176,0.10)", border: "rgba(139,154,176,0.45)", fg: "#8b9ab0" },
    on_hold:     { label: "ON HOLD",     bg: "rgba(139,154,176,0.10)", border: "rgba(139,154,176,0.45)", fg: "#8b9ab0" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function idHue(id: string) {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffff;
    return h % 360;
}

function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
}

function fmtTs(iso: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase()
        + " · "
        + new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function initials(name: string) {
    return name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
}

// ─── Avatar ────────────────────────────────────────────────────────────────────

function MemberAvatar({ name, avatarUrl, userId, size = 32 }: { name: string; avatarUrl: string | null; userId: string; size?: number }) {
    const hue = idHue(userId);
    const tint = `hsl(${hue} 90% 60%)`;
    const c1   = `hsl(${hue} 60% 18%)`;
    const c2   = `hsl(${(hue + 30) % 360} 70% 8%)`;
    const id   = useMemo(() => Math.random().toString(36).slice(2), []);
    const fs   = Math.max(9, Math.round(size * 0.34));

    if (avatarUrl) {
        return (
            <span className="relative inline-grid place-items-center rounded-full overflow-hidden shrink-0"
                style={{ width: size, height: size, border: `1px solid ${tint}88` }}>
                <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
            </span>
        );
    }
    return (
        <span className="relative inline-grid place-items-center rounded-full overflow-hidden shrink-0"
            style={{ width: size, height: size, border: `1px solid ${tint}88` }}>
            <svg viewBox="0 0 32 32" className="absolute inset-0 w-full h-full">
                <defs>
                    <linearGradient id={`pda-${id}`} x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor={c1} /><stop offset="100%" stopColor={c2} />
                    </linearGradient>
                </defs>
                <rect width="32" height="32" fill={`url(#pda-${id})`} />
                <path d="M0 24 L8 24 L10 22 L32 22" stroke={tint} strokeWidth="0.8" opacity="0.3" fill="none" />
                <circle cx="8" cy="24" r="1" fill={tint} opacity="0.7" />
            </svg>
            <span className="relative font-mono font-semibold tabular-nums"
                style={{ color: tint, fontSize: fs, letterSpacing: "0.06em" }}>
                {initials(name)}
            </span>
        </span>
    );
}

// ─── Cover fallback ────────────────────────────────────────────────────────────

function CoverFallback({ hue }: { hue: number }) {
    const tint = `hsl(${hue} 90% 60%)`;
    const c1   = `hsl(${hue} 60% 12%)`;
    const c2   = `hsl(${(hue + 30) % 360} 70% 7%)`;
    const id   = useMemo(() => Math.random().toString(36).slice(2), []);
    return (
        <svg viewBox="0 0 1200 400" preserveAspectRatio="xMidYMid slice" className="w-full h-full block">
            <defs>
                <linearGradient id={`pdc-${id}`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor={c1} /><stop offset="100%" stopColor={c2} />
                </linearGradient>
                <pattern id={`pdp-${id}`} width="40" height="40" patternUnits="userSpaceOnUse">
                    <circle cx="1" cy="1" r="0.8" fill={tint} opacity="0.18" />
                </pattern>
                <radialGradient id={`pdr-${id}`} cx="0.25" cy="0.3" r="0.7">
                    <stop offset="0%" stopColor={tint} stopOpacity="0.35" />
                    <stop offset="100%" stopColor={tint} stopOpacity="0" />
                </radialGradient>
            </defs>
            <rect width="1200" height="400" fill={`url(#pdc-${id})`} />
            <rect width="1200" height="400" fill={`url(#pdp-${id})`} />
            <rect width="1200" height="400" fill={`url(#pdr-${id})`} />
            <g stroke={tint} fill="none" strokeWidth="1" opacity="0.25">
                <path d="M0 120 L200 120 L220 140 L500 140" />
                <path d="M700 280 L900 280 L920 300 L1200 300" />
                <path d="M500 140 L500 400" /><path d="M920 300 L920 0" />
                <circle cx="200" cy="120" r="3" fill={tint} />
                <circle cx="900" cy="280" r="3" fill={tint} />
            </g>
            <path d="M0 0 H24 M0 0 V24"       stroke={tint} strokeWidth="2" opacity="0.85" />
            <path d="M1200 0 H1176 M1200 0 V24" stroke={tint} strokeWidth="2" opacity="0.6" />
            <path d="M0 400 H24 M0 400 V376"   stroke={tint} strokeWidth="2" opacity="0.6" />
            <path d="M1200 400 H1176 M1200 400 V376" stroke={tint} strokeWidth="2" opacity="0.85" />
        </svg>
    );
}

// ─── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ kicker, children }: { kicker: string; children: React.ReactNode }) {
    return (
        <div className="flex items-end gap-3 mb-5">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#00e5ff]/80 shrink-0">{kicker}</span>
            <h2 className="font-sans font-bold text-[#f0f4ff] text-[18px] tracking-tight leading-none shrink-0">{children}</h2>
            <span className="flex-1 h-px bg-[rgba(0,229,255,0.12)]" />
        </div>
    );
}

// ─── Input helpers ─────────────────────────────────────────────────────────────

const inputCls = "focus-cyan w-full h-10 bg-[#0d1117] text-[13px] text-[#f0f4ff] placeholder:text-[#4a5568] border border-[rgba(0,229,255,0.12)] rounded-md transition-shadow px-3";
const textareaCls = "focus-cyan w-full bg-[#0d1117] text-[13px] text-[#f0f4ff] placeholder:text-[#4a5568] border border-[rgba(0,229,255,0.12)] rounded-md transition-shadow px-3 py-2.5 resize-none leading-relaxed";

// ─── YouTube helpers ───────────────────────────────────────────────────────────

function extractYouTubeId(url: string): string | null {
    try {
        const u = new URL(url.trim());
        if (u.hostname === "youtu.be") return u.pathname.slice(1).split("?")[0] || null;
        if (u.hostname.includes("youtube.com")) return u.searchParams.get("v");
        return null;
    } catch { return null; }
}

// ─── Log image thumbnail ────────────────────────────────────────────────────────

function LogThumb({ url, title, onClick }: { url: string; title: string; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="relative overflow-hidden rounded-sm border border-[rgba(0,229,255,0.12)] hover:border-[rgba(0,229,255,0.55)] transition-colors cursor-zoom-in"
            style={{ width: 72, height: 48 }}
        >
            <img src={url} alt={title} className="w-full h-full object-cover" />
        </button>
    );
}

// ─── Timeline entry ────────────────────────────────────────────────────────────

function LogEntry({ update, isFirst, onOpenImg }: {
    update: ProjectUpdate;
    isFirst: boolean;
    onOpenImg: (url: string) => void;
}) {
    return (
        <div className="relative pl-8">
            <div className="absolute left-[7px] top-0 bottom-0 w-px bg-[rgba(0,229,255,0.20)]" />
            <div className="absolute left-[3px] top-1.5 w-[9px] h-[9px] rounded-full border-2"
                style={{
                    borderColor: "#00e5ff",
                    background: isFirst ? "#00e5ff" : "#0d1117",
                    boxShadow: isFirst ? "0 0 10px rgba(0,229,255,0.8)" : "none",
                }} />

            <div className="pb-8">
                <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
                    {update.version_tag && (
                        <>
                            <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-[#00e5ff]">{update.version_tag}</span>
                            <span className="text-[#4a5568] font-mono text-[10px]">·</span>
                        </>
                    )}
                    <h3 className="font-sans font-semibold text-[#f0f4ff] text-[14.5px] tracking-tight leading-none">{update.title}</h3>
                </div>

                {update.content && (
                    <p className="text-[#8b9ab0] text-[13px] leading-relaxed whitespace-pre-wrap">{update.content}</p>
                )}

                {update.image_urls && update.image_urls.length > 0 && (
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                        {update.image_urls.map((url) => (
                            <LogThumb key={url} url={url} title={update.title} onClick={() => onOpenImg(url)} />
                        ))}
                    </div>
                )}

                {update.video_urls && update.video_urls.length > 0 && (
                    <div className="mt-3 space-y-3">
                        {update.video_urls.map((url) => {
                            const ytId = extractYouTubeId(url);
                            if (!ytId) return null;
                            return (
                                <div key={url} className="overflow-hidden rounded-md border border-[rgba(245,158,11,0.25)]" style={{ aspectRatio: "16/9" }}>
                                    <iframe
                                        src={`https://www.youtube.com/embed/${ytId}?rel=0`}
                                        title={update.title}
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                        className="w-full h-full border-0"
                                    />
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className="flex items-center gap-4 mt-3 flex-wrap">
                    {update.source_urls && update.source_urls.map((url) => (
                        <a key={url} href={url} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#8b9ab0] hover:text-[#00e5ff] transition-colors">
                            <ExternalLink size={11} />Source
                        </a>
                    ))}
                    <span className="font-mono text-[10.5px] text-[#4a5568] tracking-[0.06em]">
                        {update.author.display_name} · {fmtTs(update.created_at)}
                    </span>
                </div>
            </div>
        </div>
    );
}

// ─── Add Update form ───────────────────────────────────────────────────────────

function AddUpdateForm({ onSubmit, posting }: {
    onSubmit: (data: { title: string; content: string; versionTag: string; sourceUrls: string; imageUrls: string; videoUrls: string }) => void;
    posting: boolean;
}) {
    const [open, setOpen] = useState(false);
    const [title,        setTitle]        = useState("");
    const [content,      setContent]      = useState("");
    const [versionTag,   setVersionTag]   = useState("");
    const [sourceUrls,   setSourceUrls]   = useState("");
    const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
    const [uploading,    setUploading]    = useState(false);
    const [videoUrls,    setVideoUrls]    = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const canSubmit = title.trim().length > 0;

    const handleImageFiles = async (files: FileList) => {
        setUploading(true);
        const results: string[] = [];
        for (const file of Array.from(files)) {
            const fd = new FormData();
            fd.append("file", file);
            fd.append("folder", "project-updates");
            try {
                const res = await fetch("/api/cloudinary/upload", { method: "POST", body: fd });
                const json = await res.json();
                if (json.url) results.push(json.url as string);
            } catch {
                // silently skip failed uploads
            }
        }
        setUploadedUrls(prev => [...prev, ...results]);
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!canSubmit) return;
        onSubmit({ title, content, versionTag, sourceUrls, imageUrls: uploadedUrls.join("\n"), videoUrls });
        setTitle(""); setContent(""); setVersionTag(""); setSourceUrls(""); setUploadedUrls([]); setVideoUrls("");
        setOpen(false);
    };

    return (
        <div className="relative pl-8 mb-6">
            <div className="absolute left-[7px] top-0 bottom-0 w-px bg-[rgba(0,229,255,0.20)]" />
            <div className="absolute left-[3px] top-3 w-[9px] h-[9px] rounded-full border border-[rgba(0,229,255,0.12)] bg-[#0d1117]" />

            {!open ? (
                <button
                    onClick={() => setOpen(true)}
                    className="inline-flex items-center gap-2 h-8 px-3 border border-dashed border-[rgba(0,229,255,0.18)] rounded-sm text-[#8b9ab0] hover:text-[#00e5ff] hover:border-[rgba(0,229,255,0.45)] font-mono text-[11px] uppercase tracking-[0.14em] transition-colors"
                >
                    <Plus size={13} /> Log Update
                </button>
            ) : (
                <form
                    onSubmit={handleSubmit}
                    className="bg-[#111820] border border-[rgba(0,229,255,0.28)] rounded-md p-4 space-y-3"
                    style={{ animation: "fadeIn 180ms ease-out" }}
                >
                    <div className="font-mono text-[10px] uppercase tracking-[0.20em] text-[#00e5ff] mb-1">// NEW ENTRY</div>

                    <div>
                        <label className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8b9ab0] mb-1.5 block">
                            <span className="text-[#00e5ff]/70">$</span> Title
                        </label>
                        <input value={title} onChange={e => setTitle(e.target.value)} required
                            placeholder="gRPC server live on pit laptop"
                            className={inputCls} />
                    </div>

                    <div>
                        <label className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8b9ab0] mb-1.5 block">
                            <span className="text-[#00e5ff]/70">$</span> Content
                        </label>
                        <textarea value={content} onChange={e => setContent(e.target.value)} rows={3}
                            placeholder="Describe what changed and what was tested…"
                            className={textareaCls} />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8b9ab0] mb-1.5 flex items-center justify-between">
                                <span><span className="text-[#00e5ff]/70">$</span> Version Tag</span>
                                <span className="text-[#4a5568]">OPTIONAL</span>
                            </label>
                            <input value={versionTag} onChange={e => setVersionTag(e.target.value)}
                                placeholder="v0.4-beta"
                                className={inputCls} />
                        </div>
                        <div>
                            <label className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8b9ab0] mb-1.5 flex items-center justify-between">
                                <span><span className="text-[#00e5ff]/70">$</span> Source URL</span>
                                <span className="text-[#4a5568]">OPTIONAL</span>
                            </label>
                            <input value={sourceUrls} onChange={e => setSourceUrls(e.target.value)}
                                placeholder="https://github.com/…"
                                className={inputCls} />
                        </div>
                    </div>

                    <div>
                        <label className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8b9ab0] mb-1.5 flex items-center justify-between">
                            <span><span className="text-[#00e5ff]/70">$</span> Images</span>
                            <span className="text-[#4a5568]">OPTIONAL</span>
                        </label>
                        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
                            onChange={e => e.target.files && handleImageFiles(e.target.files)} />
                        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                            className="inline-flex items-center gap-2 h-8 px-3 border border-dashed border-[rgba(0,229,255,0.25)] rounded-sm text-[#8b9ab0] hover:text-[#00e5ff] hover:border-[rgba(0,229,255,0.50)] font-mono text-[10px] uppercase tracking-[0.14em] transition-colors disabled:opacity-50">
                            {uploading ? <Loader2 size={12} className="animate-spin" /> : <ImagePlus size={12} />}
                            {uploading ? "Uploading…" : "Upload Images"}
                        </button>
                        {uploadedUrls.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                                {uploadedUrls.map((url, i) => (
                                    <div key={i} className="relative w-16 h-16 rounded-sm overflow-hidden border border-[rgba(0,229,255,0.15)] group">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={url} alt="" className="w-full h-full object-cover" />
                                        <button type="button"
                                            onClick={() => setUploadedUrls(prev => prev.filter((_, j) => j !== i))}
                                            className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <X size={14} className="text-white" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8b9ab0] mb-1.5 flex items-center justify-between">
                            <span><span className="text-[#00e5ff]/70">$</span> YouTube Video URL</span>
                            <span className="text-[#4a5568]">OPTIONAL</span>
                        </label>
                        <input value={videoUrls} onChange={e => setVideoUrls(e.target.value)}
                            placeholder="https://youtube.com/watch?v=…"
                            className={inputCls} />
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                        <button type="submit" disabled={!canSubmit || posting}
                            className="inline-flex items-center gap-2 h-8 px-4 rounded-sm font-mono text-[11px] uppercase tracking-[0.14em] text-[#07090f] bg-[#00e5ff] hover:bg-[#00c7e0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                            {posting ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                            Add Update
                        </button>
                        <button type="button" onClick={() => setOpen(false)}
                            className="h-8 px-4 rounded-sm font-mono text-[11px] uppercase tracking-[0.14em] text-[#8b9ab0] hover:text-[#f0f4ff] transition-colors">
                            Cancel
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}

// ─── Member row ────────────────────────────────────────────────────────────────

function MemberRow({ m, canManage, removing, onRemove }: {
    m: ProjectMember;
    canManage: boolean;
    removing: boolean;
    onRemove: (id: string) => void;
}) {
    const [hover, setHover] = useState(false);
    const isLead = m.role === "lead";

    return (
        <div
            className="flex items-center gap-2.5 h-11 px-2 rounded-sm transition-colors"
            style={{ background: hover && canManage && !isLead ? "rgba(0,229,255,0.04)" : "transparent" }}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
        >
            <MemberAvatar name={m.user.display_name} avatarUrl={m.user.avatar_url} userId={m.user.id} size={32} />
            <div className="min-w-0 flex-1">
                <div className="font-sans font-medium text-[#f0f4ff] text-[13px] tracking-tight truncate">{m.user.display_name}</div>
                {m.role && (
                    <div className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[#4a5568] truncate">{m.role}</div>
                )}
            </div>
            {isLead && (
                <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] px-1.5 h-5 grid place-items-center rounded-sm border shrink-0"
                    style={{ color: "#f59e0b", borderColor: "rgba(245,158,11,0.45)", background: "rgba(245,158,11,0.10)" }}>
                    LEAD
                </span>
            )}
            {hover && canManage && !isLead && (
                <button
                    onClick={() => onRemove(m.id)}
                    disabled={removing}
                    className="grid place-items-center w-6 h-6 rounded-sm border border-[rgba(0,229,255,0.12)] text-[#4a5568] hover:text-[#ef4444] hover:border-[rgba(239,68,68,0.50)] shrink-0 transition-colors"
                >
                    {removing ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />}
                </button>
            )}
        </div>
    );
}

// ─── Lightbox ──────────────────────────────────────────────────────────────────

function Lightbox({ url, onClose }: { url: string; onClose: () => void }) {
    useEffect(() => {
        const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", fn);
        return () => window.removeEventListener("keydown", fn);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-[110]" style={{ animation: "fadeIn 160ms ease-out" }}>
            <div className="absolute inset-0 backdrop-blur-md cursor-pointer" style={{ background: "rgba(7,9,15,0.88)" }} onClick={onClose} />
            <div className="absolute inset-0 grid place-items-center p-8">
                <div className="relative w-full max-w-3xl bg-[#111820] border border-[rgba(0,229,255,0.28)] rounded-md overflow-hidden corner-ticks shadow-2xl">
                    <span className="ct-tr" /><span className="ct-bl" />
                    <button onClick={onClose}
                        className="absolute top-3 right-3 z-10 grid place-items-center w-8 h-8 border border-[rgba(0,229,255,0.12)] rounded-sm text-[#8b9ab0] hover:text-[#f0f4ff] bg-[#07090f]/80 transition-colors">
                        <X size={14} />
                    </button>
                    <div className="aspect-video w-full overflow-hidden">
                        <img src={url} alt="Preview" className="w-full h-full object-contain" />
                    </div>
                    <div className="px-5 py-3 border-t border-[rgba(0,229,255,0.12)] flex items-center justify-between">
                        <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-[#8b9ab0] truncate max-w-[70%]">{url}</span>
                        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#4a5568]">ESC to close</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function ProjectDetailClient({
    project,
    members: rawMembers,
    updates: rawUpdates,
}: {
    project: ProjectData;
    members: unknown[];
    updates: unknown[];
}) {
    const { user, isFaculty } = useUser();
    const supabase = useMemo(() => createClient(), []);

    const [members, setMembers] = useState<ProjectMember[]>(rawMembers as unknown as ProjectMember[]);
    const [updates, setUpdates] = useState<ProjectUpdate[]>(rawUpdates as unknown as ProjectUpdate[]);

    // Live refetch
    useEffect(() => {
        const refetch = async () => {
            const { data: memData } = await supabase
                .from("project_members")
                .select("id, role, joined_at, user:profiles!project_members_user_id_fkey(id, display_name, avatar_url, username)")
                .eq("project_id", project.id);
            if (memData) setMembers(memData.map(m => ({ ...m, user: m.user as unknown as ProjectMember["user"] })) as unknown as ProjectMember[]);

            const { data: updData } = await supabase
                .from("project_updates")
                .select("id, title, content, version_tag, source_urls, image_urls, video_urls, created_at, author:profiles!project_updates_author_id_fkey(id, display_name, avatar_url)")
                .eq("project_id", project.id)
                .order("created_at", { ascending: false });
            if (updData) setUpdates(updData.map(u => ({ ...u, author: u.author as unknown as ProjectUpdate["author"] })) as unknown as ProjectUpdate[]);
        };
        refetch();
    }, [supabase, project.id]);

    const isOwner = !!user?.id && project.created_by === user.id;
    const displayMembers = useMemo(() => {
        const creator = project.creator;
        if (!creator || members.some(m => m.user.id === creator.id)) return members;
        return [{ id: `owner-${project.id}`, role: "lead", joined_at: project.created_at, user: creator }, ...members];
    }, [members, project]);

    const isLead   = isOwner || members.some(m => m.user.id === user?.id && m.role === "lead");
    const isMember = isOwner || members.some(m => m.user.id === user?.id);
    const canManage = isLead || isFaculty;

    // Invite
    const [inviteEmail,   setInviteEmail]   = useState("");
    const [inviteMsg,     setInviteMsg]     = useState<{ type: "ok" | "err"; text: string } | null>(null);
    const [inviting,      setInviting]      = useState(false);
    const [removingId,    setRemovingId]    = useState<string | null>(null);
    const [memberError,   setMemberError]   = useState<string | null>(null);

    const handleInvite = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!inviteEmail.trim() || !user) return;
        setInviting(true);
        setInviteMsg(null);
        try {
            let profile: { id: string; display_name: string } | null = null;
            if (inviteEmail.includes("@")) {
                const { data } = await supabase.rpc("lookup_profile_by_email", { lookup_email: inviteEmail.trim().toLowerCase() });
                if (data && Array.isArray(data) && data.length > 0) profile = data[0];
            }
            if (!profile) { setInviteMsg({ type: "err", text: "No member found with that email." }); setInviting(false); return; }
            if (profile.id === user.id) { setInviteMsg({ type: "err", text: "You can't invite yourself." }); setInviting(false); return; }
            if (members.some(m => m.user.id === profile!.id)) { setInviteMsg({ type: "err", text: "Already on the team." }); setInviting(false); return; }

            const { error } = await supabase.from("project_invites").insert({ project_id: project.id, inviter_id: user.id, invitee_id: profile.id });
            if (error) {
                setInviteMsg({ type: "err", text: error.code === "23505" ? "Invite already sent." : error.message });
            } else {
                await supabase.from("notifications").insert({
                    user_id: profile.id, type: "project_invite_received",
                    message: `${user.user_metadata?.display_name || "A team lead"} invited you to join ${project.title}.`,
                    related_entity_id: project.id,
                });
                setInviteEmail("");
                setInviteMsg({ type: "ok", text: `Invite sent to ${profile.display_name}` });
                setTimeout(() => setInviteMsg(null), 3000);
            }
        } catch { setInviteMsg({ type: "err", text: "Something went wrong." }); }
        setInviting(false);
    };

    const handleRemoveMember = async (memberId: string) => {
        if (!confirm("Remove this member from the project?")) return;
        setMemberError(null);
        setRemovingId(memberId);
        const result = await removeProjectMember({ projectId: project.id, memberId });
        if (!result.ok) { setMemberError(result.error); setRemovingId(null); return; }
        setMembers(prev => prev.filter(m => m.id !== memberId));
        setRemovingId(null);
    };

    // Post update
    const [postingUpdate, setPostingUpdate] = useState(false);
    const [lightboxUrl,   setLightboxUrl]   = useState<string | null>(null);

    const handlePostUpdate = async (data: { title: string; content: string; versionTag: string; sourceUrls: string; imageUrls: string; videoUrls: string }) => {
        if (!data.title.trim() || !user) return;
        setPostingUpdate(true);
        const sourceUrls = data.sourceUrls.split("\n").map(v => v.trim()).filter(Boolean);
        const imageUrls  = data.imageUrls.split("\n").map(v => v.trim()).filter(Boolean);
        const videoUrls  = data.videoUrls.split("\n").map(v => v.trim()).filter(Boolean);

        const { data: row, error } = await supabase
            .from("project_updates")
            .insert({
                project_id: project.id, author_id: user.id,
                title: data.title.trim(),
                content: data.content.trim() || null,
                version_tag: data.versionTag.trim() || null,
                source_urls: sourceUrls.length > 0 ? sourceUrls : null,
                image_urls: imageUrls.length > 0 ? imageUrls : null,
                video_urls: videoUrls.length > 0 ? videoUrls : null,
            })
            .select("id, title, content, version_tag, source_urls, image_urls, video_urls, created_at")
            .single();

        if (error) { console.error(error); alert("Failed to post update: " + error.message); setPostingUpdate(false); return; }

        if (row) {
            const { data: authorProfile } = await supabase.from("profiles").select("id, display_name, avatar_url").eq("id", user.id).single();
            const newUpdate: ProjectUpdate = {
                ...row,
                video_urls: row.video_urls ?? null,
                author: authorProfile || { id: user.id, display_name: "You", avatar_url: null },
            };
            setUpdates(prev => [newUpdate, ...prev]);
        }
        setPostingUpdate(false);
    };

    const hue = useMemo(() => idHue(project.id), [project.id]);
    const st  = STATUS_CFG[project.status] ?? STATUS_CFG.planning;

    return (
        <div className="min-h-screen bg-[#07090f] px-4 sm:px-8 pt-6 sm:pt-10 pb-20">
            <div className="max-w-[1360px] mx-auto">

                {/* Back link */}
                <Link href="/projects"
                    className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-[#8b9ab0] hover:text-[#00e5ff] transition-colors mb-6">
                    <ArrowLeft size={13} /> Back to All Projects
                </Link>

                {/* Cover */}
                <div className="relative w-full rounded-md overflow-hidden border border-[rgba(0,229,255,0.12)] mb-6" style={{ aspectRatio: "3/1" }}>
                    {project.cover_image_url
                        ? <img src={project.cover_image_url} alt={project.title} className="w-full h-full object-cover" />
                        : <CoverFallback hue={hue} />
                    }
                </div>

                {/* Title row */}
                <div className="flex items-start justify-between gap-6 flex-wrap mb-8">
                    <div className="min-w-0">
                        <h1 className="font-sans font-black text-[#f0f4ff] tracking-tight leading-none" style={{ fontSize: "clamp(28px, 3vw, 44px)" }}>
                            {project.title}
                        </h1>
                        <div className="flex items-center gap-3 mt-2.5 flex-wrap">
                            <span className="inline-flex items-center h-[24px] px-2.5 rounded-sm border font-mono text-[10.5px] uppercase tracking-[0.14em]"
                                style={{ color: st.fg, background: st.bg, borderColor: st.border }}>
                                {st.label}
                            </span>
                            <span className="font-mono text-[10.5px] text-[#4a5568] tracking-[0.06em]">
                                Created {fmtDate(project.created_at)}
                            </span>
                        </div>
                    </div>
                    {canManage && (
                        <Link href={`/projects/${project.id}/manage`}
                            className="inline-flex items-center gap-2 h-9 px-4 rounded-sm font-mono text-[11px] uppercase tracking-[0.14em] text-[#8b9ab0] border border-[rgba(0,229,255,0.18)] hover:text-[#f0f4ff] hover:border-[rgba(0,229,255,0.40)] transition-colors">
                            <Settings2 size={14} /> Manage Project
                        </Link>
                    )}
                </div>

                {/* Body: main + sidebar */}
                <div className="flex items-start gap-8 flex-col lg:flex-row">

                    {/* ── MAIN ── */}
                    <div className="flex-1 min-w-0 space-y-10">

                        {/* Description */}
                        <div>
                            <SectionHeader kicker="01">Description</SectionHeader>
                            <div className="space-y-3">
                                {project.description.trim().split("\n\n").map((para, i) => (
                                    <p key={i} className="text-[#8b9ab0] text-[14px] leading-relaxed">{para}</p>
                                ))}
                            </div>
                        </div>

                        {/* Tech stack */}
                        {project.tech_stack && project.tech_stack.length > 0 && (
                            <div>
                                <SectionHeader kicker="02">Tech Stack</SectionHeader>
                                <div className="flex flex-wrap gap-1.5">
                                    {project.tech_stack.map(t => (
                                        <span key={t}
                                            className="inline-flex items-center h-[22px] px-2.5 rounded-sm border bg-[#07090f]/70 font-mono text-[10.5px] uppercase tracking-[0.10em] text-[#f0f4ff]"
                                            style={{ borderColor: "rgba(0,229,255,0.40)" }}>
                                            {t}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Progress log */}
                        <div>
                            <SectionHeader kicker="03">Progress Log</SectionHeader>
                            <div className="relative">
                                {isMember && (
                                    <AddUpdateForm onSubmit={handlePostUpdate} posting={postingUpdate} />
                                )}
                                {updates.length === 0 ? (
                                    <div className="relative pl-8 py-8 text-center">
                                        <div className="absolute left-[7px] top-0 bottom-0 w-px bg-[rgba(0,229,255,0.20)]" />
                                        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#4a5568]">
                                            {isMember ? "No updates yet — log the first one above." : "No updates posted yet."}
                                        </p>
                                    </div>
                                ) : (
                                    updates.map((u, i) => (
                                        <LogEntry key={u.id} update={u} isFirst={i === 0} onOpenImg={setLightboxUrl} />
                                    ))
                                )}
                                {/* Timeline end */}
                                <div className="relative pl-8 pb-2">
                                    <div className="absolute left-[7px] top-0 h-3 w-px bg-[rgba(0,229,255,0.20)]" />
                                    <div className="absolute left-[4px] top-3 w-[7px] h-[7px] rounded-full border border-[rgba(0,229,255,0.12)] bg-[#07090f]" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── SIDEBAR ── */}
                    <div className="w-full lg:w-[310px] xl:w-[340px] shrink-0">
                        <div
                            className="bg-[#0d1117] border border-[rgba(0,229,255,0.12)] rounded-md p-5 corner-ticks sticky top-24 space-y-6"
                        >
                            <span className="ct-tr" /><span className="ct-bl" />

                            {/* Team */}
                            <div>
                                <SectionHeader kicker="04">Team</SectionHeader>
                                {memberError && (
                                    <p className="font-mono text-[10.5px] text-[#ef4444] mb-2">{memberError}</p>
                                )}
                                <div className="space-y-0.5">
                                    {displayMembers.map(m => (
                                        <MemberRow
                                            key={m.id} m={m}
                                            canManage={canManage}
                                            removing={removingId === m.id}
                                            onRemove={handleRemoveMember}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Invite */}
                            {canManage && (
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="font-mono text-[10px] uppercase tracking-[0.20em] text-[#4a5568]">// INVITE</span>
                                        <span className="flex-1 h-px bg-[rgba(0,229,255,0.12)]" />
                                    </div>
                                    <form onSubmit={handleInvite} className="space-y-2">
                                        <div className="relative">
                                            <span className="absolute inset-y-0 left-0 grid place-items-center w-10 text-[#8b9ab0] pointer-events-none border-r border-[rgba(0,229,255,0.12)]">
                                                <Mail size={14} />
                                            </span>
                                            <input
                                                type="email" value={inviteEmail}
                                                onChange={e => { setInviteEmail(e.target.value); setInviteMsg(null); }}
                                                placeholder="team@nst.edu"
                                                className={`${inputCls} pl-12`}
                                            />
                                        </div>
                                        <button type="submit" disabled={inviting || !inviteEmail.trim()}
                                            className="w-full h-9 flex items-center justify-center gap-2 rounded-sm font-mono text-[11px] uppercase tracking-[0.14em] text-[#07090f] bg-[#00e5ff] hover:bg-[#00c7e0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                                            {inviting ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />}
                                            Invite Member
                                        </button>
                                        {inviteMsg && (
                                            <div className="flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.12em]"
                                                style={{ color: inviteMsg.type === "ok" ? "#22c55e" : "#ef4444" }}>
                                                {inviteMsg.type === "ok"
                                                    ? <CheckCircle2 size={11} />
                                                    : <AlertCircle size={11} />}
                                                {inviteMsg.text}
                                            </div>
                                        )}
                                    </form>
                                </div>
                            )}

                            {/* Meta */}
                            <div className="border-t border-[rgba(0,229,255,0.12)] pt-5">
                                <div className="font-mono text-[10px] uppercase tracking-[0.20em] text-[#4a5568] mb-3">// META</div>
                                <div className="space-y-2.5">
                                    {([
                                        ["Created",  fmtDate(project.created_at)],
                                        ["Updates",  String(updates.length)],
                                        ["Members",  String(displayMembers.length)],
                                        ["Status",   st.label],
                                    ] as [string, string][]).map(([k, v]) => (
                                        <div key={k} className="flex items-center justify-between gap-4 border-b border-[rgba(0,229,255,0.08)] pb-2 last:border-0">
                                            <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#8b9ab0]">{k}</span>
                                            <span className="font-mono text-[11.5px] text-[#f0f4ff] tabular-nums text-right">{v}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* Lightbox */}
            {typeof document !== "undefined" && lightboxUrl && createPortal(
                <Lightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />,
                document.body
            )}
        </div>
    );
}
