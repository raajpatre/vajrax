"use client";

import { useState, useEffect, useCallback, useTransition, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/useUser";
import VajraLoader from "@/components/ui/VajraLoader";
import {
    Package, ShieldCheck, Loader2, Plus, Pencil, Trash2, X,
    AlertCircle, RefreshCw, ExternalLink, Search,
    Cpu, Cog, BatteryFull, Layers, Wrench, Cable,
    LayoutGrid, Flame, Image as ImageIcon, ScanEye, Save,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Tables } from "@/types/database";
import { syncInventoryStocksToGoogleSheets } from "@/actions/inventory-history";

type InventoryItem = Tables<"inventory_items">;

// ─── Category metadata ────────────────────────────────────────────────────────

const CATEGORIES = [
    { key: "all",             label: "All",             Icon: LayoutGrid  },
    { key: "microcontroller", label: "Microcontroller", Icon: Cpu         },
    { key: "motor",           label: "Motor",           Icon: Cog         },
    { key: "sensor",          label: "Sensor",          Icon: ScanEye     },
    { key: "battery",         label: "Battery",         Icon: BatteryFull },
    { key: "chassis",         label: "Chassis",         Icon: Layers      },
    { key: "tool",            label: "Tool",            Icon: Wrench      },
    { key: "cable",           label: "Cable",           Icon: Cable       },
    { key: "general",         label: "General",         Icon: Package     },
] as const;

const CAT_COLOR: Record<string, { fg: string; bg: string; bd: string }> = {
    microcontroller: { fg: "#00e5ff", bg: "rgba(0,229,255,0.10)",   bd: "rgba(0,229,255,0.45)"  },
    motor:           { fg: "#f59e0b", bg: "rgba(245,158,11,0.10)",  bd: "rgba(245,158,11,0.45)" },
    sensor:          { fg: "#a78bfa", bg: "rgba(167,139,250,0.10)", bd: "rgba(167,139,250,0.45)"},
    battery:         { fg: "#ef4444", bg: "rgba(239,68,68,0.10)",   bd: "rgba(239,68,68,0.45)"  },
    chassis:         { fg: "#5eead4", bg: "rgba(94,234,212,0.10)",  bd: "rgba(94,234,212,0.45)" },
    tool:            { fg: "#fbbf24", bg: "rgba(251,191,36,0.10)",  bd: "rgba(251,191,36,0.45)" },
    cable:           { fg: "#f472b6", bg: "rgba(244,114,182,0.10)", bd: "rgba(244,114,182,0.45)"},
    general:         { fg: "#8b9ab0", bg: "rgba(139,154,176,0.10)", bd: "rgba(139,154,176,0.40)"},
};

function getCat(key: string) {
    return CATEGORIES.find(c => c.key === key) ?? CATEGORIES[CATEGORIES.length - 1];
}

// ─── Shared input style ───────────────────────────────────────────────────────

const inputCls = (err?: boolean) =>
    `w-full h-9 bg-[#07090f] text-[13px] text-[#f0f4ff] placeholder:text-[#4a5568] rounded-sm border px-3 transition-all outline-none ${
        err ? "border-[rgba(239,68,68,0.60)]" : "border-[rgba(0,229,255,0.18)]"
    }`;

// ─── Category badge ───────────────────────────────────────────────────────────

function CatBadge({ cat }: { cat: string }) {
    const c = CAT_COLOR[cat] ?? CAT_COLOR.general;
    const meta = getCat(cat);
    const Icon = meta.Icon;
    return (
        <span
            className="inline-flex items-center gap-1 h-5 px-1.5 rounded-sm border font-mono text-[9.5px] uppercase tracking-[0.12em]"
            style={{ color: c.fg, background: "rgba(7,9,15,0.88)", borderColor: c.bd, backdropFilter: "blur(4px)" }}
        >
            <Icon size={9} /> {meta.label}
        </span>
    );
}

// ─── Card cover fallback ──────────────────────────────────────────────────────

function CoverFallback({ cat }: { cat: string }) {
    const c = CAT_COLOR[cat] ?? CAT_COLOR.general;
    const meta = getCat(cat);
    const Icon = meta.Icon;
    return (
        <div
            className="w-full h-full grid place-items-center"
            style={{ background: "#07090f" }}
        >
            <div
                className="absolute inset-0 opacity-10"
                style={{
                    backgroundImage: `repeating-linear-gradient(35deg, ${c.fg} 0, ${c.fg} 1px, transparent 0, transparent 50%)`,
                    backgroundSize: "14px 14px",
                }}
            />
            <div
                className="relative grid place-items-center w-12 h-12 rounded-sm border"
                style={{ color: c.fg, borderColor: c.bd, background: c.bg }}
            >
                <Icon size={22} />
            </div>
        </div>
    );
}

// ─── Admin inventory card ─────────────────────────────────────────────────────

function AdminInvCard({
    item, shown, delay, onEdit, onDelete,
}: {
    item: InventoryItem;
    shown: boolean;
    delay: number;
    onEdit: (item: InventoryItem) => void;
    onDelete: (item: InventoryItem) => void;
}) {
    const [hover, setHover] = useState(false);
    const avail = item.available_quantity > 0;

    return (
        <div
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            className="relative bg-[#0d1117] rounded-[4px] overflow-hidden flex flex-col"
            style={{
                border: `1px solid ${hover ? "rgba(0,229,255,0.32)" : "rgba(0,229,255,0.12)"}`,
                boxShadow: hover
                    ? "0 0 0 1px rgba(0,229,255,0.10),0 14px 32px -18px rgba(0,0,0,0.75),0 0 22px -10px rgba(0,229,255,0.35)"
                    : "none",
                transform: hover ? "translateY(-2px)" : "translateY(0)",
                opacity: shown ? 1 : 0,
                transition: [
                    "border-color 180ms", "box-shadow 220ms",
                    "transform 200ms cubic-bezier(.2,.7,.2,1)",
                    `opacity 440ms ${delay}ms cubic-bezier(.2,.7,.2,1)`,
                ].join(", "),
            }}
        >
            {/* Cover */}
            <div className="relative overflow-hidden shrink-0" style={{ height: 160 }}>
                {item.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                    <CoverFallback cat={item.category} />
                )}
                <span className="absolute top-2.5 left-2.5 z-10 pointer-events-none">
                    <CatBadge cat={item.category} />
                </span>
                {item.is_consumable && (
                    <span
                        className="absolute top-2.5 right-2.5 z-10 pointer-events-none font-mono text-[9px] uppercase tracking-[0.14em] h-[18px] px-1.5 rounded-sm border"
                        style={{ color: "#f59e0b", borderColor: "rgba(245,158,11,0.45)", background: "rgba(7,9,15,0.85)" }}
                    >
                        CONSUMABLE
                    </span>
                )}
            </div>

            {/* Body */}
            <div className="p-3 flex flex-col flex-1">
                <div className="font-sans font-semibold text-[#f0f4ff] text-[14px] tracking-tight leading-snug">
                    {item.name}
                </div>
                <p
                    className="text-[#8b9ab0] text-[12px] mt-1 leading-relaxed flex-1"
                    style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}
                >
                    {item.description || <span className="italic text-[#4a5568]">No description</span>}
                </p>

                {/* Availability */}
                <div className="flex items-center gap-2 mt-3">
                    <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{
                            background: avail ? "#22c55e" : "#ef4444",
                            boxShadow: avail ? "0 0 6px #22c55e" : "0 0 6px #ef4444",
                        }}
                    />
                    <span
                        className="font-mono text-[10.5px] uppercase tracking-[0.14em]"
                        style={{ color: avail ? "#22c55e" : "#ef4444" }}
                    >
                        {avail ? "Available" : "Not Available"}
                    </span>
                    <span className="font-mono text-[10px] text-[#4a5568] ml-1 tabular-nums">
                        ({item.available_quantity}/{item.total_quantity})
                    </span>
                </div>

                {/* Always-visible admin actions */}
                <div
                    className="flex items-center gap-2 mt-3 pt-2.5 border-t"
                    style={{ borderColor: "rgba(0,229,255,0.10)" }}
                >
                    <button
                        onClick={() => onEdit(item)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-sm border font-mono text-[10.5px] uppercase tracking-[0.12em] transition-all"
                        style={{ color: "#00e5ff", background: "rgba(0,229,255,0.08)", borderColor: "rgba(0,229,255,0.35)" }}
                        onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,229,255,0.14)"; e.currentTarget.style.borderColor = "rgba(0,229,255,0.60)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "rgba(0,229,255,0.08)"; e.currentTarget.style.borderColor = "rgba(0,229,255,0.35)"; }}
                    >
                        <Pencil size={12} /> Edit
                    </button>
                    <button
                        onClick={() => onDelete(item)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-sm border font-mono text-[10.5px] uppercase tracking-[0.12em] transition-all"
                        style={{ color: "#ef4444", background: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.35)" }}
                        onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.16)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.65)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.35)"; }}
                    >
                        <Trash2 size={12} /> Delete
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Category filter pills ────────────────────────────────────────────────────

function FilterPills({
    value, onChange, counts,
}: {
    value: string;
    onChange: (k: string) => void;
    counts: Record<string, number>;
}) {
    return (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 flex-nowrap" style={{ scrollbarWidth: "thin" }}>
            {CATEGORIES.map(f => {
                const active = value === f.key;
                const Icon = f.Icon;
                return (
                    <button
                        key={f.key}
                        onClick={() => onChange(f.key)}
                        className="shrink-0 inline-flex items-center gap-1.5 h-9 px-3 rounded-sm font-mono text-[11px] uppercase tracking-[0.14em] whitespace-nowrap transition-all duration-150"
                        style={{
                            color:      active ? "#00e5ff" : "#8b9ab0",
                            background: active ? "rgba(0,229,255,0.10)" : "transparent",
                            border:     `1px solid ${active ? "rgba(0,229,255,0.55)" : "rgba(0,229,255,0.12)"}`,
                            boxShadow:  active ? "0 0 16px -4px rgba(0,229,255,0.45)" : "none",
                        }}
                        onMouseEnter={e => { if (!active) { e.currentTarget.style.color = "#f0f4ff"; e.currentTarget.style.borderColor = "rgba(0,229,255,0.30)"; } }}
                        onMouseLeave={e => { if (!active) { e.currentTarget.style.color = "#8b9ab0"; e.currentTarget.style.borderColor = "rgba(0,229,255,0.12)"; } }}
                    >
                        <Icon size={12} />
                        <span>{f.label}</span>
                        <span
                            className="font-mono text-[9.5px] tabular-nums"
                            style={{ color: active ? "rgba(0,229,255,0.8)" : "#4a5568" }}
                        >
                            {String(counts[f.key] ?? 0).padStart(2, "0")}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

// ─── Field label helper ───────────────────────────────────────────────────────

function FieldLabel({ label, hint }: { label: string; hint?: string }) {
    return (
        <div className="flex items-end justify-between mb-1.5">
            <label className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8b9ab0]">
                <span className="text-[#00e5ff]/70">$</span> {label}
            </label>
            {hint && <span className="font-mono text-[9.5px] text-[#4a5568]">{hint}</span>}
        </div>
    );
}

// ─── Item Add / Edit modal ────────────────────────────────────────────────────

const EMPTY_FORM = {
    name: "", desc: "", cat: "microcontroller",
    totalQty: "", availQty: "", imageUrl: "",
    consumable: false, safetyCert: "",
};

function ItemModal({
    open, editing, onClose, onSaved,
}: {
    open: boolean;
    editing: InventoryItem | null;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [form, setForm] = useState(EMPTY_FORM);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const isEdit = !!editing;

    useEffect(() => {
        if (!open) return;
        setErrors({});
        setSaveError(null);
        setForm(editing ? {
            name: editing.name,
            desc: editing.description ?? "",
            cat: editing.category,
            totalQty: String(editing.total_quantity),
            availQty: String(editing.available_quantity),
            imageUrl: editing.image_url ?? "",
            consumable: editing.is_consumable ?? false,
            safetyCert: editing.required_safety_certification ?? "",
        } : EMPTY_FORM);
    }, [open, editing]);

    const set = (k: string, v: string | boolean) => {
        setForm(f => ({ ...f, [k]: v }));
        setErrors(e => ({ ...e, [k]: "" }));
    };

    const validate = () => {
        const e: Record<string, string> = {};
        if (!form.name.trim()) e.name = "Required";
        const t = parseInt(form.totalQty);
        const a = parseInt(form.availQty);
        if (isNaN(t) || t < 0) e.totalQty = "Enter a valid number";
        if (isNaN(a) || a < 0) e.availQty = "Enter a valid number";
        if (!isNaN(t) && !isNaN(a) && a > t) e.availQty = "Must be ≤ Total";
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const doSave = async () => {
        if (!validate()) return;
        setSaving(true);
        setSaveError(null);

        const supabase = createClient();
        const payload = {
            name: form.name.trim(),
            description: form.desc.trim() || null,
            category: form.cat,
            total_quantity: parseInt(form.totalQty) || 0,
            available_quantity: parseInt(form.availQty) || 0,
            image_url: form.imageUrl.trim() || null,
            is_consumable: form.consumable,
            required_safety_certification: form.safetyCert.trim() || null,
        };

        try {
            if (isEdit && editing) {
                const { error } = await supabase.from("inventory_items").update(payload).eq("id", editing.id);
                if (error) { setSaveError(error.message); setSaving(false); return; }
            } else {
                const { error } = await supabase.from("inventory_items").insert(payload);
                if (error) { setSaveError(error.message); setSaving(false); return; }
            }
            await syncInventoryStocksToGoogleSheets();
            setSaving(false);
            onSaved();
            onClose();
        } catch (err: unknown) {
            setSaveError(err instanceof Error ? err.message : "Unexpected error");
            setSaving(false);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50">
            <div
                className="absolute inset-0 backdrop-blur-md"
                style={{ background: "rgba(7,9,15,0.78)" }}
                onClick={onClose}
            />
            <div className="absolute inset-0 grid place-items-center p-6 pointer-events-none">
                <div
                    className="relative w-full max-w-xl pointer-events-auto rounded-[4px] max-h-[90vh] flex flex-col"
                    style={{
                        background: "rgba(17,24,32,0.97)",
                        border: "1px solid rgba(0,229,255,0.30)",
                        boxShadow: "0 0 0 1px rgba(0,229,255,0.06),0 32px 80px -16px rgba(0,0,0,0.95)",
                    }}
                >
                    {/* Top accent line */}
                    <div
                        className="absolute inset-x-0 top-0 h-px pointer-events-none"
                        style={{ background: "linear-gradient(90deg,transparent,rgba(0,229,255,0.6),transparent)" }}
                    />

                    {/* Header */}
                    <div
                        className="px-5 h-12 flex items-center justify-between border-b shrink-0"
                        style={{ borderColor: "rgba(0,229,255,0.12)" }}
                    >
                        <div className="flex items-center gap-2.5">
                            <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ background: "#00e5ff", color: "#00e5ff", animation: "pulse 1.6s ease-in-out infinite" }}
                            />
                            <span className="text-[#f0f4ff] text-[14px] font-semibold">
                                {isEdit ? "Edit Item" : "Add Item"}
                            </span>
                            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#4a5568]">
                                {isEdit ? `// ${editing?.id?.slice(0, 12)}` : "// VAULT ENTRY"}
                            </span>
                        </div>
                        <button
                            onClick={onClose}
                            className="grid place-items-center w-7 h-7 border rounded-sm text-[#8b9ab0] hover:text-[#f0f4ff] transition-colors"
                            style={{ borderColor: "rgba(0,229,255,0.22)" }}
                        >
                            <X size={14} />
                        </button>
                    </div>

                    {/* Scrollable body */}
                    <form onSubmit={e => { e.preventDefault(); doSave(); }} className="flex-1 overflow-y-auto p-5 space-y-4">
                        {saveError && (
                            <div
                                className="flex items-center gap-2 px-3 py-2 rounded-sm font-mono text-[11px]"
                                style={{ color: "#ef4444", background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.35)" }}
                            >
                                <AlertCircle size={12} /> {saveError}
                            </div>
                        )}

                        {/* Name */}
                        <div>
                            <FieldLabel label="Item Name" hint="REQUIRED" />
                            <input
                                type="text"
                                value={form.name}
                                onChange={e => set("name", e.target.value)}
                                placeholder="e.g. ESP32-S3 Devkit"
                                className={inputCls(!!errors.name)}
                                style={{ outline: "none" }}
                                onFocus={e => e.target.style.borderColor = "rgba(0,229,255,0.55)"}
                                onBlur={e => e.target.style.borderColor = errors.name ? "rgba(239,68,68,0.60)" : "rgba(0,229,255,0.18)"}
                            />
                            {errors.name && (
                                <div className="flex items-center gap-1 mt-1 font-mono text-[10px]" style={{ color: "#ef4444" }}>
                                    <AlertCircle size={11} /> {errors.name}
                                </div>
                            )}
                        </div>

                        {/* Description */}
                        <div>
                            <FieldLabel label="Description" />
                            <textarea
                                rows={3}
                                value={form.desc}
                                onChange={e => set("desc", e.target.value)}
                                placeholder="Describe specs, usage constraints, location in lab…"
                                className="w-full bg-[#07090f] text-[13px] text-[#f0f4ff] placeholder:text-[#4a5568] rounded-sm border px-3 py-2 resize-none outline-none transition-all"
                                style={{ borderColor: "rgba(0,229,255,0.18)" }}
                                onFocus={e => e.target.style.borderColor = "rgba(0,229,255,0.55)"}
                                onBlur={e => e.target.style.borderColor = "rgba(0,229,255,0.18)"}
                            />
                        </div>

                        {/* Category */}
                        <div>
                            <FieldLabel label="Category" />
                            <div className="relative">
                                <select
                                    value={form.cat}
                                    onChange={e => set("cat", e.target.value)}
                                    className="appearance-none w-full h-9 bg-[#07090f] text-[13px] text-[#f0f4ff] border rounded-sm px-3 pr-9 outline-none"
                                    style={{ borderColor: "rgba(0,229,255,0.18)" }}
                                >
                                    {CATEGORIES.filter(c => c.key !== "all").map(c => (
                                        <option key={c.key} value={c.key} className="bg-[#07090f]">
                                            {c.label}
                                        </option>
                                    ))}
                                </select>
                                <span className="absolute inset-y-0 right-0 grid place-items-center w-9 text-[#8b9ab0] pointer-events-none">
                                    ▾
                                </span>
                            </div>
                        </div>

                        {/* Quantities */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <FieldLabel label="Total Quantity" />
                                <input
                                    type="number" min="0"
                                    value={form.totalQty}
                                    onChange={e => set("totalQty", e.target.value)}
                                    placeholder="0"
                                    className={inputCls(!!errors.totalQty)}
                                    style={{ outline: "none" }}
                                    onFocus={e => e.target.style.borderColor = "rgba(0,229,255,0.55)"}
                                    onBlur={e => e.target.style.borderColor = errors.totalQty ? "rgba(239,68,68,0.60)" : "rgba(0,229,255,0.18)"}
                                />
                                {errors.totalQty && (
                                    <div className="flex items-center gap-1 mt-1 font-mono text-[10px]" style={{ color: "#ef4444" }}>
                                        <AlertCircle size={11} /> {errors.totalQty}
                                    </div>
                                )}
                            </div>
                            <div>
                                <FieldLabel label="Available Qty" hint="≤ TOTAL" />
                                <input
                                    type="number" min="0"
                                    value={form.availQty}
                                    onChange={e => set("availQty", e.target.value)}
                                    placeholder="0"
                                    className={inputCls(!!errors.availQty)}
                                    style={{ outline: "none" }}
                                    onFocus={e => e.target.style.borderColor = "rgba(0,229,255,0.55)"}
                                    onBlur={e => e.target.style.borderColor = errors.availQty ? "rgba(239,68,68,0.60)" : "rgba(0,229,255,0.18)"}
                                />
                                {errors.availQty && (
                                    <div className="flex items-center gap-1 mt-1 font-mono text-[10px]" style={{ color: "#ef4444" }}>
                                        <AlertCircle size={11} /> {errors.availQty}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Image URL */}
                        <div>
                            <FieldLabel label="Image URL" hint="OPTIONAL" />
                            <div className="relative">
                                <span
                                    className="absolute inset-y-0 left-0 grid place-items-center w-9 text-[#8b9ab0] border-r pointer-events-none"
                                    style={{ borderColor: "rgba(0,229,255,0.14)" }}
                                >
                                    <ImageIcon size={13} />
                                </span>
                                <input
                                    type="url"
                                    value={form.imageUrl}
                                    onChange={e => set("imageUrl", e.target.value)}
                                    placeholder="https://…"
                                    className="w-full h-9 bg-[#07090f] text-[13px] text-[#f0f4ff] placeholder:text-[#4a5568] rounded-sm border px-3 pl-11 outline-none transition-all"
                                    style={{ borderColor: "rgba(0,229,255,0.18)" }}
                                    onFocus={e => e.target.style.borderColor = "rgba(0,229,255,0.55)"}
                                    onBlur={e => e.target.style.borderColor = "rgba(0,229,255,0.18)"}
                                />
                            </div>
                        </div>

                        {/* Safety cert */}
                        <div>
                            <FieldLabel label="Required Safety Certification" hint="OPTIONAL" />
                            <div className="relative">
                                <span
                                    className="absolute inset-y-0 left-0 grid place-items-center w-9 text-[#8b9ab0] border-r pointer-events-none"
                                    style={{ borderColor: "rgba(0,229,255,0.14)" }}
                                >
                                    <ShieldCheck size={13} />
                                </span>
                                <input
                                    type="text"
                                    value={form.safetyCert}
                                    onChange={e => set("safetyCert", e.target.value)}
                                    placeholder="e.g. OSHA 10, ISO 10218"
                                    className="w-full h-9 bg-[#07090f] text-[13px] text-[#f0f4ff] placeholder:text-[#4a5568] rounded-sm border px-3 pl-11 outline-none transition-all"
                                    style={{ borderColor: "rgba(0,229,255,0.18)" }}
                                    onFocus={e => e.target.style.borderColor = "rgba(0,229,255,0.55)"}
                                    onBlur={e => e.target.style.borderColor = "rgba(0,229,255,0.18)"}
                                />
                            </div>
                        </div>

                        {/* Consumable toggle */}
                        <div
                            className="flex items-center justify-between px-4 py-3 rounded-sm border transition-all"
                            style={{
                                borderColor: form.consumable ? "rgba(245,158,11,0.40)" : "rgba(0,229,255,0.15)",
                                background:  form.consumable ? "rgba(245,158,11,0.06)" : "rgba(0,229,255,0.03)",
                            }}
                        >
                            <div className="flex items-center gap-2.5">
                                <Flame size={15} style={{ color: form.consumable ? "#f59e0b" : "#4a5568" }} />
                                <div>
                                    <div
                                        className="font-sans font-medium text-[13px]"
                                        style={{ color: form.consumable ? "#f59e0b" : "#f0f4ff" }}
                                    >
                                        {form.consumable ? "Consumable" : "Not consumable"}
                                    </div>
                                    <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#4a5568] mt-0.5">
                                        {form.consumable ? "// item is used up on checkout" : "// item is returned after use"}
                                    </div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => set("consumable", !form.consumable)}
                                className="relative w-10 h-5 rounded-full transition-all duration-200 shrink-0"
                                style={{
                                    background: form.consumable ? "#f59e0b" : "rgba(74,85,104,0.55)",
                                    boxShadow: form.consumable ? "0 0 12px -2px rgba(245,158,11,0.7)" : "none",
                                }}
                            >
                                <span
                                    className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200"
                                    style={{ transform: form.consumable ? "translateX(20px)" : "translateX(0)" }}
                                />
                            </button>
                        </div>
                    </form>

                    {/* Footer */}
                    <div
                        className="px-5 h-14 flex items-center justify-end gap-2 border-t shrink-0"
                        style={{ borderColor: "rgba(0,229,255,0.10)", background: "rgba(7,9,15,0.40)" }}
                    >
                        <button
                            type="button"
                            onClick={onClose}
                            className="inline-flex items-center gap-2 h-9 px-3.5 rounded-sm border font-medium text-[13px] transition-all text-[#8b9ab0] hover:text-[#f0f4ff]"
                            style={{ borderColor: "rgba(139,154,176,0.28)", background: "transparent" }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={doSave}
                            disabled={saving}
                            className="inline-flex items-center gap-2 h-9 px-4 rounded-sm border font-medium text-[13px] transition-all disabled:opacity-60"
                            style={{
                                color: "#07090f", background: "#00e5ff", borderColor: "#00e5ff",
                                boxShadow: saving ? "none" : "0 0 18px -4px rgba(0,229,255,0.65)",
                            }}
                        >
                            {saving
                                ? <><Loader2 size={14} className="animate-spin" />Saving…</>
                                : <><Save size={14} />{isEdit ? "Save changes" : "Add item"}</>
                            }
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Delete confirm modal ─────────────────────────────────────────────────────

function DeleteModal({
    item, onConfirm, onCancel,
}: {
    item: InventoryItem | null;
    onConfirm: (id: string) => void;
    onCancel: () => void;
}) {
    const [deleting, setDeleting] = useState(false);
    if (!item) return null;

    const handleConfirm = async () => {
        setDeleting(true);
        await onConfirm(item.id);
        setDeleting(false);
    };

    return (
        <div className="fixed inset-0 z-50">
            <div
                className="absolute inset-0 backdrop-blur-md"
                style={{ background: "rgba(7,9,15,0.78)" }}
                onClick={onCancel}
            />
            <div className="absolute inset-0 grid place-items-center p-6 pointer-events-none">
                <div
                    className="relative w-full max-w-sm pointer-events-auto rounded-[4px]"
                    style={{
                        background: "rgba(17,24,32,0.97)",
                        border: "1px solid rgba(239,68,68,0.35)",
                        boxShadow: "0 0 0 1px rgba(239,68,68,0.06),0 32px 80px -16px rgba(0,0,0,0.95)",
                    }}
                >
                    <div
                        className="absolute inset-x-0 top-0 h-px pointer-events-none"
                        style={{ background: "linear-gradient(90deg,transparent,rgba(239,68,68,0.6),transparent)" }}
                    />
                    <div className="p-6 text-center">
                        <div
                            className="mx-auto w-12 h-12 grid place-items-center rounded-[4px] border mb-4"
                            style={{
                                color: "#ef4444", background: "rgba(239,68,68,0.10)", borderColor: "rgba(239,68,68,0.40)",
                                boxShadow: "0 0 20px -6px rgba(239,68,68,0.6)",
                            }}
                        >
                            <Trash2 size={20} />
                        </div>
                        <div className="font-sans font-bold text-[#f0f4ff] text-[16px] tracking-tight">Delete item?</div>
                        <p className="text-[#8b9ab0] text-[13px] mt-2 leading-relaxed">
                            <span className="text-[#f0f4ff]">"{item.name}"</span> will be permanently removed from the vault.
                        </p>
                        <div className="flex items-center justify-center gap-2 mt-6">
                            <button
                                onClick={onCancel}
                                className="inline-flex items-center gap-2 h-9 px-4 rounded-sm border font-medium text-[13px] text-[#8b9ab0] hover:text-[#f0f4ff] transition-colors"
                                style={{ borderColor: "rgba(139,154,176,0.28)" }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={deleting}
                                className="inline-flex items-center gap-2 h-9 px-4 rounded-sm border font-medium text-[13px] transition-all disabled:opacity-60"
                                style={{
                                    color: "#ef4444", background: "rgba(239,68,68,0.12)", borderColor: "rgba(239,68,68,0.45)",
                                    boxShadow: "0 0 16px -4px rgba(239,68,68,0.5)",
                                }}
                            >
                                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ msg, color }: { msg: string; color: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 6, x: "-50%" }}
            className="fixed bottom-6 left-1/2 z-[200] flex items-center gap-2.5 px-4 py-2.5 rounded-sm backdrop-blur-md pointer-events-none"
            style={{
                background: "rgba(17,24,32,0.95)",
                border: `1px solid ${color}55`,
                boxShadow: `0 0 20px -6px ${color}50`,
            }}
        >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
            <span className="font-mono text-[11.5px] text-[#f0f4ff]">{msg}</span>
        </motion.div>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function InventoryManagement() {
    const { isModerator, isFaculty, isInventoryManager, loading: authLoading } = useUser();
    const canManage = isModerator || isFaculty || isInventoryManager;
    const supabase = createClient();
    const googleSheetUrl = process.env.NEXT_PUBLIC_GOOGLE_SHEET_URL?.trim() || null;

    const [items, setItems]           = useState<InventoryItem[]>([]);
    const [loading, setLoading]       = useState(true);
    const [shown, setShown]           = useState(false);
    const [search, setSearch]         = useState("");
    const [catFilter, setCatFilter]   = useState("all");
    const [modalOpen, setModalOpen]   = useState(false);
    const [editItem, setEditItem]     = useState<InventoryItem | null>(null);
    const [deleteItem, setDeleteItem] = useState<InventoryItem | null>(null);
    const [toast, setToast]           = useState<{ msg: string; color: string } | null>(null);
    const [isSyncPending, startSync]  = useTransition();

    const showToast = (msg: string, color = "#22c55e") => {
        setToast({ msg, color });
        setTimeout(() => setToast(null), 2800);
    };

    const fetchItems = useCallback(async () => {
        const { data } = await supabase.from("inventory_items").select("*").order("name");
        if (data) setItems(data);
        setLoading(false);
    }, [supabase]);

    useEffect(() => {
        fetchItems();
        const t = setTimeout(() => setShown(true), 80);
        return () => clearTimeout(t);
    }, [fetchItems]);

    const catCounts = useMemo(() => {
        const map: Record<string, number> = { all: items.length };
        items.forEach(i => { map[i.category] = (map[i.category] ?? 0) + 1; });
        return map;
    }, [items]);

    const visible = useMemo(() => {
        let list = catFilter === "all" ? items : items.filter(i => i.category === catFilter);
        const q = search.toLowerCase().trim();
        if (q) list = list.filter(i =>
            i.name.toLowerCase().includes(q) || (i.description ?? "").toLowerCase().includes(q)
        );
        return list;
    }, [items, catFilter, search]);

    const openAdd  = () => { setEditItem(null); setModalOpen(true); };
    const openEdit = (item: InventoryItem) => { setEditItem(item); setModalOpen(true); };

    const handleSaved = () => {
        fetchItems();
        showToast(editItem ? `"${editItem.name}" updated.` : "Item added to vault.");
    };

    const handleDelete = async (id: string) => {
        const item = items.find(i => i.id === id);
        const { error } = await supabase.from("inventory_items").delete().eq("id", id);
        if (error) { showToast(error.message, "#ef4444"); return; }
        await syncInventoryStocksToGoogleSheets();
        setItems(prev => prev.filter(i => i.id !== id));
        setDeleteItem(null);
        showToast(`"${item?.name}" removed from vault.`, "#ef4444");
    };

    const handleSheetSync = () => {
        startSync(async () => {
            const result = await syncInventoryStocksToGoogleSheets();
            if (!result.ok) { showToast(result.error, "#ef4444"); return; }
            showToast(`Synced ${result.count} row${result.count === 1 ? "" : "s"} to Google Sheets.`);
        });
    };

    if (authLoading || loading) return <VajraLoader fullPage />;

    if (!canManage) {
        return (
            <div className="max-w-xl mx-auto px-6 py-20 text-center">
                <div
                    className="mx-auto w-16 h-16 grid place-items-center rounded-[4px] border mb-5"
                    style={{ color: "#ef4444", background: "rgba(239,68,68,0.10)", borderColor: "rgba(239,68,68,0.40)", boxShadow: "0 0 24px -8px rgba(239,68,68,0.6)" }}
                >
                    <ShieldCheck size={28} />
                </div>
                <h2 className="font-sans font-bold text-[20px] text-[#f0f4ff] tracking-tight">Access Denied</h2>
                <p className="text-[#8b9ab0] text-[13.5px] mt-2">You don't have permission to manage inventory.</p>
            </div>
        );
    }

    return (
        <div className="relative max-w-7xl mx-auto px-4 sm:px-8 pt-6 sm:pt-10 pb-20">
            {/* Subtle grid overlay */}
            <div
                className="fixed inset-0 pointer-events-none"
                style={{
                    backgroundImage: "linear-gradient(rgba(0,229,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,229,255,0.03) 1px,transparent 1px)",
                    backgroundSize: "40px 40px",
                }}
            />

            {/* Page header */}
            <div className="relative flex items-center gap-2 mb-2">
                <span className="h-px w-8" style={{ background: "rgba(0,229,255,0.6)" }} />
                <span className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-[#00e5ff]">// ADMIN / INVENTORY</span>
            </div>

            <div className="relative flex items-end justify-between gap-6 mb-7">
                <div>
                    <h1 className="font-sans font-black text-[#f0f4ff] tracking-tight" style={{ fontSize: 30 }}>
                        Manage Inventory
                    </h1>
                    <p className="text-[#8b9ab0] text-[13.5px] mt-1.5">
                        Add, edit, and retire equipment items.{" "}
                        <span className="font-mono text-[11px] text-[#4a5568] tabular-nums">{items.length} items in vault.</span>
                    </p>
                </div>

                {/* Header controls */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                    <button
                        onClick={handleSheetSync}
                        disabled={isSyncPending || !googleSheetUrl}
                        className="inline-flex items-center gap-2 h-9 px-3 rounded-sm border font-medium text-[12.5px] transition-all text-[#8b9ab0] hover:text-[#f0f4ff] disabled:opacity-40"
                        style={{ borderColor: "rgba(139,154,176,0.28)", background: "transparent" }}
                    >
                        <RefreshCw size={14} className={isSyncPending ? "animate-spin" : ""} /> Sync to Sheet
                    </button>
                    <a
                        href={googleSheetUrl ?? "https://docs.google.com/spreadsheets"}
                        target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-2 h-9 px-3 rounded-sm border font-medium text-[12.5px] transition-all text-[#8b9ab0] hover:text-[#f0f4ff]"
                        style={{ borderColor: "rgba(139,154,176,0.28)", background: "transparent" }}
                    >
                        <ExternalLink size={14} /> Open Sheet
                    </a>
                    <button
                        onClick={openAdd}
                        className="inline-flex items-center gap-2 h-9 px-4 rounded-sm border font-medium text-[13px] transition-all"
                        style={{ color: "#07090f", background: "#00e5ff", borderColor: "#00e5ff", boxShadow: "0 0 18px -4px rgba(0,229,255,0.65)" }}
                    >
                        <Plus size={15} /> Add Item
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="relative flex items-center gap-4 mb-5">
                <div className="relative max-w-sm flex-1">
                    <span
                        className="absolute inset-y-0 left-0 grid place-items-center w-9 text-[#8b9ab0] pointer-events-none border-r"
                        style={{ borderColor: "rgba(0,229,255,0.12)" }}
                    >
                        <Search size={13} />
                    </span>
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search items, categories…"
                        className="w-full h-9 bg-[#0d1117] text-[12.5px] text-[#f0f4ff] placeholder:text-[#4a5568] border rounded-[4px] pl-11 pr-3 outline-none transition-all"
                        style={{ borderColor: "rgba(0,229,255,0.12)" }}
                        onFocus={e => e.target.style.borderColor = "rgba(0,229,255,0.55)"}
                        onBlur={e => e.target.style.borderColor = "rgba(0,229,255,0.12)"}
                    />
                </div>
                <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#4a5568] tabular-nums shrink-0">
                    {visible.length} result{visible.length !== 1 ? "s" : ""}
                </span>
            </div>

            {/* Filter pills */}
            <FilterPills value={catFilter} onChange={setCatFilter} counts={catCounts} />

            {/* Grid */}
            <div className="mt-6">
                {visible.length === 0 ? (
                    <div
                        className="relative border border-dashed rounded-[4px] overflow-hidden"
                        style={{ borderColor: "rgba(0,229,255,0.12)", background: "rgba(13,17,23,0.40)" }}
                    >
                        <div className="relative text-center py-16 px-6">
                            <div
                                className="mx-auto w-14 h-14 grid place-items-center border rounded-[4px] text-[#4a5568] mb-4 bg-[#07090f]"
                                style={{ borderColor: "rgba(0,229,255,0.12)" }}
                            >
                                <Package size={22} />
                            </div>
                            <h3 className="text-[#f0f4ff] font-bold text-[18px] tracking-tight">No items found</h3>
                            <p className="text-[#8b9ab0] text-[13px] mt-1.5 max-w-[42ch] mx-auto leading-relaxed">
                                {catFilter !== "all" || search
                                    ? "No items match that filter. Try clearing the search."
                                    : "The inventory vault is empty. Add your first item."}
                            </p>
                            {(catFilter !== "all" || search) && (
                                <button
                                    onClick={() => { setCatFilter("all"); setSearch(""); }}
                                    className="mt-5 inline-flex items-center gap-2 h-9 px-4 rounded-sm border font-medium text-[13px]"
                                    style={{ color: "#07090f", background: "#00e5ff", borderColor: "#00e5ff" }}
                                >
                                    <LayoutGrid size={14} /> Show all items
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {visible.map((item, i) => (
                            <AdminInvCard
                                key={item.id}
                                item={item}
                                shown={shown}
                                delay={Math.min(i * 35, 350)}
                                onEdit={openEdit}
                                onDelete={setDeleteItem}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Modals */}
            <ItemModal
                open={modalOpen}
                editing={editItem}
                onClose={() => setModalOpen(false)}
                onSaved={handleSaved}
            />
            <DeleteModal
                item={deleteItem}
                onConfirm={handleDelete}
                onCancel={() => setDeleteItem(null)}
            />

            {/* Toast */}
            <AnimatePresence>
                {toast && <Toast key="toast" msg={toast.msg} color={toast.color} />}
            </AnimatePresence>
        </div>
    );
}
