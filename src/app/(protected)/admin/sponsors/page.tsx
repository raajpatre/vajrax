"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
    Building2,
    CheckCircle2,
    ImagePlus,
    Pencil,
    Plus,
    Star,
    Trash2,
    XCircle,
} from "lucide-react";
import {
    listAllSponsors,
    createSponsor,
    updateSponsor,
    deleteSponsor,
} from "@/actions/sponsors";
import type { Sponsor } from "@/actions/sponsors";

// ── constants ──────────────────────────────────────────────────

const TIERS = ["Platinum", "Gold", "Silver"] as const;
type Tier = typeof TIERS[number];

const TIER_STYLES: Record<Tier, { fg: string; bg: string; bd: string; dot: string }> = {
    Platinum: {
        fg: "#00e5ff",
        bg: "rgba(0,229,255,0.08)",
        bd: "rgba(0,229,255,0.35)",
        dot: "#00e5ff",
    },
    Gold: {
        fg: "#f59e0b",
        bg: "rgba(245,158,11,0.08)",
        bd: "rgba(245,158,11,0.35)",
        dot: "#f59e0b",
    },
    Silver: {
        fg: "#8b9ab0",
        bg: "rgba(139,154,176,0.08)",
        bd: "rgba(139,154,176,0.30)",
        dot: "#8b9ab0",
    },
};

function tierStyle(tier: string) {
    return TIER_STYLES[tier as Tier] ?? TIER_STYLES.Silver;
}

// ── Toast ──────────────────────────────────────────────────────

type ToastMsg = { id: number; text: string; ok: boolean };

function Toast({ toasts }: { toasts: ToastMsg[] }) {
    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 pointer-events-none">
            <AnimatePresence>
                {toasts.map((t) => (
                    <motion.div
                        key={t.id}
                        initial={{ opacity: 0, y: 16, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ duration: 0.22 }}
                        className="flex items-center gap-2 px-4 h-10 rounded-sm font-mono text-[11.5px] uppercase tracking-[0.14em] shadow-xl pointer-events-auto"
                        style={{
                            background: "#0d1117",
                            border: `1px solid ${t.ok ? "rgba(0,229,255,0.35)" : "rgba(239,68,68,0.40)"}`,
                            color: t.ok ? "#00e5ff" : "#ef4444",
                        }}
                    >
                        {t.ok ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                        {t.text}
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}

// ── SponsorCard ────────────────────────────────────────────────

function SponsorCard({
    sponsor,
    onEdit,
    onDelete,
}: {
    sponsor: Sponsor;
    onEdit: (s: Sponsor) => void;
    onDelete: (s: Sponsor) => void;
}) {
    const ts = tierStyle(sponsor.tier);
    return (
        <div
            className="relative flex flex-col rounded-sm overflow-hidden"
            style={{ background: "#0d1117", border: "1px solid rgba(0,229,255,0.10)" }}
        >
            {/* Tier accent bar */}
            <span
                className="absolute left-0 top-3 bottom-3 w-[2px] rounded-sm"
                style={{ background: ts.fg, opacity: 0.8, boxShadow: `0 0 8px ${ts.fg}` }}
            />

            {/* Logo area */}
            <div
                className="flex items-center justify-center mx-4 mt-4 rounded-sm overflow-hidden"
                style={{
                    height: 80,
                    background: "#07090f",
                    border: "1px solid rgba(0,229,255,0.07)",
                }}
            >
                {sponsor.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={sponsor.logo_url}
                        alt={sponsor.name}
                        className="max-h-12 max-w-[160px] w-auto object-contain opacity-80"
                        style={{ filter: "grayscale(0.3) brightness(1.4)" }}
                    />
                ) : (
                    <Building2 size={28} style={{ color: "rgba(0,229,255,0.18)" }} />
                )}
            </div>

            {/* Meta */}
            <div className="px-4 pt-3 pb-4 flex-1">
                <div className="flex items-start justify-between gap-2">
                    <span
                        className="font-semibold tracking-tight text-[13.5px] leading-tight"
                        style={{ color: "#f0f4ff" }}
                    >
                        {sponsor.name}
                    </span>
                    <span
                        className="shrink-0 font-mono text-[9.5px] uppercase tracking-[0.16em] px-1.5 py-0.5 rounded-sm border"
                        style={{ background: ts.bg, borderColor: ts.bd, color: ts.fg }}
                    >
                        {sponsor.tier}
                    </span>
                </div>

                {sponsor.website_link && (
                    <a
                        href={sponsor.website_link}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 font-mono text-[10.5px] truncate block hover:underline"
                        style={{ color: "#4a5568" }}
                    >
                        {sponsor.website_link.replace(/^https?:\/\//, "")}
                    </a>
                )}

                {/* Status pill */}
                <div className="mt-2.5 flex items-center gap-1.5">
                    <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                            background: sponsor.is_active ? "#22c55e" : "#ef4444",
                            boxShadow: sponsor.is_active ? "0 0 6px #22c55e" : "none",
                        }}
                    />
                    <span
                        className="font-mono text-[9.5px] uppercase tracking-[0.14em]"
                        style={{ color: sponsor.is_active ? "#22c55e" : "#ef4444" }}
                    >
                        {sponsor.is_active ? "Active" : "Inactive"}
                    </span>
                </div>
            </div>

            {/* Actions */}
            <div
                className="flex border-t"
                style={{ borderColor: "rgba(0,229,255,0.08)" }}
            >
                <button
                    onClick={() => onEdit(sponsor)}
                    className="flex-1 flex items-center justify-center gap-1.5 h-9 text-[11.5px] font-mono uppercase tracking-[0.12em] transition-colors"
                    style={{ color: "#00e5ff", borderRight: "1px solid rgba(0,229,255,0.08)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(0,229,255,0.06)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                    <Pencil size={11} /> Edit
                </button>
                <button
                    onClick={() => onDelete(sponsor)}
                    className="flex-1 flex items-center justify-center gap-1.5 h-9 text-[11.5px] font-mono uppercase tracking-[0.12em] transition-colors"
                    style={{ color: "#ef4444" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.06)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                    <Trash2 size={11} /> Delete
                </button>
            </div>
        </div>
    );
}

// ── SponsorModal ───────────────────────────────────────────────

type ModalFormState = {
    name: string;
    tier: Tier;
    logo_url: string;
    website_link: string;
    is_active: boolean;
};

const EMPTY_FORM: ModalFormState = {
    name: "",
    tier: "Silver",
    logo_url: "",
    website_link: "",
    is_active: true,
};

function SponsorModal({
    editing,
    onClose,
    onSaved,
    onToast,
}: {
    editing: Sponsor | null;
    onClose: () => void;
    onSaved: (s: Sponsor) => void;
    onToast: (text: string, ok: boolean) => void;
}) {
    const [form, setForm] = useState<ModalFormState>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editing) {
            setForm({
                name: editing.name,
                tier: (TIERS.includes(editing.tier as Tier) ? editing.tier : "Silver") as Tier,
                logo_url: editing.logo_url ?? "",
                website_link: editing.website_link ?? "",
                is_active: editing.is_active,
            });
        } else {
            setForm(EMPTY_FORM);
        }
    }, [editing]);

    const set = <K extends keyof ModalFormState>(k: K, v: ModalFormState[K]) =>
        setForm((p) => ({ ...p, [k]: v }));

    async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append("file", file);
            fd.append("folder", "sponsors");
            const res = await fetch("/api/cloudinary/upload", { method: "POST", body: fd });
            const json = await res.json();
            if (json.url) set("logo_url", json.url);
            else onToast("Upload failed", false);
        } catch {
            onToast("Upload failed", false);
        } finally {
            setUploading(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.name.trim()) return;
        setSaving(true);
        try {
            const payload = {
                name: form.name,
                tier: form.tier,
                logo_url: form.logo_url,
                website_link: form.website_link || null,
                is_active: form.is_active,
            };
            const result = editing
                ? await updateSponsor(editing.id, payload)
                : await createSponsor(payload);
            if (!result.ok) {
                onToast(result.error, false);
            } else {
                onSaved(result.data);
                onToast(editing ? "Sponsor updated" : "Sponsor added", true);
                onClose();
            }
        } finally {
            setSaving(false);
        }
    }

    const ts = tierStyle(form.tier);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(7,9,15,0.82)", backdropFilter: "blur(8px)" }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 8 }}
                transition={{ duration: 0.2 }}
                className="w-full max-w-md rounded-sm overflow-hidden"
                style={{ background: "#0d1117", border: "1px solid rgba(0,229,255,0.18)" }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div
                    className="px-5 py-4 flex items-center gap-3"
                    style={{ borderBottom: "1px solid rgba(0,229,255,0.10)" }}
                >
                    <span
                        className="grid place-items-center w-7 h-7 rounded-sm"
                        style={{ background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.25)" }}
                    >
                        <Star size={13} style={{ color: "#00e5ff" }} />
                    </span>
                    <span className="font-mono text-[11px] uppercase tracking-[0.2em]" style={{ color: "#00e5ff" }}>
                        {editing ? "// Edit Sponsor" : "// Add Sponsor"}
                    </span>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    {/* Name */}
                    <div>
                        <label className="block font-mono text-[10px] uppercase tracking-[0.18em] mb-1.5" style={{ color: "#4a5568" }}>
                            $ Name
                        </label>
                        <input
                            value={form.name}
                            onChange={(e) => set("name", e.target.value)}
                            required
                            placeholder="Sponsor organisation name"
                            className="w-full h-9 px-3 rounded-sm font-mono text-[12.5px] outline-none transition-colors"
                            style={{
                                background: "#07090f",
                                border: "1px solid rgba(0,229,255,0.14)",
                                color: "#f0f4ff",
                            }}
                            onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(0,229,255,0.45)"; }}
                            onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(0,229,255,0.14)"; }}
                        />
                    </div>

                    {/* Tier */}
                    <div>
                        <label className="block font-mono text-[10px] uppercase tracking-[0.18em] mb-1.5" style={{ color: "#4a5568" }}>
                            $ Tier
                        </label>
                        <div className="flex gap-2">
                            {TIERS.map((t) => {
                                const ts2 = tierStyle(t);
                                const active = form.tier === t;
                                return (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => set("tier", t)}
                                        className="flex-1 h-9 rounded-sm font-mono text-[10.5px] uppercase tracking-[0.14em] transition-all"
                                        style={{
                                            background: active ? ts2.bg : "transparent",
                                            border: `1px solid ${active ? ts2.bd : "rgba(0,229,255,0.10)"}`,
                                            color: active ? ts2.fg : "#8b9ab0",
                                        }}
                                    >
                                        {t}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Logo */}
                    <div>
                        <label className="block font-mono text-[10px] uppercase tracking-[0.18em] mb-1.5" style={{ color: "#4a5568" }}>
                            $ Logo
                        </label>
                        <div className="flex gap-2">
                            <input
                                value={form.logo_url}
                                onChange={(e) => set("logo_url", e.target.value)}
                                placeholder="https://... or upload →"
                                className="flex-1 h-9 px-3 rounded-sm font-mono text-[11.5px] outline-none transition-colors"
                                style={{
                                    background: "#07090f",
                                    border: "1px solid rgba(0,229,255,0.14)",
                                    color: "#f0f4ff",
                                }}
                                onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(0,229,255,0.45)"; }}
                                onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(0,229,255,0.14)"; }}
                            />
                            <input
                                ref={fileRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleLogoUpload}
                            />
                            <button
                                type="button"
                                onClick={() => fileRef.current?.click()}
                                disabled={uploading}
                                className="shrink-0 flex items-center gap-1.5 px-3 h-9 rounded-sm font-mono text-[10.5px] uppercase tracking-[0.14em] transition-colors"
                                style={{
                                    background: "rgba(0,229,255,0.06)",
                                    border: "1px solid rgba(0,229,255,0.25)",
                                    color: "#00e5ff",
                                    opacity: uploading ? 0.5 : 1,
                                }}
                            >
                                <ImagePlus size={12} />
                                {uploading ? "..." : "Upload"}
                            </button>
                        </div>
                        {/* Logo preview */}
                        {form.logo_url && (
                            <div
                                className="mt-2 flex items-center justify-center rounded-sm"
                                style={{ height: 56, background: "#07090f", border: "1px solid rgba(0,229,255,0.07)" }}
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={form.logo_url}
                                    alt="Preview"
                                    className="max-h-10 max-w-[200px] object-contain opacity-80"
                                    style={{ filter: "grayscale(0.3) brightness(1.4)" }}
                                />
                            </div>
                        )}
                    </div>

                    {/* Website */}
                    <div>
                        <label className="block font-mono text-[10px] uppercase tracking-[0.18em] mb-1.5" style={{ color: "#4a5568" }}>
                            $ Website (optional)
                        </label>
                        <input
                            value={form.website_link}
                            onChange={(e) => set("website_link", e.target.value)}
                            placeholder="https://sponsor.com"
                            type="url"
                            className="w-full h-9 px-3 rounded-sm font-mono text-[11.5px] outline-none transition-colors"
                            style={{
                                background: "#07090f",
                                border: "1px solid rgba(0,229,255,0.14)",
                                color: "#f0f4ff",
                            }}
                            onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(0,229,255,0.45)"; }}
                            onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(0,229,255,0.14)"; }}
                        />
                    </div>

                    {/* Active toggle */}
                    <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: "#4a5568" }}>
                            $ Show in homepage marquee
                        </span>
                        <button
                            type="button"
                            onClick={() => set("is_active", !form.is_active)}
                            className="relative w-10 h-5 rounded-full transition-colors"
                            style={{
                                background: form.is_active ? "rgba(0,229,255,0.25)" : "rgba(139,154,176,0.15)",
                                border: `1px solid ${form.is_active ? "rgba(0,229,255,0.45)" : "rgba(139,154,176,0.25)"}`,
                            }}
                        >
                            <span
                                className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
                                style={{
                                    background: form.is_active ? "#00e5ff" : "#8b9ab0",
                                    left: form.is_active ? "calc(100% - 18px)" : "2px",
                                    boxShadow: form.is_active ? "0 0 8px rgba(0,229,255,0.6)" : "none",
                                }}
                            />
                        </button>
                    </div>

                    {/* Footer */}
                    <div
                        className="flex gap-2 pt-2"
                        style={{ borderTop: "1px solid rgba(0,229,255,0.08)" }}
                    >
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 h-9 rounded-sm font-mono text-[11px] uppercase tracking-[0.14em] transition-colors"
                            style={{
                                border: "1px solid rgba(0,229,255,0.14)",
                                color: "#8b9ab0",
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(0,229,255,0.35)"; e.currentTarget.style.color = "#f0f4ff"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(0,229,255,0.14)"; e.currentTarget.style.color = "#8b9ab0"; }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving || !form.name.trim()}
                            className="flex-1 h-9 rounded-sm font-mono text-[11px] uppercase tracking-[0.14em] transition-colors"
                            style={{
                                background: "rgba(0,229,255,0.10)",
                                border: "1px solid rgba(0,229,255,0.40)",
                                color: "#00e5ff",
                                opacity: saving || !form.name.trim() ? 0.5 : 1,
                            }}
                        >
                            {saving ? "Saving..." : editing ? "Save Changes" : "Add Sponsor"}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}

// ── DeleteModal ────────────────────────────────────────────────

function DeleteModal({
    sponsor,
    onClose,
    onDeleted,
    onToast,
}: {
    sponsor: Sponsor;
    onClose: () => void;
    onDeleted: (id: string) => void;
    onToast: (text: string, ok: boolean) => void;
}) {
    const [deleting, setDeleting] = useState(false);

    async function handleDelete() {
        setDeleting(true);
        const result = await deleteSponsor(sponsor.id);
        setDeleting(false);
        if (result.ok) {
            onDeleted(sponsor.id);
            onToast("Sponsor removed", true);
            onClose();
        } else {
            onToast(result.error, false);
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(7,9,15,0.82)", backdropFilter: "blur(8px)" }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 8 }}
                transition={{ duration: 0.2 }}
                className="w-full max-w-sm rounded-sm overflow-hidden"
                style={{ background: "#0d1117", border: "1px solid rgba(239,68,68,0.35)" }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-5">
                    <div className="font-mono text-[10.5px] uppercase tracking-[0.2em] mb-1" style={{ color: "#ef4444" }}>
                        // Confirm Delete
                    </div>
                    <div className="text-[13.5px] font-medium mt-2" style={{ color: "#f0f4ff" }}>
                        Remove <span style={{ color: "#ef4444" }}>{sponsor.name}</span>?
                    </div>
                    <div className="text-[12px] mt-1" style={{ color: "#8b9ab0" }}>
                        This will permanently delete the sponsor and remove them from the homepage marquee.
                    </div>
                    <div
                        className="flex gap-2 mt-5 pt-4"
                        style={{ borderTop: "1px solid rgba(239,68,68,0.12)" }}
                    >
                        <button
                            onClick={onClose}
                            className="flex-1 h-9 rounded-sm font-mono text-[11px] uppercase tracking-[0.14em] transition-colors"
                            style={{ border: "1px solid rgba(0,229,255,0.14)", color: "#8b9ab0" }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(0,229,255,0.35)"; e.currentTarget.style.color = "#f0f4ff"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(0,229,255,0.14)"; e.currentTarget.style.color = "#8b9ab0"; }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={deleting}
                            className="flex-1 h-9 rounded-sm font-mono text-[11px] uppercase tracking-[0.14em] transition-colors"
                            style={{
                                background: "rgba(239,68,68,0.10)",
                                border: "1px solid rgba(239,68,68,0.40)",
                                color: "#ef4444",
                                opacity: deleting ? 0.5 : 1,
                            }}
                        >
                            {deleting ? "Deleting..." : "Delete"}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

// ── Page ───────────────────────────────────────────────────────

export default function AdminSponsorsPage() {
    const [sponsors, setSponsors] = useState<Sponsor[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Sponsor | null>(null);
    const [deleting, setDeleting] = useState<Sponsor | null>(null);
    const [toasts, setToasts] = useState<ToastMsg[]>([]);
    const toastId = useRef(0);

    function addToast(text: string, ok: boolean) {
        const id = ++toastId.current;
        setToasts((p) => [...p, { id, text, ok }]);
        setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 2800);
    }

    useEffect(() => {
        listAllSponsors().then((r) => {
            if (r.ok) setSponsors(r.data);
            setLoading(false);
        });
    }, []);

    function openAdd() {
        setEditing(null);
        setModalOpen(true);
    }

    function openEdit(s: Sponsor) {
        setEditing(s);
        setModalOpen(true);
    }

    function handleSaved(s: Sponsor) {
        setSponsors((prev) => {
            const idx = prev.findIndex((x) => x.id === s.id);
            if (idx >= 0) {
                const next = [...prev];
                next[idx] = s;
                return next;
            }
            return [...prev, s];
        });
    }

    function handleDeleted(id: string) {
        setSponsors((prev) => prev.filter((s) => s.id !== id));
    }

    const platinum = sponsors.filter((s) => s.tier === "Platinum");
    const gold = sponsors.filter((s) => s.tier === "Gold");
    const silver = sponsors.filter((s) => s.tier === "Silver");

    return (
        <div
            className="min-h-screen px-6 py-8 lg:px-10"
            style={{ background: "#07090f" }}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="h-px w-6" style={{ background: "rgba(0,229,255,0.6)" }} />
                        <span className="font-mono text-[10px] uppercase tracking-[0.24em]" style={{ color: "#00e5ff" }}>
                            // admin
                        </span>
                    </div>
                    <h1
                        className="font-extrabold tracking-tight"
                        style={{ fontSize: "clamp(22px, 2.4vw, 30px)", color: "#f0f4ff" }}
                    >
                        Sponsors
                    </h1>
                    <p className="mt-1 text-[13px]" style={{ color: "#8b9ab0" }}>
                        Manage organisations shown in the homepage marquee.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Tier counts */}
                    <div className="hidden sm:flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: "#4a5568" }}>
                        {[
                            { label: "Platinum", count: platinum.length, color: "#00e5ff" },
                            { label: "Gold", count: gold.length, color: "#f59e0b" },
                            { label: "Silver", count: silver.length, color: "#8b9ab0" },
                        ].map(({ label, count, color }) => (
                            <span key={label} className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full" style={{ background: color, boxShadow: label === "Platinum" ? `0 0 6px ${color}` : "none" }} />
                                {label} · {String(count).padStart(2, "0")}
                            </span>
                        ))}
                    </div>
                    <button
                        onClick={openAdd}
                        className="flex items-center gap-2 px-4 h-9 rounded-sm font-mono text-[11px] uppercase tracking-[0.14em] transition-colors"
                        style={{
                            background: "rgba(0,229,255,0.08)",
                            border: "1px solid rgba(0,229,255,0.35)",
                            color: "#00e5ff",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(0,229,255,0.14)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(0,229,255,0.08)"; }}
                    >
                        <Plus size={13} /> Add Sponsor
                    </button>
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-24 font-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: "#4a5568" }}>
                    Loading...
                </div>
            ) : sponsors.length === 0 ? (
                <div
                    className="flex flex-col items-center justify-center py-24 rounded-sm font-mono text-[11px] uppercase tracking-[0.18em] text-center gap-3"
                    style={{ border: "1px dashed rgba(0,229,255,0.12)", color: "#4a5568" }}
                >
                    <Star size={22} style={{ color: "rgba(0,229,255,0.2)" }} />
                    No sponsors yet. Click &ldquo;Add Sponsor&rdquo; to get started.
                </div>
            ) : (
                <div className="space-y-8">
                    {[
                        { tier: "Platinum", items: platinum },
                        { tier: "Gold", items: gold },
                        { tier: "Silver", items: silver },
                    ].map(({ tier, items }) =>
                        items.length === 0 ? null : (
                            <section key={tier}>
                                <div className="flex items-center gap-3 mb-4">
                                    <span
                                        className="w-2 h-2 rounded-full"
                                        style={{
                                            background: tierStyle(tier).fg,
                                            boxShadow: tier === "Platinum" ? `0 0 8px ${tierStyle(tier).fg}` : "none",
                                        }}
                                    />
                                    <span
                                        className="font-mono text-[10.5px] uppercase tracking-[0.22em]"
                                        style={{ color: tierStyle(tier).fg }}
                                    >
                                        {tier}
                                    </span>
                                    <span className="flex-1 h-px" style={{ background: "rgba(0,229,255,0.08)" }} />
                                    <span className="font-mono text-[9.5px] tabular-nums" style={{ color: "#4a5568" }}>
                                        {String(items.length).padStart(2, "0")}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                    {items.map((s) => (
                                        <SponsorCard
                                            key={s.id}
                                            sponsor={s}
                                            onEdit={openEdit}
                                            onDelete={setDeleting}
                                        />
                                    ))}
                                </div>
                            </section>
                        )
                    )}
                </div>
            )}

            {/* Modals */}
            <AnimatePresence>
                {modalOpen && (
                    <SponsorModal
                        editing={editing}
                        onClose={() => setModalOpen(false)}
                        onSaved={handleSaved}
                        onToast={addToast}
                    />
                )}
                {deleting && (
                    <DeleteModal
                        sponsor={deleting}
                        onClose={() => setDeleting(null)}
                        onDeleted={handleDeleted}
                        onToast={addToast}
                    />
                )}
            </AnimatePresence>

            <Toast toasts={toasts} />
        </div>
    );
}
