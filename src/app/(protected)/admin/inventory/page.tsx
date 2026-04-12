"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/useUser";
import VajraLoader from "@/components/ui/VajraLoader";
import {
    Package,
    ShieldCheck,
    Loader2,
    Plus,
    Pencil,
    Trash2,
    X,
    Save,
    AlertCircle,
    CheckCircle2,
    RefreshCw,
    Sheet,
    ExternalLink,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Tables } from "@/types/database";
import { syncInventoryStocksToGoogleSheets } from "@/actions/inventory-history";

type InventoryItem = Tables<"inventory_items">;

const categories = [
    "microcontroller",
    "motor",
    "sensor",
    "battery",
    "chassis",
    "tool",
    "cable",
    "general",
];

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
    const [category, setCategory] = useState(item?.category || categories[0]);
    const [totalQuantity, setTotalQuantity] = useState(
        item?.total_quantity || 1
    );
    const [availableQuantity, setAvailableQuantity] = useState(
        item?.available_quantity || 1
    );
    const [imageUrl, setImageUrl] = useState(item?.image_url || "");
    const [isConsumable, setIsConsumable] = useState(item?.is_consumable ?? false);
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
            is_consumable: isConsumable,
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

            const syncResult = await syncInventoryStocksToGoogleSheets();
            if (!syncResult.ok) {
                setError(syncResult.error);
                setLoading(false);
                return;
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
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />
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
                            <button
                                onClick={onClose}
                                className="text-text-muted hover:text-foreground transition-colors"
                            >
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
                                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                                    Name
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                                    Description
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={2}
                                    className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 resize-none transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                                    Category
                                </label>
                                <select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary transition-all capitalize"
                                >
                                    {categories.map((c) => (
                                        <option key={c} value={c}>
                                            {c}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1.5">
                                        Total Qty
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={totalQuantity}
                                        onChange={(e) => setTotalQuantity(Number(e.target.value))}
                                        className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1.5">
                                        Available Qty
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        max={totalQuantity}
                                        value={availableQuantity}
                                        onChange={(e) =>
                                            setAvailableQuantity(Number(e.target.value))
                                        }
                                        className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                                    />
                                </div>
                            </div>

                            <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-border/80 bg-surface/40 px-4 py-3">
                                <input
                                    type="checkbox"
                                    checked={isConsumable}
                                    onChange={(e) => setIsConsumable(e.target.checked)}
                                    className="mt-1 rounded border-border text-primary focus:ring-primary/40"
                                />
                                <span>
                                    <span className="block text-sm font-medium text-text-secondary">
                                        Consumable
                                    </span>
                                    <span className="block text-xs text-text-muted mt-0.5">
                                        Approving a request reduces total stock and skips the return step.
                                    </span>
                                </span>
                            </label>

                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                                    Required Safety Certification (optional)
                                </label>
                                <input
                                    type="text"
                                    value={requiredSafetyCertification}
                                    onChange={(e) => setRequiredSafetyCertification(e.target.value)}
                                    placeholder="e.g. Laser Cutter Level 1"
                                    className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                                    Item Image (optional)
                                </label>
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

                            <button
                                type="submit"
                                disabled={loading || !name.trim()}
                                className="btn-primary w-full !py-3 disabled:opacity-40"
                            >
                                {loading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4" />
                                )}
                                {isEdit ? "Save Changes" : "Add Item"}
                            </button>
                        </form>
                    </>
                )}
            </motion.div>
        </div>
    );
}

export default function InventoryManagement() {
    const { isModerator, isFaculty, isInventoryManager, loading: authLoading } = useUser();
    const canManageInventory = isModerator || isFaculty || isInventoryManager;
    const supabase = createClient();
    const googleSheetUrl = process.env.NEXT_PUBLIC_GOOGLE_SHEET_URL?.trim() || null;
    const isGoogleSheetConfigured = Boolean(googleSheetUrl);
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [editItem, setEditItem] = useState<InventoryItem | null | undefined>(
        undefined
    );
    const [actionError, setActionError] = useState<string | null>(null);
    const [syncMessage, setSyncMessage] = useState<string | null>(null);
    const [isSyncPending, startSyncTransition] = useTransition();

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
        const { error } = await supabase.from("inventory_items").delete().eq("id", id);
        if (error) {
            setActionError(error.message);
            return;
        }

        const syncResult = await syncInventoryStocksToGoogleSheets();
        if (!syncResult.ok) {
            setActionError(syncResult.error);
            return;
        }

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

    if (authLoading || loading) {
        return <VajraLoader fullPage />;
    }

    if (!canManageInventory) {
        return (
            <div className="max-w-3xl mx-auto px-4 py-16 text-center">
                <ShieldCheck className="w-16 h-16 text-text-muted mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-2">Access Denied</h2>
                <p className="text-text-muted text-sm">Admin access required.</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="flex-1">
                    <h1 className="text-xl font-bold">Inventory Management</h1>
                    <p className="text-xs text-text-muted">{items.length} items</p>
                </div>
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

            {/* Table */}
            {items.length === 0 ? (
                <div className="glass p-4 md:p-5 md:p-8 md:p-16 text-center">
                    <Package className="w-12 h-12 text-text-muted mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No items</h3>
                    <p className="text-text-muted text-sm">
                        Add your first equipment item.
                    </p>
                </div>
            ) : (
                <div className="glass overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border/50">
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase">
                                        Name
                                    </th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase">
                                        Category
                                    </th>
                                    <th className="text-center px-4 py-3 text-xs font-semibold text-text-muted uppercase">
                                        Stock
                                    </th>
                                    <th className="text-right px-4 py-3 text-xs font-semibold text-text-muted uppercase">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item) => (
                                    <tr
                                        key={item.id}
                                        className="border-b border-border/30 last:border-0 hover:bg-surface/30 transition-colors"
                                    >
                                        <td className="px-4 py-3">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="font-medium">{item.name}</p>
                                                {item.is_consumable && (
                                                    <span className="text-[10px] font-semibold uppercase tracking-wide text-cyan-400/90 border border-cyan-400/25 rounded px-1.5 py-0.5">
                                                        Consumable
                                                    </span>
                                                )}
                                                {item.required_safety_certification && (
                                                    <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-300 border border-amber-400/30 rounded px-1.5 py-0.5">
                                                        Cert: {item.required_safety_certification}
                                                    </span>
                                                )}
                                            </div>
                                            {item.description && (
                                                <p className="text-xs text-text-muted truncate max-w-[200px]">
                                                    {item.description}
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="capitalize text-xs text-text-secondary">
                                                {item.category}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span
                                                className={`text-xs font-semibold ${item.available_quantity > 0
                                                        ? "text-emerald-400"
                                                        : "text-red-400"
                                                    }`}
                                            >
                                                {item.available_quantity}/{item.total_quantity}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => setEditItem(item)}
                                                    className="p-1.5 rounded-lg text-text-muted hover:text-primary-light hover:bg-primary/10 transition-all"
                                                    title="Edit"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(item.id)}
                                                    className="p-1.5 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-400/10 transition-all"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

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
