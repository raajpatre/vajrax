"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tables } from "@/types/database";
import { Image as ImageIcon, X, Plus, Trash2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/useUser";
import { useRouter } from "next/navigation";
import GalleryUploadModal from "./GalleryUploadModal";

type GalleryItem = Tables<"gallery_items">;

const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
    }),
};

export default function GalleryClient({ items }: { items: GalleryItem[] }) {
    const { isFaculty, isModerator } = useUser();
    const router = useRouter();
    const [selected, setSelected] = useState<GalleryItem | null>(null);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!selected) return;
        if (!window.confirm("Are you sure you want to delete this image?")) return;

        setIsDeleting(true);
        try {
            const supabase = createClient();
            
            // Extract filename from URL
            const urlParts = selected.cover_image_url.split('/gallery-images/');
            const filename = urlParts.length > 1 ? urlParts[1] : null;

            if (filename) {
                // Remove from storage non-blocking to prevent UI hang on slow networks
                supabase.storage.from("gallery-images").remove([filename]).catch(e => console.error(e));
            }

            // Remove from database
            const { error } = await supabase.from("gallery_items").delete().eq("id", selected.id);
            if (error) throw error;

            setSelected(null);
            router.refresh();
        } catch (error) {
            console.error("Error deleting gallery item:", error);
            alert("Failed to delete the image. Ensure the SQL delete policies are applied.");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="relative min-h-screen overflow-hidden pb-24 pt-[calc(var(--nav-height)+2.5rem)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(77,168,255,0.12),transparent_30%),radial-gradient(circle_at_88%_16%,rgba(0,242,255,0.1),transparent_30%)]" />

            <div className="relative z-10 mx-auto max-w-7xl px-6">
                <div className="mb-12">
                    <div className="mb-3 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <h1 className="section-title text-3xl">Gallery</h1>
                        </div>
                        
                        {(isFaculty || isModerator) && (
                            <button
                                onClick={() => setIsUploadModalOpen(true)}
                                className="btn-primary"
                            >
                                <Plus className="h-4 w-4" />
                                Add Image
                            </button>
                        )}
                    </div>
                    <p className="max-w-lg text-text-secondary">
                        A visual archive of robots, prototypes, events, and behind-the-scenes moments.
                    </p>
                </div>

                {items.length === 0 ? (
                    <div className="glass p-16 text-center">
                        <ImageIcon className="mx-auto mb-4 h-12 w-12 text-text-muted" />
                        <h3 className="mb-2 text-lg font-semibold">Gallery is empty</h3>
                        <p className="text-text-muted text-sm">
                            Stunning builds and moments will appear here soon.
                        </p>
                    </div>
                ) : (
                    <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
                        {items.map((item, i) => (
                            <motion.div
                                key={item.id}
                                custom={i}
                                initial="hidden"
                                animate="visible"
                                variants={fadeUp}
                                className="glass energy-card group relative cursor-pointer overflow-hidden rounded-[22px] border-white/14 break-inside-avoid"
                                onClick={() => setSelected(item)}
                            >
                                <div className="overflow-hidden">
                                    <img
                                        src={item.cover_image_url}
                                        alt={item.title}
                                        className="h-auto w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                </div>
                                <div className="p-4">
                                    <h3 className="mb-1 text-sm font-semibold transition-colors group-hover:text-cyan-100">
                                        {item.title}
                                    </h3>
                                    {item.description && (
                                        <p className="text-xs text-text-muted line-clamp-2">
                                            {item.description}
                                        </p>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Lightbox */}
            <AnimatePresence>
                {selected && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
                        onClick={() => setSelected(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            transition={{ type: "spring", damping: 25 }}
                            className="glass relative w-full max-w-4xl overflow-hidden rounded-[24px]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
                                {(isFaculty || isModerator) && (
                                    <button
                                        onClick={handleDelete}
                                        disabled={isDeleting}
                                        className="w-8 h-8 rounded-full bg-red-500/80 flex items-center justify-center text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                                        title="Delete Image"
                                    >
                                        {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                    </button>
                                )}
                                <button
                                    onClick={() => setSelected(null)}
                                    className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <img
                                src={selected.cover_image_url}
                                alt={selected.title}
                                className="w-full max-h-[70vh] object-contain bg-black"
                            />
                            <div className="p-6">
                                <h2 className="text-xl font-bold mb-2">{selected.title}</h2>
                                {selected.description && (
                                    <p className="text-text-secondary text-sm">
                                        {selected.description}
                                    </p>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            
            <GalleryUploadModal 
                isOpen={isUploadModalOpen} 
                onClose={() => setIsUploadModalOpen(false)} 
                onSuccess={() => {
                    router.refresh();
                }} 
            />
        </div>
    );
}
