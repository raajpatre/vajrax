"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Tables } from "@/types/database";
import { Image as ImageIcon, X, Plus, Trash2, Loader2, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/useUser";
import { useRouter } from "next/navigation";
import GalleryUploadModal from "./GalleryUploadModal";
import { ArticleCard } from "@/components/ui/article-card";

type GalleryItem = Tables<"gallery_items">;

export default function GalleryClient({ items }: { items: GalleryItem[] }) {
    const { isFaculty, isModerator } = useUser();
    const router = useRouter();
    const [selected, setSelected] = useState<GalleryItem | null>(null);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [editItem, setEditItem] = useState<GalleryItem | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const formatCardDate = (value: string) => {
        const date = new Date(value);
        return {
            month: date.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
            day: date.getDate(),
        };
    };

    const shouldBypassOptimization = (url: string) => {
        try {
            const hostname = new URL(url).hostname;
            return ![
                "drive.google.com",
                "lh3.googleusercontent.com",
                "docs.googleusercontent.com",
                process.env.NEXT_PUBLIC_SUPABASE_URL
                    ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
                    : "",
            ].includes(hostname);
        } catch {
            return true;
        }
    };

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
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(0,229,255,0.10),transparent_30%),radial-gradient(circle_at_88%_16%,rgba(0,218,243,0.08),transparent_30%)]" />

            <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
                <div className="mb-12">
                    <div className="mb-3 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <h1 className="section-title text-2xl sm:text-3xl">Gallery</h1>
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
                    <div className="glass p-4 md:p-5 md:p-8 md:p-16 text-center">
                        <ImageIcon className="mx-auto mb-4 h-12 w-12 text-text-muted" />
                        <h3 className="mb-2 text-lg font-semibold">Gallery is empty</h3>
                        <p className="text-text-muted text-sm">
                            Stunning builds and moments will appear here soon.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {items.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                className="cursor-pointer text-left"
                                onClick={() => setSelected(item)}
                            >
                                <ArticleCard
                                    tag={item.tag || "Gallery"}
                                    date={formatCardDate(item.created_at)}
                                    title={item.title}
                                    description={item.description || "Captured moments from VajraX projects, events, and milestones."}
                                    imageUrl={item.cover_image_url}
                                    imageAlt={item.title}
                                    location={{
                                        city: item.location_city || "Bengaluru",
                                        country: item.location_country || "India",
                                    }}
                                    className="max-w-none"
                                />
                            </button>
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
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-6"
                        onClick={() => setSelected(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            transition={{ type: "spring", damping: 25 }}
                            className="glass relative w-full max-w-4xl overflow-hidden rounded-lg"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
                                {(isFaculty || isModerator) && (
                                    <>
                                        <button
                                            onClick={() => setEditItem(selected)}
                                            className="w-8 h-8 rounded-full bg-cyan-500/80 flex items-center justify-center text-white hover:bg-cyan-600 transition-colors"
                                            title="Edit Image"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={handleDelete}
                                            disabled={isDeleting}
                                            className="w-8 h-8 rounded-full bg-red-500/80 flex items-center justify-center text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                                            title="Delete Image"
                                        >
                                            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                        </button>
                                    </>
                                )}
                                <button
                                    onClick={() => setSelected(null)}
                                    className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="relative h-[52vh] w-full bg-black sm:h-[70vh]">
                                <Image
                                    src={selected.cover_image_url}
                                    alt={selected.title}
                                    fill
                                    sizes="100vw"
                                    unoptimized={shouldBypassOptimization(selected.cover_image_url)}
                                    className="object-contain"
                                />
                            </div>
                            <div className="p-4 sm:p-6">
                                <h2 className="mb-2 text-lg font-bold sm:text-xl">{selected.title}</h2>
                                {selected.description && (
                                    <p className="text-text-secondary text-sm">
                                        {selected.description}
                                    </p>
                                )}
                                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-text-muted">
                                    <span className="rounded-full border border-cyan-300/12 bg-cyan-300/10 px-3 py-1 text-cyan-100">
                                        {selected.tag || "Gallery"}
                                    </span>
                                    <span>
                                        {selected.location_city || "Bengaluru"}, {selected.location_country || "India"}
                                    </span>
                                    <span>
                                        {new Date(selected.created_at).toLocaleDateString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric",
                                        })}
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            
            <GalleryUploadModal 
                isOpen={isUploadModalOpen || !!editItem} 
                onClose={() => {
                    setIsUploadModalOpen(false);
                    setEditItem(null);
                }} 
                editItem={editItem}
                onSuccess={() => {
                    setSelected(null);
                    router.refresh();
                }} 
            />
        </div>
    );
}
