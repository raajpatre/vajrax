"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
    ArrowLeft, Settings2, ExternalLink, X, Plus, Check,
    UserPlus, UserCheck, Loader2, Mail, AlertCircle, CheckCircle2, ImagePlus,
    Pencil, Trash2, FileCode2, Download, Box, Copy, Paperclip, Search,
} from "lucide-react";
import Link from "next/link";
import { useUser } from "@/lib/hooks/useUser";
import { createClient } from "@/lib/supabase/client";
import { removeProjectMember } from "@/actions/project-members";
import { updateProjectLog, deleteProjectLog } from "@/actions/project-logs";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProjectMember {
    id: string;
    role: string | null;
    joined_at: string | null;
    user: { id: string; display_name: string; avatar_url: string | null; username: string | null };
}

interface Attachment {
    url: string;
    name: string;
    kind: "code" | "stl";
}

interface ProjectUpdate {
    id: string;
    title: string;
    content: string | null;
    version_tag: string | null;
    source_urls: string[] | null;
    image_urls: string[] | null;
    video_urls: string[] | null;
    attachments: Attachment[] | null;
    created_at: string | null;
    author: { id: string; display_name: string; avatar_url: string | null };
}

const LOG_SELECT =
    "id, title, content, version_tag, source_urls, image_urls, video_urls, attachments, created_at, author:profiles!project_updates_author_id_fkey(id, display_name, avatar_url)";

// Accepted code / 3D-model file extensions for log attachments.
const CODE_EXTS = new Set([
    "py", "ipynb", "c", "h", "cpp", "hpp", "cc", "cxx", "ino", "js", "jsx", "ts", "tsx", "mjs", "cjs",
    "java", "kt", "go", "rs", "rb", "php", "swift", "m", "mm", "cs", "sh", "bash", "zsh", "ps1", "lua",
    "r", "jl", "dart", "html", "css", "scss", "sql", "json", "yaml", "yml", "toml", "xml", "md", "txt",
    "csv", "v", "vhd", "vhdl", "gcode", "nc", "scad", "urdf", "xacro", "launch",
]);
const ATTACH_ACCEPT = "." + [...CODE_EXTS, "stl"].join(",.");

function attachmentKind(name: string): "code" | "stl" | null {
    const dot = name.lastIndexOf(".");
    const ext = dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
    if (ext === "stl") return "stl";
    if (CODE_EXTS.has(ext)) return "code";
    return null;
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
    in_progress: { label: "IN PROGRESS", bg: "rgba(245,158,11,0.15)", border: "rgba(245,158,11,0.55)", fg: "#f59e0b" },
    ongoing: { label: "IN PROGRESS", bg: "rgba(245,158,11,0.15)", border: "rgba(245,158,11,0.55)", fg: "#f59e0b" },
    completed: { label: "COMPLETED", bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.50)", fg: "#22c55e" },
    planning: { label: "PLANNING", bg: "rgba(0,229,255,0.10)", border: "rgba(0,229,255,0.50)", fg: "#00e5ff" },
    archived: { label: "ARCHIVED", bg: "rgba(139,154,176,0.10)", border: "rgba(139,154,176,0.45)", fg: "#8b9ab0" },
    on_hold: { label: "ON HOLD", bg: "rgba(139,154,176,0.10)", border: "rgba(139,154,176,0.45)", fg: "#8b9ab0" },
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

// ISO → value for <input type="datetime-local"> (local wall-clock "YYYY-MM-DDTHH:mm").
function toLocalInput(iso: string | null): string {
    const d = iso ? new Date(iso) : new Date();
    if (isNaN(d.getTime())) return toLocalInput(null);
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
}

// datetime-local value → ISO string (UTC). Returns null if empty/invalid.
function fromLocalInput(value: string): string | null {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d.toISOString();
}

function sortByCreatedDesc(list: ProjectUpdate[]): ProjectUpdate[] {
    return [...list].sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime());
}

function initials(name: string) {
    return name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
}

// ─── Avatar ────────────────────────────────────────────────────────────────────

function MemberAvatar({ name, avatarUrl, userId, size = 32 }: { name: string; avatarUrl: string | null; userId: string; size?: number }) {
    const hue = idHue(userId);
    const tint = `hsl(${hue} 90% 60%)`;
    const c1 = `hsl(${hue} 60% 18%)`;
    const c2 = `hsl(${(hue + 30) % 360} 70% 8%)`;
    const id = useMemo(() => Math.random().toString(36).slice(2), []);
    const fs = Math.max(9, Math.round(size * 0.34));

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
    const c1 = `hsl(${hue} 60% 12%)`;
    const c2 = `hsl(${(hue + 30) % 360} 70% 7%)`;
    const id = useMemo(() => Math.random().toString(36).slice(2), []);
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
            <path d="M0 0 H24 M0 0 V24" stroke={tint} strokeWidth="2" opacity="0.85" />
            <path d="M1200 0 H1176 M1200 0 V24" stroke={tint} strokeWidth="2" opacity="0.6" />
            <path d="M0 400 H24 M0 400 V376" stroke={tint} strokeWidth="2" opacity="0.6" />
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

// ─── Attachment helpers ─────────────────────────────────────────────────────────

// Force a download (with the original filename) for a Cloudinary raw URL.
function downloadUrl(url: string, name: string): string {
    if (url.includes("/upload/")) {
        return url.replace("/upload/", `/upload/fl_attachment:${encodeURIComponent(name)}/`);
    }
    return url;
}

// ─── Code viewer modal ───────────────────────────────────────────────────────────

function CodeViewer({ attachment, onClose }: { attachment: Attachment; onClose: () => void }) {
    const [text, setText] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", fn);
        return () => window.removeEventListener("keydown", fn);
    }, [onClose]);

    useEffect(() => {
        let active = true;
        fetch(attachment.url)
            .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text(); })
            .then(t => { if (active) setText(t); })
            .catch(() => { if (active) setError("Could not load file contents. Use download instead."); });
        return () => { active = false; };
    }, [attachment.url]);

    const copy = async () => {
        if (text == null) return;
        try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ }
    };

    return (
        <div className="fixed inset-0 z-[110]" style={{ animation: "fadeIn 160ms ease-out" }}>
            <div className="absolute inset-0 backdrop-blur-md cursor-pointer" style={{ background: "rgba(7,9,15,0.88)" }} onClick={onClose} />
            <div className="absolute inset-0 grid place-items-center p-4 sm:p-8">
                <div className="relative w-full max-w-4xl max-h-[85vh] flex flex-col bg-[#0d1117] border border-[rgba(0,229,255,0.28)] rounded-md overflow-hidden corner-ticks shadow-2xl">
                    <span className="ct-tr" /><span className="ct-bl" />
                    {/* Header */}
                    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[rgba(0,229,255,0.12)] bg-[#111820]">
                        <FileCode2 size={14} className="text-[#00e5ff] shrink-0" />
                        <span className="font-mono text-[12px] text-[#f0f4ff] truncate flex-1">{attachment.name}</span>
                        <button onClick={copy} disabled={text == null}
                            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-sm border border-[rgba(0,229,255,0.18)] text-[#8b9ab0] hover:text-[#00e5ff] hover:border-[rgba(0,229,255,0.45)] font-mono text-[10px] uppercase tracking-[0.12em] transition-colors disabled:opacity-40">
                            {copied ? <Check size={11} /> : <Copy size={11} />} {copied ? "Copied" : "Copy"}
                        </button>
                        <a href={downloadUrl(attachment.url, attachment.name)} download={attachment.name}
                            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-sm border border-[rgba(0,229,255,0.18)] text-[#8b9ab0] hover:text-[#00e5ff] hover:border-[rgba(0,229,255,0.45)] font-mono text-[10px] uppercase tracking-[0.12em] transition-colors">
                            <Download size={11} /> Download
                        </a>
                        <button onClick={onClose} className="grid place-items-center w-7 h-7 rounded-sm border border-[rgba(0,229,255,0.12)] text-[#8b9ab0] hover:text-[#f0f4ff] transition-colors">
                            <X size={13} />
                        </button>
                    </div>
                    {/* Body */}
                    <div className="flex-1 overflow-auto bg-[#07090f]">
                        {error ? (
                            <div className="p-6 font-mono text-[12px] text-[#ef4444]">{error}</div>
                        ) : text == null ? (
                            <div className="p-6 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-[#4a5568]">
                                <Loader2 size={13} className="animate-spin" /> Loading…
                            </div>
                        ) : (
                            <pre className="p-4 text-[12.5px] leading-relaxed text-[#cdd6e4] font-mono whitespace-pre overflow-x-auto"><code>{text}</code></pre>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Attachment chips ────────────────────────────────────────────────────────────

function AttachmentChips({ attachments, onOpenCode }: { attachments: Attachment[]; onOpenCode: (a: Attachment) => void }) {
    if (attachments.length === 0) return null;
    return (
        <div className="flex flex-wrap gap-2 mt-3">
            {attachments.map((a, i) =>
                a.kind === "code" ? (
                    <button key={i} onClick={() => onOpenCode(a)}
                        className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-sm border border-[rgba(0,229,255,0.18)] bg-[#0d1117] text-[#8b9ab0] hover:text-[#00e5ff] hover:border-[rgba(0,229,255,0.45)] font-mono text-[10.5px] transition-colors max-w-[220px]">
                        <FileCode2 size={12} className="shrink-0" />
                        <span className="truncate">{a.name}</span>
                    </button>
                ) : (
                    <a key={i} href={downloadUrl(a.url, a.name)} download={a.name}
                        className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-sm border border-[rgba(245,158,11,0.30)] bg-[#0d1117] text-[#8b9ab0] hover:text-[#f59e0b] hover:border-[rgba(245,158,11,0.55)] font-mono text-[10.5px] transition-colors max-w-[220px]">
                        <Box size={12} className="shrink-0" />
                        <span className="truncate">{a.name}</span>
                        <Download size={11} className="shrink-0 opacity-70" />
                    </a>
                )
            )}
        </div>
    );
}

// ─── Timeline entry ────────────────────────────────────────────────────────────

function LogEntry({ update, isFirst, canEdit, deleting, onOpenImg, onOpenCode, onEdit, onDelete }: {
    update: ProjectUpdate;
    isFirst: boolean;
    canEdit: boolean;
    deleting: boolean;
    onOpenImg: (url: string) => void;
    onOpenCode: (a: Attachment) => void;
    onEdit: (u: ProjectUpdate) => void;
    onDelete: (u: ProjectUpdate) => void;
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
                <div className="flex items-start gap-2.5 mb-1.5">
                    <div className="flex items-center gap-2.5 flex-wrap min-w-0 flex-1">
                        {update.version_tag && (
                            <>
                                <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-[#00e5ff]">{update.version_tag}</span>
                                <span className="text-[#4a5568] font-mono text-[10px]">·</span>
                            </>
                        )}
                        <h3 className="font-sans font-semibold text-[#f0f4ff] text-[14.5px] tracking-tight leading-tight">{update.title}</h3>
                    </div>
                    {canEdit && (
                        <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => onEdit(update)} title="Edit log"
                                className="grid place-items-center w-6 h-6 rounded-sm border border-[rgba(0,229,255,0.12)] text-[#4a5568] hover:text-[#00e5ff] hover:border-[rgba(0,229,255,0.45)] transition-colors">
                                <Pencil size={11} />
                            </button>
                            <button onClick={() => onDelete(update)} disabled={deleting} title="Delete log"
                                className="grid place-items-center w-6 h-6 rounded-sm border border-[rgba(0,229,255,0.12)] text-[#4a5568] hover:text-[#ef4444] hover:border-[rgba(239,68,68,0.50)] transition-colors disabled:opacity-50">
                                {deleting ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                            </button>
                        </div>
                    )}
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

                {update.attachments && update.attachments.length > 0 && (
                    <AttachmentChips attachments={update.attachments} onOpenCode={onOpenCode} />
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

// ─── Log form (shared by add + edit) ─────────────────────────────────────────────

interface LogFormData {
    title: string;
    content: string;
    versionTag: string;
    sourceUrls: string;
    imageUrls: string[];
    videoUrls: string;
    attachments: Attachment[];
    createdAt: string; // datetime-local value ("" = use now / server default)
}

const emptyLogForm: LogFormData = {
    title: "", content: "", versionTag: "", sourceUrls: "", imageUrls: [], videoUrls: "", attachments: [], createdAt: "",
};

function LogForm({ initial, heading, submitLabel, submitting, onSubmit, onCancel }: {
    initial: LogFormData;
    heading: string;
    submitLabel: string;
    submitting: boolean;
    onSubmit: (data: LogFormData) => void;
    onCancel: () => void;
}) {
    const [title, setTitle] = useState(initial.title);
    const [content, setContent] = useState(initial.content);
    const [versionTag, setVersionTag] = useState(initial.versionTag);
    const [sourceUrls, setSourceUrls] = useState(initial.sourceUrls);
    const [videoUrls, setVideoUrls] = useState(initial.videoUrls);
    const [uploadedUrls, setUploadedUrls] = useState<string[]>(initial.imageUrls);
    const [attachments, setAttachments] = useState<Attachment[]>(initial.attachments);
    const [createdAt, setCreatedAt] = useState(initial.createdAt || toLocalInput(null));
    const [uploading, setUploading] = useState(false);
    const [attaching, setAttaching] = useState(false);
    const imgInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const canSubmit = title.trim().length > 0 && !uploading && !attaching;

    const handleImageFiles = async (files: FileList) => {
        setUploading(true);
        const results: string[] = [];
        for (const file of Array.from(files)) {
            const fd = new FormData();
            fd.append("file", file);
            fd.append("folder", "progress-logs");
            try {
                const res = await fetch("/api/cloudinary/upload", { method: "POST", body: fd });
                const json = await res.json();
                if (json.url) results.push(json.url as string);
            } catch { /* skip */ }
        }
        setUploadedUrls(prev => [...prev, ...results]);
        setUploading(false);
        if (imgInputRef.current) imgInputRef.current.value = "";
    };

    const handleAttachFiles = async (files: FileList) => {
        setAttaching(true);
        const results: Attachment[] = [];
        for (const file of Array.from(files)) {
            const kind = attachmentKind(file.name);
            if (!kind) continue;
            const fd = new FormData();
            fd.append("file", file);
            fd.append("folder", "project-files");
            fd.append("kind", "raw");
            fd.append("filename", file.name);
            try {
                const res = await fetch("/api/cloudinary/upload", { method: "POST", body: fd });
                const json = await res.json();
                if (json.url) results.push({ url: json.url as string, name: (json.name as string) || file.name, kind });
            } catch { /* skip */ }
        }
        setAttachments(prev => [...prev, ...results]);
        setAttaching(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!canSubmit) return;
        onSubmit({ title, content, versionTag, sourceUrls, imageUrls: uploadedUrls, videoUrls, attachments, createdAt });
    };

    const floatingInputCls = "peer w-full h-11 bg-transparent border border-[rgba(0,229,255,0.2)] rounded-md text-[14px] text-[#f0f4ff] px-3 focus:border-[rgba(0,229,255,0.55)] focus:outline-none transition-colors";
    const floatingLabelCls = "absolute left-3 top-1/2 -translate-y-1/2 text-[#8b9ab0] text-[14px] pointer-events-none transition-all duration-200 peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:scale-[0.85] peer-focus:-translate-x-1 peer-focus:bg-[#111820] peer-focus:px-2 peer-focus:text-[#00e5ff] peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:scale-[0.85] peer-[:not(:placeholder-shown)]:-translate-x-1 peer-[:not(:placeholder-shown)]:bg-[#111820] peer-[:not(:placeholder-shown)]:px-2 peer-[:not(:placeholder-shown)]:text-[#00e5ff]";
    const floatingLabelTopCls = "absolute left-3 top-0 -translate-y-1/2 scale-[0.85] -translate-x-1 bg-[#111820] px-2 text-[#00e5ff] text-[14px] pointer-events-none";

    return (
        <form
            onSubmit={handleSubmit}
            className="relative w-full bg-[#111820]/90 backdrop-blur-md rounded-md corner-ticks p-6 space-y-6 mt-4 mb-4"
            style={{
                animation: "fadeIn 180ms ease-out",
                border: "1px solid rgba(0,229,255,0.28)",
                boxShadow: "0 0 0 1px rgba(0,229,255,0.06), 0 24px 60px -24px rgba(0,0,0,0.8), 0 0 40px -16px rgba(0,229,255,0.35)",
            }}
        >
            <span className="ct-tr" /><span className="ct-bl" />
            <div
                className="absolute inset-x-0 top-0 h-px pointer-events-none rounded-t-md"
                style={{ background: "linear-gradient(90deg, transparent, rgba(0,229,255,0.6), transparent)" }}
            />

            <div className="font-mono text-[12px] uppercase tracking-[0.20em] text-[#00e5ff] mb-2 font-bold">{heading}</div>

            <div className="relative group">
                <input value={title} onChange={e => setTitle(e.target.value)} required
                    placeholder=" " className={floatingInputCls} />
                <label className={floatingLabelCls}>Title</label>
            </div>

            <div className="relative group">
                <textarea value={content} onChange={e => setContent(e.target.value)} rows={3} required
                    placeholder=" " className="peer w-full bg-transparent border border-[rgba(0,229,255,0.2)] rounded-md text-[14px] text-[#f0f4ff] p-3 focus:border-[rgba(0,229,255,0.55)] focus:outline-none transition-colors resize-y" />
                <label className="absolute left-3 top-4 -translate-y-1/2 text-[#8b9ab0] text-[14px] pointer-events-none transition-all duration-200 peer-focus:top-0 peer-focus:scale-[0.85] peer-focus:-translate-x-1 peer-focus:bg-[#111820] peer-focus:px-2 peer-focus:text-[#00e5ff] peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:scale-[0.85] peer-[:not(:placeholder-shown)]:-translate-x-1 peer-[:not(:placeholder-shown)]:bg-[#111820] peer-[:not(:placeholder-shown)]:px-2 peer-[:not(:placeholder-shown)]:text-[#00e5ff]">
                    Content
                </label>
            </div>

            <div className="relative group">
                <input type="datetime-local" value={createdAt} onChange={e => setCreatedAt(e.target.value)} required
                    className={`${floatingInputCls} [color-scheme:dark]`} />
                <label className={floatingLabelTopCls}>
                    Timestamp
                </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="relative group">
                    <input value={versionTag} onChange={e => setVersionTag(e.target.value)}
                        placeholder=" " className={floatingInputCls} />
                    <label className={floatingLabelCls}>Version Tag <span className="opacity-50 text-[10px] ml-1">(Optional)</span></label>
                </div>
                <div className="relative group">
                    <input value={sourceUrls} onChange={e => setSourceUrls(e.target.value)}
                        placeholder=" " className={floatingInputCls} />
                    <label className={floatingLabelCls}>Source URL <span className="opacity-50 text-[10px] ml-1">(Optional)</span></label>
                </div>
            </div>

            <div>
                <label className={floatingLabelTopCls} style={{ position: 'relative', top: 'auto', left: '-4px', transform: 'none', background: 'transparent', display: 'inline-block', marginBottom: '8px' }}>Images <span className="opacity-50 text-[10px] ml-1">(Optional)</span></label>
                <div className="mt-1">
                    <input ref={imgInputRef} type="file" accept="image/*" multiple className="hidden"
                        onChange={e => e.target.files && handleImageFiles(e.target.files)} />
                    <button type="button" onClick={() => imgInputRef.current?.click()} disabled={uploading}
                        className="inline-flex items-center gap-2 h-9 px-4 border border-dashed border-[rgba(0,229,255,0.25)] rounded-sm text-[#8b9ab0] hover:text-[#00e5ff] hover:border-[rgba(0,229,255,0.50)] font-mono text-[11px] uppercase tracking-[0.14em] transition-colors disabled:opacity-50">
                        {uploading ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} />}
                        {uploading ? "Uploading…" : "Upload Images"}
                    </button>
                    {uploadedUrls.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
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
            </div>

            <div>
                <label className={floatingLabelTopCls} style={{ position: 'relative', top: 'auto', left: '-4px', transform: 'none', background: 'transparent', display: 'inline-block', marginBottom: '8px' }}>Code / STL Files <span className="opacity-50 text-[10px] ml-1">(Optional)</span></label>
                <div className="mt-1">
                    <input ref={fileInputRef} type="file" accept={ATTACH_ACCEPT} multiple className="hidden"
                        onChange={e => e.target.files && handleAttachFiles(e.target.files)} />
                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={attaching}
                        className="inline-flex items-center gap-2 h-9 px-4 border border-dashed border-[rgba(0,229,255,0.25)] rounded-sm text-[#8b9ab0] hover:text-[#00e5ff] hover:border-[rgba(0,229,255,0.50)] font-mono text-[11px] uppercase tracking-[0.14em] transition-colors disabled:opacity-50">
                        {attaching ? <Loader2 size={13} className="animate-spin" /> : <Paperclip size={13} />}
                        {attaching ? "Uploading…" : "Attach Files"}
                    </button>
                    {attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                            {attachments.map((a, i) => (
                                <span key={i}
                                    className="inline-flex items-center gap-1.5 h-7 pl-2.5 pr-1.5 rounded-sm border border-[rgba(0,229,255,0.18)] bg-[#0d1117] font-mono text-[10.5px] text-[#8b9ab0] max-w-[220px]">
                                    {a.kind === "stl" ? <Box size={11} className="shrink-0 text-[#f59e0b]" /> : <FileCode2 size={11} className="shrink-0 text-[#00e5ff]" />}
                                    <span className="truncate">{a.name}</span>
                                    <button type="button" onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))}
                                        className="grid place-items-center w-4 h-4 rounded-sm text-[#4a5568] hover:text-[#ef4444] transition-colors">
                                        <X size={11} />
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="relative group pt-1">
                <input value={videoUrls} onChange={e => setVideoUrls(e.target.value)}
                    placeholder=" " className={floatingInputCls} />
                <label className={floatingLabelCls}>YouTube Video URL <span className="opacity-50 text-[10px] ml-1">(Optional)</span></label>
            </div>

            <div className="flex items-center gap-3 pt-4">
                <button type="submit" disabled={!canSubmit || submitting}
                    className="inline-flex items-center justify-center gap-2 h-10 px-6 rounded-sm font-mono text-[12px] uppercase tracking-[0.14em] text-[#07090f] bg-[#00e5ff] hover:bg-[#00c7e0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-bold min-w-[140px]">
                    {submitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    {submitLabel}
                </button>
                <button type="button" onClick={onCancel}
                    className="h-10 px-6 rounded-sm font-mono text-[12px] uppercase tracking-[0.14em] text-[#8b9ab0] hover:text-white transition-colors">
                    Cancel
                </button>
            </div>
        </form>
    );
}

// ─── Add Update form (collapsed button → LogForm) ─────────────────────────────────

function AddUpdateForm({ onSubmit, posting }: {
    onSubmit: (data: LogFormData) => void;
    posting: boolean;
}) {
    const [open, setOpen] = useState(false);

    return (
        <div className="relative pl-8 mb-6">
            <div className="absolute left-[7px] top-0 bottom-0 w-px bg-[rgba(0,229,255,0.20)]" />
            <div className="absolute left-[3px] top-3 w-[9px] h-[9px] rounded-full border border-[rgba(0,229,255,0.12)] bg-[#0d1117]" />

            {!open ? (
                <button
                    onClick={() => setOpen(true)}
                    className="vista-button"
                >
                    <span><Plus size={13} /> Log Update</span>
                </button>
            ) : (
                <LogForm
                    initial={emptyLogForm}
                    heading="// NEW ENTRY"
                    submitLabel="Add Update"
                    submitting={posting}
                    onSubmit={(data) => { onSubmit(data); setOpen(false); }}
                    onCancel={() => setOpen(false)}
                />
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
                    <div className="px-5 py-3 border-t border-[rgba(0,229,255,0.12)] flex items-center justify-end">
                        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#4a5568]">ESC to close</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Contribution bar ───────────────────────────────────────────────────────────

function ContributionBar({ updates }: { updates: ProjectUpdate[] }) {
    const items = useMemo(() => {
        const map = new Map<string, { id: string; name: string; count: number }>();
        for (const u of updates) {
            const a = u.author;
            const e = map.get(a.id) ?? { id: a.id, name: a.display_name, count: 0 };
            e.count++;
            map.set(a.id, e);
        }
        return [...map.values()].sort((x, y) => y.count - x.count);
    }, [updates]);

    const total = updates.length;
    if (total === 0) return null;

    return (
        <div className="border-t border-[rgba(0,229,255,0.12)] pt-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.20em] text-[#4a5568] mb-3">// CONTRIBUTIONS</div>

            {/* Stacked bar */}
            <div className="flex w-full h-2.5 rounded-full overflow-hidden border border-[rgba(0,229,255,0.12)] bg-[#07090f]">
                {items.map((it) => {
                    const pct = (it.count / total) * 100;
                    const tint = `hsl(${idHue(it.id)} 90% 60%)`;
                    return (
                        <div key={it.id}
                            title={`${it.name}: ${it.count} log${it.count === 1 ? "" : "s"} (${Math.round(pct)}%)`}
                            style={{ width: `${pct}%`, background: tint }} />
                    );
                })}
            </div>

            {/* Legend */}
            <div className="mt-3 space-y-1.5">
                {items.map((it) => {
                    const pct = Math.round((it.count / total) * 100);
                    const tint = `hsl(${idHue(it.id)} 90% 60%)`;
                    return (
                        <div key={it.id} className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: tint, boxShadow: `0 0 6px ${tint}80` }} />
                            <span className="font-mono text-[10.5px] text-[#8b9ab0] truncate flex-1">{it.name}</span>
                            <span className="font-mono text-[10.5px] text-[#f0f4ff] tabular-nums shrink-0">{it.count} · {pct}%</span>
                        </div>
                    );
                })}
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
                .select(LOG_SELECT)
                .eq("project_id", project.id)
                .order("created_at", { ascending: false });
            if (updData) setUpdates(updData.map(u => ({
                ...u,
                attachments: (u.attachments as unknown as Attachment[] | null) ?? null,
                author: u.author as unknown as ProjectUpdate["author"],
            })) as unknown as ProjectUpdate[]);

            // Fetch all profiles for the member picker
            const { data: profilesData } = await supabase
                .from("profiles")
                .select("id, display_name, username, avatar_url")
                .order("display_name");
            if (profilesData) setAllProfiles(profilesData);

            // Fetch pending invites for this project
            const { data: pendingData } = await supabase
                .from("project_invites")
                .select("invitee_id")
                .eq("project_id", project.id)
                .eq("status", "pending");
            if (pendingData) setPendingInviteIds(pendingData.map((r) => r.invitee_id as string));
        };
        refetch();
    }, [supabase, project.id]);

    const isOwner = !!user?.id && project.created_by === user.id;
    const displayMembers = useMemo(() => {
        const creator = project.creator;
        if (!creator || members.some(m => m.user.id === creator.id)) return members;
        return [{ id: `owner-${project.id}`, role: "lead", joined_at: project.created_at, user: creator }, ...members];
    }, [members, project]);

    const isLead = isOwner || members.some(m => m.user.id === user?.id && m.role === "lead");
    const isMember = isOwner || members.some(m => m.user.id === user?.id);
    const canManage = isLead || isFaculty;

    // Invite
    const [inviteMsg, setInviteMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
    const [inviting, setInviting] = useState(false);
    const [removingId, setRemovingId] = useState<string | null>(null);
    const [memberError, setMemberError] = useState<string | null>(null);
    const [allProfiles, setAllProfiles] = useState<{ id: string; display_name: string; username: string | null; avatar_url: string | null }[]>([]);
    const [selectedInvitees, setSelectedInvitees] = useState<string[]>([]);
    const [memberSearch, setMemberSearch] = useState("");
    const [pendingInviteIds, setPendingInviteIds] = useState<string[]>([]);

    const handleSendInvite = async () => {
        if (selectedInvitees.length === 0 || !user) return;
        setInviting(true);
        setInviteMsg(null);

        let successCount = 0;
        const errors: string[] = [];

        for (const profileId of selectedInvitees) {
            if (pendingInviteIds.includes(profileId)) {
                const prof = allProfiles.find((p) => p.id === profileId);
                errors.push(`${prof?.display_name ?? profileId} already has a pending invite.`);
                continue;
            }

            // Clear any previously rejected invites
            await supabase
                .from("project_invites")
                .delete()
                .eq("project_id", project.id)
                .eq("invitee_id", profileId);

            const { error } = await supabase.from("project_invites").insert({
                project_id: project.id,
                inviter_id: user.id,
                invitee_id: profileId,
            });

            if (error) {
                errors.push(error.code === "23505" ? "Invite already sent." : error.message);
            } else {
                // Send notification
                const prof = allProfiles.find((p) => p.id === profileId);
                await supabase.from("notifications").insert({
                    user_id: profileId,
                    type: "project_invite_received",
                    message: `${user.user_metadata?.display_name || "A team lead"} invited you to join ${project.title}.`,
                    related_entity_id: project.id,
                });
                successCount++;
            }
        }

        if (successCount > 0) {
            setInviteMsg({ type: "ok", text: `${successCount} invite${successCount > 1 ? "s" : ""} sent.` });
            setSelectedInvitees([]);
            setTimeout(() => setInviteMsg(null), 3000);
            // Refresh
            const { data: pendingData } = await supabase
                .from("project_invites")
                .select("invitee_id")
                .eq("project_id", project.id)
                .eq("status", "pending");
            if (pendingData) setPendingInviteIds(pendingData.map((r) => r.invitee_id as string));
        }
        if (errors.length > 0) {
            setInviteMsg({ type: "err", text: errors.join(" ") });
        }
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

    // Post / edit / delete update
    const [postingUpdate, setPostingUpdate] = useState(false);
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
    const [codeView, setCodeView] = useState<Attachment | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [savingEdit, setSavingEdit] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const handlePostUpdate = async (data: LogFormData) => {
        if (!data.title.trim() || !user) return;
        setPostingUpdate(true);
        const sourceUrls = data.sourceUrls.split("\n").map(v => v.trim()).filter(Boolean);
        const imageUrls = data.imageUrls.map(v => v.trim()).filter(Boolean);
        const videoUrls = data.videoUrls.split("\n").map(v => v.trim()).filter(Boolean);
        const attachments = data.attachments;

        const createdAtIso = fromLocalInput(data.createdAt);

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
                attachments: attachments.length > 0 ? (attachments as unknown as import("@/types/database").Json) : null,
                ...(createdAtIso ? { created_at: createdAtIso } : {}),
            })
            .select(LOG_SELECT)
            .single();

        if (error) { console.error(error); alert("Failed to post update: " + error.message); setPostingUpdate(false); return; }

        if (row) {
            const newUpdate: ProjectUpdate = {
                ...(row as unknown as ProjectUpdate),
                attachments: ((row as { attachments?: unknown }).attachments as Attachment[] | null) ?? null,
                author: (row as unknown as ProjectUpdate).author ?? { id: user.id, display_name: "You", avatar_url: null },
            };
            setUpdates(prev => sortByCreatedDesc([newUpdate, ...prev]));
        }
        setPostingUpdate(false);
    };

    const handleSaveEdit = async (data: LogFormData) => {
        if (!editingId) return;
        setSavingEdit(true);
        const sourceUrls = data.sourceUrls.split("\n").map(v => v.trim()).filter(Boolean);
        const imageUrls = data.imageUrls.map(v => v.trim()).filter(Boolean);
        const videoUrls = data.videoUrls.split("\n").map(v => v.trim()).filter(Boolean);
        const attachments = data.attachments;

        const createdAtIso = fromLocalInput(data.createdAt);

        const result = await updateProjectLog({
            logId: editingId,
            title: data.title.trim(),
            content: data.content.trim() || null,
            versionTag: data.versionTag.trim() || null,
            sourceUrls: sourceUrls.length > 0 ? sourceUrls : null,
            imageUrls: imageUrls.length > 0 ? imageUrls : null,
            videoUrls: videoUrls.length > 0 ? videoUrls : null,
            attachments: attachments.length > 0 ? (attachments as unknown as import("@/types/database").Json) : null,
            createdAt: createdAtIso,
        });

        if (!result.ok) { alert("Failed to save: " + result.error); setSavingEdit(false); return; }

        setUpdates(prev => sortByCreatedDesc(prev.map(u => u.id === editingId ? {
            ...u,
            title: data.title.trim(),
            content: data.content.trim() || null,
            version_tag: data.versionTag.trim() || null,
            source_urls: sourceUrls.length > 0 ? sourceUrls : null,
            image_urls: imageUrls.length > 0 ? imageUrls : null,
            video_urls: videoUrls.length > 0 ? videoUrls : null,
            attachments: attachments.length > 0 ? attachments : null,
            created_at: createdAtIso ?? u.created_at,
        } : u)));
        setSavingEdit(false);
        setEditingId(null);
    };

    const handleDeleteLog = async (id: string) => {
        if (!confirm("Delete this log entry? This cannot be undone.")) return;
        setDeletingId(id);
        const result = await deleteProjectLog(id);
        if (!result.ok) { alert("Failed to delete: " + result.error); setDeletingId(null); return; }
        setUpdates(prev => prev.filter(u => u.id !== id));
        setDeletingId(null);
    };

    const toFormData = (u: ProjectUpdate): LogFormData => ({
        title: u.title,
        content: u.content ?? "",
        versionTag: u.version_tag ?? "",
        sourceUrls: (u.source_urls ?? []).join("\n"),
        imageUrls: u.image_urls ?? [],
        videoUrls: (u.video_urls ?? []).join("\n"),
        attachments: u.attachments ?? [],
        createdAt: toLocalInput(u.created_at),
    });

    const hue = useMemo(() => idHue(project.id), [project.id]);
    const st = STATUS_CFG[project.status] ?? STATUS_CFG.planning;

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
                                        editingId === u.id ? (
                                            <div key={u.id} className="relative pl-8 mb-6">
                                                <div className="absolute left-[7px] top-0 bottom-0 w-px bg-[rgba(0,229,255,0.20)]" />
                                                <div className="absolute left-[3px] top-3 w-[9px] h-[9px] rounded-full border border-[rgba(0,229,255,0.12)] bg-[#0d1117]" />
                                                <LogForm
                                                    initial={toFormData(u)}
                                                    heading="// EDIT ENTRY"
                                                    submitLabel="Save Changes"
                                                    submitting={savingEdit}
                                                    onSubmit={handleSaveEdit}
                                                    onCancel={() => setEditingId(null)}
                                                />
                                            </div>
                                        ) : (
                                            <LogEntry
                                                key={u.id}
                                                update={u}
                                                isFirst={i === 0}
                                                canEdit={!!user && (u.author.id === user.id || canManage)}
                                                deleting={deletingId === u.id}
                                                onOpenImg={setLightboxUrl}
                                                onOpenCode={setCodeView}
                                                onEdit={(upd) => setEditingId(upd.id)}
                                                onDelete={(upd) => handleDeleteLog(upd.id)}
                                            />
                                        )
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
                                        <span className="font-mono text-[10px] uppercase tracking-[0.20em] text-[#4a5568]">INVITE</span>
                                        <span className="flex-1 h-px bg-[rgba(0,229,255,0.12)]" />
                                    </div>
                                    <div className="space-y-2">
                                        {/* Search */}
                                        <div className="relative">
                                            <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#4a5568" }} />
                                            <input
                                                type="text"
                                                value={memberSearch}
                                                onChange={(e) => setMemberSearch(e.target.value)}
                                                placeholder="Search members..."
                                                className="w-full h-8 pl-7 pr-3 rounded-sm text-[12px] bg-[#07090f] text-[#f0f4ff] placeholder:text-[#4a5568] focus:outline-none transition-colors"
                                                style={{ border: "1px solid rgba(0,229,255,0.18)" }}
                                            />
                                        </div>
                                        {/* Member list */}
                                        <div className="max-h-40 overflow-y-auto space-y-0.5" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(0,229,255,0.15) transparent" }}>
                                            {allProfiles
                                                .filter((p) =>
                                                    p.id !== user?.id &&
                                                    !members.some((m) => m.user.id === p.id) &&
                                                    (memberSearch === "" ||
                                                        p.display_name?.toLowerCase().includes(memberSearch.toLowerCase()) ||
                                                        p.username?.toLowerCase().includes(memberSearch.toLowerCase()))
                                                )
                                                .map((p) => {
                                                    const isSelected = selectedInvitees.includes(p.id);
                                                    const hasPending = pendingInviteIds.includes(p.id);
                                                    return (
                                                        <button
                                                            key={p.id}
                                                            type="button"
                                                            disabled={hasPending}
                                                            onClick={() => {
                                                                if (hasPending) return;
                                                                setSelectedInvitees((prev) =>
                                                                    isSelected ? prev.filter((x) => x !== p.id) : [...prev, p.id]
                                                                );
                                                                setInviteMsg(null);
                                                            }}
                                                            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-left transition-all"
                                                            style={{
                                                                background: isSelected ? "rgba(0,229,255,0.08)" : hasPending ? "rgba(245,158,11,0.04)" : "transparent",
                                                                border: isSelected ? "1px solid rgba(0,229,255,0.22)" : "1px solid transparent",
                                                                opacity: hasPending ? 0.6 : 1,
                                                            }}
                                                        >
                                                            <div className="w-5 h-5 rounded-sm flex items-center justify-center overflow-hidden shrink-0" style={{ background: "rgba(0,229,255,0.10)", border: "1px solid rgba(0,229,255,0.20)" }}>
                                                                {p.avatar_url ? (
                                                                    <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <span className="font-mono text-[8px] font-bold" style={{ color: "#00e5ff" }}>{p.display_name?.slice(0, 2).toUpperCase() || "??"}</span>
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-[11.5px] truncate" style={{ color: "#f0f4ff" }}>{p.display_name}</p>
                                                                {p.username && <p className="font-mono text-[9px]" style={{ color: "#4a5568" }}>@{p.username}</p>}
                                                            </div>
                                                            {hasPending ? (
                                                                <span className="font-mono text-[8px] px-1 py-0.5 rounded-sm shrink-0" style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.25)" }}>Pending</span>
                                                            ) : isSelected ? (
                                                                <CheckCircle2 size={11} style={{ color: "#00e5ff" }} className="shrink-0" />
                                                            ) : null}
                                                        </button>
                                                    );
                                                })}
                                        </div>
                                        {/* Send button */}
                                        <button
                                            type="button"
                                            onClick={() => void handleSendInvite()}
                                            disabled={inviting || selectedInvitees.length === 0}
                                            className="btn-3d-cyan w-full text-center disabled:opacity-50 disabled:cursor-not-allowed"
                                            style={{ minWidth: 0, paddingBottom: 0, border: 'none' }}
                                        >
                                            <div className="btn-top flex items-center justify-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] font-bold w-full">
                                                {inviting ? <Loader2 size={13} className="animate-spin" /> : <UserCheck size={13} />}
                                                <span>Send {selectedInvitees.length > 0 ? `${selectedInvitees.length} ` : ""}Invite{selectedInvitees.length !== 1 ? "s" : ""}</span>
                                            </div>
                                            <div className="btn-bottom" />
                                            <div className="btn-base" />
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
                                    </div>
                                </div>
                            )}

                            {/* Meta */}
                            <div className="border-t border-[rgba(0,229,255,0.12)] pt-5">
                                <div className="space-y-2.5">
                                    {([
                                        ["Created", fmtDate(project.created_at)],
                                        ["Updates", String(updates.length)],
                                        ["Members", String(displayMembers.length)],
                                        ["Status", st.label],
                                    ] as [string, string][]).map(([k, v]) => (
                                        <div key={k} className="flex items-center justify-between gap-4 border-b border-[rgba(0,229,255,0.08)] pb-2 last:border-0">
                                            <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#8b9ab0]">{k}</span>
                                            <span className="font-mono text-[11.5px] text-[#f0f4ff] tabular-nums text-right">{v}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Contributions */}
                            <ContributionBar updates={updates} />
                        </div>
                    </div>

                </div>
            </div>

            {/* Lightbox */}
            {typeof document !== "undefined" && lightboxUrl && createPortal(
                <Lightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />,
                document.body
            )}

            {/* Code viewer */}
            {typeof document !== "undefined" && codeView && createPortal(
                <CodeViewer attachment={codeView} onClose={() => setCodeView(null)} />,
                document.body
            )}
        </div>
    );
}
