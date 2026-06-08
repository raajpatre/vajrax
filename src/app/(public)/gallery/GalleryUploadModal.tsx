"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
    X, Loader2, Image as ImageIcon, Calendar, MapPin, Tag,
    Link2, Upload, PlayCircle, FileText, Play, Check, Globe,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@/lib/hooks/useUser";
import { Tables } from "@/types/database";

type GalleryItem = Tables<"gallery_items">;
type MediaType = "photo" | "video" | "article";

interface GalleryUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    editItem?: GalleryItem | null;
}

function extractYouTubeId(url: string): string | null {
    try {
        const u = new URL(url.trim());
        if (u.hostname === "youtu.be") return u.pathname.slice(1).split("?")[0] || null;
        if (u.hostname.includes("youtube.com")) return u.searchParams.get("v");
        return null;
    } catch {
        return null;
    }
}

function ytThumbnail(videoId: string) {
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

async function uploadToCloudinary(file: File, folder: string): Promise<string> {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", folder);
    const res = await fetch("/api/cloudinary/upload", { method: "POST", body: fd });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Upload failed.");
    return json.url as string;
}

const MEDIA_TYPES: { key: MediaType; label: string; Icon: LucideIcon }[] = [
    { key: "photo",   label: "Photo",   Icon: ImageIcon  },
    { key: "video",   label: "Video",   Icon: PlayCircle },
    { key: "article", label: "Article", Icon: FileText   },
];

const TAG_OPTIONS = [
    "Gallery", "Achievement", "Event", "Build-Log", "Workshop",
    "Award", "Hackathon", "Announcement", "Project", "Outreach",
];

const TAG_COLORS = [
    { hex: "#00e5ff", label: "Cyan"   },
    { hex: "#f59e0b", label: "Amber"  },
    { hex: "#a78bfa", label: "Purple" },
    { hex: "#22c55e", label: "Green"  },
    { hex: "#ef4444", label: "Red"    },
    { hex: "#38bdf8", label: "Blue"   },
    { hex: "#f472b6", label: "Pink"   },
    { hex: "#ffd700", label: "Gold"   },
];

// Shared input class
const inputCls =
    "w-full bg-[rgba(7,9,15,0.6)] border border-edge rounded-sm px-3 py-2.5 text-fg text-[13px] " +
    "focus:outline-none focus:border-cyan2/60 transition-colors placeholder:text-fg3";

// $ label
function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
    return (
        <div className="flex items-center justify-between mb-1.5">
            <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg2">
                <span className="text-fg3 mr-0.5">$</span> {children}
            </label>
            {hint && (
                <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-fg3">{hint}</span>
            )}
        </div>
    );
}

export default function GalleryUploadModal({
    isOpen, onClose, onSuccess, editItem = null,
}: GalleryUploadModalProps) {
    const { user } = useUser();

    const [mediaType,       setMediaType]       = useState<MediaType>("photo");
    const [title,           setTitle]           = useState("");
    const [description,     setDescription]     = useState("");
    const [date,            setDate]            = useState(() => new Date().toISOString().split("T")[0]);
    const [tag,             setTag]             = useState("Gallery");
    const [tagColor,        setTagColor]        = useState<string | null>(null);
    const [locationCity,    setLocationCity]    = useState("Bengaluru");
    const [locationCountry, setLocationCountry] = useState("India");

    // Photo-specific
    const [imageSource,   setImageSource]   = useState<"upload" | "url">("upload");
    const [imageFile,     setImageFile]     = useState<File | null>(null);
    const [imageUrlInput, setImageUrlInput] = useState("");
    const [imagePreview,  setImagePreview]  = useState<string | null>(null);

    // Video-specific
    const [youtubeUrl, setPlayUrl] = useState("");

    // Article-specific
    const [articleUrl,    setArticleUrl]    = useState("");
    const [thumbFile,     setThumbFile]     = useState<File | null>(null);
    const [thumbPreview,  setThumbPreview]  = useState<string | null>(null);
    const [thumbUrlInput, setThumbUrlInput] = useState("");
    const [thumbSource,   setThumbSource]   = useState<"upload" | "url" | "none">("none");

    const [loading,        setLoading]        = useState(false);
    const [loadingMessage, setLoadingMessage] = useState("");
    const [error,          setError]          = useState<string | null>(null);

    const fileInputRef  = useRef<HTMLInputElement>(null);
    const thumbInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!isOpen) return;
        if (editItem) {
            setTitle(editItem.title || "");
            setDescription(editItem.description || "");
            setDate(editItem.created_at
                ? new Date(editItem.created_at).toISOString().split("T")[0]
                : new Date().toISOString().split("T")[0]);
            setTag(editItem.tag || "Gallery");
            setTagColor(editItem.tag_color ?? null);
            setLocationCity(editItem.location_city || "Bengaluru");
            setLocationCountry(editItem.location_country || "India");

            const hasMedia = !!editItem.media_url;
            const ytId = hasMedia ? extractYouTubeId(editItem.media_url!) : null;
            if (ytId) {
                setMediaType("video");
                setPlayUrl(editItem.media_url!);
            } else if (hasMedia) {
                setMediaType("article");
                setArticleUrl(editItem.media_url!);
                setThumbSource(editItem.cover_image_url ? "url" : "none");
                setThumbUrlInput(editItem.cover_image_url ?? "");
                setThumbPreview(editItem.cover_image_url ?? null);
            } else {
                setMediaType("photo");
                setImageSource("url");
                setImageUrlInput(editItem.cover_image_url || "");
                setImagePreview(editItem.cover_image_url || null);
            }
        } else {
            setMediaType("photo");
            setTitle(""); setDescription("");
            setDate(new Date().toISOString().split("T")[0]);
            setTag("Gallery"); setTagColor(null); setLocationCity("Bengaluru"); setLocationCountry("India");
            setImageSource("upload"); setImageFile(null); setImageUrlInput(""); setImagePreview(null);
            setPlayUrl("");
            setArticleUrl(""); setThumbFile(null); setThumbPreview(null); setThumbUrlInput(""); setThumbSource("none");
        }
        setError(null); setLoading(false); setLoadingMessage("");
    }, [isOpen, editItem]);

    const ytId = useMemo(() => extractYouTubeId(youtubeUrl), [youtubeUrl]);

    const canSubmit = useMemo(() => {
        if (!title.trim()) return false;
        if (mediaType === "photo") return imageSource === "upload" ? !!imageFile : !!imageUrlInput.trim();
        if (mediaType === "video") return !!ytId;
        if (mediaType === "article") return !!articleUrl.trim();
        return false;
    }, [title, mediaType, imageSource, imageFile, imageUrlInput, ytId, articleUrl]);

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImageFile(file);
        setImageSource("upload");
        setImageUrlInput("");
        const reader = new FileReader();
        reader.onloadend = () => setImagePreview(reader.result as string);
        reader.readAsDataURL(file);
    };

    const handleThumbSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setThumbFile(file);
        setThumbSource("upload");
        setThumbUrlInput("");
        const reader = new FileReader();
        reader.onloadend = () => setThumbPreview(reader.result as string);
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e: { preventDefault(): void }): Promise<void> => {
        e.preventDefault();
        setError(null);
        if (!canSubmit) { setError("Please fill in all required fields."); return; }

        setLoading(true);
        const supabase = createClient();
        const isoDate = new Date(date).toISOString();

        try {
            let coverImageUrl: string | null = null;
            let mediaUrl: string | null = null;
            let resolvedTag = tag.trim() || "Gallery";

            if (mediaType === "photo") {
                resolvedTag = tag.trim() || "Gallery";
                setLoadingMessage("Uploading image to Cloudinary…");
                if (imageSource === "upload" && imageFile) {
                    if (imageFile.size > 20 * 1024 * 1024) {
                        setError("Image exceeds 20 MB limit.");
                        setLoading(false);
                        return;
                    }
                    coverImageUrl = await uploadToCloudinary(imageFile, "vajrax/gallery");
                } else {
                    coverImageUrl = imageUrlInput.trim();
                }
            } else if (mediaType === "video") {
                resolvedTag = "Video";
                mediaUrl = youtubeUrl.trim();
                coverImageUrl = ytThumbnail(ytId!);
            } else if (mediaType === "article") {
                resolvedTag = "Article";
                mediaUrl = articleUrl.trim();
                if (thumbSource === "upload" && thumbFile) {
                    setLoadingMessage("Uploading thumbnail to Cloudinary…");
                    coverImageUrl = await uploadToCloudinary(thumbFile, "vajrax/gallery");
                } else if (thumbSource === "url" && thumbUrlInput.trim()) {
                    coverImageUrl = thumbUrlInput.trim();
                }
            }

            setLoadingMessage(editItem ? "Saving changes…" : "Saving to gallery…");

            if (editItem) {
                const { error: updateError } = await supabase
                    .from("gallery_items")
                    .update({
                        title: title.trim(),
                        description: description.trim() || null,
                        cover_image_url: coverImageUrl,
                        media_url: mediaUrl,
                        created_at: isoDate,
                        tag: resolvedTag,
                        tag_color: tagColor,
                        location_city: locationCity.trim() || "Bengaluru",
                        location_country: locationCountry.trim() || "India",
                    })
                    .eq("id", editItem.id);
                if (updateError) throw updateError;
            } else {
                const { error: insertError } = await supabase.from("gallery_items").insert({
                    title: title.trim(),
                    description: description.trim() || null,
                    cover_image_url: coverImageUrl,
                    media_url: mediaUrl,
                    created_at: isoDate,
                    tag: resolvedTag,
                    tag_color: tagColor,
                    location_city: locationCity.trim() || "Bengaluru",
                    location_country: locationCountry.trim() || "India",
                    created_by: user?.id || null,
                });
                if (insertError) throw insertError;
            }

            onSuccess();
            onClose();
        } catch (err: unknown) {
            console.error("Gallery save error:", err);
            setError(err instanceof Error ? err.message : "An error occurred.");
        } finally {
            setLoading(false);
            setLoadingMessage("");
        }
    };

    const statusReady = canSubmit && !loading;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center px-4 py-6">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 backdrop-blur-md"
                        style={{ background: "rgba(7,9,15,0.88)" }}
                        onClick={loading ? undefined : onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.97, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.97, y: 10 }}
                        transition={{ duration: 0.18 }}
                        className="relative z-10 w-full max-w-xl border border-edgeStrong rounded-md overflow-hidden corner-ticks"
                        style={{ background: "rgba(7,9,15,0.98)" }}
                    >
                        <span className="ct-tr" />
                        <span className="ct-bl" />

                        {/* ── HEADER ── */}
                        <div
                            className="flex items-center justify-between px-5 py-4 border-b border-edge"
                        >
                            <div className="flex items-center gap-3">
                                <span style={{
                                    display: "inline-block", width: 8, height: 8, borderRadius: 999, flexShrink: 0,
                                    background: "#00e5ff", boxShadow: "0 0 0 2px rgba(0,229,255,0.15), 0 0 10px rgba(0,229,255,0.7)",
                                }} />
                                <div>
                                    <h2 className="font-sans font-bold text-fg text-[15px] tracking-tight leading-tight">
                                        {editItem
                                            ? "Edit gallery item"
                                            : `New gallery ${mediaType}`}
                                    </h2>
                                    <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-fg3 mt-0.5">
                                        GALLERY · {editItem ? "EDIT" : "CREATE"}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                disabled={loading}
                                className="grid place-items-center w-8 h-8 border border-edge rounded-sm text-fg2 hover:text-fg hover:border-cyan2/50 transition-colors disabled:opacity-40"
                            >
                                <X size={13} />
                            </button>
                        </div>

                        {/* ── BODY ── */}
                        <form onSubmit={handleSubmit}>
                            <div className="overflow-y-auto px-5 py-5 flex flex-col gap-5" style={{ maxHeight: "calc(100vh - 12rem)" }}>

                                {/* Error */}
                                {error && (
                                    <div
                                        className="font-mono text-[11px] px-3 py-2.5 rounded-sm border"
                                        style={{ background: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.3)", color: "#ef4444" }}
                                    >
                                        // ERROR: {error}
                                    </div>
                                )}

                                {/* Loading message */}
                                {loading && loadingMessage && (
                                    <div
                                        className="flex items-center gap-2 font-mono text-[11px] px-3 py-2.5 rounded-sm border"
                                        style={{ background: "rgba(0,229,255,0.06)", borderColor: "rgba(0,229,255,0.2)", color: "#00e5ff" }}
                                    >
                                        <Loader2 size={11} className="animate-spin" />
                                        {loadingMessage}
                                    </div>
                                )}

                                {/* Media type tabs */}
                                {!editItem && (
                                    <div className="grid grid-cols-3 border border-edge rounded-sm overflow-hidden">
                                        {MEDIA_TYPES.map(({ key, label, Icon }, i) => (
                                            <button
                                                key={key}
                                                type="button"
                                                onClick={() => setMediaType(key)}
                                                className={[
                                                    "flex items-center justify-center gap-1.5 py-2.5 font-mono text-[10px] uppercase tracking-[0.16em] transition-all",
                                                    i < 2 ? "border-r border-edge" : "",
                                                    mediaType === key
                                                        ? "text-cyan2"
                                                        : "text-fg3 hover:text-fg2",
                                                ].join(" ")}
                                                style={mediaType === key ? {
                                                    background: "rgba(0,229,255,0.07)",
                                                    boxShadow: "inset 0 -2px 0 rgba(0,229,255,0.5)",
                                                } : {}}
                                            >
                                                <Icon size={12} />
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* ── PHOTO ── */}
                                {mediaType === "photo" && (
                                    <div>
                                        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageSelect} className="hidden" />

                                        {/* Source toggle */}
                                        <div className="flex gap-0 border border-edge rounded-sm overflow-hidden mb-3 w-fit">
                                            {(["upload", "url"] as const).map((src, i) => (
                                                <button
                                                    key={src}
                                                    type="button"
                                                    onClick={() => {
                                                        setImageSource(src);
                                                        if (src === "url") { setImageFile(null); setImagePreview(imageUrlInput || null); }
                                                    }}
                                                    className={[
                                                        "flex items-center gap-1.5 px-4 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.14em] transition-all",
                                                        i === 0 ? "border-r border-edge" : "",
                                                        imageSource === src ? "text-cyan2 bg-[rgba(0,229,255,0.07)]" : "text-fg3 hover:text-fg2",
                                                    ].join(" ")}
                                                >
                                                    {src === "upload" ? <Upload size={10} /> : <Link2 size={10} />}
                                                    {src === "upload" ? "Upload" : "URL"}
                                                </button>
                                            ))}
                                        </div>

                                        {imageSource === "upload" ? (
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="group w-full"
                                            >
                                                {imagePreview ? (
                                                    <div className="relative w-full overflow-hidden rounded-sm border border-edge" style={{ aspectRatio: "16/7" }}>
                                                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                                                            <Upload size={24} className="text-white" />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div
                                                        className="w-full flex flex-col items-center justify-center gap-3 rounded-sm transition-all"
                                                        style={{
                                                            aspectRatio: "16/7",
                                                            border: "1.5px dashed rgba(0,229,255,0.25)",
                                                            background: "rgba(0,229,255,0.02)",
                                                        }}
                                                    >
                                                        <div
                                                            className="grid place-items-center w-12 h-12 rounded-sm transition-all group-hover:bg-[rgba(0,229,255,0.12)]"
                                                            style={{ background: "rgba(0,229,255,0.07)", border: "1px solid rgba(0,229,255,0.2)" }}
                                                        >
                                                            <Upload size={20} className="text-cyan2" />
                                                        </div>
                                                        <div className="text-center">
                                                            <p className="font-sans text-[13px] font-semibold text-fg">Drop image or click to upload</p>
                                                            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-fg3 mt-1">
                                                                PNG · JPG · WEBP · UP TO 20MB
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </button>
                                        ) : (
                                            <div className="flex flex-col gap-2">
                                                <div className="relative">
                                                    <Link2 size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg3 pointer-events-none" />
                                                    <input
                                                        type="url"
                                                        value={imageUrlInput}
                                                        onChange={(e) => { setImageUrlInput(e.target.value); setImagePreview(e.target.value || null); setError(null); }}
                                                        placeholder="https://res.cloudinary.com/…"
                                                        className={inputCls + " pl-9"}
                                                    />
                                                </div>
                                                {imagePreview ? (
                                                    <div className="relative w-full overflow-hidden rounded-sm border border-edge" style={{ aspectRatio: "16/7" }}>
                                                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover"
                                                            onError={() => { setImagePreview(null); setError("Could not load image from that URL."); }} />
                                                    </div>
                                                ) : (
                                                    <div
                                                        className="w-full flex flex-col items-center justify-center gap-2 rounded-sm"
                                                        style={{
                                                            aspectRatio: "16/7",
                                                            border: "1.5px dashed rgba(0,229,255,0.2)",
                                                            background: "rgba(0,229,255,0.02)",
                                                        }}
                                                    >
                                                        <ImageIcon size={24} className="text-fg3" />
                                                        <p className="font-sans text-[12px] text-fg3">Paste image URL to preview</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ── VIDEO ── */}
                                {mediaType === "video" && (
                                    <div className="flex flex-col gap-3">
                                        <div className="relative">
                                            <Play size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#ef4444] pointer-events-none" />
                                            <input
                                                type="url"
                                                value={youtubeUrl}
                                                onChange={(e) => { setPlayUrl(e.target.value); setError(null); }}
                                                placeholder="https://youtube.com/watch?v=…"
                                                className={inputCls + " pl-9"}
                                            />
                                        </div>
                                        {ytId ? (
                                            <div className="relative w-full overflow-hidden rounded-sm border border-edge" style={{ aspectRatio: "16/9" }}>
                                                <img src={ytThumbnail(ytId)} alt="YouTube thumbnail" className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <div className="grid place-items-center w-12 h-12 rounded-full" style={{ background: "rgba(239,68,68,0.9)" }}>
                                                        <PlayCircle size={26} className="text-white" />
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div
                                                className="w-full flex flex-col items-center justify-center gap-2 rounded-sm"
                                                style={{
                                                    aspectRatio: "16/9",
                                                    border: "1.5px dashed rgba(239,68,68,0.25)",
                                                    background: "rgba(239,68,68,0.03)",
                                                }}
                                            >
                                                <Play size={28} style={{ color: "rgba(239,68,68,0.5)" }} />
                                                <p className="font-sans text-[12px] text-fg3">Paste YouTube URL above</p>
                                                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg3">Public or unlisted · plays inline</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ── ARTICLE ── */}
                                {mediaType === "article" && (
                                    <div className="flex flex-col gap-3">
                                        <div className="relative">
                                            <FileText size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a78bfa] pointer-events-none" />
                                            <input
                                                type="url"
                                                value={articleUrl}
                                                onChange={(e) => { setArticleUrl(e.target.value); setError(null); }}
                                                placeholder="https://medium.com/…"
                                                className={inputCls + " pl-9"}
                                            />
                                        </div>

                                        <div>
                                            <FieldLabel>Cover image <span className="text-fg3 normal-case font-sans font-normal text-[11px] tracking-normal ml-1">(optional)</span></FieldLabel>
                                            <input type="file" accept="image/*" ref={thumbInputRef} onChange={handleThumbSelect} className="hidden" />
                                            <div className="flex gap-0 border border-edge rounded-sm overflow-hidden mb-2 w-fit">
                                                {(["none", "upload", "url"] as const).map((src, i) => (
                                                    <button
                                                        key={src}
                                                        type="button"
                                                        onClick={() => { setThumbSource(src); if (src === "none") { setThumbFile(null); setThumbPreview(null); setThumbUrlInput(""); } }}
                                                        className={[
                                                            "px-4 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.14em] transition-all",
                                                            i < 2 ? "border-r border-edge" : "",
                                                            thumbSource === src ? "text-cyan2 bg-[rgba(0,229,255,0.07)]" : "text-fg3 hover:text-fg2",
                                                        ].join(" ")}
                                                    >
                                                        {src === "none" ? "None" : src === "upload" ? "Upload" : "URL"}
                                                    </button>
                                                ))}
                                            </div>
                                            {thumbSource === "upload" && (
                                                <button type="button" onClick={() => thumbInputRef.current?.click()} className="group w-full">
                                                    {thumbPreview ? (
                                                        <div className="relative h-28 w-full overflow-hidden rounded-sm border border-edge">
                                                            <img src={thumbPreview} alt="Thumbnail" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                                        </div>
                                                    ) : (
                                                        <div
                                                            className="h-28 w-full flex flex-col items-center justify-center gap-1.5 rounded-sm transition-all"
                                                            style={{ border: "1.5px dashed rgba(0,229,255,0.2)", background: "rgba(0,229,255,0.02)" }}
                                                        >
                                                            <Upload size={18} className="text-fg3 group-hover:text-cyan2 transition-colors" />
                                                            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg3">Upload thumbnail</span>
                                                        </div>
                                                    )}
                                                </button>
                                            )}
                                            {thumbSource === "url" && (
                                                <input
                                                    type="url"
                                                    value={thumbUrlInput}
                                                    onChange={(e) => { setThumbUrlInput(e.target.value); setThumbPreview(e.target.value || null); }}
                                                    placeholder="https://…/thumbnail.jpg"
                                                    className={inputCls}
                                                />
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* ── $ TITLE ── */}
                                <div>
                                    <FieldLabel>Title</FieldLabel>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        required
                                        placeholder="E.g., VajraX Team at TechFest 2025"
                                        className={inputCls}
                                    />
                                </div>

                                {/* ── $ DESCRIPTION ── */}
                                <div>
                                    <FieldLabel hint="2-LINE PREVIEW IN CARD">Description</FieldLabel>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        rows={3}
                                        placeholder="Write a short caption or context…"
                                        className={inputCls + " resize-none"}
                                    />
                                </div>

                                {/* ── $ TAG · $ CITY · $ COUNTRY ── */}
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <FieldLabel>
                                            Tag
                                            {mediaType !== "photo" && (
                                                <span className="text-fg3 ml-1 normal-case font-sans font-normal text-[10px] tracking-normal">(auto)</span>
                                            )}
                                        </FieldLabel>
                                        <div className="relative">
                                            <select
                                                value={mediaType === "video" ? "Video" : mediaType === "article" ? "Article" : tag}
                                                onChange={(e) => { if (mediaType === "photo") setTag(e.target.value); }}
                                                disabled={mediaType !== "photo"}
                                                className={inputCls + " appearance-none pr-7 disabled:opacity-50 disabled:cursor-not-allowed"}
                                                style={{ colorScheme: "dark" }}
                                            >
                                                {mediaType !== "photo"
                                                    ? <option>{mediaType === "video" ? "Video" : "Article"}</option>
                                                    : TAG_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)
                                                }
                                            </select>
                                            <Tag size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-fg3 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div>
                                        <FieldLabel>City</FieldLabel>
                                        <div className="relative">
                                            <MapPin size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg3 pointer-events-none" />
                                            <input
                                                type="text"
                                                value={locationCity}
                                                onChange={(e) => setLocationCity(e.target.value)}
                                                placeholder="Bengaluru"
                                                className={inputCls + " pl-8"}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <FieldLabel>Country</FieldLabel>
                                        <div className="relative">
                                            <Globe size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg3 pointer-events-none" />
                                            <input
                                                type="text"
                                                value={locationCountry}
                                                onChange={(e) => setLocationCountry(e.target.value)}
                                                placeholder="India"
                                                className={inputCls + " pl-8"}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Tag color swatches — photo only */}
                                {mediaType === "photo" && (
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-fg3">Tag color</span>
                                        {/* None / clear */}
                                        <button
                                            type="button"
                                            onClick={() => setTagColor(null)}
                                            title="Default"
                                            className="relative w-5 h-5 rounded-full border-2 transition-all"
                                            style={{
                                                borderColor: tagColor === null ? "#f0f4ff" : "rgba(139,154,176,0.3)",
                                                background: "#0d1117",
                                            }}
                                        >
                                            <span className="absolute inset-0 flex items-center justify-center">
                                                <span className="block w-2.5 h-px bg-[#8b9ab0] rotate-45" />
                                            </span>
                                        </button>
                                        {TAG_COLORS.map(({ hex, label }) => (
                                            <button
                                                key={hex}
                                                type="button"
                                                onClick={() => setTagColor(hex)}
                                                title={label}
                                                className="w-5 h-5 rounded-full border-2 transition-all hover:scale-110"
                                                style={{
                                                    background: hex,
                                                    borderColor: tagColor === hex ? "#f0f4ff" : "transparent",
                                                    boxShadow: tagColor === hex ? `0 0 8px ${hex}` : "none",
                                                }}
                                            />
                                        ))}
                                    </div>
                                )}

                                {/* ── $ DATE ── */}
                                <div>
                                    <FieldLabel>Date</FieldLabel>
                                    <div className="relative">
                                        <Calendar size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg3 pointer-events-none" />
                                        <input
                                            type="date"
                                            value={date}
                                            onChange={(e) => setDate(e.target.value)}
                                            required
                                            className={inputCls + " pl-8"}
                                            style={{ colorScheme: "dark" }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* ── FOOTER ── */}
                            <div className="flex items-center justify-between px-5 py-4 border-t border-edge">
                                <div className="flex items-center gap-2">
                                    <span style={{
                                        display: "inline-block", width: 6, height: 6, borderRadius: 999, flexShrink: 0,
                                        background: statusReady ? "#22c55e" : "#f59e0b",
                                        boxShadow: statusReady
                                            ? "0 0 0 1px rgba(34,197,94,0.2), 0 0 8px rgba(34,197,94,0.7)"
                                            : "0 0 0 1px rgba(245,158,11,0.2), 0 0 8px rgba(245,158,11,0.7)",
                                    }} />
                                    <span
                                        className="font-mono text-[10px] uppercase tracking-[0.18em]"
                                        style={{ color: statusReady ? "#22c55e" : "#f59e0b" }}
                                    >
                                        {statusReady ? "READY TO PUBLISH" : "FIELDS PENDING"}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        disabled={loading}
                                        className="font-sans text-[13px] text-fg2 hover:text-fg transition-colors disabled:opacity-40"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading || !canSubmit}
                                        className="flex items-center gap-2 h-9 px-5 rounded-sm font-sans text-[13px] font-semibold transition-all disabled:opacity-40"
                                        style={{
                                            background: canSubmit ? "rgba(0,229,255,0.10)" : "rgba(0,229,255,0.04)",
                                            border: "1px solid rgba(0,229,255,0.35)",
                                            color: "#00e5ff",
                                        }}
                                    >
                                        {loading
                                            ? <Loader2 size={13} className="animate-spin" />
                                            : <Check size={13} />
                                        }
                                        {loading
                                            ? (loadingMessage || "Publishing…")
                                            : editItem ? "Save changes" : `Publish ${mediaType}`
                                        }
                                    </button>
                                </div>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
