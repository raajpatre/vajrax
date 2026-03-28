"use client";

import { useMemo, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { X, Loader2, Image as ImageIcon, Calendar, MapPin, Tag, Link2, Upload } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@/lib/hooks/useUser";

interface GalleryUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

function normalizeImageUrl(raw: string) {
    const value = raw.trim();
    if (!value) return "";

    try {
        const url = new URL(value);

        if (url.hostname === "drive.google.com") {
            const fileId = url.searchParams.get("id") || url.pathname.match(/\/file\/d\/([^/]+)/)?.[1];
            if (fileId) {
                return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`;
            }
        }

        return url.toString();
    } catch {
        return "";
    }
}

export default function GalleryUploadModal({ isOpen, onClose, onSuccess }: GalleryUploadModalProps) {
    const { user } = useUser();
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
    const [tag, setTag] = useState("Gallery");
    const [locationCity, setLocationCity] = useState("Bengaluru");
    const [locationCountry, setLocationCountry] = useState("India");
    const [imageSource, setImageSource] = useState<"upload" | "url">("upload");
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imageUrlInput, setImageUrlInput] = useState("");
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState("");
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const normalizedImageUrl = useMemo(() => normalizeImageUrl(imageUrlInput), [imageUrlInput]);
    const hasUploadImage = imageSource === "upload" && !!imageFile;
    const hasEmbedUrl = imageSource === "url" && !!normalizedImageUrl;

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

        if (!title.trim() || !date || (!hasUploadImage && !hasEmbedUrl)) {
            setError("Title, Date, and an image source are required.");
            return;
        }

        setLoading(true);
        setLoadingMessage("Preparing Image...");
        const supabase = createClient();

        try {
            let imageUrl = normalizedImageUrl;

            if (imageSource === "upload" && imageFile) {
                // Prevent very large files
                if (imageFile.size > 10 * 1024 * 1024) {
                    setError("Image size exceeds 10MB limit. Please choose a smaller image.");
                    setLoading(false);
                    return;
                }

                setLoadingMessage("Uploading image securely to the cloud... (This may take a moment)");
                const ext = imageFile.name.split(".").pop();
                const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

                const uploadPromise = supabase.storage
                    .from("gallery-images")
                    .upload(filename, imageFile, { contentType: imageFile.type });

                const timeoutPromise = new Promise<{ error: any }>((_, reject) =>
                    setTimeout(() => reject(new Error("Upload timed out after 5 minutes. Please check your network connection.")), 300000)
                );

                const { error: uploadError } = await Promise.race([uploadPromise, timeoutPromise]) as any;

                if (uploadError) throw new Error(uploadError.message || "Failed to upload image");

                const { data: urlData } = supabase.storage
                    .from("gallery-images")
                    .getPublicUrl(filename);

                imageUrl = urlData.publicUrl;
            }

            // Use the selected date string to populate created_at
            const isoDate = new Date(date).toISOString();

            setLoadingMessage("Saving gallery item to database...");
            // Insert metadata
            const { error: insertError } = await supabase.from("gallery_items").insert({
                title: title.trim(),
                description: description.trim() || null,
                cover_image_url: imageUrl,
                created_at: isoDate,
                tag: tag.trim() || "Gallery",
                location_city: locationCity.trim() || "Bengaluru",
                location_country: locationCountry.trim() || "India",
                created_by: user?.id || null,
            });

            if (insertError) throw insertError;

            setTitle("");
            setDescription("");
            setTag("Gallery");
            setLocationCity("Bengaluru");
            setLocationCountry("India");
            setImageSource("upload");
            setImageFile(null);
            setImageUrlInput("");
            setImagePreview(null);
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error("Upload error:", err);
            setError(err.message || "An error occurred during upload.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto px-4 pb-4 pt-[calc(var(--nav-height)+1rem)] sm:px-6 sm:pb-6">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={loading ? undefined : onClose}
                    />
                    <div className="relative z-10 flex min-h-full items-start justify-center">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="glass-strong flex w-full max-w-4xl flex-col overflow-hidden rounded-[30px] shadow-2xl"
                        >
                            <div className="flex items-center justify-between border-b border-white/8 px-5 py-4 sm:px-6">
                                <div>
                                    <h2 className="text-xl font-bold">Add to Gallery</h2>
                                    <p className="mt-1 text-sm text-text-muted">
                                        Upload a new moment with its image, tag, date, and location details.
                                    </p>
                                </div>
                                <button
                                    onClick={onClose}
                                    disabled={loading}
                                    className="p-2 rounded-lg text-text-muted hover:text-foreground hover:bg-white/5 transition-colors disabled:opacity-50"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="max-h-[calc(100dvh-var(--nav-height)-3.25rem)] overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
                                <form onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
                                {error && (
                                    <div className="rounded-lg bg-red-400/10 border border-red-400/20 p-3 text-sm text-red-400 lg:col-span-2">
                                        {error}
                                    </div>
                                )}
                                {loading && loadingMessage && !error && (
                                    <div className="flex items-center gap-2 rounded-lg bg-primary/10 border border-primary/20 p-3 text-sm text-primary-light lg:col-span-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        {loadingMessage}
                                    </div>
                                )}

                                <div className="rounded-[24px] border border-cyan-200/10 bg-white/[0.03] p-5 lg:sticky lg:top-0">
                                    <div className="flex flex-col items-center text-center">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            ref={fileInputRef}
                                            onChange={handleImageSelect}
                                            className="hidden"
                                        />

                                        <div className="mb-4 grid w-full grid-cols-2 rounded-2xl border border-white/8 bg-black/10 p-1">
                                            <button
                                                type="button"
                                                onClick={() => setImageSource("upload")}
                                                className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                                                    imageSource === "upload"
                                                        ? "bg-cyan-300/12 text-cyan-100"
                                                        : "text-text-muted hover:text-foreground"
                                                }`}
                                            >
                                                <Upload className="h-3.5 w-3.5" />
                                                Upload
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setImageSource("url");
                                                    setImageFile(null);
                                                    setImagePreview(normalizedImageUrl || null);
                                                }}
                                                className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                                                    imageSource === "url"
                                                        ? "bg-cyan-300/12 text-cyan-100"
                                                        : "text-text-muted hover:text-foreground"
                                                }`}
                                            >
                                                <Link2 className="h-3.5 w-3.5" />
                                                Embed URL
                                            </button>
                                        </div>

                                        {imageSource === "upload" ? (
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="group w-full"
                                            >
                                                {imagePreview ? (
                                                    <div className="relative mx-auto h-40 w-full overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_0_30px_rgba(76,201,240,0.08)]">
                                                        <img
                                                            src={imagePreview}
                                                            alt="Preview"
                                                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                        />
                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                                                            <ImageIcon className="h-8 w-8 text-white" />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="mx-auto flex h-40 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface/70 text-text-muted transition-all group-hover:border-primary/50 group-hover:bg-primary/5 group-hover:text-primary">
                                                        <ImageIcon className="mb-2 h-8 w-8" />
                                                        <span className="text-sm font-medium">Click to select an image</span>
                                                    </div>
                                                )}
                                            </button>
                                        ) : (
                                            <div className="w-full space-y-3">
                                                <div className="relative">
                                                    <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                                                    <input
                                                        type="url"
                                                        value={imageUrlInput}
                                                        onChange={(e) => {
                                                            setImageUrlInput(e.target.value);
                                                            setImagePreview(normalizeImageUrl(e.target.value) || null);
                                                            setError(null);
                                                        }}
                                                        placeholder="Paste image URL or Google Drive share link"
                                                        className="w-full rounded-xl border border-border bg-surface py-3 pl-10 pr-4 text-sm text-white transition-all focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                                                    />
                                                </div>

                                                {imagePreview ? (
                                                    <div className="relative mx-auto h-40 w-full overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_0_30px_rgba(76,201,240,0.08)]">
                                                        <img
                                                            src={imagePreview}
                                                            alt="Preview"
                                                            className="h-full w-full object-cover"
                                                            onError={() => {
                                                                setImagePreview(null);
                                                                setError("That image URL could not be previewed. For Google Drive, make sure the file is public and use a standard share link.");
                                                            }}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="mx-auto flex h-40 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface/70 px-4 text-text-muted">
                                                        <ImageIcon className="mb-2 h-8 w-8" />
                                                        <span className="text-sm font-medium">Paste a valid image URL to preview it</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <p className="mt-4 text-base font-semibold text-foreground">Gallery Image</p>
                                        <p className="mt-1 text-xs leading-relaxed text-text-muted">
                                            Upload a file or paste an image URL. Google Drive links work best when set to “Anyone with the link can view”.
                                        </p>

                                        <div className="mt-5 w-full rounded-2xl border border-white/8 bg-black/10 px-4 py-3 text-left">
                                            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                                                Display
                                            </p>
                                            <p className="mt-2 text-sm text-text-secondary">
                                                This image will appear in the gallery grid and expand inside the lightbox when selected.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                {/* Title */}
                                <div className="md:col-span-2">
                                    <label className="mb-1.5 block text-sm font-medium text-text-secondary">
                                        Title
                                    </label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        required
                                        placeholder="E.g., VajraX Team at TechFest 2025"
                                        className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-white transition-all focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-text-secondary">
                                        <Tag className="w-4 h-4" />
                                        Tag
                                    </label>
                                    <input
                                        type="text"
                                        value={tag}
                                        onChange={(e) => setTag(e.target.value)}
                                        required
                                        placeholder="Event"
                                        className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-white transition-all focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-text-secondary">
                                        <Calendar className="w-4 h-4" />
                                        Date
                                    </label>
                                    <input
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        required
                                        className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-white transition-all focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                                        style={{ colorScheme: "dark" }}
                                    />
                                </div>

                                <div>
                                    <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-text-secondary">
                                        <MapPin className="w-4 h-4" />
                                        City
                                    </label>
                                    <input
                                        type="text"
                                        value={locationCity}
                                        onChange={(e) => setLocationCity(e.target.value)}
                                        required
                                        placeholder="Bengaluru"
                                        className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-white transition-all focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-text-secondary">
                                        Country
                                    </label>
                                    <input
                                        type="text"
                                        value={locationCountry}
                                        onChange={(e) => setLocationCountry(e.target.value)}
                                        required
                                        placeholder="India"
                                        className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-white transition-all focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="mb-1.5 block text-sm font-medium text-text-secondary">
                                        Description (Optional)
                                    </label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        rows={4}
                                        placeholder="Write a short caption or context..."
                                        className="w-full resize-none rounded-xl border border-border bg-surface px-4 py-3 text-sm text-white transition-all focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                                    />
                                        </div>

                                        <div className="md:col-span-2 flex justify-end pt-2">
                                            <button
                                                type="submit"
                                                disabled={loading || !title.trim() || (!hasUploadImage && !hasEmbedUrl)}
                                                className="btn-primary w-full md:w-auto md:min-w-[220px] !py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {loading ? (
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                ) : (
                                                    "Upload to Gallery"
                                                )}
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
