"use client";

import { useState } from "react";
import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import type { MomActionItem } from "@/types/database";

interface ActionItemsBuilderProps {
    items: MomActionItem[];
    onChange: (items: MomActionItem[]) => void;
}

export default function ActionItemsBuilder({ items, onChange }: ActionItemsBuilderProps) {
    const [draft, setDraft] = useState<Partial<MomActionItem>>({ task: "", assignee: "", due_date: "" });

    const addItem = () => {
        if (!draft.task?.trim()) return;
        onChange([
            ...items,
            {
                task: draft.task.trim(),
                assignee: draft.assignee?.trim() || undefined,
                due_date: draft.due_date || undefined,
            },
        ]);
        setDraft({ task: "", assignee: "", due_date: "" });
    };

    const removeItem = (idx: number) => onChange(items.filter((_, i) => i !== idx));

    const moveItem = (idx: number, dir: -1 | 1) => {
        const next = [...items];
        const target = idx + dir;
        if (target < 0 || target >= next.length) return;
        [next[idx], next[target]] = [next[target], next[idx]];
        onChange(next);
    };

    const updateItem = (idx: number, patch: Partial<MomActionItem>) => {
        const next = [...items];
        next[idx] = { ...next[idx], ...patch };
        onChange(next);
    };

    return (
        <div className="space-y-3">
            {/* Existing items */}
            {items.length > 0 && (
                <div className="space-y-2">
                    {items.map((item, idx) => (
                        <div
                            key={idx}
                            className="flex items-start gap-3 rounded-sm px-3 py-2.5"
                            style={{ border: "1px solid rgba(0,229,255,0.12)", background: "#07090f" }}
                        >
                            {/* Index */}
                            <span
                                className="shrink-0 font-mono text-[10px] w-5 h-5 grid place-items-center rounded-sm mt-0.5"
                                style={{ background: "rgba(0,229,255,0.08)", color: "#00e5ff" }}
                            >
                                {idx + 1}
                            </span>

                            {/* Fields */}
                            <div className="flex-1 min-w-0 space-y-1.5">
                                <input
                                    value={item.task}
                                    onChange={(e) => updateItem(idx, { task: e.target.value })}
                                    placeholder="Task description"
                                    className="w-full text-[13px] bg-transparent text-[#f0f4ff] placeholder:text-[#4a5568] focus:outline-none border-b border-[rgba(0,229,255,0.10)] pb-1"
                                />
                                <div className="flex gap-2">
                                    <input
                                        value={item.assignee ?? ""}
                                        onChange={(e) => updateItem(idx, { assignee: e.target.value })}
                                        placeholder="Assignee (optional)"
                                        className="flex-1 text-[12px] bg-transparent text-[#8b9ab0] placeholder:text-[#4a5568] focus:outline-none"
                                    />
                                    <input
                                        type="date"
                                        value={item.due_date ?? ""}
                                        onChange={(e) => updateItem(idx, { due_date: e.target.value })}
                                        className="text-[12px] bg-transparent text-[#8b9ab0] focus:outline-none"
                                        style={{ colorScheme: "dark" }}
                                    />
                                </div>
                            </div>

                            {/* Reorder + Delete */}
                            <div className="flex flex-col items-center gap-0.5 shrink-0">
                                <button type="button" onClick={() => moveItem(idx, -1)} disabled={idx === 0} className="p-0.5 text-[#4a5568] hover:text-[#8b9ab0] disabled:opacity-30 transition-colors">
                                    <ChevronUp size={12} />
                                </button>
                                <button type="button" onClick={() => moveItem(idx, 1)} disabled={idx === items.length - 1} className="p-0.5 text-[#4a5568] hover:text-[#8b9ab0] disabled:opacity-30 transition-colors">
                                    <ChevronDown size={12} />
                                </button>
                                <button type="button" onClick={() => removeItem(idx)} className="p-0.5 text-[#4a5568] hover:text-[#ef4444] transition-colors mt-0.5">
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add new item */}
            <div
                className="rounded-sm px-3 py-3 space-y-2"
                style={{ border: "1px dashed rgba(0,229,255,0.18)", background: "#07090f" }}
            >
                <input
                    value={draft.task ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, task: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addItem(); } }}
                    placeholder="New action item…"
                    className="w-full text-[13px] bg-transparent text-[#f0f4ff] placeholder:text-[#4a5568] focus:outline-none border-b border-[rgba(0,229,255,0.12)] pb-1.5"
                />
                <div className="flex items-center gap-2">
                    <input
                        value={draft.assignee ?? ""}
                        onChange={(e) => setDraft((d) => ({ ...d, assignee: e.target.value }))}
                        placeholder="Assignee"
                        className="flex-1 text-[12px] bg-transparent text-[#8b9ab0] placeholder:text-[#4a5568] focus:outline-none"
                    />
                    <input
                        type="date"
                        value={draft.due_date ?? ""}
                        onChange={(e) => setDraft((d) => ({ ...d, due_date: e.target.value }))}
                        className="text-[12px] bg-transparent text-[#8b9ab0] focus:outline-none"
                        style={{ colorScheme: "dark" }}
                    />
                    <button
                        type="button"
                        onClick={addItem}
                        className="shrink-0 flex items-center gap-1.5 h-7 px-3 rounded-sm font-mono text-[10px] uppercase tracking-[0.12em] transition-colors"
                        style={{ border: "1px solid rgba(0,229,255,0.25)", color: "#00e5ff" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(0,229,255,0.08)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                        <Plus size={11} /> Add
                    </button>
                </div>
            </div>
        </div>
    );
}
