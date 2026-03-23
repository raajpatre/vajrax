"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { X, Loader2, Image as ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@/lib/hooks/useUser";

interface EventModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
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
    
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState("");
    const [error, setError] = useState<string | null>(null);

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImageFile(file);
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
        let imageUrl = null;

        try {
            if (imageFile) {
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
                    
                const timeoutPromise = new Promise<{ error: any }>((_, reject) => 
                    setTimeout(() => reject(new Error("Upload timed out after 5 minutes. Please check your network connection.")), 300000)
                );
                
                const { error: uploadError } = await Promise.race([uploadPromise, timeoutPromise]) as any;

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
            setImageFile(null);
            setImagePreview(null);
            
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error("Upload error:", err);
            setError(err.message || "An error occurred while creating the event. Ensure SQL policies are applied.");
        } finally {
            setLoading(false);
            setLoadingMessage("");
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={loading ? undefined : onClose}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto glass-strong rounded-2xl shadow-2xl custom-scrollbar"
                    >
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold">Add Event</h2>
                                <button
                                    onClick={onClose}
                                    disabled={loading}
                                    className="p-2 rounded-lg text-text-muted hover:text-foreground hover:bg-white/5 transition-colors disabled:opacity-50"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                {error && (
                                    <div className="p-3 rounded-lg bg-red-400/10 border border-red-400/20 text-red-400 text-sm">
                                        {error}
                                    </div>
                                )}
                                {loading && loadingMessage && !error && (
                                    <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-primary-light text-sm flex items-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        {loadingMessage}
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium mb-1.5 text-text-secondary">
                                        Event Title *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all text-sm"
                                        placeholder="Enter event name"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1.5 text-text-secondary">
                                        Description *
                                    </label>
                                    <textarea
                                        required
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all text-sm resize-none h-24"
                                        placeholder="Describe the event..."
                                    />
                                </div>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5 text-text-secondary">
                                            Event Type
                                        </label>
                                        <select
                                            value={eventType}
                                            onChange={(e) => setEventType(e.target.value)}
                                            className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all text-sm"
                                        >
                                            <option value="hackathon">Hackathon</option>
                                            <option value="workshop">Workshop</option>
                                            <option value="meetup">Meetup</option>
                                            <option value="competition">Competition</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5 text-text-secondary">
                                            Visibility
                                        </label>
                                        <div className="flex bg-surface border border-border rounded-xl p-1 h-[42px]">
                                            <button
                                                type="button"
                                                onClick={() => setIsExclusive(false)}
                                                className={`flex-1 text-xs font-medium rounded-lg transition-colors ${
                                                    !isExclusive ? "bg-primary text-primary-content" : "text-text-secondary hover:text-foreground"
                                                }`}
                                            >
                                                Open for All
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setIsExclusive(true)}
                                                className={`flex-1 text-xs font-medium rounded-lg transition-colors ${
                                                    isExclusive ? "bg-primary text-primary-content" : "text-text-secondary hover:text-foreground"
                                                }`}
                                            >
                                                Club Exclusive
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5 text-text-secondary">
                                            Start Time *
                                        </label>
                                        <input
                                            type="datetime-local"
                                            required
                                            value={startsAt}
                                            onChange={(e) => setStartsAt(e.target.value)}
                                            className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all text-sm [color-scheme:dark]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5 text-text-secondary">
                                            End Time (Optional)
                                        </label>
                                        <input
                                            type="datetime-local"
                                            value={endsAt}
                                            onChange={(e) => setEndsAt(e.target.value)}
                                            className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all text-sm [color-scheme:dark]"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1.5 text-text-secondary">
                                        Location (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                        className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all text-sm"
                                        placeholder="e.g. Innovation Lab Room 101"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1.5 text-text-secondary">
                                        Registration URL (Optional)
                                    </label>
                                    <input
                                        type="url"
                                        value={registrationUrl}
                                        onChange={(e) => setRegistrationUrl(e.target.value)}
                                        className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all text-sm"
                                        placeholder="https://lu.ma/event"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1.5 text-text-secondary">
                                        Cover Image (Optional)
                                    </label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageSelect}
                                        className="hidden"
                                        id="event-image-upload"
                                    />
                                    <label
                                        htmlFor="event-image-upload"
                                        className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                                            imagePreview
                                                ? "border-primary/50 bg-primary/5"
                                                : "border-border hover:border-primary/50 hover:bg-surface/50"
                                        }`}
                                    >
                                        {imagePreview ? (
                                            <div className="relative w-full h-full p-2 group">
                                                <img
                                                    src={imagePreview}
                                                    alt="Preview"
                                                    className="w-full h-full object-cover rounded-lg"
                                                />
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                                                    <span className="text-sm font-medium">Change Image</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-2 text-text-muted">
                                                <ImageIcon className="w-8 h-8" />
                                                <span className="text-sm">Click to upload image</span>
                                            </div>
                                        )}
                                    </label>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full btn-primary py-3 !text-sm mt-6"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                            Saving Event...
                                        </>
                                    ) : (
                                        "Add Event"
                                    )}
                                </button>
                            </form>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
