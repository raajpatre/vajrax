"use client";

import { useMemo, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { X, Loader2, Image as ImageIcon, Calendar, MapPin, Link2, Upload, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@/lib/hooks/useUser";

interface EventModalProps {
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

export default function EventModal({ isOpen, onClose, onSuccess }: EventModalProps) {
    const { user } = useUser();
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [eventType, setEventType] = useState("hackathon");
    const [isExclusive, setIsExclusive] = useState(false);
    const [startsAt, setStartsAt] = useState("");
    const [endsAt, setEndsAt] = useState("");
    const [location, setLocation] = useState("");
    const [registrationUrl, setRegistrationUrl] = useState("");
    const [imageSource, setImageSource] = useState<"upload" | "url">("upload");
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imageUrlInput, setImageUrlInput] = useState("");
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState("");
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const normalizedImageUrl = useMemo(() => normalizeImageUrl(imageUrlInput), [imageUrlInput]);
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

        if (!title.trim() || !description.trim() || !startsAt) {
            setError("Title, description, and start time are required.");
            return;
        }

        setLoading(true);
        const supabase = createClient();
        let imageUrl = hasEmbedUrl ? normalizedImageUrl : null;

        try {
            if (imageSource === "upload" && imageFile) {
                // Prevent very large files
                if (imageFile.size > 10 * 1024 * 1024) {
                    throw new Error("Image size exceeds 10MB limit. Please choose a smaller image.");
                }

                setLoadingMessage("Uploading event image...");
                const ext = imageFile.name.split(".").pop();
                const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
                
                const uploadPromise = supabase.storage
                    .from("event-images")
                    .upload(filename, imageFile, { contentType: imageFile.type });
                    
                const timeoutPromise = new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error("Upload timed out after 5 minutes. Please check your network connection.")), 300000)
                );

                const { error: uploadError } = await Promise.race([
                    uploadPromise,
                    timeoutPromise,
                ]) as Awaited<typeof uploadPromise>;

                if (uploadError) throw new Error(uploadError.message || "Failed to upload image");

                const { data: urlData } = supabase.storage
                    .from("event-images")
                    .getPublicUrl(filename);

                imageUrl = urlData.publicUrl;
            }

            setLoadingMessage("Saving event details...");
            
            // Format dates
            const startDate = new Date(startsAt).toISOString();
            const endDate = endsAt ? new Date(endsAt).toISOString() : null;

            const { error: insertError } = await supabase.from("events").insert({
                title: title.trim(),
                description: description.trim(),
                event_type: eventType,
                is_exclusive: isExclusive,
                starts_at: startDate,
                ends_at: endDate,
                location: location.trim() || null,
                registration_url: registrationUrl.trim() || null,
                cover_image_url: imageUrl,
                created_by: user?.id || null,
            });

            if (insertError) throw insertError;

            // Reset form
            setTitle("");
            setDescription("");
            setEventType("hackathon");
            setIsExclusive(false);
            setStartsAt("");
            setEndsAt("");
            setLocation("");
            setRegistrationUrl("");
            setImageSource("upload");
            setImageFile(null);
            setImageUrlInput("");
            setImagePreview(null);
            
            onSuccess();
            onClose();
        } catch (err: unknown) {
            console.error("Upload error:", err);
            setError(err instanceof Error
                ? err.message
                : "An error occurred while creating the event. Ensure SQL policies are applied.");
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
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={loading ? undefined : onClose}
                    />
                    <div className="relative z-10 flex min-h-full items-start justify-center">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="glass-strong flex w-full max-w-4xl flex-col overflow-hidden rounded-[24px] shadow-2xl sm:rounded-[30px]"
                        >
                            <div className="flex items-start justify-between gap-4 border-b border-white/8 px-4 py-3 sm:items-center sm:px-6 sm:py-4">
                                <div>
                                    <h2 className="text-lg font-bold sm:text-xl">Add Event</h2>
                                    <p className="mt-1 max-w-[18rem] text-xs text-text-muted sm:max-w-none sm:text-sm">
                                        Publish a new event with its timing, visibility, and a strong cover visual.
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

                            <div className="max-h-[calc(100dvh-var(--nav-height)-1.5rem)] overflow-y-auto px-4 py-4 sm:max-h-[calc(100dvh-var(--nav-height)-3.25rem)] sm:px-6 sm:py-6">
                                <form onSubmit={handleSubmit} className="grid gap-4 sm:gap-5 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
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

                                    <div className="rounded-[22px] border border-cyan-200/10 bg-white/[0.03] p-4 sm:rounded-[24px] sm:p-5 lg:sticky lg:top-0">
                                        <div className="flex flex-col items-center text-center">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                ref={fileInputRef}
                                                onChange={handleImageSelect}
                                                className="hidden"
                                            />

                                            <div className="mb-3 grid w-full grid-cols-2 rounded-2xl border border-white/8 bg-black/10 p-1 sm:mb-4">
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
                                                        <div className="relative mx-auto h-32 w-full overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_0_30px_rgba(76,201,240,0.08)] sm:h-40">
                                                            <img
                                                                src={imagePreview}
                                                                alt="Event cover preview"
                                                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                            />
                                                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                                                                <Upload className="h-8 w-8 text-white" />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="mx-auto flex h-32 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface/70 text-text-muted transition-all group-hover:border-primary/50 group-hover:bg-primary/5 group-hover:text-primary sm:h-40">
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
                                                        <div className="relative mx-auto h-32 w-full overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_0_30px_rgba(76,201,240,0.08)] sm:h-40">
                                                            <img
                                                                src={imagePreview}
                                                                alt="Event cover preview"
                                                                className="h-full w-full object-cover"
                                                                onError={() => {
                                                                    setImagePreview(null);
                                                                    setError("That image URL could not be previewed. For Google Drive, make sure the file is public and use a standard share link.");
                                                                }}
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="mx-auto flex h-32 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface/70 px-4 text-text-muted sm:h-40">
                                                            <ImageIcon className="mb-2 h-8 w-8" />
                                                            <span className="text-sm font-medium">Paste a valid image URL to preview it</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <p className="mt-3 text-sm font-semibold text-foreground sm:mt-4 sm:text-base">Event Cover</p>
                                            <p className="mt-1 text-[11px] leading-relaxed text-text-muted sm:text-xs">
                                                Upload a file or paste an image URL for a strong event card preview.
                                            </p>

                                            <div className="mt-4 w-full rounded-2xl border border-white/8 bg-black/10 px-3 py-2.5 text-left sm:mt-5 sm:px-4 sm:py-3">
                                                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                                                    Display
                                                </p>
                                                <p className="mt-1.5 text-xs text-text-secondary sm:mt-2 sm:text-sm">
                                                    This image becomes the hero visual on the event card and the expanded event details view.
                                                </p>
                                            </div>

                                            <div className="mt-3 flex w-full items-center gap-2 rounded-2xl border border-white/8 bg-cyan-400/5 px-3 py-2.5 text-left sm:px-4">
                                                <Sparkles className="h-4 w-4 shrink-0 text-cyan-200" />
                                                <p className="text-[11px] leading-relaxed text-text-secondary sm:text-xs">
                                                    Optional, but highly recommended for workshops, launches, and flagship events.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
                                        <div className="md:col-span-2">
                                            <label className="mb-1.5 block text-sm font-medium text-text-secondary">
                                                Event Title
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                value={title}
                                                onChange={(e) => setTitle(e.target.value)}
                                                className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-white transition-all focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                                                placeholder="E.g., VajraX Hardware Design Sprint"
                                            />
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="mb-1.5 block text-sm font-medium text-text-secondary">
                                                Description
                                            </label>
                                            <textarea
                                                required
                                                value={description}
                                                onChange={(e) => setDescription(e.target.value)}
                                                rows={4}
                                                className="w-full resize-none rounded-xl border border-border bg-surface px-4 py-3 text-sm text-white transition-all focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                                                placeholder="Describe the event, what people can expect, and why they should join..."
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-1.5 block text-sm font-medium text-text-secondary">
                                                Event Type
                                            </label>
                                            <select
                                                value={eventType}
                                                onChange={(e) => setEventType(e.target.value)}
                                                className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-white transition-all focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                                            >
                                                <option value="hackathon">Hackathon</option>
                                                <option value="workshop">Workshop</option>
                                                <option value="meetup">Meetup</option>
                                                <option value="competition">Competition</option>
                                                <option value="other">Other</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="mb-1.5 block text-sm font-medium text-text-secondary">
                                                Visibility
                                            </label>
                                            <div className="grid grid-cols-2 rounded-2xl border border-white/8 bg-black/10 p-1">
                                                <button
                                                    type="button"
                                                    onClick={() => setIsExclusive(false)}
                                                    className={`rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${
                                                        !isExclusive
                                                            ? "bg-cyan-300/12 text-cyan-100"
                                                            : "text-text-muted hover:text-foreground"
                                                    }`}
                                                >
                                                    Open for All
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsExclusive(true)}
                                                    className={`rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${
                                                        isExclusive
                                                            ? "bg-cyan-300/12 text-cyan-100"
                                                            : "text-text-muted hover:text-foreground"
                                                    }`}
                                                >
                                                    Club Exclusive
                                                </button>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-text-secondary">
                                                <Calendar className="w-4 h-4" />
                                                Start Time
                                            </label>
                                            <input
                                                type="datetime-local"
                                                required
                                                value={startsAt}
                                                onChange={(e) => setStartsAt(e.target.value)}
                                                className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-white transition-all focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 [color-scheme:dark]"
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-text-secondary">
                                                <Calendar className="w-4 h-4" />
                                                End Time (Optional)
                                            </label>
                                            <input
                                                type="datetime-local"
                                                value={endsAt}
                                                onChange={(e) => setEndsAt(e.target.value)}
                                                className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-white transition-all focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 [color-scheme:dark]"
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-text-secondary">
                                                <MapPin className="w-4 h-4" />
                                                Location (Optional)
                                            </label>
                                            <input
                                                type="text"
                                                value={location}
                                                onChange={(e) => setLocation(e.target.value)}
                                                className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-white transition-all focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                                                placeholder="Innovation Lab Room 101"
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-text-secondary">
                                                <Link2 className="w-4 h-4" />
                                                Registration URL (Optional)
                                            </label>
                                            <input
                                                type="url"
                                                value={registrationUrl}
                                                onChange={(e) => setRegistrationUrl(e.target.value)}
                                                className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-white transition-all focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                                                placeholder="https://lu.ma/event"
                                            />
                                        </div>

                                        <div className="md:col-span-2 flex justify-end pt-2">
                                            <button
                                                type="submit"
                                                disabled={loading}
                                                className="btn-primary w-full md:w-auto md:min-w-[220px] !py-2.5 sm:!py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {loading ? (
                                                    <span className="inline-flex items-center gap-2">
                                                        <Loader2 className="w-5 h-5 animate-spin" />
                                                        Saving Event...
                                                    </span>
                                                ) : (
                                                    "Add Event"
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
