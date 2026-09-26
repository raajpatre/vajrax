"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
    X, Loader2, Image as ImageIcon, Calendar, MapPin, Link2,
    Upload, Sparkles, Plus, Trash2, GripVertical, ToggleLeft, ToggleRight,
    ChevronDown, Settings2, FileText, Users, Check, Circle, Square,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@/lib/hooks/useUser";
import { Tables } from "@/types/database";
import type { CustomField, CustomFieldType } from "@/types/database";

type Event = Tables<"events">;

interface EventModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    event?: Event | null;
}

// ── helpers ───────────────────────────────────────────────────────
function normalizeImageUrl(raw: string) {
    const value = raw.trim();
    if (!value) return "";
    try {
        const url = new URL(value);
        if (url.hostname === "drive.google.com") {
            const fileId = url.searchParams.get("id") || url.pathname.match(/\/file\/d\/([^/]+)/)?.[1];
            if (fileId) return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`;
        }
        return url.toString();
    } catch { return ""; }
}

function toDateTimeLocal(value: string | null) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60_000);
    return localDate.toISOString().slice(0, 16);
}

function newField(): CustomField {
    return {
        id: crypto.randomUUID(),
        label: "",
        type: "short_text",
        required: false,
        options: [],
        placeholder: "",
    };
}

const FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
    short_text: "Short Text",
    long_text: "Long Paragraph",
    dropdown: "Dropdown",
    mcq: "Multiple Choice",
    checkbox: "Checkboxes",
    rating: "Rating",
    image: "Image Upload",
    url: "External URL",
};

const MODAL_TABS = [
    { id: "details", label: "Event Details", icon: Calendar },
    { id: "registration", label: "Registration", icon: Users },
    { id: "report", label: "Event Report", icon: FileText },
] as const;
type ModalTab = typeof MODAL_TABS[number]["id"];

// ── Form-style Inputs ─────────────────────────────────────────────
const AuthInput = ({ label, className, placeholder, ...props }: any) => (
    <div className={`relative w-full ${className || ""}`}>
        <label className="mb-2 flex items-center gap-2">
            
            <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#8b9ab0] font-medium">{label}</span>
        </label>
        <input
            className="w-full bg-[#0d1117] border border-[rgba(255,255,255,0.05)] text-[#f0f4ff] text-[13px] rounded-sm px-3.5 py-2.5 focus:outline-none focus:border-[#00e5ff] focus:ring-1 focus:ring-[#00e5ff]/20 placeholder:text-[#4a5568]"
            placeholder={placeholder}
            {...props}
        />
    </div>
);

const AuthTextarea = ({ label, className, placeholder, ...props }: any) => (
    <div className={`relative w-full ${className || ""}`}>
        <label className="mb-2 flex items-center gap-2">
            
            <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#8b9ab0] font-medium">{label}</span>
        </label>
        <textarea
            className="w-full bg-[#0d1117] border border-[rgba(255,255,255,0.05)] text-[#f0f4ff] text-[13px] rounded-sm p-3.5 focus:outline-none focus:border-[#00e5ff] focus:ring-1 focus:ring-[#00e5ff]/20 placeholder:text-[#4a5568] resize-none"
            placeholder={placeholder}
            {...props}
        />
    </div>
);

function AuthSelect({ label, children, className = "", ...props }: any) {
    return (
        <div className={`relative w-full ${className}`}>
            <label className="mb-2 flex items-center gap-2">
                
                <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#8b9ab0] font-medium">{label}</span>
            </label>
            <div className="relative">
                <select
                    className="w-full bg-[#0d1117] border border-[rgba(255,255,255,0.05)] text-[#f0f4ff] text-[13px] rounded-sm pl-3.5 pr-9 py-2.5 focus:outline-none focus:border-[#00e5ff] focus:ring-1 focus:ring-[#00e5ff]/20 appearance-none"
                    {...props}
                >
                    {children}
                </select>
                <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#4a5568] pointer-events-none" />
            </div>
        </div>
    );
}

function AuthDateTime({ label, className = "", ...props }: any) {
    return (
        <div className={`relative w-full ${className}`}>
            <label className="mb-2 flex items-center gap-2">
                
                <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#8b9ab0] font-medium">{label}</span>
            </label>
            <input
                type="datetime-local"
                className="w-full bg-[#0d1117] border border-[rgba(255,255,255,0.05)] text-[#f0f4ff] text-[13px] rounded-sm px-3.5 py-2.5 focus:outline-none focus:border-[#00e5ff] focus:ring-1 focus:ring-[#00e5ff]/20 [color-scheme:dark]"
                {...props}
            />
        </div>
    );
}

// ── Custom Field Builder Row ──────────────────────────────────────
function FieldBuilderRow({
    field,
    onChange,
    onDelete,
}: {
    field: CustomField;
    onChange: (updated: CustomField) => void;
    onDelete: () => void;
}) {
    const needsOptions = ["dropdown", "mcq", "checkbox"].includes(field.type);

    return (
        <div className="rounded-lg border border-[rgba(0,229,255,0.15)] bg-white/[0.02] p-4 space-y-4">
            <div className="flex items-start sm:items-end gap-2 flex-col sm:flex-row">
                <div className="flex w-full items-end gap-2">
                    <div className="shrink-0 mb-3 cursor-grab text-[#8b9ab0] hover:text-[#f0f4ff] transition-colors">
                        <GripVertical size={14} />
                    </div>
                    <AuthInput
                        value={field.label}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...field, label: e.target.value })}
                        label="Field label (e.g. What motivates you?)"
                    />
                </div>
                <div className="flex w-full sm:w-auto items-end gap-2 pl-6 sm:pl-0">
                    <AuthSelect
                        value={field.type}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                            const newType = e.target.value as CustomFieldType;
                            const oldNeedsOptions = ["dropdown", "mcq", "checkbox"].includes(field.type);
                            const newNeedsOptions = ["dropdown", "mcq", "checkbox"].includes(newType);
                            onChange({ 
                                ...field, 
                                type: newType, 
                                options: (oldNeedsOptions && newNeedsOptions) ? field.options : (newNeedsOptions ? [""] : []) 
                            });
                        }}
                        label="Type"
                    >
                        {Object.entries(FIELD_TYPE_LABELS).map(([v, l]) => (
                            <option key={v} value={v}>{l}</option>
                        ))}
                    </AuthSelect>
                    <button
                        type="button"
                        onClick={() => onChange({ ...field, required: !field.required })}
                        className={`shrink-0 text-[10px] font-mono uppercase tracking-[0.12em] px-3 h-[36px] rounded-sm border transition-colors ${field.required ? "border-[rgba(0,229,255,0.4)] text-[#00e5ff] bg-[rgba(0,229,255,0.08)]" : "border-[rgba(255,255,255,0.1)] text-[#8b9ab0] hover:text-[#f0f4ff] hover:bg-[rgba(255,255,255,0.02)]"}`}
                    >
                        {field.required ? "Required" : "Optional"}
                    </button>
                    <button
                        type="button"
                        onClick={onDelete}
                        className="shrink-0 w-[36px] h-[36px] grid place-items-center rounded-sm border border-[rgba(239,68,68,0.2)] text-[#ef4444] hover:bg-[rgba(239,68,68,0.1)] transition-colors"
                    >
                        <Trash2 size={13} />
                    </button>
                </div>
            </div>

            {needsOptions && (
                <div className="pl-6 space-y-2 mt-2">
                    <label className="flex items-center gap-2 mb-3">
                        
                        <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#8b9ab0] font-medium">Options</span>
                    </label>
                    
                    {(field.options ?? []).map((opt, idx) => (
                        <div key={idx} className="flex items-center gap-3 group">
                            {field.type === "mcq" && <Circle size={14} className="text-[#4a5568] shrink-0" />}
                            {field.type === "checkbox" && <Square size={14} className="text-[#4a5568] shrink-0" />}
                            {field.type === "dropdown" && <span className="font-mono text-[11px] text-[#4a5568] shrink-0 w-3.5 text-center">{idx + 1}.</span>}

                            <input
                                type="text"
                                value={opt}
                                onChange={(e) => {
                                    const newOptions = [...(field.options ?? [])];
                                    newOptions[idx] = e.target.value;
                                    onChange({ ...field, options: newOptions });
                                }}
                                placeholder={`Option ${idx + 1}`}
                                className="flex-1 bg-transparent border-b border-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.2)] focus:border-[#00e5ff] text-[13px] text-[#f0f4ff] px-1 py-1.5 focus:outline-none transition-colors"
                            />

                            <button
                                type="button"
                                onClick={() => {
                                    const newOptions = (field.options ?? []).filter((_, i) => i !== idx);
                                    onChange({ ...field, options: newOptions });
                                }}
                                className="text-[#4a5568] hover:text-[#ef4444] opacity-0 group-hover:opacity-100 transition-all p-1 shrink-0"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                    
                    <div className="flex items-center gap-3 pt-1">
                        {field.type === "mcq" && <Circle size={14} className="text-[#4a5568] shrink-0" />}
                        {field.type === "checkbox" && <Square size={14} className="text-[#4a5568] shrink-0" />}
                        {field.type === "dropdown" && <span className="font-mono text-[11px] text-[#4a5568] shrink-0 w-3.5 text-center">{(field.options?.length ?? 0) + 1}.</span>}
                        
                        <button
                            type="button"
                            onClick={() => {
                                const newOptions = [...(field.options ?? []), ""];
                                onChange({ ...field, options: newOptions });
                            }}
                            className="text-[13px] text-[#8b9ab0] hover:text-[#00e5ff] border-b border-transparent transition-colors px-1 py-1"
                        >
                            Add Option
                        </button>
                    </div>
                </div>
            )}

            {!needsOptions && (
                <div className="pl-6">
                    <AuthInput
                        value={field.placeholder ?? ""}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...field, placeholder: e.target.value })}
                        label="Placeholder text (optional)"
                    />
                </div>
            )}
        </div>
    );
}

// ── Main Modal ────────────────────────────────────────────────────
export default function EventModal({ isOpen, onClose, onSuccess, event }: EventModalProps) {
    const { user } = useUser();
    const [activeTab, setActiveTab] = useState<ModalTab>("details");

    // ── Details tab state ─────────────────────────────────────────
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [eventType, setEventType] = useState("hackathon");
    const [isExclusive, setIsExclusive] = useState(false);
    const [startsAt, setStartsAt] = useState("");
    const [endsAt, setEndsAt] = useState("");
    const [location, setLocation] = useState("");
    const [imageSource, setImageSource] = useState<"upload" | "url">("upload");
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imageUrlInput, setImageUrlInput] = useState("");
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const normalizedImageUrl = useMemo(() => normalizeImageUrl(imageUrlInput), [imageUrlInput]);
    const hasEmbedUrl = imageSource === "url" && !!normalizedImageUrl;

    // ── Registration tab state ────────────────────────────────────
    const [registrationMode, setRegistrationMode] = useState<"none" | "individual" | "team" | "both" | "external">("none");
    const [externalRegistrationUrl, setExternalRegistrationUrl] = useState("");
    const [registrationOpen, setRegistrationOpen] = useState(true);
    const [registrationDeadline, setRegistrationDeadline] = useState("");
    const [maxRegistrations, setMaxRegistrations] = useState<string>("");
    const [teamSizeMin, setTeamSizeMin] = useState(2);
    const [teamSizeMax, setTeamSizeMax] = useState(4);
    const [teamSizeStrict, setTeamSizeStrict] = useState(false);

    // ── Custom fields tab state ───────────────────────────────────
    const [customFields, setCustomFields] = useState<CustomField[]>([]);

    // ── Report tab state ──────────────────────────────────────────
    const [reportSummary, setReportSummary] = useState("");
    const [reportYoutubeUrls, setReportYoutubeUrls] = useState("");

    // ── Submit state ──────────────────────────────────────────────
    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState("");
    const [error, setError] = useState<string | null>(null);
    const isEditing = !!event;

    // ── Reset on open ─────────────────────────────────────────────
    useEffect(() => {
        if (!isOpen) return;
        setActiveTab("details");
        if (event) {
            setTitle(event.title ?? "");
            setDescription(event.description ?? "");
            setEventType(event.event_type ?? "hackathon");
            setIsExclusive(!!event.is_exclusive);
            setStartsAt(toDateTimeLocal(event.starts_at));
            setEndsAt(toDateTimeLocal(event.ends_at));
            setLocation(event.location ?? "");
            if (event.cover_image_url) {
                setImageSource("url");
                setImageUrlInput(event.cover_image_url);
                setImagePreview(normalizeImageUrl(event.cover_image_url) || event.cover_image_url);
                setImageFile(null);
            } else {
                setImageSource("upload");
                setImageFile(null);
                setImageUrlInput("");
                setImagePreview(null);
            }
            // Registration
            setRegistrationMode((event.registration_mode as "none" | "individual" | "team" | "both" | "external") ?? "none");
            setExternalRegistrationUrl(event.external_registration_url ?? "");
            setRegistrationOpen(!!event.registration_open);
            setRegistrationDeadline(toDateTimeLocal(event.registration_deadline));
            setMaxRegistrations(event.max_registrations?.toString() ?? "");
            setTeamSizeMin(event.team_size_min ?? 2);
            setTeamSizeMax(event.team_size_max ?? 4);
            setTeamSizeStrict(!!event.team_size_strict);
            setCustomFields((event.custom_fields as unknown as CustomField[]) ?? []);
            // Report
            setReportSummary(event.report_summary ?? "");
            setReportYoutubeUrls(((event.report_youtube_urls as unknown as string[]) ?? []).join("\n"));
        } else {
            setTitle(""); setDescription(""); setEventType("hackathon"); setIsExclusive(false);
            setStartsAt(""); setEndsAt(""); setLocation("");
            setImageSource("upload"); setImageFile(null); setImageUrlInput(""); setImagePreview(null);
            setRegistrationMode("none"); setExternalRegistrationUrl("");
            setRegistrationOpen(false); setRegistrationDeadline(""); setMaxRegistrations("");
            setTeamSizeMin(2); setTeamSizeMax(4); setTeamSizeStrict(false);
            setCustomFields([]); setReportSummary(""); setReportYoutubeUrls("");
        }
        setError(null); setLoading(false); setLoadingMessage("");
    }, [event, isOpen]);

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImageSource("upload");
        setImageFile(file);
        setImageUrlInput("");
        const reader = new FileReader();
        reader.onloadend = () => setImagePreview(reader.result as string);
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!title.trim() || !description.trim() || !startsAt) {
            setError("Title, description, and start time are required.");
            setActiveTab("details");
            return;
        }
        setLoading(true);
        const supabase = createClient();
        let imageUrl = hasEmbedUrl ? normalizedImageUrl : null;

        try {
            if (imageSource === "upload" && imageFile) {
                if (imageFile.size > 10 * 1024 * 1024) throw new Error("Image size exceeds 10MB limit.");
                setLoadingMessage("Uploading event image...");
                const ext = imageFile.name.split(".").pop();
                const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
                const uploadPromise = supabase.storage.from("event-images").upload(filename, imageFile, { contentType: imageFile.type });
                const timeoutPromise = new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error("Upload timed out.")), 300000)
                );
                const { error: uploadError } = await Promise.race([uploadPromise, timeoutPromise]) as Awaited<typeof uploadPromise>;
                if (uploadError) throw new Error(uploadError.message || "Failed to upload image");
                const { data: urlData } = supabase.storage.from("event-images").getPublicUrl(filename);
                imageUrl = urlData.publicUrl;
            }

            setLoadingMessage("Saving event details...");
            const startDate = new Date(startsAt).toISOString();
            const endDate = endsAt ? new Date(endsAt).toISOString() : null;
            const deadline = registrationDeadline ? new Date(registrationDeadline).toISOString() : null;
            const maxReg = maxRegistrations && maxRegistrations !== "" ? parseInt(maxRegistrations, 10) : null;
            const youtubeUrls = reportYoutubeUrls.split("\n").map((s) => s.trim()).filter(Boolean);

            const payload = {
                title: title.trim(),
                description: description.trim(),
                event_type: eventType,
                is_exclusive: isExclusive,
                starts_at: startDate,
                ends_at: endDate,
                location: location.trim() || null,
                cover_image_url: imageUrl,
                // Registration
                registration_mode: registrationMode,
                external_registration_url: registrationMode === "external" ? externalRegistrationUrl.trim() || null : null,
                registration_open: registrationMode !== "none",
                registration_deadline: deadline,
                max_registrations: maxReg,
                team_size_min: teamSizeMin,
                team_size_max: teamSizeMax,
                team_size_strict: teamSizeStrict,
                custom_fields: customFields.map(f => ({
                    ...f,
                    options: f.options ? f.options.map(o => o.trim()).filter(Boolean) : []
                })) as any,
                // Report
                report_summary: reportSummary.trim() || null,
                report_youtube_urls: youtubeUrls,
            };

            if (event) {
                const { error: updateError } = await supabase.from("events").update(payload).eq("id", event.id);
                if (updateError) throw updateError;
            } else {
                const { error: insertError } = await supabase.from("events").insert({ ...payload, created_by: user?.id || null });
                if (insertError) throw insertError;
            }

            onSuccess();
            onClose();
        } catch (err: unknown) {
            console.error("Event save error:", err);
            setError(err instanceof Error ? err.message : `An error occurred while ${isEditing ? "updating" : "creating"} the event.`);
        } finally {
            setLoading(false);
            setLoadingMessage("");
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto px-3 pb-3 pt-[calc(var(--nav-height)+0.5rem)] sm:px-6 sm:pb-6 sm:pt-[calc(var(--nav-height)+1rem)]">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={loading ? undefined : onClose}
                    />
                    <div className="relative z-10 flex min-h-full items-start justify-center">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="relative z-10 w-full max-w-4xl bg-[#07090f] border border-[rgba(255,255,255,0.1)] rounded-md shadow-2xl overflow-hidden flex flex-col"
                        >
                            {/* Header */}
                            <div className="flex items-start justify-between p-6 pb-5 border-b border-[rgba(255,255,255,0.05)]">
                                <div className="flex items-start gap-3">
                                    <div className="mt-1.5 w-2 h-2 rounded-full bg-[#00e5ff] shadow-[0_0_8px_rgba(0,229,255,0.8)] animate-pulse" />
                                    <div>
                                        <h2 className="text-[17px] font-bold text-[#f0f4ff] tracking-tight mb-1">
                                            {isEditing ? "Edit Event" : "New Event"}
                                        </h2>
                                        <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#8b9ab0]">
                                            EVENT • {isEditing ? "EDIT" : "CREATE"}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    disabled={loading}
                                    className="w-7 h-7 flex items-center justify-center rounded-sm text-[#8b9ab0] hover:text-[#f0f4ff] hover:bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.05)] transition-colors disabled:opacity-50"
                                >
                                    <X size={13} />
                                </button>
                            </div>

                            {/* Tab bar */}
                            <div className="flex border-b border-[rgba(255,255,255,0.05)] overflow-x-auto px-6">
                                {MODAL_TABS.map(({ id, label, icon: Icon }) => (
                                    <button
                                        key={id}
                                        type="button"
                                        onClick={() => setActiveTab(id)}
                                        className={`flex items-center gap-2 px-4 py-4 text-[10px] font-mono uppercase tracking-[0.14em] whitespace-nowrap border-b-2 transition-colors ${activeTab === id
                                            ? "border-[#00e5ff] text-[#00e5ff]"
                                            : "border-transparent text-[#8b9ab0] hover:text-[#f0f4ff]"}`}
                                    >
                                        <Icon size={12} />
                                        {label}
                                    </button>
                                ))}
                            </div>

                            <div className="max-h-[calc(100dvh-var(--nav-height)-8rem)] overflow-y-auto">
                                <form onSubmit={handleSubmit}>
                                    {/* Error / loading banner */}
                                    {error && (
                                        <div className="mx-4 mt-4 rounded-lg bg-red-400/10 border border-red-400/20 p-3 text-sm text-red-400">
                                            {error}
                                        </div>
                                    )}
                                    {loading && loadingMessage && !error && (
                                        <div className="mx-4 mt-4 flex items-center gap-2 rounded-lg bg-primary/10 border border-primary/20 p-3 text-sm text-primary-light">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            {loadingMessage}
                                        </div>
                                    )}

                                    {/* ── DETAILS TAB ─────────────────────────────── */}
                                    {activeTab === "details" && (
                                        <div className="p-4 sm:p-6 grid gap-4 sm:gap-5 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
                                            {/* Left: image picker */}
                                            <div className="rounded-lg border border-cyan-200/10 bg-white/[0.03] p-4 sm:p-5 lg:sticky lg:top-0">
                                                <div className="flex flex-col items-center text-center">
                                                    <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageSelect} className="hidden" />

                                                    <div className="w-full flex flex-col items-center gap-4">
                                                        <label className="group cursor-pointer bg-[rgba(0,229,255,0.03)] hover:bg-[rgba(0,229,255,0.06)] px-6 py-8 w-full rounded-[10px] border-2 border-dashed border-[rgba(0,229,255,0.2)] hover:border-[rgba(0,229,255,0.5)] shadow-[0_0_40px_-10px_rgba(0,229,255,0.15)] flex flex-col items-center justify-center gap-1.5 transition-all duration-300">
                                                            <svg viewBox="0 0 640 512" className="h-[50px] fill-[#8b9ab0] group-hover:fill-[#00e5ff] transition-all duration-300 mb-4 drop-shadow-[0_0_10px_rgba(0,229,255,0)] group-hover:drop-shadow-[0_0_15px_rgba(0,229,255,0.5)]">
                                                                <path d="M144 480C64.5 480 0 415.5 0 336c0-62.8 40.2-116.2 96.2-135.9c-.1-2.7-.2-5.4-.2-8.1c0-88.4 71.6-160 160-160c59.3 0 111 32.2 138.7 80.2C409.9 102 428.3 96 448 96c53 0 96 43 96 96c0 12.2-2.3 23.8-6.4 34.6C596 238.4 640 290.1 640 352c0 70.7-57.3 128-128 128H144zm79-217c-9.4 9.4-9.4 24.6 0 33.9s24.6 9.4 33.9 0l39-39V392c0 13.3 10.7 24 24 24s24-10.7 24-24V257.9l39 39c9.4 9.4 24.6 9.4 33.9 0s9.4-24.6 0-33.9l-80-80c-9.4-9.4-24.6-9.4-33.9 0l-80 80z" />
                                                            </svg>
                                                            <span className="bg-[rgba(0,229,255,0.08)] border border-[rgba(0,229,255,0.2)] px-5 py-2 rounded-xl text-[#00e5ff] text-[13px] font-semibold tracking-wide transition-all duration-300 group-hover:bg-[#00e5ff] group-hover:text-black group-hover:shadow-[0_0_20px_rgba(0,229,255,0.4)] mt-1">
                                                                Browse file
                                                            </span>
                                                            <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                                                        </label>

                                                        {imagePreview && (
                                                            <div className="relative mx-auto w-full max-w-[240px] aspect-[3/4] overflow-hidden rounded-xl border border-border shadow-[0_0_30px_rgba(0,229,255,0.08)]">
                                                                <img src={imagePreview} alt="Cover" className="h-full w-full object-cover transition-transform duration-300 hover:scale-105" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Right: form fields */}
                                            <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
                                                <AuthInput required value={title} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)} label="Event Title" className="md:col-span-2" />
                                                <AuthTextarea required value={description} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)} rows={4} label="Description" className="md:col-span-2" />
                                                <AuthSelect value={eventType} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEventType(e.target.value)} label="Event Type">
                                                    <option value="hackathon">Hackathon</option>
                                                    <option value="workshop">Workshop</option>
                                                    <option value="meetup">Meetup</option>
                                                    <option value="competition">Competition</option>
                                                    <option value="feedback">Feedback</option>
                                                    <option value="other">Other</option>
                                                </AuthSelect>
                                                <div>
                                                    <div className="grid grid-cols-2 rounded-md border border-[rgba(0,229,255,0.2)] bg-transparent p-1 h-11 relative">
                                                        <label className="absolute left-2 top-0 -translate-y-1/2 scale-[0.85] bg-background px-2 text-[#00e5ff] text-[14px] pointer-events-none z-10">Visibility</label>
                                                        <button type="button" onClick={() => setIsExclusive(false)} className={`rounded-sm text-[13px] font-semibold transition-all ${!isExclusive ? "bg-[rgba(0,229,255,0.15)] text-[#00e5ff]" : "text-[#8b9ab0] hover:text-[#f0f4ff]"}`}>Open for All</button>
                                                        <button type="button" onClick={() => setIsExclusive(true)} className={`rounded-sm text-[13px] font-semibold transition-all ${isExclusive ? "bg-[rgba(0,229,255,0.15)] text-[#00e5ff]" : "text-[#8b9ab0] hover:text-[#f0f4ff]"}`}>Club Exclusive</button>
                                                    </div>
                                                </div>
                                                <AuthDateTime required value={startsAt} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartsAt(e.target.value)} label="Start Time" />
                                                <AuthDateTime value={endsAt} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndsAt(e.target.value)} label="End Time (Optional)" />
                                                <AuthInput value={location} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocation(e.target.value)} label="Location (Optional)" className="md:col-span-2" />
                                            </div>
                                        </div>
                                    )}

                                    {/* ── REGISTRATION TAB ────────────────────────── */}
                                    {activeTab === "registration" && (
                                        <div className="p-4 sm:p-6 space-y-6">
                                            {/* Mode selector */}
                                            <div>
                                                <label className="mb-2 block text-sm font-medium text-text-secondary">Registration Mode</label>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                    {([
                                                        { v: "none", label: "No Registration", desc: "Walk-in / Open to all" },
                                                        { v: "individual", label: "Individual", desc: "One person per entry" },
                                                        { v: "team", label: "Team Only", desc: "Team registration" },
                                                        { v: "both", label: "Individual + Team", desc: "Participant chooses" },
                                                        { v: "external", label: "External URL", desc: "Link to external form" },
                                                    ] as const).map(({ v, label, desc }) => (
                                                        <button
                                                            key={v}
                                                            type="button"
                                                            onClick={() => setRegistrationMode(v)}
                                                            className={`rounded-xl border p-3 text-left transition-all ${registrationMode === v ? "border-cyan-400/50 bg-cyan-300/10" : "border-[var(--ghost-border)] bg-white/[0.02] hover:bg-white/[0.04]"}`}
                                                        >
                                                            <div className={`text-xs font-semibold ${registrationMode === v ? "text-cyan-200" : "text-text-secondary"}`}>{label}</div>
                                                            <div className="text-[10px] text-text-muted mt-0.5">{desc}</div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {registrationMode === "external" && (
                                                <div className="pt-2">
                                                    <AuthInput type="url" value={externalRegistrationUrl} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExternalRegistrationUrl(e.target.value)} label="External Registration URL" />
                                                </div>
                                            )}

                                            {registrationMode !== "none" && registrationMode !== "external" && (
                                                <>


                                                    {/* Deadline + capacity */}
                                                    <div className="grid gap-4 md:grid-cols-2 pt-2">
                                                        <div>
                                                            <AuthDateTime value={registrationDeadline} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRegistrationDeadline(e.target.value)} label="Registration Deadline" />
                                                            <p className="mt-1 text-[11px] text-[#8b9ab0] ml-1">Auto-closes form at this time</p>
                                                        </div>
                                                        <div>
                                                            <AuthInput type="number" min="1" value={maxRegistrations} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMaxRegistrations(e.target.value)} label="Max Registrations (Optional)" />
                                                        </div>
                                                    </div>

                                                    {/* Team config */}
                                                    {(registrationMode === "team" || registrationMode === "both") && (
                                                        <div className="rounded-md border border-[rgba(0,229,255,0.15)] p-5 space-y-5 mt-4">
                                                            <div className="text-[13px] font-semibold text-[#f0f4ff] uppercase tracking-wide">Team Configuration</div>
                                                            <div className="grid gap-4 md:grid-cols-3">
                                                                <div>
                                                                    <AuthInput type="number" min="2" max="20" value={teamSizeMin} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTeamSizeMin(+e.target.value)} label="Min Members" />
                                                                </div>
                                                                <div>
                                                                    <AuthInput type="number" min="2" max="20" value={teamSizeMax} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTeamSizeMax(+e.target.value)} label="Max Members" />
                                                                </div>
                                                                <div className="flex flex-col w-full">
                                                                    <label className="mb-2 flex items-center gap-2">
                                                                        
                                                                        <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#8b9ab0] font-medium truncate">
                                                                            {teamSizeStrict ? `Exact (${teamSizeMax})` : `Range (${teamSizeMin}–${teamSizeMax})`}
                                                                        </span>
                                                                    </label>
                                                                    <button type="button" onClick={() => setTeamSizeStrict((s) => !s)}
                                                                        className={`w-full py-2.5 rounded-sm border text-[13px] transition-all ${teamSizeStrict ? "border-[rgba(0,229,255,0.4)] bg-[rgba(0,229,255,0.08)] text-[#00e5ff]" : "border-[rgba(255,255,255,0.1)] text-[#8b9ab0] hover:text-[#f0f4ff] hover:bg-[rgba(255,255,255,0.02)]"}`}>
                                                                        {teamSizeStrict ? "✓ Strict count" : "Flexible count"}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* ── CUSTOM FIELDS ───────────────────────────── */}
                                                    <div className="pt-4 mt-6 border-t border-[rgba(255,255,255,0.05)] space-y-4">
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <div className="text-sm font-medium text-text-secondary">Custom Registration Fields</div>
                                                                <div className="text-[11px] text-text-muted mt-0.5">Add extra fields to collect from participants</div>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => setCustomFields((f) => [...f, newField()])}
                                                                className="inline-flex items-center gap-2 h-9 px-4 rounded-lg text-xs font-semibold bg-cyan-300/10 text-cyan-200 border border-cyan-400/30 hover:bg-cyan-300/15 transition-colors"
                                                            >
                                                                <Plus size={13} /> Add Field
                                                            </button>
                                                        </div>
                                                        {customFields.length === 0 ? (
                                                            <div className="rounded-xl border border-dashed border-[var(--ghost-border)] p-8 text-center text-text-muted text-sm">
                                                                No custom fields yet. Click "Add Field" to add questions to the registration form.
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-3">
                                                                {customFields.map((field, i) => (
                                                                    <FieldBuilderRow
                                                                        key={field.id}
                                                                        field={field}
                                                                        onChange={(updated) => setCustomFields((f) => f.map((ff, idx) => idx === i ? updated : ff))}
                                                                        onDelete={() => setCustomFields((f) => f.filter((_, idx) => idx !== i))}
                                                                    />
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {/* ── REPORT TAB ──────────────────────────────── */}
                                    {activeTab === "report" && (
                                        <div className="p-4 sm:p-6 space-y-5">
                                            <div className="rounded-md border border-[rgba(245,158,11,0.2)] bg-[rgba(245,158,11,0.05)] px-4 py-3 text-[12.5px] text-[#f59e0b]">
                                                The event report is shown to the public after the event ends. Fill it in once the event is over.
                                            </div>
                                            <div className="pt-2">
                                                <AuthTextarea value={reportSummary} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReportSummary(e.target.value)} rows={8} label="Event Summary" />
                                            </div>
                                            <div className="pt-2">
                                                <AuthTextarea value={reportYoutubeUrls} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReportYoutubeUrls(e.target.value)} rows={4} label="YouTube Video URLs" />
                                                <p className="mt-1 text-[11px] text-[#8b9ab0] ml-1">One URL per line. Supports youtube.com and youtu.be links.</p>
                                            </div>
                                            <div className="rounded-lg border border-cyan-200/10 bg-white/[0.02] p-4 text-[12px] text-text-muted">
                                                <span className="text-cyan-200 font-semibold">Coming soon:</span> Photo uploader, guest speakers editor, and event sponsors editor will be available here.
                                            </div>
                                        </div>
                                    )}

                                    {/* Footer with submit */}
                                    <div className="p-5 border-t border-[rgba(255,255,255,0.05)] flex items-center justify-between">
                                        <div />
                                        <div className="flex items-center gap-3">
                                            <button
                                                type="button"
                                                onClick={onClose}
                                                disabled={loading}
                                                className="px-4 py-2 text-[12px] text-[#8b9ab0] hover:text-[#f0f4ff] transition-colors disabled:opacity-50"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={loading || !title.trim()}
                                                className="h-[34px] px-4 inline-flex items-center justify-center gap-1.5 bg-transparent border border-[rgba(0,229,255,0.2)] text-[#00e5ff] text-[12px] font-medium rounded-sm hover:bg-[rgba(0,229,255,0.05)] hover:border-[#00e5ff] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                            >
                                                {loading ? (
                                                    <Loader2 size={12} className="animate-spin" />
                                                ) : (
                                                    <Check size={12} />
                                                )}
                                                {isEditing ? "Save changes" : "Add Event"}
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                </div>
            )}
        </AnimatePresence>
    );
}
