"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
    X, Loader2, Image as ImageIcon, Calendar, MapPin, Tag,
    Link2, Upload, PlayCircle, FileText, Play, Check, Globe, AlignLeft, Type
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

const FloatingField = ({ 
    icon: Icon, 
    label, 
    value, 
    type = "text", 
    textarea = false, 
    select = false, 
    children,
    hint,
    ...props 
}: any) => {
    const hasValue = value !== undefined && value !== null && value !== "";
    const active = hasValue || type === "date" || select;
    const paddingLeft = Icon ? "pl-11" : "pl-4";
    const baseCls = `peer w-full bg-transparent border border-[rgba(0,229,255,0.2)] rounded-md text-[14px] text-[#f0f4ff] focus:border-[rgba(0,229,255,0.55)] focus:outline-none transition-colors ${paddingLeft} pr-3`;

    const initialPosition = textarea ? 'top-3' : 'top-1/2 -translate-y-1/2';
    const activePosition = 'top-0 -translate-y-1/2';
    const activeTransform = `scale-[0.85] ${Icon ? "-translate-x-6" : "-translate-x-2"}`;
    
    const focusCls = `peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:scale-[0.85] ${Icon ? "peer-focus:-translate-x-6" : "peer-focus:-translate-x-2"} peer-focus:bg-[#07090f] peer-focus:px-2 peer-focus:text-[#00e5ff]`;
    
    const activeCls = active ? `${activePosition} ${activeTransform} bg-[#07090f] px-2 text-[#00e5ff]` : initialPosition;
    
    const labelCls = `absolute ${Icon ? "left-11" : "left-4"} text-[#8b9ab0] text-[14px] pointer-events-none transition-all duration-200 ${focusCls} ${activeCls}`;

    return (
        <div className="relative group w-full mt-2">
            {textarea ? (
                <textarea {...props} value={value} placeholder=" " className={`${baseCls} py-3 resize-none`} />
            ) : select ? (
                <select {...props} value={value} className={`${baseCls} h-11 appearance-none`}>
                    {children}
                </select>
            ) : (
                <input {...props} type={type} value={value} placeholder=" " className={`${baseCls} h-11`} style={type === 'date' ? { colorScheme: 'dark' } : {}} />
            )}
            
            {Icon && (
                <span className={`absolute left-0 top-0 ${textarea ? 'h-11' : 'bottom-0'} grid place-items-center w-11 text-[#8b9ab0] pointer-events-none peer-focus:text-[#00e5ff] transition-colors`}>
                    <Icon size={15} />
                </span>
            )}
            
            <label className={labelCls}>
                {label}
            </label>

            {hint && (
                <span className="absolute right-0 -top-5 font-mono text-[9px] uppercase tracking-[0.14em] text-fg3">{hint}</span>
            )}
        </div>
    );
};

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
    const [imageFiles,    setImageFiles]    = useState<File[]>([]);
    const [imageUrlInput, setImageUrlInput] = useState("");
    const [imagePreviews, setImagePreviews]  = useState<string[]>([]);

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
                setImagePreviews(editItem.cover_image_url ? editItem.cover_image_url.split(',') : []);
            }
        } else {
            setMediaType("photo");
            setTitle(""); setDescription("");
            setDate(new Date().toISOString().split("T")[0]);
            setTag("Gallery"); setTagColor(null); setLocationCity("Bengaluru"); setLocationCountry("India");
            setImageSource("upload"); setImageFiles([]); setImageUrlInput(""); setImagePreviews([]);
            setPlayUrl("");
            setArticleUrl(""); setThumbFile(null); setThumbPreview(null); setThumbUrlInput(""); setThumbSource("none");
        }
        setError(null); setLoading(false); setLoadingMessage("");
    }, [isOpen, editItem]);

    const ytId = useMemo(() => extractYouTubeId(youtubeUrl), [youtubeUrl]);

    const canSubmit = useMemo(() => {
        if (!title.trim()) return false;
        if (mediaType === "photo") return imageSource === "upload" ? imageFiles.length > 0 : !!imageUrlInput.trim();
        if (mediaType === "video") return !!ytId;
        if (mediaType === "article") return !!articleUrl.trim();
        return false;
    }, [title, mediaType, imageSource, imageFiles, imageUrlInput, ytId, articleUrl]);

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        
        const combinedFiles = [...imageFiles, ...files];
        if (combinedFiles.length > 10) {
            setError("You can only upload up to 10 photos.");
            return;
        }
        
        setImageFiles(combinedFiles);
        setImageSource("upload");
        setImageUrlInput("");
        const newPreviews = files.map(file => URL.createObjectURL(file));
        setImagePreviews([...imagePreviews, ...newPreviews]);
        
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const removeImage = (index: number) => {
        if (imageSource === "upload") {
            const newFiles = [...imageFiles];
            newFiles.splice(index, 1);
            setImageFiles(newFiles);
            
            const newPreviews = [...imagePreviews];
            newPreviews.splice(index, 1);
            setImagePreviews(newPreviews);
        } else {
            const newPreviews = [...imagePreviews];
            newPreviews.splice(index, 1);
            setImagePreviews(newPreviews);
            setImageUrlInput(newPreviews.join(","));
        }
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
                if (imageSource === "upload" && imageFiles.length > 0) {
                    setLoadingMessage("Uploading images to Cloudinary…");
                    const urls: string[] = [];
                    for (const file of imageFiles) {
                        if (file.size > 20 * 1024 * 1024) {
                            setError("An image exceeds 20 MB limit.");
                            setLoading(false);
                            return;
                        }
                        const url = await uploadToCloudinary(file, "vajrax/gallery");
                        urls.push(url);
                    }
                    coverImageUrl = urls.join(",");
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
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4 py-6">
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
                        className="relative z-10 w-full max-w-xl max-h-[85vh] md:max-h-[90vh] border border-edgeStrong rounded-md overflow-hidden corner-ticks flex flex-col"
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
                        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 overflow-hidden">
                            <div className="overflow-y-auto px-4 py-5 sm:px-5 flex flex-col gap-6 flex-1">

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
                                        <input type="file" accept="image/*" multiple ref={fileInputRef} onChange={handleImageSelect} className="hidden" />

                                        {/* Source toggle */}
                                        <div className="flex gap-0 border border-edge rounded-sm overflow-hidden mb-3 w-fit">
                                            {(["upload", "url"] as const).map((src, i) => (
                                                <button
                                                    key={src}
                                                    type="button"
                                                    onClick={() => {
                                                        setImageSource(src);
                                                        if (src === "url") { setImageFiles([]); setImagePreviews(imageUrlInput ? imageUrlInput.split(',') : []); }
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
                                            <div className="w-full">
                                                <button
                                                    type="button"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="w-full flex flex-col items-center justify-center gap-3 rounded-sm transition-all mb-3 group"
                                                    style={{
                                                        height: "80px",
                                                        border: "1.5px dashed rgba(0,229,255,0.25)",
                                                        background: "rgba(0,229,255,0.02)",
                                                    }}
                                                >
                                                    <div
                                                        className="grid place-items-center w-10 h-10 rounded-sm transition-all group-hover:bg-[rgba(0,229,255,0.12)]"
                                                        style={{ background: "rgba(0,229,255,0.07)", border: "1px solid rgba(0,229,255,0.2)" }}
                                                    >
                                                        <Upload size={16} className="text-cyan2" />
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-fg3">
                                                            Click to upload up to 10 photos
                                                        </p>
                                                    </div>
                                                </button>
                                                {imagePreviews.length > 0 && (
                                                    <div className="flex flex-wrap gap-2">
                                                        {imagePreviews.map((preview, i) => (
                                                            <div key={i} className="relative w-16 h-16 rounded-sm border border-edge overflow-hidden group/thumb">
                                                                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                                                                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity hover:bg-red-500"
                                                                >
                                                                    <X size={12} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-2">
                                                <FloatingField
                                                    icon={Link2}
                                                    label="Image URL(s) - comma separated"
                                                    type="url"
                                                    value={imageUrlInput}
                                                    onChange={(e: any) => { setImageUrlInput(e.target.value); setImagePreviews(e.target.value ? e.target.value.split(',') : []); setError(null); }}
                                                    placeholder="https://...1.jpg,https://...2.jpg"
                                                />
                                                {imagePreviews.length > 0 ? (
                                                    <div className="flex flex-wrap gap-2">
                                                        {imagePreviews.map((preview, i) => (
                                                            <div key={i} className="relative w-16 h-16 rounded-sm border border-edge overflow-hidden group/thumb">
                                                                <img src={preview} alt="Preview" className="w-full h-full object-cover"
                                                                    onError={() => setError(`Could not load image ${i + 1}`)} />
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                                                                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity hover:bg-red-500"
                                                                >
                                                                    <X size={12} />
                                                                </button>
                                                            </div>
                                                        ))}
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
                                        <FloatingField
                                            icon={Play}
                                            label="YouTube URL"
                                            type="url"
                                            value={youtubeUrl}
                                            onChange={(e: any) => { setPlayUrl(e.target.value); setError(null); }}
                                            placeholder="https://youtube.com/watch?v=…"
                                        />
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
                                        <FloatingField
                                            icon={FileText}
                                            label="Article URL"
                                            type="url"
                                            value={articleUrl}
                                            onChange={(e: any) => { setArticleUrl(e.target.value); setError(null); }}
                                            placeholder="https://medium.com/…"
                                        />

                                        <div className="mt-2">
                                            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg2 mb-2 block">Cover image <span className="text-fg3 normal-case font-sans font-normal text-[11px] tracking-normal ml-1">(optional)</span></span>
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
                                                <FloatingField
                                                    icon={Link2}
                                                    label="Thumbnail URL"
                                                    type="url"
                                                    value={thumbUrlInput}
                                                    onChange={(e: any) => { setThumbUrlInput(e.target.value); setThumbPreview(e.target.value || null); }}
                                                    placeholder="https://…/thumbnail.jpg"
                                                />
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* ── $ TITLE ── */}
                                <FloatingField
                                    icon={Type}
                                    label="Title"
                                    value={title}
                                    onChange={(e: any) => setTitle(e.target.value)}
                                    required
                                />

                                {/* ── $ DESCRIPTION ── */}
                                <FloatingField
                                    icon={AlignLeft}
                                    label="Description"
                                    value={description}
                                    onChange={(e: any) => setDescription(e.target.value)}
                                    textarea
                                    rows={3}
                                    hint="2-LINE PREVIEW IN CARD"
                                />

                                {/* ── $ TAG · $ CITY · $ COUNTRY ── */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-3">
                                    <FloatingField
                                        icon={Tag}
                                        label={mediaType !== "photo" ? "Tag (auto)" : "Tag"}
                                        select
                                        value={mediaType === "video" ? "Video" : mediaType === "article" ? "Article" : tag}
                                        onChange={(e: any) => { if (mediaType === "photo") setTag(e.target.value); }}
                                        disabled={mediaType !== "photo"}
                                    >
                                        {mediaType !== "photo"
                                            ? <option>{mediaType === "video" ? "Video" : "Article"}</option>
                                            : TAG_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)
                                        }
                                    </FloatingField>

                                    <FloatingField
                                        icon={MapPin}
                                        label="City"
                                        value={locationCity}
                                        onChange={(e: any) => setLocationCity(e.target.value)}
                                    />

                                    <FloatingField
                                        icon={Globe}
                                        label="Country"
                                        value={locationCountry}
                                        onChange={(e: any) => setLocationCountry(e.target.value)}
                                    />
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
                                <FloatingField
                                    icon={Calendar}
                                    label="Date"
                                    type="date"
                                    value={date}
                                    onChange={(e: any) => setDate(e.target.value)}
                                    required
                                />
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
