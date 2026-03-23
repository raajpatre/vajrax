"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/useUser";
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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Tables } from "@/types/database";

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
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="glass-strong p-6 w-full max-w-lg relative z-10 max-h-[90vh] overflow-y-auto"
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

                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                                    Image URL (optional)
                                </label>
                                <input
                                    type="url"
                                    value={imageUrl}
                                    onChange={(e) => setImageUrl(e.target.value)}
                                    placeholder="https://..."
                                    className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                                />
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
    const { isModerator, isFaculty, loading: authLoading } = useUser();
    const supabase = createClient();
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [editItem, setEditItem] = useState<InventoryItem | null | undefined>(
        undefined
    );

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
        await supabase.from("inventory_items").delete().eq("id", id);
        setItems((prev) => prev.filter((i) => i.id !== id));
    };

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary-light" />
            </div>
        );
    }

    if (!isModerator && !isFaculty) {
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
                <div className="w-10 h-10 rounded-xl bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center">
                    <Package className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex-1">
                    <h1 className="text-xl font-bold">Inventory Management</h1>
                    <p className="text-xs text-text-muted">{items.length} items</p>
                </div>
                <button
                    onClick={() => setEditItem(null)}
                    className="btn-primary text-sm"
                >
                    <Plus className="w-4 h-4" />
                    Add Item
                </button>
            </div>

            {/* Table */}
            {items.length === 0 ? (
                <div className="glass p-16 text-center">
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
                                            <p className="font-medium">{item.name}</p>
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
