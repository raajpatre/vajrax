"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { X, Loader2, Image as ImageIcon, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@/lib/hooks/useUser";

interface GalleryUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function GalleryUploadModal({ isOpen, onClose, onSuccess }: GalleryUploadModalProps) {
    const { user } = useUser();
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState("");
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

        if (!title.trim() || !date || !imageFile) {
            setError("Title, Date, and Image are required.");
            return;
        }

        setLoading(true);
        setLoadingMessage("Preparing Image...");
        const supabase = createClient();

        // Prevent very large files
        if (imageFile.size > 10 * 1024 * 1024) {
            setError("Image size exceeds 10MB limit. Please choose a smaller image.");
            setLoading(false);
            return;
        }

        try {
            setLoadingMessage("Uploading image to securely to the cloud... (This may take a moment)");
            // Upload image
            const ext = imageFile.name.split(".").pop();
            const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
            
            // Add a timeout to the upload to catch silent hangs
            const uploadPromise = supabase.storage
                .from("gallery-images")
                .upload(filename, imageFile, { contentType: imageFile.type });
                
            const timeoutPromise = new Promise<{ error: any }>((_, reject) => 
                setTimeout(() => reject(new Error("Upload timed out after 30 seconds.")), 30000)
            );
            
            const { error: uploadError } = await Promise.race([uploadPromise, timeoutPromise]) as any;

            if (uploadError) throw new Error(uploadError.message || "Failed to upload image");

            const { data: urlData } = supabase.storage
                .from("gallery-images")
                .getPublicUrl(filename);

            const imageUrl = urlData.publicUrl;

            // Use the selected date string to populate created_at
            const isoDate = new Date(date).toISOString();

            setLoadingMessage("Saving gallery item to database...");
            // Insert metadata
            const { error: insertError } = await supabase.from("gallery_items").insert({
                title: title.trim(),
                description: description.trim() || null,
                cover_image_url: imageUrl,
                created_at: isoDate,
                created_by: user?.id || null,
            });

            if (insertError) throw insertError;

            setTitle("");
            setDescription("");
            setImageFile(null);
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
                        className="relative w-full max-w-lg glass-strong rounded-2xl overflow-hidden shadow-2xl"
                    >
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold">Add to Gallery</h2>
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

                                {/* Image Upload */}
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1.5">
                                        Gallery Image
                                    </label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        ref={fileInputRef}
                                        onChange={handleImageSelect}
                                        className="hidden"
                                    />
                                    {imagePreview ? (
                                        <div className="relative rounded-xl overflow-hidden border border-border h-48 cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
                                            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <ImageIcon className="w-8 h-8 text-white" />
                                            </div>
                                        </div>
                                    ) : (
                                        <div
                                            onClick={() => fileInputRef.current?.click()}
                                            className="h-48 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center text-text-muted hover:text-primary hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-all"
                                        >
                                            <ImageIcon className="w-8 h-8 mb-2" />
                                            <span className="text-sm font-medium">Click to select an image</span>
                                        </div>
                                    )}
                                </div>

                                {/* Title */}
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1.5">
                                        Title
                                    </label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        required
                                        placeholder="E.g., VajraX Team at TechFest 2025"
                                        className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all text-white"
                                    />
                                </div>

                                {/* Date */}
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1.5 flex items-center gap-2">
                                        <Calendar className="w-4 h-4" />
                                        Date
                                    </label>
                                    <input
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        required
                                        className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all text-white"
                                        style={{ colorScheme: "dark" }}
                                    />
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1.5">
                                        Description (Optional)
                                    </label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        rows={3}
                                        placeholder="Write a short caption or context..."
                                        className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 resize-none transition-all text-white"
                                    />
                                </div>

                                <div className="pt-2">
                                    <button
                                        type="submit"
                                        disabled={loading || !imageFile || !title.trim()}
                                        className="btn-primary w-full !py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {loading ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            "Upload to Gallery"
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

