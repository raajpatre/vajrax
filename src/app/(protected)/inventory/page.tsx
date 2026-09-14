"use client";

import { useState, useEffect, useCallback, useTransition, useMemo, useId, useRef, useLayoutEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/useUser";
import VajraLoader from "@/components/ui/VajraLoader";
import {
    LayoutGrid,
    Cpu,
    Cog,
    BatteryFull,
    Layers,
    Wrench,
    Cable,
    Package,
    Search,
    ShoppingCart,
    Plus,
    Minus,
    X,
    Pencil,
    Trash2,
    Check,
    CheckCircle2,
    Send,
    Loader2,
    PackageOpen,
    RefreshCw,
    ExternalLink,
    AlertCircle,
    ShieldCheck,
    Hash,
    Link2,
    ScanEye,
} from "lucide-react";
import { Tables } from "@/types/database";
import { submitEquipmentCart } from "@/actions/equipment-requests";
import { syncInventoryStocksToGoogleSheets } from "@/actions/inventory-history";

export interface InventoryItem extends Tables<"inventory_items"> { }

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

interface CartItem {
    item: InventoryItem;
    quantity: number;
    requestType: "borrow" | "permanent";
}

/* ─── Category config ─────────────────────────────────────────────── */

const CATEGORIES = [
    { key: "all",             label: "All",             Icon: LayoutGrid },
    { key: "microcontroller", label: "Microcontroller", Icon: Cpu        },
    { key: "motor",           label: "Motor",           Icon: Cog        },
    { key: "sensor",          label: "Sensor",          Icon: ScanEye    },
    { key: "battery",         label: "Battery",         Icon: BatteryFull},
    { key: "chassis",         label: "Chassis",         Icon: Layers     },
    { key: "tool",            label: "Tool",            Icon: Wrench     },
    { key: "cable",           label: "Cable",           Icon: Cable      },
    { key: "general",         label: "General",         Icon: Package    },
] as const;


const CAT_COLOR: Record<string, { fg: string; bg: string; bd: string }> = {
    microcontroller: { fg: "#00e5ff", bg: "rgba(0,229,255,0.10)",    bd: "rgba(0,229,255,0.45)"   },
    motor:           { fg: "#f59e0b", bg: "rgba(245,158,11,0.10)",   bd: "rgba(245,158,11,0.45)"  },
    sensor:          { fg: "#a78bfa", bg: "rgba(167,139,250,0.10)",  bd: "rgba(167,139,250,0.45)" },
    battery:         { fg: "#ef4444", bg: "rgba(239,68,68,0.10)",    bd: "rgba(239,68,68,0.45)"   },
    chassis:         { fg: "#5eead4", bg: "rgba(94,234,212,0.10)",   bd: "rgba(94,234,212,0.45)"  },
    tool:            { fg: "#fbbf24", bg: "rgba(251,191,36,0.10)",   bd: "rgba(251,191,36,0.45)"  },
    cable:           { fg: "#f472b6", bg: "rgba(244,114,182,0.10)",  bd: "rgba(244,114,182,0.45)" },
    general:         { fg: "#8b9ab0", bg: "rgba(139,154,176,0.10)",  bd: "rgba(139,154,176,0.40)" },
};

function getCatColor(cat: string) {
    return CAT_COLOR[cat] ?? CAT_COLOR.general;
}

function getCatMeta(cat: string) {
    return CATEGORIES.find(c => c.key === cat) ?? CATEGORIES[CATEGORIES.length - 1];
}

/* ─── Auth helpers ────────────────────────────────────────────────── */

function isStockVisibleToUser(input: { isFaculty: boolean; isModerator: boolean; isInventoryManager: boolean }) {
    return input.isFaculty || input.isModerator || input.isInventoryManager;
}

function getAvailMeta(item: InventoryItem, canViewExact: boolean) {
    const isAvail = item.available_quantity > 0;
    return {
        isAvail,
        label: canViewExact
            ? isAvail ? `${item.available_quantity}/${item.total_quantity}` : "Out of stock"
            : isAvail ? "Available" : "Out of stock",
    };
}

/* ─── Cart localStorage ───────────────────────────────────────────── */

const CART_KEY = "vajrax_inventory_cart";
function loadCart(): CartItem[] {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem(CART_KEY) ?? "[]") as CartItem[]; } catch { return []; }
}
function saveCart(cart: CartItem[]) {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch { /* quota */ }
}

/* ─── Cover fallback ──────────────────────────────────────────────── */

function InvCoverFallback({ cat }: { cat: string }) {
    const c = getCatColor(cat);
    const catMeta = getCatMeta(cat);
    const uid = useId().replace(/:/g, "");
    const Icon = catMeta.Icon;
    return (
        <div className="relative w-full h-full grid place-items-center overflow-hidden" style={{ background: "#07090f" }}>
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 160" preserveAspectRatio="xMidYMid slice">
                <defs>
                    <pattern id={`ic-s-${uid}`} width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
                        <line x1="0" y1="0" x2="0" y2="14" stroke={c.fg} strokeWidth="1" opacity="0.09" />
                    </pattern>
                </defs>
                <rect width="400" height="160" fill="#07090f" />
                <rect width="400" height="160" fill={`url(#ic-s-${uid})`} />
                <path d="M0 0 H14 M0 0 V14" stroke={c.fg} strokeWidth="1.4" opacity="0.7" />
                <path d="M400 160 H386 M400 160 V146" stroke={c.fg} strokeWidth="1.4" opacity="0.7" />
            </svg>
            <div className="relative grid place-items-center w-12 h-12 rounded-sm border"
                style={{ color: c.fg, borderColor: c.bd, background: c.bg }}>
                <Icon size={22} />
            </div>
        </div>
    );
}

/* ─── Category badge ──────────────────────────────────────────────── */

function CatBadge({ cat }: { cat: string }) {
    const c = getCatColor(cat);
    const m = getCatMeta(cat);
    const Icon = m.Icon;
    return (
        <span
            className="inline-flex items-center gap-1 h-[20px] px-1.5 rounded-sm border font-mono text-[9.5px] uppercase tracking-[0.12em]"
            style={{ color: c.fg, background: "rgba(7,9,15,0.88)", borderColor: c.bd, backdropFilter: "blur(4px)" }}
        >
            <Icon size={9} /> {m.label}
        </span>
    );
}

/* ─── Qty stepper ─────────────────────────────────────────────────── */

function QtyStepper({ value, onChange, min = 1, max = 99 }: {
    value: number; onChange: (v: number) => void; min?: number; max?: number;
}) {
    return (
        <div className="flex items-center gap-0 border rounded-sm overflow-hidden" style={{ borderColor: "rgba(0,229,255,0.14)" }}>
            <button
                onClick={() => onChange(Math.max(min, value - 1))}
                className="grid place-items-center w-9 h-9 border-r text-[#8b9ab0] hover:text-[#f0f4ff] hover:bg-[rgba(0,229,255,0.06)] transition-colors"
                style={{ borderColor: "rgba(0,229,255,0.14)" }}
            >
                <Minus size={13} />
            </button>
            <span className="font-mono text-[13px] tabular-nums text-[#f0f4ff] min-w-[2.5rem] text-center">{value}</span>
            <button
                onClick={() => onChange(Math.min(max, value + 1))}
                className="grid place-items-center w-9 h-9 border-l text-[#8b9ab0] hover:text-[#f0f4ff] hover:bg-[rgba(0,229,255,0.06)] transition-colors"
                style={{ borderColor: "rgba(0,229,255,0.14)" }}
            >
                <Plus size={13} />
            </button>
        </div>
    );
}

/* ─── Usage toggle ────────────────────────────────────────────────── */

function UsageToggle({ value, onChange, small }: {
    value: "borrow" | "permanent"; onChange: (v: "borrow" | "permanent") => void; small?: boolean;
}) {
    const opts: { k: "borrow" | "permanent"; l: string }[] = [
        { k: "borrow", l: "Borrowing" },
        { k: "permanent", l: "Permanent" },
    ];
    const h = small ? "h-6" : "h-8";
    const fs = small ? "text-[9.5px]" : "text-[10.5px]";
    return (
        <div className="flex items-center gap-0 p-0.5 border rounded-sm" style={{ borderColor: "rgba(0,229,255,0.14)", background: "rgba(7,9,15,0.60)" }}>
            {opts.map(o => (
                <button key={o.k} onClick={() => onChange(o.k)}
                    className={`flex-1 ${h} px-2 rounded-sm font-mono ${fs} uppercase tracking-[0.12em] transition-colors whitespace-nowrap`}
                    style={{
                        background: value === o.k ? "#00e5ff" : "transparent",
                        color: value === o.k ? "#07090f" : "#8b9ab0",
                        boxShadow: value === o.k ? "0 0 10px rgba(0,229,255,0.55)" : "none",
                    }}>
                    {o.l}
                </button>
            ))}
        </div>
    );
}

/* ─── Inventory card ──────────────────────────────────────────────── */

function InvCard({ item, inCart, canManage, canViewExact, onAdd, onEdit, onDelete, shown, delay }: {
    item: InventoryItem;
    inCart: boolean;
    canManage: boolean;
    canViewExact: boolean;
    onAdd: (item: InventoryItem) => void;
    onEdit: (item: InventoryItem) => void;
    onDelete: (item: InventoryItem) => void;
    shown: boolean;
    delay: number;
}) {
    const [hover, setHover] = useState(false);
    const { isAvail } = getAvailMeta(item, canViewExact);

    return (
        <div
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            className="relative rounded-md overflow-hidden flex flex-col"
            style={{
                background: "#0d1117",
                border: `1px solid ${hover ? "rgba(0,229,255,0.32)" : "rgba(0,229,255,0.12)"}`,
                boxShadow: hover
                    ? "0 0 0 1px rgba(0,229,255,0.10), 0 14px 32px -18px rgba(0,0,0,0.75), 0 0 22px -10px rgba(0,229,255,0.35)"
                    : "none",
                transform: hover ? "translateY(-2px)" : "translateY(0)",
                opacity: shown ? 1 : 0,
                transition: [
                    "border-color 180ms",
                    "box-shadow 220ms",
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
                    <InvCoverFallback cat={item.category} />
                )}

                {/* Category badge */}
                <span className="absolute top-2.5 left-2.5 z-10 pointer-events-none">
                    <CatBadge cat={item.category} />
                </span>

                {/* Consumable flag */}
                {item.is_consumable && !canManage && (
                    <span
                        className="absolute top-2.5 right-2.5 z-10 pointer-events-none font-mono text-[9px] uppercase tracking-[0.14em] h-[18px] px-1.5 rounded-sm border"
                        style={{ color: "#f59e0b", borderColor: "rgba(245,158,11,0.45)", background: "rgba(7,9,15,0.85)" }}
                    >
                        CONSUMABLE
                    </span>
                )}

                {/* Manager: edit/delete on hover */}
                {canManage && hover && (
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-20">
                        <button
                            onClick={() => onEdit(item)}
                            className="grid place-items-center w-7 h-7 rounded-sm border text-[#00e5ff] transition-colors"
                            style={{ background: "rgba(7,9,15,0.85)", borderColor: "rgba(0,229,255,0.55)" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,229,255,0.15)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "rgba(7,9,15,0.85)")}
                            aria-label="Edit"
                        >
                            <Pencil size={12} />
                        </button>
                        <button
                            onClick={() => onDelete(item)}
                            className="grid place-items-center w-7 h-7 rounded-sm border text-[#ef4444] transition-colors"
                            style={{ background: "rgba(7,9,15,0.85)", borderColor: "rgba(239,68,68,0.55)" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "rgba(239,68,68,0.15)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "rgba(7,9,15,0.85)")}
                            aria-label="Delete"
                        >
                            <Trash2 size={12} />
                        </button>
                    </div>
                )}
            </div>

            {/* Body */}
            <div className="p-3 flex flex-col flex-1">
                <div className="font-sans font-semibold text-[#f0f4ff] text-[14px] tracking-tight leading-snug">
                    {item.name}
                </div>
                <p
                    className="text-[#8b9ab0] text-[12px] mt-1 leading-relaxed flex-1 overflow-hidden"
                    style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" } as React.CSSProperties}
                >
                    {item.description ?? ""}
                </p>

                {/* Availability */}
                <div className="flex items-center gap-2 mt-3 mb-3">
                    <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{
                            background: isAvail ? "#22c55e" : "#ef4444",
                            boxShadow: isAvail ? "0 0 6px #22c55e" : "0 0 6px #ef4444",
                        }}
                    />
                    <span
                        className="font-mono text-[10.5px] uppercase tracking-[0.14em]"
                        style={{ color: isAvail ? "#22c55e" : "#ef4444" }}
                    >
                        {isAvail ? "Available" : "Not Available"}
                    </span>
                    {canViewExact && (
                        <span className="font-mono text-[10px] text-[#4a5568] ml-1 tabular-nums">
                            ({item.available_quantity}/{item.total_quantity})
                        </span>
                    )}
                </div>

                {/* CTA */}
                {inCart ? (
                    <div
                        className="h-8 flex items-center justify-center gap-1.5 rounded-sm border font-mono text-[11px] uppercase tracking-[0.14em]"
                        style={{ color: "#22c55e", borderColor: "rgba(34,197,94,0.45)", background: "rgba(34,197,94,0.06)" }}
                    >
                        <Check size={13} /> In Cart
                    </div>
                ) : (
                    <button
                        onClick={() => isAvail && onAdd(item)}
                        disabled={!isAvail}
                        className="w-full h-8 inline-flex items-center justify-center gap-1.5 rounded-sm font-mono text-[11px] uppercase tracking-[0.14em] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ background: "#00e5ff", color: "#07090f" }}
                    >
                        <ShoppingCart size={12} /> Add to Cart
                    </button>
                )}
            </div>
        </div>
    );
}

/* ─── Filter pills ────────────────────────────────────────────────── */

function InvFilterPills({ value, onChange, counts }: {
    value: string; onChange: (k: string) => void; counts: Record<string, number>;
}) {
    const wrapRef = useRef<HTMLDivElement>(null);
    const btnRefs = useRef<Record<string, HTMLLabelElement | null>>({});
    const [bar, setBar] = useState({ x: 0, w: 0, ready: false });

    const measureRef = useRef<() => void>(() => {});
    const measure = () => {
        const el = btnRefs.current[value];
        const wrap = wrapRef.current;
        if (!el || !wrap) return;
        const er = el.getBoundingClientRect();
        const wr = wrap.getBoundingClientRect();
        setBar({ x: er.left - wr.left, w: er.width, ready: true });
    };
    measureRef.current = measure;

    useIsomorphicLayoutEffect(() => { measure(); }, [value]);
    useEffect(() => {
        const ro = new ResizeObserver(() => measureRef.current());
        if (wrapRef.current) ro.observe(wrapRef.current);
        return () => ro.disconnect();
    }, []);

    return (
        <div 
            className="cir-tabs relative max-w-full overflow-x-auto"
            ref={wrapRef}
            style={{ 
                background: "rgba(13,17,23,0.8)", 
                backdropFilter: "blur(8px)", 
                borderColor: "rgba(0,229,255,0.15)",
                scrollbarWidth: "none",
                msOverflowStyle: "none",
            }}
        >
            <style>{`
                .cir-tabs::-webkit-scrollbar { display: none; }
            `}</style>

            {/* Sliding Pill Background */}
            <div 
                className="absolute rounded-full pointer-events-none"
                style={{
                    top: "6px",
                    left: 0,
                    height: "36px",
                    transform: `translateX(${bar.x - 1}px)`,
                    width: bar.w,
                    opacity: bar.ready ? 1 : 0,
                    background: "#00e5ff",
                    boxShadow: "0 1px 1px rgba(0,229,255,0.06), 0 8px 18px -10px rgba(0,229,255,0.5)",
                    transition: "transform 250ms cubic-bezier(0.22, 1, 0.36, 1), width 250ms cubic-bezier(0.22, 1, 0.36, 1), opacity 200ms",
                }}
            />

            {CATEGORIES.map(f => {
                const active = value === f.key;
                const Icon = f.Icon;
                return (
                    <label 
                        key={f.key} 
                        className="relative inline-flex mb-0 cursor-pointer z-10" 
                        title={f.label}
                        ref={(el) => { btnRefs.current[f.key] = el; }}
                    >
                        <input
                            type="radio"
                            className="cir-tabs__r"
                            name="invCatFilter"
                            value={f.key}
                            checked={active}
                            onChange={() => onChange(f.key)}
                            aria-label={f.label}
                        />
                        <span 
                            className="cir-tabs__t transition-colors duration-200 !px-4 !bg-transparent flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] whitespace-nowrap"
                        >
                            <Icon size={12} />
                            <span>{f.label}</span>
                            <span
                                className="font-mono text-[9.5px] tabular-nums transition-colors duration-200"
                                style={{ color: active ? "rgba(0,0,0,0.6)" : "#4a5568" }}
                            >
                                {String(counts[f.key] ?? 0).padStart(2, "0")}
                            </span>
                        </span>
                    </label>
                );
            })}
        </div>
    );
}

/* ─── Add-to-cart modal ───────────────────────────────────────────── */

function AddToCartModal({ item, onClose, onConfirm }: {
    item: InventoryItem;
    onClose: () => void;
    onConfirm: (cartItem: CartItem) => void;
}) {
    const [qty, setQty] = useState(1);
    const [usage, setUsage] = useState<"borrow" | "permanent">("borrow");
    const [anim, setAnim] = useState(false);

    useEffect(() => {
        const id = requestAnimationFrame(() => setAnim(true));
        return () => cancelAnimationFrame(id);
    }, []);

    useEffect(() => {
        const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", fn);
        return () => window.removeEventListener("keydown", fn);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-[110]" style={{ animation: "fadeIn 160ms ease-out" }}>
            <div className="absolute inset-0 backdrop-blur-md" style={{ background: "rgba(7,9,15,0.80)" }} onClick={onClose} />
            <div className="absolute inset-0 grid place-items-center p-4 sm:p-6">
                <div
                    className="relative w-full max-w-md rounded-md shadow-2xl corner-ticks"
                    style={{
                        background: "rgba(17,24,32,0.95)",
                        backdropFilter: "blur(16px)",
                        border: "1px solid rgba(0,229,255,0.28)",
                        transform: anim ? "scale(1) translateY(0)" : "scale(0.94) translateY(10px)",
                        opacity: anim ? 1 : 0,
                        transition: "transform 300ms cubic-bezier(.34,1.56,.64,1), opacity 220ms ease-out",
                    }}
                >
                    {/* Header */}
                    <div className="px-5 h-12 flex items-center justify-between border-b" style={{ borderColor: "rgba(0,229,255,0.12)", background: "rgba(7,9,15,0.40)" }}>
                        <div className="flex items-center gap-2.5">
                            <CatBadge cat={item.category} />
                            <span className="font-sans font-semibold text-[#f0f4ff] text-[14px] tracking-tight truncate max-w-[220px]">
                                {item.name}
                            </span>
                        </div>
                        <button
                            onClick={onClose}
                            className="grid place-items-center w-8 h-8 rounded-sm border border-[rgba(0,229,255,0.14)] text-[#8b9ab0] hover:text-white transition-all hover:bg-[#ef4444] hover:border-[#ef4444]"
                        >
                            <X size={14} />
                        </button>
                    </div>

                    <div className="p-5 space-y-4">
                        <div>
                            <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8b9ab0] mb-2">QUANTITY</div>
                            <div className="flex items-center gap-4">
                                <QtyStepper value={qty} onChange={setQty} min={1} max={item.available_quantity} />
                                <span className="font-mono text-[11px] text-[#8b9ab0] tracking-[0.10em]">
                                    {item.available_quantity} available
                                </span>
                            </div>
                        </div>
                        <div>
                            <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8b9ab0] mb-2">USAGE TYPE</div>
                            <UsageToggle value={usage} onChange={setUsage} />
                        </div>
                        {item.required_safety_certification && (
                            <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-md border"
                                style={{ borderColor: "rgba(245,158,11,0.40)", background: "rgba(245,158,11,0.06)" }}>
                                <ShieldCheck size={14} className="text-[#f59e0b] shrink-0 mt-px" />
                                <div className="text-[12px] text-[#f59e0b] leading-snug">
                                    Cert required: {item.required_safety_certification}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="px-5 h-14 flex items-center justify-end gap-2 border-t" style={{ borderColor: "rgba(0,229,255,0.12)", background: "rgba(7,9,15,0.40)" }}>
                        <button
                            onClick={onClose}
                            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-sm border font-mono text-[11px] uppercase tracking-[0.12em] text-[#8b9ab0] transition-all hover:text-[#f0f4ff]"
                            style={{ borderColor: "rgba(0,229,255,0.14)", background: "transparent" }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => { onConfirm({ item, quantity: qty, requestType: usage }); onClose(); }}
                            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-sm font-mono text-[11px] uppercase tracking-[0.14em] transition-all"
                            style={{ background: "#00e5ff", color: "#07090f" }}
                        >
                            <ShoppingCart size={13} /> Add to Cart
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ─── Cart Drawer ─────────────────────────────────────────────────── */

function CartDrawer({ open, onClose, cart, onUpdateQty, onChangeType, onRemove, onSubmit, submitting, submitError, submitSuccess }: {
    open: boolean;
    onClose: () => void;
    cart: CartItem[];
    onUpdateQty: (id: string, qty: number) => void;
    onChangeType: (id: string, type: "borrow" | "permanent") => void;
    onRemove: (id: string) => void;
    onSubmit: (reason: string) => void;
    submitting: boolean;
    submitError: string | null;
    submitSuccess: boolean;
}) {
    const [reason, setReason] = useState("");

    return (
        <>
            {open && (
                <div
                    className="fixed inset-0 z-[90] backdrop-blur-sm"
                    style={{ background: "rgba(7,9,15,0.60)" }}
                    onClick={onClose}
                />
            )}
            <div
                className="fixed top-0 right-0 bottom-0 z-[91] flex flex-col"
                style={{
                    width: "100%",
                    maxWidth: 380,
                    background: "#0d1117",
                    borderLeft: "1px solid rgba(0,229,255,0.18)",
                    boxShadow: "-8px 0 32px rgba(0,0,0,0.55)",
                    transform: open ? "translateX(0)" : "translateX(100%)",
                    transition: "transform 280ms cubic-bezier(.5,.05,.2,1)",
                }}
            >
                {/* Header */}
                <div
                    className="h-14 px-5 flex items-center gap-3 border-b shrink-0"
                    style={{ borderColor: "rgba(0,229,255,0.12)", background: "rgba(7,9,15,0.60)" }}
                >
                    <ShoppingCart size={16} className="text-[#00e5ff]" />
                    <h3 className="font-sans font-bold text-[#f0f4ff] text-[16px] tracking-tight flex-1">Cart</h3>
                    {cart.length > 0 && (
                        <span
                            className="font-mono text-[10.5px] tabular-nums px-2 h-5 grid place-items-center rounded-sm"
                            style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.50)", color: "#f59e0b" }}
                        >
                            {cart.length} ITEM{cart.length !== 1 ? "S" : ""}
                        </span>
                    )}
                    <button
                        onClick={onClose}
                        className="grid place-items-center w-8 h-8 rounded-sm border border-[rgba(0,229,255,0.14)] text-[#8b9ab0] hover:text-white transition-all hover:bg-[#ef4444] hover:border-[#ef4444]"
                    >
                        <X size={14} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 min-h-0 overflow-y-auto">
                    {submitSuccess ? (
                        <div className="flex flex-col items-center justify-center h-full gap-3 px-6">
                            <div
                                className="w-14 h-14 grid place-items-center rounded-full"
                                style={{ border: "1px solid rgba(34,197,94,0.50)", background: "rgba(34,197,94,0.10)", boxShadow: "0 0 28px -6px rgba(34,197,94,0.6)" }}
                            >
                                <CheckCircle2 size={26} className="text-[#22c55e]" />
                            </div>
                            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#22c55e]">
                                // REQUEST SUBMITTED
                            </div>
                            <p className="text-[#8b9ab0] text-[13px] text-center leading-relaxed">
                                Your equipment request has been sent for review. You&apos;ll be notified when it&apos;s processed.
                            </p>
                        </div>
                    ) : cart.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
                            <ShoppingCart size={28} className="text-[#4a5568]" />
                            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#4a5568]">// CART EMPTY</div>
                        </div>
                    ) : (
                        <div className="divide-y" style={{ borderColor: "rgba(0,229,255,0.08)" }}>
                            {cart.map(ci => (
                                <div key={ci.item.id} className="p-4 space-y-2.5" style={{ borderColor: "rgba(0,229,255,0.08)" }}>
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <CatBadge cat={ci.item.category} />
                                            <div className="font-sans font-semibold text-[#f0f4ff] text-[13.5px] tracking-tight mt-1.5 truncate">
                                                {ci.item.name}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => onRemove(ci.item.id)}
                                            className="grid place-items-center w-7 h-7 rounded-sm border text-[#8b9ab0] hover:text-[#ef4444] transition-colors shrink-0"
                                            style={{ borderColor: "rgba(0,229,255,0.14)" }}
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <QtyStepper value={ci.quantity} onChange={v => onUpdateQty(ci.item.id, v)} min={1} max={ci.item.available_quantity} />
                                        <UsageToggle value={ci.requestType} onChange={v => onChangeType(ci.item.id, v)} small />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {!submitSuccess && (
                    <div className="border-t p-4 space-y-3 shrink-0" style={{ borderColor: "rgba(0,229,255,0.12)", background: "rgba(7,9,15,0.40)" }}>
                        {submitError && (
                            <div className="flex items-start gap-2 px-3 py-2 rounded-md border"
                                style={{ borderColor: "rgba(239,68,68,0.45)", background: "rgba(239,68,68,0.08)" }}>
                                <AlertCircle size={13} className="text-[#ef4444] shrink-0 mt-px" />
                                <span className="text-[12px] text-[#ef4444]">{submitError}</span>
                            </div>
                        )}
                        <div>
                            <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8b9ab0] mb-1.5">
                                REASON <span className="text-[#ef4444]">*</span>
                            </div>
                            <textarea
                                rows={3}
                                value={reason}
                                onChange={e => setReason(e.target.value)}
                                placeholder="Why do you need this equipment?"
                                className="w-full text-[12.5px] text-[#f0f4ff] placeholder:text-[#4a5568] rounded-md px-3 py-2 resize-none focus-cyan transition-shadow outline-none"
                                style={{ background: "#07090f", border: "1px solid rgba(0,229,255,0.14)" }}
                            />
                        </div>
                        <button
                            onClick={() => onSubmit(reason)}
                            disabled={submitting || !reason.trim() || cart.length === 0}
                            className="w-full h-10 inline-flex items-center justify-center gap-2 rounded-sm font-mono text-[11px] uppercase tracking-[0.14em] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            style={{ background: "#00e5ff", color: "#07090f" }}
                        >
                            {submitting ? (
                                <><Loader2 size={14} className="animate-spin" />Submitting…</>
                            ) : (
                                <><Send size={13} />Submit Request ({cart.length})</>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}

/* ─── Item Modal (add / edit) ─────────────────────────────────────── */

function ItemModal({ item, onClose, onSaved }: {
    item: InventoryItem | null;
    onClose: () => void;
    onSaved: () => void;
}) {
    const isEdit = !!item;
    const [anim, setAnim] = useState(false);
    const [name, setName] = useState(item?.name ?? "");
    const [description, setDescription] = useState(item?.description ?? "");
    const [category, setCategory] = useState(item?.category ?? "general");
    const [totalQty, setTotalQty] = useState(String(item?.total_quantity ?? 1));
    const [availQty, setAvailQty] = useState(String(item?.available_quantity ?? 1));
    const [imageUrl, setImageUrl] = useState(item?.image_url ?? "");
    const [safetyCert, setSafetyCert] = useState(item?.required_safety_certification ?? "");
    const [consumable, setConsumable] = useState(item?.is_consumable ?? false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        const id = requestAnimationFrame(() => setAnim(true));
        return () => cancelAnimationFrame(id);
    }, []);

    useEffect(() => {
        const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", fn);
        return () => window.removeEventListener("keydown", fn);
    }, [onClose]);

    const handleSave = async () => {
        if (!name.trim()) return;
        setLoading(true);
        setError(null);
        const supabase = createClient();
        const payload = {
            name: name.trim(),
            description: description.trim() || null,
            category,
            total_quantity: Number(totalQty) || 0,
            available_quantity: Number(availQty) || 0,
            image_url: imageUrl.trim() || null,
            required_safety_certification: safetyCert.trim() || null,
            is_consumable: consumable,
        };
        try {
            if (isEdit && item) {
                const { error: err } = await supabase.from("inventory_items").update(payload).eq("id", item.id);
                if (err) { setError(err.message); setLoading(false); return; }
            } else {
                const { error: err } = await supabase.from("inventory_items").insert(payload);
                if (err) { setError(err.message); setLoading(false); return; }
            }
            setSuccess(true);
            setLoading(false);
            setTimeout(() => { onSaved(); onClose(); }, 900);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Unexpected error");
            setLoading(false);
        }
    };

    const CATS_OPTS = CATEGORIES.filter(c => c.key !== "all");

    return (
        <div className="fixed inset-0 z-[120]" style={{ animation: "fadeIn 160ms ease-out" }}>
            <div className="absolute inset-0 backdrop-blur-md" style={{ background: "rgba(7,9,15,0.80)" }} onClick={onClose} />
            <div className="absolute inset-0 grid place-items-center p-4 sm:p-6 overflow-y-auto">
                <div
                    className="relative w-full max-w-2xl rounded-md shadow-2xl corner-ticks my-auto"
                    style={{
                        background: "rgba(17,24,32,0.95)",
                        backdropFilter: "blur(16px)",
                        border: "1px solid rgba(0,229,255,0.28)",
                        transform: anim ? "scale(1) translateY(0)" : "scale(0.94) translateY(10px)",
                        opacity: anim ? 1 : 0,
                        transition: "transform 320ms cubic-bezier(.34,1.56,.64,1), opacity 220ms ease-out",
                    }}
                >
                    {/* Header */}
                    <div className="px-5 h-12 flex items-center justify-between border-b" style={{ borderColor: "rgba(0,229,255,0.12)", background: "rgba(7,9,15,0.40)" }}>
                        <div className="flex items-center gap-2.5">
                            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#00e5ff", boxShadow: "0 0 6px #00e5ff" }} />
                            <div>
                                <div className="text-[#f0f4ff] text-[14px] font-semibold">
                                    {isEdit ? "Edit item" : "New inventory item"}
                                </div>
                                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8b9ab0] mt-0.5">
                                    INVENTORY · {isEdit ? "EDIT" : "CREATE"}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="grid place-items-center w-8 h-8 rounded-sm border border-[rgba(0,229,255,0.14)] text-[#8b9ab0] hover:text-white transition-all hover:bg-[#ef4444] hover:border-[#ef4444]"
                        >
                            <X size={14} />
                        </button>
                    </div>

                    <div className="p-5 space-y-4">
                        {success ? (
                            <div className="text-center py-8 flex flex-col items-center gap-3">
                                <CheckCircle2 size={32} className="text-[#22c55e]" />
                                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#22c55e]">
                                    {isEdit ? "// ITEM UPDATED" : "// ITEM ADDED"}
                                </p>
                            </div>
                        ) : (
                            <>
                                {error && (
                                    <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-md border"
                                        style={{ borderColor: "rgba(239,68,68,0.45)", background: "rgba(239,68,68,0.08)" }}>
                                        <AlertCircle size={14} className="text-[#ef4444] shrink-0 mt-px" />
                                        <span className="text-[12.5px] text-[#ef4444]">{error}</span>
                                    </div>
                                )}

                                {/* Name */}
                                <ModalField label="Item name">
                                    <ModalInput placeholder="ESP32-S3 Devkit" value={name} onChange={e => setName(e.target.value)} />
                                </ModalField>

                                {/* Description */}
                                <ModalField label="Description">
                                    <textarea
                                        rows={3}
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        placeholder="Describe the item, use case, and any restrictions…"
                                        className="w-full text-[13px] text-[#f0f4ff] placeholder:text-[#4a5568] rounded-md px-3 py-2.5 resize-none focus-cyan transition-shadow outline-none"
                                        style={{ background: "#07090f", border: "1px solid rgba(0,229,255,0.14)" }}
                                    />
                                </ModalField>

                                {/* Category + Qty row */}
                                <div className="grid grid-cols-12 gap-3">
                                    <ModalField label="Category" className="col-span-12 md:col-span-4">
                                        <select
                                            value={category}
                                            onChange={e => setCategory(e.target.value)}
                                            className="w-full h-10 text-[13px] text-[#f0f4ff] rounded-md px-3 focus-cyan transition-shadow outline-none appearance-none"
                                            style={{ background: "#07090f", border: "1px solid rgba(0,229,255,0.14)" }}
                                        >
                                            {CATS_OPTS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                                        </select>
                                    </ModalField>
                                    <ModalField label="Total qty" hint="TOTAL" className="col-span-6 md:col-span-4">
                                        <ModalInput icon={<Hash size={12} />} value={totalQty} onChange={e => setTotalQty(e.target.value)} />
                                    </ModalField>
                                    <ModalField label="Available qty" className="col-span-6 md:col-span-4">
                                        <ModalInput icon={<Hash size={12} />} value={availQty} onChange={e => setAvailQty(e.target.value)} />
                                    </ModalField>
                                </div>

                                {/* Image URL */}
                                <ModalField label="Image URL" hint="OPTIONAL">
                                    <ModalInput icon={<Link2 size={12} />} placeholder="https://…/photo.jpg" value={imageUrl} onChange={e => setImageUrl(e.target.value)} />
                                </ModalField>

                                {/* Safety cert */}
                                <ModalField label="Safety certification" hint="OPTIONAL">
                                    <ModalInput icon={<ShieldCheck size={12} />} placeholder="e.g. Bay-A briefing required" value={safetyCert} onChange={e => setSafetyCert(e.target.value)} />
                                </ModalField>

                                {/* Consumable toggle */}
                                <button
                                    type="button"
                                    onClick={() => setConsumable(c => !c)}
                                    className="w-full flex items-center justify-between gap-4 p-3 rounded-sm border transition-colors"
                                    style={{
                                        borderColor: consumable ? "rgba(245,158,11,0.5)" : "rgba(0,229,255,0.12)",
                                        background: consumable ? "rgba(245,158,11,0.06)" : "rgba(7,9,15,0.50)",
                                    }}
                                >
                                    <span className="flex items-center gap-3">
                                        <PackageOpen size={14} style={{ color: consumable ? "#f59e0b" : "#4a5568" }} />
                                        <span>
                                            <span className="block font-sans font-semibold text-[13.5px] tracking-tight" style={{ color: consumable ? "#f59e0b" : "#f0f4ff" }}>
                                                Consumable
                                            </span>
                                            <span className="block text-[11.5px] text-[#8b9ab0] mt-0.5">
                                                Item is used up on checkout — cannot be returned
                                            </span>
                                        </span>
                                    </span>
                                    <span
                                        className="relative w-10 h-6 rounded-full transition-colors shrink-0"
                                        style={{ background: consumable ? "#f59e0b" : "rgba(139,154,176,0.25)" }}
                                    >
                                        <span
                                            className="absolute top-[3px] w-[18px] h-[18px] rounded-full transition-all"
                                            style={{
                                                background: "#07090f",
                                                left: consumable ? 20 : 3,
                                                boxShadow: consumable ? "0 0 10px rgba(245,158,11,0.7)" : "none",
                                            }}
                                        />
                                    </span>
                                </button>
                            </>
                        )}
                    </div>

                    {!success && (
                        <div className="px-5 h-14 flex items-center justify-end gap-2 border-t" style={{ borderColor: "rgba(0,229,255,0.12)", background: "rgba(7,9,15,0.40)" }}>
                            <button
                                onClick={onClose}
                                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-sm border font-mono text-[11px] uppercase tracking-[0.12em] text-[#8b9ab0] hover:text-[#f0f4ff] transition-colors"
                                style={{ borderColor: "rgba(0,229,255,0.14)" }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={!name.trim() || loading}
                                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-sm font-mono text-[11px] uppercase tracking-[0.14em] transition-all disabled:opacity-40"
                                style={{ background: "#00e5ff", color: "#07090f" }}
                            >
                                {loading ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                                {isEdit ? "Save changes" : "Add to inventory"}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ─── Modal helper components ─────────────────────────────────────── */

function ModalField({ label, hint, children, className }: {
    label: string; hint?: string; children: React.ReactNode; className?: string;
}) {
    return (
        <div className={className}>
            <div className="flex items-end justify-between mb-1.5">
                <label className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8b9ab0]">
                    <span style={{ color: "rgba(0,229,255,0.70)" }}>$</span> {label}
                </label>
                {hint && <span className="font-mono text-[9.5px] text-[#4a5568] tracking-[0.06em]">{hint}</span>}
            </div>
            {children}
        </div>
    );
}

function ModalInput({ icon, placeholder, value, onChange }: {
    icon?: React.ReactNode;
    placeholder?: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
    return (
        <div className="relative">
            {icon && (
                <span className="absolute inset-y-0 left-0 grid place-items-center w-9 text-[#4a5568] pointer-events-none">
                    {icon}
                </span>
            )}
            <input
                type="text"
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                className={`w-full h-10 text-[13px] text-[#f0f4ff] placeholder:text-[#4a5568] rounded-md focus-cyan transition-shadow outline-none ${icon ? "pl-9 pr-3" : "px-3"}`}
                style={{ background: "#07090f", border: "1px solid rgba(0,229,255,0.14)" }}
            />
        </div>
    );
}

/* ─── Main page ───────────────────────────────────────────────────── */

export default function InventoryPage() {
    const { isAuthenticated, isFaculty, isModerator, isInventoryManager, loading: userLoading } = useUser();
    const canManage = isFaculty || isModerator || isInventoryManager;
    const canViewExact = isStockVisibleToUser({ isFaculty, isModerator, isInventoryManager });
    const supabase = createClient();
    const googleSheetUrl = process.env.NEXT_PUBLIC_GOOGLE_SHEET_URL?.trim() || null;

    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [catFilter, setCatFilter] = useState("all");
    const [shown, setShown] = useState(false);
    const [syncMessage, setSyncMessage] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [isSyncPending, startSyncTransition] = useTransition();

    // Modal state
    const [editItem, setEditItem] = useState<InventoryItem | null | undefined>(undefined); // undefined = closed
    const [addToCartItem, setAddToCartItem] = useState<InventoryItem | null>(null);

    // Cart state
    const [cart, setCart] = useState<CartItem[]>([]);
    const [cartOpen, setCartOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [submitSuccess, setSubmitSuccess] = useState(false);

    const [t, setT] = useState(0);
    useEffect(() => {
        let raf: number;
        const start = performance.now();
        const tick = () => {
            setT((performance.now() - start) / 1000);
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, []);

    const drift = (k: number): string =>
        `translate(${Math.sin(t * 0.08 + k) * 6}px, ${Math.cos(t * 0.07 + k * 1.3) * 4}px)`;

    useEffect(() => { setCart(loadCart()); }, []);
    useEffect(() => { saveCart(cart); }, [cart]);

    const fetchItems = useCallback(async () => {
        const { data } = await supabase.from("inventory_items").select("*").order("name");
        if (data) setItems(data);
        setLoading(false);
    }, [supabase]);

    useEffect(() => { void fetchItems(); }, [fetchItems]);

    // Staggered reveal on filter/search change
    useEffect(() => {
        setShown(false);
        const id = setTimeout(() => setShown(true), 60);
        return () => clearTimeout(id);
    }, [catFilter, search]);

    useEffect(() => {
        const id = setTimeout(() => setShown(true), 60);
        return () => clearTimeout(id);
    }, []);

    const counts = useMemo(() => {
        const c: Record<string, number> = { all: items.length };
        items.forEach(it => { c[it.category] = (c[it.category] ?? 0) + 1; });
        return c;
    }, [items]);

    const filtered = useMemo(() => {
        let list = catFilter === "all" ? items : items.filter(it => it.category === catFilter);
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(it =>
                it.name.toLowerCase().includes(q) || it.description?.toLowerCase().includes(q)
            );
        }
        return list;
    }, [items, catFilter, search]);

    const cartIds = useMemo(() => new Set(cart.map(c => c.item.id)), [cart]);

    const handleDelete = async (item: InventoryItem) => {
        if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
        setActionError(null);
        await supabase.from("inventory_items").delete().eq("id", item.id);
        setItems(prev => prev.filter(i => i.id !== item.id));
    };

    const handleSheetSync = () => {
        setActionError(null);
        setSyncMessage(null);
        startSyncTransition(async () => {
            const result = await syncInventoryStocksToGoogleSheets();
            if (!result.ok) { setActionError(result.error); return; }
            setSyncMessage(`Synced ${result.count} row${result.count === 1 ? "" : "s"} to Google Sheets.`);
        });
    };

    const addToCart = (cartItem: CartItem) => {
        setCart(prev => {
            const ex = prev.find(c => c.item.id === cartItem.item.id);
            return ex
                ? prev.map(c => c.item.id === cartItem.item.id ? { ...c, quantity: cartItem.quantity, requestType: cartItem.requestType } : c)
                : [...prev, cartItem];
        });
    };

    const handleSubmitCart = async (reason: string) => {
        if (!reason.trim() || cart.length === 0) return;
        setSubmitting(true);
        setSubmitError(null);
        const result = await submitEquipmentCart({
            items: cart.map(c => ({ itemId: c.item.id, quantity: c.quantity, requestType: c.requestType })),
            reason: reason.trim(),
        });
        if (!result.ok) { setSubmitError(result.error); setSubmitting(false); return; }
        setSubmitSuccess(true);
        setSubmitting(false);
        setCart([]);
        saveCart([]);
        setTimeout(() => { setCartOpen(false); setSubmitSuccess(false); void fetchItems(); }, 2000);
    };

    if (userLoading || loading) return <VajraLoader fullPage />;

    return (
        <div className="min-h-screen relative overflow-hidden bg-[#07090f]">
            {/* Grid Background */}
            <div
                className="absolute inset-0 pointer-events-none z-0 animate-grid-pan"
                style={{
                    backgroundImage:
                        "linear-gradient(rgba(0,229,255,0.04) 1px, transparent 1px)," +
                        "linear-gradient(90deg, rgba(0,229,255,0.04) 1px, transparent 1px)",
                    backgroundSize: "40px 40px",
                    maskImage:
                        "radial-gradient(ellipse 80% 70% at 50% 50%, #000 30%, transparent 90%)",
                    WebkitMaskImage:
                        "radial-gradient(ellipse 80% 70% at 50% 50%, #000 30%, transparent 90%)",
                }}
            />
            
            {/* Radial cyan glows — bottom-left large, top-right smaller */}
            <div
                className="absolute -bottom-32 -left-32 w-[640px] h-[640px] pointer-events-none z-0"
                style={{
                    background: "radial-gradient(circle, rgba(0,229,255,0.13) 0%, transparent 70%)",
                }}
            />
            <div
                className="absolute -top-40 -right-40 w-[560px] h-[560px] pointer-events-none z-0"
                style={{
                    background: "radial-gradient(circle, rgba(0,229,255,0.08) 0%, transparent 70%)",
                }}
            />

            {/* Scanlines */}
            <div className="absolute inset-0 pointer-events-none scanline animate-scanline-pan opacity-50 z-0" />
            
            {/* Circuit-trace SVG decorations — 3 shapes, slow sine/cosine drift */}
            <div
                className="absolute top-[6%] right-[-4%] w-[42vw] h-[40vh] pointer-events-none z-0"
                style={{ opacity: 0.06, transform: drift(0) }}
            >
                <CircuitTrace which={0} className="w-full h-full" />
            </div>
            <div
                className="absolute bottom-[12%] left-[-4%] w-[36vw] h-[44vh] pointer-events-none z-0"
                style={{ opacity: 0.06, transform: drift(2) }}
            >
                <CircuitTrace which={1} className="w-full h-full" />
            </div>
            <div
                className="absolute top-[44%] right-[10%] w-[26vw] h-[28vh] pointer-events-none z-0"
                style={{ opacity: 0.05, transform: drift(4) }}
            >
                <CircuitTrace which={2} className="w-full h-full" />
            </div>

            <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-8 pt-8 pb-16">
                {/* Page header */}
            <div className="mb-7">
                <h1 className="font-sans font-extrabold tracking-tight text-[#f0f4ff] text-[36px] leading-none">
                    Inventory
                </h1>
                <p className="text-[#8b9ab0] text-[13.5px] mt-2 max-w-[64ch]">
                    Live SKU index. Check out parts, submit requests, track availability.
                </p>
            </div>

            {/* Feedback banners */}
            {actionError && (
                <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-md border text-[13px]"
                    style={{ borderColor: "rgba(239,68,68,0.45)", background: "rgba(239,68,68,0.08)", color: "#ef4444" }}>
                    <AlertCircle size={14} className="shrink-0" />{actionError}
                </div>
            )}
            {syncMessage && (
                <div className="mb-4 px-4 py-3 rounded-md border text-[13px]"
                    style={{ borderColor: "rgba(0,229,255,0.28)", background: "rgba(0,229,255,0.06)", color: "#00e5ff" }}>
                    {syncMessage}
                </div>
            )}

            {/* Controls row */}
            <div className="flex items-center gap-3 mb-5 flex-wrap">
                {/* Search */}
                <div className="relative w-full sm:flex-1 sm:max-w-sm">
                    <span className="absolute inset-y-0 left-0 grid place-items-center w-9 text-[#8b9ab0] pointer-events-none">
                        <Search size={14} />
                    </span>
                    <input
                        type="text"
                        placeholder="Search items…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full h-9 text-[13px] text-[#f0f4ff] placeholder:text-[#4a5568] rounded-md focus-cyan transition-shadow pl-9 pr-3 outline-none"
                        style={{ background: "#0d1117", border: "1px solid rgba(0,229,255,0.14)" }}
                    />
                </div>

                <div className="hidden sm:block sm:flex-1" />

                {/* Manager actions */}
                {canManage && (
                    <>
                        <button
                            onClick={handleSheetSync}
                            disabled={isSyncPending || !googleSheetUrl}
                            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-sm border font-mono text-[11px] uppercase tracking-[0.12em] text-[#8b9ab0] hover:text-[#f0f4ff] transition-all disabled:opacity-40"
                            style={{ borderColor: "rgba(0,229,255,0.14)", background: "transparent" }}
                        >
                            <RefreshCw size={12} className={isSyncPending ? "animate-spin" : ""} />
                            Sync
                        </button>
                        <a
                            href={googleSheetUrl ?? "#"}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-sm border font-mono text-[11px] uppercase tracking-[0.12em] text-[#8b9ab0] hover:text-[#f0f4ff] transition-all"
                            style={{ borderColor: "rgba(0,229,255,0.14)", background: "transparent" }}
                        >
                            <ExternalLink size={12} /> Sheet
                        </a>
                        <button
                            onClick={() => setEditItem(null)}
                            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-sm font-mono text-[11px] uppercase tracking-[0.14em] transition-all"
                            style={{ background: "#00e5ff", color: "#07090f" }}
                        >
                            <Plus size={13} /> Add Item
                        </button>
                    </>
                )}

                {/* Cart button */}
                {isAuthenticated && (
                    <button
                        onClick={() => { setCartOpen(true); setSubmitError(null); }}
                        className="relative grid place-items-center w-9 h-9 rounded-sm border text-[#8b9ab0] hover:text-[#00e5ff] transition-colors"
                        style={{ borderColor: "rgba(0,229,255,0.14)" }}
                        onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0,229,255,0.45)")}
                        onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0,229,255,0.14)")}
                    >
                        <ShoppingCart size={15} />
                        {cart.length > 0 && (
                            <span
                                className="absolute -top-1.5 -right-1.5 grid place-items-center min-w-[18px] h-[18px] px-1 rounded-sm font-mono text-[9.5px] font-semibold tabular-nums"
                                style={{ background: "#f59e0b", color: "#07090f", boxShadow: "0 0 0 1.5px #07090f, 0 0 8px rgba(245,158,11,0.7)" }}
                            >
                                {cart.length}
                            </span>
                        )}
                    </button>
                )}
            </div>

            {/* Filter pills */}
            <div className="mb-5">
                <InvFilterPills value={catFilter} onChange={v => setCatFilter(v)} counts={counts} />
            </div>

            {/* Meta strip */}
            <div className="flex items-center justify-between mb-5 font-mono text-[10.5px] uppercase tracking-[0.18em] text-[#8b9ab0]">
                <div className="flex items-center gap-3">
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#22c55e", boxShadow: "0 0 6px #22c55e" }} />
                    <span>{String(filtered.length).padStart(2, "0")} of {String(items.length).padStart(2, "0")} items</span>
                </div>
                <span className="text-[#4a5568] hidden md:block">// last sync 12s ago</span>
            </div>

            {/* Grid */}
            {filtered.length === 0 ? (
                <div
                    className="relative border border-dashed rounded-md overflow-hidden corner-ticks"
                    style={{ borderColor: "rgba(0,229,255,0.15)", background: "rgba(13,17,23,0.40)" }}
                >
                    <div className="relative text-center py-16 px-6">
                        <div
                            className="mx-auto w-14 h-14 grid place-items-center border rounded-md text-[#4a5568] mb-4"
                            style={{ borderColor: "rgba(0,229,255,0.18)", background: "#07090f" }}
                        >
                            <PackageOpen size={22} />
                        </div>
                        <h3 className="text-[#f0f4ff] font-bold text-[18px] tracking-tight">No items found</h3>
                        <p className="text-[#8b9ab0] text-[13px] mt-1.5 max-w-[42ch] mx-auto leading-relaxed">
                            {catFilter !== "all" || search
                                ? "No items match that filter or search. Try clearing them."
                                : "The inventory vault is empty."}
                        </p>
                        {(catFilter !== "all" || search) && (
                            <div className="mt-5">
                                <button
                                    onClick={() => { setCatFilter("all"); setSearch(""); }}
                                    className="inline-flex items-center gap-2 h-9 px-4 rounded-sm font-mono text-[11px] uppercase tracking-[0.14em]"
                                    style={{ background: "#00e5ff", color: "#07090f" }}
                                >
                                    <LayoutGrid size={13} /> Show all items
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filtered.map((item, i) => (
                        <InvCard
                            key={item.id}
                            item={item}
                            inCart={cartIds.has(item.id)}
                            canManage={canManage}
                            canViewExact={canViewExact}
                            shown={shown}
                            delay={Math.min(i, 14) * 35}
                            onAdd={setAddToCartItem}
                            onEdit={setEditItem}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            )}

            {/* Add-to-cart modal */}
            {addToCartItem && (
                <AddToCartModal
                    item={addToCartItem}
                    onClose={() => setAddToCartItem(null)}
                    onConfirm={addToCart}
                />
            )}

            {/* Cart drawer */}
            <CartDrawer
                open={cartOpen}
                onClose={() => { setCartOpen(false); setSubmitSuccess(false); }}
                cart={cart}
                onUpdateQty={(id, qty) => setCart(prev => prev.map(c => c.item.id === id ? { ...c, quantity: qty } : c))}
                onChangeType={(id, type) => setCart(prev => prev.map(c => c.item.id === id ? { ...c, requestType: type } : c))}
                onRemove={id => setCart(prev => prev.filter(c => c.item.id !== id))}
                onSubmit={handleSubmitCart}
                submitting={submitting}
                submitError={submitError}
                submitSuccess={submitSuccess}
            />

            {/* Item add/edit modal */}
            {editItem !== undefined && (
                <ItemModal
                    item={editItem}
                    onClose={() => setEditItem(undefined)}
                    onSaved={fetchItems}
                />
            )}
        </div>
        </div>
    );
}

// ─── CircuitTrace ─────────────────────────────────────────────────────────────
type CircuitTraceProps = {
  which?: number;
  className?: string;
  style?: React.CSSProperties;
};

function CircuitTrace({ which = 0, className = "", style }: CircuitTraceProps) {
  const paths = [
    {
      viewBox: "0 0 600 400",
      d: [
        "M 0 200 L 120 200 L 140 220 L 280 220 L 300 240 L 600 240",
        "M 80 200 L 80 60  M 240 220 L 240 100",
        "M 380 240 L 380 360",
      ],
      nodes: [
        [120, 200], [280, 220], [80, 60], [240, 100], [380, 360],
      ] as [number, number][],
    },
    {
      viewBox: "0 0 500 400",
      d: [
        "M 500 80 L 380 80 L 360 100 L 220 100 L 200 120 L 80 120 L 0 120",
        "M 360 100 L 360 240",
        "M 200 120 L 200 300 L 0 300",
        "M 100 120 L 100 60",
      ],
      nodes: [
        [380, 80], [220, 100], [80, 120], [360, 240], [200, 300], [100, 60],
      ] as [number, number][],
    },
    {
      viewBox: "0 0 400 300",
      d: [
        "M 0 50 L 80 50 L 90 60 L 200 60 L 210 70 L 320 70 L 330 80 L 400 80",
        "M 0 200 L 120 200 L 130 210 L 280 210 L 290 220 L 400 220",
        "M 200 60 L 200 200 M 290 220 L 290 80",
      ],
      nodes: [
        [80, 50], [200, 60], [320, 70], [120, 200], [280, 210],
      ] as [number, number][],
    },
  ];

  const p = paths[which % paths.length];
  return (
    <svg
      className={className}
      style={style}
      viewBox={p.viewBox}
      preserveAspectRatio="none"
      fill="none"
      stroke="#00e5ff"
      strokeWidth="1.2"
    >
      {p.d.map((d, i) => (
        <path key={i} d={d} />
      ))}
      {p.nodes.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="2.5" fill="#00e5ff" />
      ))}
    </svg>
  );
}
