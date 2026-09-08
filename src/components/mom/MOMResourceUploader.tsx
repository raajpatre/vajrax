"use client";

import { useState, useRef } from "react";
import { Plus, Trash2, Link, ImageIcon, Loader2 } from "lucide-react";
import type { MomResource } from "@/types/database";

interface MOMResourceUploaderProps {
    resources: MomResource[];
    onChange: (resources: MomResource[]) => void;
}

async function uploadToCloudinary(file: File): Promise<string> {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", "mom");
    const res = await fetch("/api/cloudinary/upload", { method: "POST", body: fd });
    if (!res.ok) throw new Error("Upload failed");
    const json = await res.json() as { url: string };
    return json.url;
}

export default function MOMResourceUploader({ resources, onChange }: MOMResourceUploaderProps) {
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [newUrl, setNewUrl] = useState("");
    const [newTitle, setNewTitle] = useState("");
    const fileRef = useRef<HTMLInputElement>(null);

    const addPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        setUploadError(null);
        try {
            const url = await uploadToCloudinary(file);
            onChange([...resources, { type: "photo", url, title: file.name.replace(/\.[^.]+$/, "") }]);
        } catch {
            setUploadError("Image upload failed. Try again.");
        } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = "";
        }
    };

    const addUrl = () => {
        const trimmed = newUrl.trim();
        if (!trimmed) return;
        onChange([...resources, { type: "url", url: trimmed, title: newTitle.trim() || trimmed }]);
        setNewUrl("");
        setNewTitle("");
    };

    const removeItem = (idx: number) => {
        onChange(resources.filter((_, i) => i !== idx));
    };

    const updateTitle = (idx: number, title: string) => {
        const next = [...resources];
        next[idx] = { ...next[idx], title };
        onChange(next);
    };

    return (
        <div className="space-y-4">
            {/* Photo upload */}
            <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#8b9ab0] mb-2 flex items-center gap-2">
                    <ImageIcon size={11} /> Photos
                </div>
                <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={addPhoto}
                />
                <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-2 h-9 px-4 rounded-sm font-mono text-[11px] uppercase tracking-[0.12em] transition-all duration-150 disabled:opacity-50"
                    style={{
                        border: "1px solid rgba(0,229,255,0.25)",
                        color: "#8b9ab0",
                        background: "transparent",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "#f0f4ff"; e.currentTarget.style.borderColor = "rgba(0,229,255,0.5)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "#8b9ab0"; e.currentTarget.style.borderColor = "rgba(0,229,255,0.25)"; }}
                >
                    {uploading ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                    {uploading ? "Uploading…" : "Add Photo"}
                </button>
                {uploadError && (
                    <p className="mt-1 font-mono text-[11px] text-[#ef4444]">{uploadError}</p>
                )}
            </div>

            {/* URL entry */}
            <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#8b9ab0] mb-2 flex items-center gap-2">
                    <Link size={11} /> External Links
                </div>
                <div className="flex gap-2">
                    <input
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="Link title (optional)"
                        className="flex-1 rounded-sm border border-[rgba(0,229,255,0.18)] bg-[#07090f] px-3 py-2 text-[13px] text-[#f0f4ff] placeholder:text-[#4a5568] focus:outline-none focus:border-[#00e5ff] transition-colors"
                    />
                    <input
                        value={newUrl}
                        onChange={(e) => setNewUrl(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addUrl(); } }}
                        placeholder="https://…"
                        className="flex-1 min-w-0 rounded-sm border border-[rgba(0,229,255,0.18)] bg-[#07090f] px-3 py-2 text-[13px] text-[#f0f4ff] placeholder:text-[#4a5568] focus:outline-none focus:border-[#00e5ff] transition-colors"
                    />
                    <button
                        type="button"
                        onClick={addUrl}
                        className="shrink-0 h-9 px-3 rounded-sm grid place-items-center transition-colors"
                        style={{ border: "1px solid rgba(0,229,255,0.25)", color: "#8b9ab0" }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = "#00e5ff"; e.currentTarget.style.borderColor = "rgba(0,229,255,0.5)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = "#8b9ab0"; e.currentTarget.style.borderColor = "rgba(0,229,255,0.25)"; }}
                    >
                        <Plus size={15} />
                    </button>
                </div>
            </div>

            {/* Resource list */}
            {resources.length > 0 && (
                <div className="space-y-2">
                    {resources.map((r, idx) => (
                        <div
                            key={idx}
                            className="flex items-center gap-3 rounded-sm px-3 py-2"
                            style={{ border: "1px solid rgba(0,229,255,0.12)", background: "#07090f" }}
                        >
                            <span
                                className="font-mono text-[9px] uppercase tracking-[0.14em] shrink-0 px-1.5 h-[18px] grid place-items-center rounded-sm"
                                style={r.type === "photo"
                                    ? { color: "#a78bfa", background: "rgba(167,139,250,0.10)", border: "1px solid rgba(167,139,250,0.3)" }
                                    : { color: "#00e5ff", background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.25)" }
                                }
                            >
                                {r.type === "photo" ? "photo" : "link"}
                            </span>
                            {r.type === "photo" ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={r.url} alt={r.title ?? ""} className="w-10 h-10 object-cover rounded-sm shrink-0" />
                            ) : null}
                            <input
                                value={r.title ?? ""}
                                onChange={(e) => updateTitle(idx, e.target.value)}
                                placeholder="Label…"
                                className="flex-1 min-w-0 text-[13px] bg-transparent text-[#f0f4ff] placeholder:text-[#4a5568] focus:outline-none"
                            />
                            <a href={r.url} target="_blank" rel="noreferrer"
                                className="font-mono text-[10px] text-[#4a5568] hover:text-[#00e5ff] truncate max-w-[160px] transition-colors"
                            >
                                {r.url.length > 40 ? r.url.slice(0, 37) + "…" : r.url}
                            </a>
                            <button
                                type="button"
                                onClick={() => removeItem(idx)}
                                className="shrink-0 grid place-items-center w-7 h-7 rounded-sm transition-colors"
                                style={{ color: "#4a5568" }}
                                onMouseEnter={(e) => { e.currentTarget.style.color = "#ef4444"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.color = "#4a5568"; }}
                            >
                                <Trash2 size={13} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
