"use client";

import { useState, useEffect, useRef } from "react";
import { X, Pin, Calendar, Link2, Eye, Code2, Loader2 } from "lucide-react";
import type { NoticeInput, NoticeRow } from "@/actions/notice-board";
import type { NoticeCTA } from "@/types/database";
import dynamic from "next/dynamic";

const MOMEditor = dynamic(() => import("@/components/mom/MOMEditor"), { ssr: false });

const CTA_LABELS = ["Download", "See", "Submit", "Apply", "Register", "More Info"] as const;
export type CtaLabel = typeof CTA_LABELS[number];

interface NoticeFormProps {
    initial?: NoticeRow | null;
    onSubmit: (input: NoticeInput) => Promise<void>;
    onCancel: () => void;
    isSubmitting: boolean;
}

export default function NoticeForm({ initial, onSubmit, onCancel, isSubmitting }: NoticeFormProps) {
    const [title, setTitle] = useState(initial?.title ?? "");
    const [body, setBody] = useState(initial?.body ?? "");
    const [isPinned, setIsPinned] = useState(initial?.is_pinned ?? false);
    const [expiresAt, setExpiresAt] = useState(
        initial?.expires_at ? new Date(initial.expires_at).toISOString().slice(0, 16) : ""
    );
    
    const [ctas, setCtas] = useState<NoticeCTA[]>(() => {
        if (initial?.ctas && Array.isArray(initial.ctas) && initial.ctas.length > 0) {
            return initial.ctas;
        }
        if (initial?.cta_label && initial?.cta_url) {
            return [{ label: initial.cta_label, url: initial.cta_url }];
        }
        return [];
    });
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (!title.trim()) { setError("Title is required."); return; }
        if (!body.trim()) { setError("Body is required."); return; }
        
        for (let i = 0; i < ctas.length; i++) {
            const cta = ctas[i];
            if (!cta.label) { setError(`Please select a button label for CTA ${i + 1}.`); return; }
            if (!cta.url.trim()) { setError(`Please enter a URL for CTA ${i + 1}.`); return; }
            if (cta.url.trim() && !/^https?:\/\/.+/.test(cta.url.trim())) {
                setError(`URL for CTA ${i + 1} must start with http:// or https://`); return;
            }
        }
        
        await onSubmit({
            title: title.trim(),
            body: body.trim(),
            is_pinned: isPinned,
            expires_at: expiresAt || null,
            cta_label: ctas.length > 0 ? (ctas[0].label as any) : null,
            cta_url: ctas.length > 0 ? ctas[0].url.trim() : null,
            ctas: ctas.map(c => ({ label: c.label, url: c.url.trim() })),
        });
    };

    const inputStyle: React.CSSProperties = {
        width: "100%",
        background: "#07090f",
        border: "1px solid rgba(0,229,255,0.18)",
        borderRadius: "2px",
        color: "#f0f4ff",
        fontFamily: "inherit",
        fontSize: "14px",
        padding: "10px 14px",
        outline: "none",
        transition: "border-color 150ms, box-shadow 150ms",
    };

    const labelStyle: React.CSSProperties = {
        display: "block",
        fontSize: "14px",
        color: "#8b9ab0",
        marginBottom: "6px",
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Title */}
            <div>
                <div className="relative group">
                    <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder=" "
                        maxLength={200}
                        className="peer w-full h-11 bg-transparent border border-[rgba(0,229,255,0.2)] rounded-md text-[14px] text-[#f0f4ff] pl-4 pr-4 focus:border-[rgba(0,229,255,0.55)] focus:outline-none transition-colors"
                        required
                    />
                    <label className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8b9ab0] text-[14px] pointer-events-none transition-all duration-200 peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:scale-[0.85] peer-focus:-translate-x-3 peer-focus:bg-[#07090f] peer-focus:px-2 peer-focus:text-[#00e5ff] peer-valid:top-0 peer-valid:-translate-y-1/2 peer-valid:scale-[0.85] peer-valid:-translate-x-3 peer-valid:bg-[#07090f] peer-valid:px-2 peer-valid:text-[#00e5ff]">
                        Title *
                    </label>
                </div>
                <div className="font-mono text-[10px] text-right mt-1.5" style={{ color: "#4a5568" }}>
                    {title.length}/200
                </div>
            </div>

            {/* Body */}
            <div>
                <label style={labelStyle}>Body *</label>
                <MOMEditor
                    content={body}
                    onChange={setBody}
                    placeholder="Write your announcement here..."
                />
            </div>

            {/* Options row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Pin toggle */}
                <div>
                    <label style={labelStyle}>Options</label>
                    <button
                        type="button"
                        onClick={() => setIsPinned(!isPinned)}
                        className="inline-flex items-center gap-2 h-10 px-4 rounded-sm border font-mono text-[11px] uppercase tracking-[0.14em] transition-all w-full"
                        style={{
                            background: isPinned ? "rgba(245,158,11,0.10)" : "transparent",
                            borderColor: isPinned ? "rgba(245,158,11,0.4)" : "rgba(0,229,255,0.18)",
                            color: isPinned ? "#f59e0b" : "#8b9ab0",
                            boxShadow: isPinned ? "0 0 12px -4px rgba(245,158,11,0.4)" : "none",
                        }}
                    >
                        <Pin size={12} />
                        {isPinned ? "PINNED" : "PIN NOTICE"}
                    </button>
                </div>

                {/* Expiry date */}
                <div>
                    <label style={labelStyle}>
                        <span className="inline-flex items-center gap-1.5">
                            <Calendar size={13} /> Expires at (Optional)
                        </span>
                    </label>
                    <input
                        type="datetime-local"
                        value={expiresAt}
                        onChange={(e) => setExpiresAt(e.target.value)}
                        className="w-full h-11 bg-transparent border border-[rgba(0,229,255,0.2)] rounded-md text-[14px] text-[#f0f4ff] px-4 focus:border-[rgba(0,229,255,0.55)] focus:outline-none transition-colors"
                        style={{ colorScheme: "dark" }}
                    />
                </div>
            </div>

            {/* CTA Section */}
            <div
                className="rounded-sm overflow-hidden"
                style={{ border: "1px solid rgba(0,229,255,0.12)" }}
            >
                <div
                    className="w-full flex items-center justify-between px-4 py-3"
                    style={{ background: "#0d1117" }}
                >
                    <div className="flex items-center gap-2">
                        <Link2 size={13} style={{ color: "#4a5568" }} />
                        <span className="font-mono text-[11px] uppercase tracking-[0.14em]" style={{ color: "#8b9ab0" }}>
                            CTA Buttons (Optional)
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setCtas([...ctas, { label: "", url: "" }])}
                        className="font-mono text-[10px] uppercase tracking-[0.14em] px-3 h-6 rounded-sm border grid place-items-center transition-all hover:bg-[rgba(0,229,255,0.08)]"
                        style={{
                            color: "#00e5ff",
                            borderColor: "rgba(0,229,255,0.35)",
                            background: "transparent",
                        }}
                    >
                        + ADD BUTTON
                    </button>
                </div>

                {ctas.length > 0 && (
                    <div className="flex flex-col" style={{ borderTop: "1px solid rgba(0,229,255,0.12)" }}>
                        {ctas.map((cta, index) => (
                            <div key={index} className="px-4 pb-4 pt-4 flex flex-col gap-3 relative" style={{ borderBottom: index < ctas.length - 1 ? "1px dashed rgba(0,229,255,0.15)" : "none" }}>
                                <button
                                    type="button"
                                    onClick={() => setCtas(ctas.filter((_, i) => i !== index))}
                                    className="absolute top-4 right-4 text-[#ef4444] hover:text-[#f87171] transition-colors p-1"
                                    title="Remove button"
                                >
                                    <X size={14} />
                                </button>
                                {/* Label picker */}
                                <div>
                                    <label style={labelStyle}>Button {index + 1} Label</label>
                                    <div className="flex flex-wrap gap-2 pr-8">
                                        {CTA_LABELS.map((l) => (
                                            <button
                                                key={l}
                                                type="button"
                                                onClick={() => {
                                                    const newCtas = [...ctas];
                                                    newCtas[index].label = l;
                                                    setCtas(newCtas);
                                                }}
                                                className="inline-flex items-center h-8 px-3 rounded-sm border font-mono text-[11px] uppercase tracking-[0.12em] transition-all"
                                                style={{
                                                    background: cta.label === l ? "rgba(0,229,255,0.12)" : "transparent",
                                                    borderColor: cta.label === l ? "rgba(0,229,255,0.45)" : "rgba(0,229,255,0.16)",
                                                    color: cta.label === l ? "#00e5ff" : "#8b9ab0",
                                                    boxShadow: cta.label === l ? "0 0 10px -3px rgba(0,229,255,0.4)" : "none",
                                                }}
                                            >
                                                {l.toUpperCase()}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* URL input */}
                                <div className="relative group mt-2">
                                    <input
                                        type="url"
                                        value={cta.url}
                                        onChange={(e) => {
                                            const newCtas = [...ctas];
                                            newCtas[index].url = e.target.value;
                                            setCtas(newCtas);
                                        }}
                                        placeholder=" "
                                        className="peer w-full h-11 bg-transparent border border-[rgba(0,229,255,0.2)] rounded-md text-[14px] text-[#f0f4ff] pl-4 pr-4 focus:border-[rgba(0,229,255,0.55)] focus:outline-none transition-colors"
                                    />
                                    <label className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8b9ab0] text-[14px] pointer-events-none transition-all duration-200 peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:scale-[0.85] peer-focus:-translate-x-3 peer-focus:bg-[#07090f] peer-focus:px-2 peer-focus:text-[#00e5ff] peer-valid:top-0 peer-valid:-translate-y-1/2 peer-valid:scale-[0.85] peer-valid:-translate-x-3 peer-valid:bg-[#07090f] peer-valid:px-2 peer-valid:text-[#00e5ff]">
                                        Destination URL
                                    </label>
                                </div>
                            </div>
                        ))}
                        
                        {/* Live preview */}
                        {ctas.some(c => c.label) && (
                            <div className="px-4 pb-5 pt-3" style={{ borderTop: "1px dashed rgba(0,229,255,0.15)" }}>
                                <label style={labelStyle}>BUTTON PREVIEW</label>
                                <div className="flex flex-wrap gap-3">
                                    {ctas.map((cta, i) => cta.label ? (
                                        <div
                                            key={i}
                                            className="inline-flex items-center justify-center gap-2 h-10 px-6 rounded-sm border font-mono text-[12px] uppercase tracking-[0.14em]"
                                            style={{
                                                background: "rgba(0,229,255,0.08)",
                                                borderColor: "rgba(0,229,255,0.35)",
                                                color: "#00e5ff",
                                                boxShadow: "0 0 14px -4px rgba(0,229,255,0.45)",
                                            }}
                                        >
                                            {cta.label.toUpperCase()}
                                        </div>
                                    ) : null)}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Error */}
            {error && (
                <div
                    className="px-4 py-3 rounded-sm font-mono text-[12px]"
                    style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444" }}
                >
                    ⚠ {error}
                </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 h-9 px-4 rounded-sm border font-mono text-[12px] uppercase tracking-[0.14em] transition-colors"
                    style={{ color: "#8b9ab0", borderColor: "rgba(139,154,176,0.3)", background: "transparent" }}
                >
                    <X size={12} /> CANCEL
                </button>
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 h-9 px-5 rounded-sm border font-mono text-[12px] uppercase tracking-[0.14em] transition-all"
                    style={{
                        background: "rgba(0,229,255,0.10)",
                        borderColor: "rgba(0,229,255,0.4)",
                        color: "#00e5ff",
                        boxShadow: "0 0 14px -4px rgba(0,229,255,0.45)",
                        opacity: isSubmitting ? 0.7 : 1,
                    }}
                >
                    {isSubmitting ? <><Loader2 size={12} className="animate-spin" /> SAVING…</> : <>{initial ? "SAVE CHANGES" : "BROADCAST →"}</>}
                </button>
            </div>
        </form>
    );
}
