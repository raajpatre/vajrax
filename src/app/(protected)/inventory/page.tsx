"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/useUser";
import VajraLoader from "@/components/ui/VajraLoader";
import {
    Package,
    Search,
    Loader2,
    Box,
    Cpu,
    Wrench,
    Battery,
    Cog,
    CircuitBoard,
    AlertCircle,
    CheckCircle2,
    X,
    Send,
    Plus,
    Pencil,
    Trash2,
    Save,
    RefreshCw,
    Sheet,
    ExternalLink,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Tables } from "@/types/database";
import { LucideIcon } from "lucide-react";
import { submitEquipmentRequest } from "@/actions/equipment-requests";
import { syncInventoryStocksToGoogleSheets } from "@/actions/inventory-history";

type InventoryItem = Tables<"inventory_items">;

const CategoryIcon: Record<string, LucideIcon> = {
    microcontroller: CircuitBoard,
    motor: Cog,
    chassis: Box,
    tool: Wrench,
    battery: Battery,
    sensor: Cpu,
    cable: CircuitBoard,
    general: Package,
};

const categoryColors: Record<string, string> = {
    microcontroller: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
    motor: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    chassis: "text-stone-400 bg-stone-400/10 border-stone-400/20",
    tool: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    battery: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
    sensor: "text-violet-400 bg-violet-400/10 border-violet-400/20",
    cable: "text-pink-400 bg-pink-400/10 border-pink-400/20",
    general: "text-gray-400 bg-gray-400/10 border-gray-400/20",
};

const AVAILABLE_CATEGORIES = [
    "microcontroller",
    "motor",
    "sensor",
    "battery",
    "chassis",
    "tool",
    "cable",
    "general",
];

function isStockVisibleToUser(input: {
    isFaculty: boolean;
    isModerator: boolean;
    isInventoryManager: boolean;
}) {
    return input.isFaculty || input.isModerator || input.isInventoryManager;
}

function getInventoryAvailabilityMeta(item: InventoryItem, canViewExactAvailability: boolean) {
    const isVisibleToGeneralUsers = item.available_quantity > 2;
    const isAvailable = canViewExactAvailability ? item.available_quantity > 0 : isVisibleToGeneralUsers;

    return {
        isAvailable,
        label: canViewExactAvailability
            ? isAvailable
                ? `${item.available_quantity}/${item.total_quantity} available`
                : "Out of stock"
            : isAvailable
                ? "Available"
                : "Out of stock",
    };
}

// Add/Edit Modal
function ItemModal({
    item,
    onClose,
    onSaved,
}: {
    item: InventoryItem | null;
    onClose: () => void;
    onSaved: () => void;
}) {
    const isEdit = !!item;
    const [name, setName] = useState(item?.name || "");
    const [description, setDescription] = useState(item?.description || "");
    const [category, setCategory] = useState(item?.category || AVAILABLE_CATEGORIES[0]);
    const [totalQuantity, setTotalQuantity] = useState(item?.total_quantity || 1);
    const [availableQuantity, setAvailableQuantity] = useState(item?.available_quantity || 1);
    const [imageUrl, setImageUrl] = useState(item?.image_url || "");
    const [requiredSafetyCertification, setRequiredSafetyCertification] = useState(item?.required_safety_certification || "");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setLoading(true);
        setError(null);
        const supabase = createClient();

        const payload = {
            name: name.trim(),
            description: description.trim() || null,
            category,
            total_quantity: totalQuantity,
            available_quantity: availableQuantity,
            image_url: imageUrl.trim() || null,
            required_safety_certification: requiredSafetyCertification.trim() || null,
        };

        try {
            if (isEdit && item) {
                const { error: updateError } = await supabase
                    .from("inventory_items")
                    .update(payload)
                    .eq("id", item.id);
                if (updateError) {
                    setError(updateError.message);
                    setLoading(false);
                    return;
                }
            } else {
                const { error: insertError } = await supabase
                    .from("inventory_items")
                    .insert(payload);
                if (insertError) {
                    setError(insertError.message);
                    setLoading(false);
                    return;
                }
            }

            setSuccess(true);
            setLoading(false);
            setTimeout(() => {
                onSaved();
                onClose();
            }, 1000);
        } catch (err: any) {
            setError(err.message || "An unexpected error occurred");
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="glass-strong p-4 md:p-6 w-full max-w-lg relative z-10 max-h-[90vh] overflow-y-auto"
            >
                {success ? (
                    <div className="text-center py-8">
                        <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                        <h3 className="text-lg font-bold">
                            {isEdit ? "Item Updated!" : "Item Added!"}
                        </h3>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-lg font-bold">
                                {isEdit ? "Edit Item" : "Add Item"}
                            </h3>
                            <button onClick={onClose} className="text-text-muted hover:text-foreground transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="space-y-4">
                            {error && (
                                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                    {error}
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1.5">Name</label>
                                <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1.5">Description</label>
                                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 resize-none transition-all" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1.5">Category</label>
                                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary transition-all capitalize">
                                    {AVAILABLE_CATEGORIES.map((c) => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1.5">Total Qty</label>
                                    <input type="number" min={0} value={totalQuantity} onChange={(e) => setTotalQuantity(Number(e.target.value))} className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1.5">Available Qty</label>
                                    <input type="number" min={0} max={totalQuantity} value={availableQuantity} onChange={(e) => setAvailableQuantity(Number(e.target.value))} className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1.5">Required Safety Certification (optional)</label>
                                <input
                                    type="text"
                                    value={requiredSafetyCertification}
                                    onChange={(e) => setRequiredSafetyCertification(e.target.value)}
                                    placeholder="e.g. Laser Cutter Level 1"
                                    className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1.5">Item Image (optional)</label>
                                {imageUrl && (
                                    <div className="mb-3 overflow-hidden rounded-xl border border-border/70 bg-surface/40">
                                        <img
                                            src={imageUrl}
                                            alt={name || "Inventory item preview"}
                                            className="h-40 w-full object-cover"
                                        />
                                    </div>
                                )}
                                <input
                                    type="url"
                                    value={imageUrl}
                                    onChange={(e) => setImageUrl(e.target.value)}
                                    placeholder="https://..."
                                    className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                                />
                                {imageUrl && (
                                    <button
                                        type="button"
                                        onClick={() => setImageUrl("")}
                                        className="mt-3 btn-ghost text-sm !py-2.5 !px-4"
                                    >
                                        Remove Image
                                    </button>
                                )}
                            </div>
                            <button type="submit" disabled={loading || !name.trim()} className="btn-primary w-full !py-3 disabled:opacity-40">
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {isEdit ? "Save Changes" : "Add Item"}
                            </button>
                        </form>
                    </>
                )}
            </motion.div>
        </div>
    );
}

// Request modal
function RequestModal({
    item,
    canViewExactAvailability,
    onClose,
    onSubmitted,
}: {
    item: InventoryItem;
    canViewExactAvailability: boolean;
    onClose: () => void;
    onSubmitted: () => void;
}) {
    const { user } = useUser();
    const [quantity, setQuantity] = useState(1);
    const [reason, setReason] = useState("");
    const [requestType, setRequestType] = useState<"borrow" | "permanent">("borrow");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const availabilityMeta = getInventoryAvailabilityMeta(item, canViewExactAvailability);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !reason.trim()) return;

        setLoading(true);
        setError(null);

        const result = await submitEquipmentRequest({
            itemId: item.id,
            quantity,
            reason: reason.trim(),
            requestType,
        });

        if (!result.ok) {
            setError(result.error);
            setLoading(false);
            return;
        }

        setSuccess(true);
        setLoading(false);
        setTimeout(() => {
            onSubmitted();
            onClose();
        }, 1500);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-3 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center sm:p-4">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="glass-strong relative z-10 my-auto w-full max-w-md overflow-y-auto p-4 md:p-5 max-h-[calc(100dvh-max(1.5rem,env(safe-area-inset-top))-max(1.5rem,env(safe-area-inset-bottom)))] sm:p-4 md:p-6"
            >
                {success ? (
                    <div className="text-center py-8">
                        <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                        <h3 className="text-lg font-bold mb-1">Request Submitted!</h3>
                        <p className="text-sm text-text-secondary">
                            You&apos;ll be notified when it&apos;s reviewed.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-lg font-bold">Request Equipment</h3>
                            <button
                                onClick={onClose}
                                className="text-text-muted hover:text-foreground transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="glass p-3 mb-5 flex items-center gap-3">
                            <div
                                className={`w-10 h-10 flex-shrink-0 rounded-lg border flex items-center justify-center ${categoryColors[item.category] ||
                                    "text-text-muted bg-surface border-border"
                                    }`}
                            >
                                {(() => {
                                    const Icon = CategoryIcon[item.category] || Box;
                                    return <Icon className="w-5 h-5" />;
                                })()}
                            </div>
                            <div>
                                <p className="text-sm font-semibold">{item.name}</p>
                                <p
                                    className={`text-xs font-medium ${
                                        availabilityMeta.isAvailable ? "text-emerald-400" : "text-red-400"
                                    }`}
                                >
                                    {availabilityMeta.label}
                                </p>
                                {item.required_safety_certification && (
                                    <p className="text-[11px] text-amber-300 mt-1">
                                        Requires certification: <span className="font-semibold">{item.required_safety_certification}</span>
                                    </p>
                                )}
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                    {error}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                                    Quantity
                                </label>
                                <input
                                    type="number"
                                    min={1}
                                    max={item.available_quantity}
                                    value={quantity}
                                    onChange={(e) => setQuantity(Number(e.target.value))}
                                    className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                                    Usage Type
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setRequestType("borrow")}
                                        className={`px-3 py-2.5 rounded-xl text-xs font-medium border transition-all text-center ${
                                            requestType === "borrow"
                                                ? "bg-primary/20 text-primary-light border-primary/30"
                                                : "text-text-muted border-border hover:border-primary/20"
                                        }`}
                                    >
                                        🔄 Borrowing
                                        <span className="block text-[10px] text-text-muted mt-0.5">Will return after use</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setRequestType("permanent")}
                                        className={`px-3 py-2.5 rounded-xl text-xs font-medium border transition-all text-center ${
                                            requestType === "permanent"
                                                ? "bg-amber-400/20 text-amber-400 border-amber-400/30"
                                                : "text-text-muted border-border hover:border-amber-400/20"
                                        }`}
                                    >
                                        📌 Permanent Use
                                        <span className="block text-[10px] text-text-muted mt-0.5">For a project build</span>
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                                    Reason
                                </label>
                                <textarea
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    required
                                    rows={3}
                                    placeholder="Why do you need this equipment?"
                                    className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 resize-none transition-all"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !reason.trim() || quantity < 1}
                                className="btn-primary w-full !py-3 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                                ) : (
                                    <Send className="w-4 h-4 text-black" />
                                )}
                                Submit Request
                            </button>
                        </form>
                    </>
                )}
            </motion.div>
        </div>
    );
}

export default function InventoryPage() {
    const { isAuthenticated, isFaculty, isModerator, isInventoryManager, loading: userLoading } = useUser();
    const canManageInventory = isFaculty || isModerator || isInventoryManager;
    const canViewExactAvailability = isStockVisibleToUser({
        isFaculty,
        isModerator,
        isInventoryManager,
    });
    const supabase = createClient();
    const googleSheetUrl = process.env.NEXT_PUBLIC_GOOGLE_SHEET_URL?.trim() || null;
    const isGoogleSheetConfigured = Boolean(googleSheetUrl);

    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [requestItem, setRequestItem] = useState<InventoryItem | null>(null);
    const [editItem, setEditItem] = useState<InventoryItem | null | undefined>(undefined);
    const [actionError, setActionError] = useState<string | null>(null);
    const [syncMessage, setSyncMessage] = useState<string | null>(null);
    const [isSyncPending, startSyncTransition] = useTransition();

    const categories = Array.from(new Set(items.map((i) => i.category)));

    const fetchItems = useCallback(async () => {
        const { data } = await supabase
            .from("inventory_items")
            .select("*")
            .order("name");
        if (data) setItems(data);
        setLoading(false);
    }, [supabase]);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this item? This cannot be undone.")) return;
        setActionError(null);
        setSyncMessage(null);
        await supabase.from("inventory_items").delete().eq("id", id);
        setItems((prev) => prev.filter((i) => i.id !== id));
    };

    const handleSheetSync = () => {
        setActionError(null);
        setSyncMessage(null);

        startSyncTransition(async () => {
            const result = await syncInventoryStocksToGoogleSheets();
            if (!result.ok) {
                setActionError(result.error);
                return;
            }

            setSyncMessage(
                `Synced ${result.count} stock row${result.count === 1 ? "" : "s"} to Google Sheets.`
            );
        });
    };

    const filtered = items.filter((item) => {
        const matchSearch =
            item.name.toLowerCase().includes(search.toLowerCase()) ||
            item.description?.toLowerCase().includes(search.toLowerCase());
        const matchCategory = !activeCategory || item.category === activeCategory;
        return matchSearch && matchCategory;
    });

    if (userLoading || loading) {
        return <VajraLoader fullPage />;
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="flex-1">
                    <h1 className="text-xl font-bold">Inventory</h1>
                    <p className="text-xs text-text-muted">
                        Browse and request equipment
                    </p>
                </div>
                {canManageInventory && (
                    <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                            onClick={handleSheetSync}
                            disabled={isSyncPending || !isGoogleSheetConfigured}
                            className="btn-primary text-sm disabled:opacity-50"
                        >
                            {isSyncPending ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                                <RefreshCw className="w-4 h-4" />
                            )}
                            Sync to Sheet
                        </button>
                        <a
                            href={googleSheetUrl || "https://docs.google.com/spreadsheets/d/1NGiGWa8EceraGPMWFoxipQPOKS6YJbGXjczBaIEgc6k/edit?usp=sharing"}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-ghost text-sm"
                        >
                            <Sheet className="w-4 h-4" />
                            Open Sheet
                            <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <button
                            onClick={() => setEditItem(null)}
                            className="btn-primary text-sm"
                        >
                            <Plus className="w-4 h-4" />
                            Add Item
                        </button>
                    </div>
                )}
            </div>

            {actionError && (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {actionError}
                </div>
            )}

            {syncMessage && (
                <div className="mb-4 rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">
                    {syncMessage}
                </div>
            )}

            {/* Search + Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search equipment..."
                        className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-xl text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                    />
                </div>
                <div className="flex gap-2 flex-wrap">
                    <button
                        onClick={() => setActiveCategory(null)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${!activeCategory
                                ? "bg-primary/20 text-primary-light border border-primary/30"
                                : "text-text-muted hover:text-foreground border border-border hover:border-border"
                            }`}
                    >
                        All
                    </button>
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() =>
                                setActiveCategory(activeCategory === cat ? null : cat)
                            }
                            className={`px-3 py-2 rounded-lg text-xs font-medium capitalize transition-all ${activeCategory === cat
                                    ? "bg-primary/20 text-primary-light border border-primary/30"
                                    : "text-text-muted hover:text-foreground border border-border hover:border-border"
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid */}
            {filtered.length === 0 ? (
                <div className="glass p-4 md:p-5 md:p-8 md:p-16 text-center">
                    <Package className="w-12 h-12 text-text-muted mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                        {items.length === 0 ? "Inventory is empty" : "No matches"}
                    </h3>
                    <p className="text-text-muted text-sm">
                        {items.length === 0
                            ? "Equipment will appear here once added."
                            : "Try adjusting your search or filters."}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((item) => {
                        const availabilityMeta = getInventoryAvailabilityMeta(item, canViewExactAvailability);
                        return (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="glass overflow-hidden group relative flex flex-col"
                            >
                                {/* Admin Actions */}
                                {canManageInventory && (
                                    <div className="flex gap-1 absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                        <button
                                            onClick={() => setEditItem(item)}
                                            className="p-1.5 rounded-lg bg-black/60 backdrop-blur-md text-text-muted hover:text-primary-light hover:bg-primary/20 transition-all border border-white/10"
                                            title="Edit Item"
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        {canManageInventory && (
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                className="p-1.5 rounded-lg bg-black/60 backdrop-blur-md text-text-muted hover:text-red-400 hover:bg-red-400/20 transition-all border border-white/10"
                                                title="Delete Item"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Image */}
                                {item.image_url && (
                                    <div className="h-40 overflow-hidden border-b border-border/50">
                                        <img
                                            src={item.image_url}
                                            alt={item.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                    </div>
                                )}

                                <div className="p-4">
                                    {/* Category badge */}
                                    <div className="flex items-center gap-2 mb-2">
                                        <span
                                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border shadow-sm ${categoryColors[item.category] ||
                                                "text-text-muted bg-surface border-border"
                                                }`}
                                        >
                                            {(() => {
                                                const Icon = CategoryIcon[item.category];
                                                return Icon ? <Icon className="w-3.5 h-3.5" strokeWidth={2.5} /> : null;
                                            })()}
                                            {item.category}
                                        </span>
                                    </div>

                                    {/* Name + description */}
                                    <h3 className="font-semibold text-sm mb-1">{item.name}</h3>
                                    {item.description && (
                                        <p className="text-xs text-text-muted line-clamp-2 mb-3">
                                            {item.description}
                                        </p>
                                    )}

                                    {/* Availability */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <div
                                                className={`w-2 h-2 rounded-full ${availabilityMeta.isAvailable ? "bg-emerald-400" : "bg-red-400"
                                                    }`}
                                            />
                                            <span
                                                className={`text-xs font-medium ${availabilityMeta.isAvailable
                                                        ? "text-emerald-400"
                                                        : "text-red-400"
                                                    }`}
                                            >
                                                {availabilityMeta.label}
                                            </span>
                                        </div>

                                        {isAuthenticated && availabilityMeta.isAvailable && (
                                            <button
                                                onClick={() => setRequestItem(item)}
                                                className="btn-primary !px-4 !py-2 text-[11px]"
                                            >
                                                Request
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Request modal */}
            <AnimatePresence>
                {requestItem && (
                    <RequestModal
                        item={requestItem}
                        canViewExactAvailability={canViewExactAvailability}
                        onClose={() => setRequestItem(null)}
                        onSubmitted={fetchItems}
                    />
                )}
            </AnimatePresence>

            {/* Add/Edit modal */}
            <AnimatePresence>
                {editItem !== undefined && (
                    <ItemModal
                        item={editItem}
                        onClose={() => setEditItem(undefined)}
                        onSaved={fetchItems}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
