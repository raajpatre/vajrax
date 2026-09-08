"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import {
    Bold, Italic, UnderlineIcon, Strikethrough,
    AlignLeft, AlignCenter, AlignRight,
    List, ListOrdered, Quote, Minus,
    Code, Heading1, Heading2, Heading3,
    Undo, Redo,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface MOMEditorProps {
    content: string;
    onChange: (html: string) => void;
    placeholder?: string;
    readOnly?: boolean;
}

// ─────────────────────────────────────────────────────────────
// Toolbar Button
// ─────────────────────────────────────────────────────────────

function ToolbarBtn({
    onClick,
    active,
    disabled,
    title,
    children,
}: {
    onClick: () => void;
    active?: boolean;
    disabled?: boolean;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            title={title}
            className="grid place-items-center w-8 h-8 rounded-sm transition-all duration-150 disabled:opacity-30"
            style={{
                background: active ? "rgba(0,229,255,0.12)" : "transparent",
                border: active ? "1px solid rgba(0,229,255,0.35)" : "1px solid transparent",
                color: active ? "#00e5ff" : "#8b9ab0",
            }}
            onMouseEnter={(e) => {
                if (!disabled) {
                    e.currentTarget.style.color = "#f0f4ff";
                    e.currentTarget.style.background = "rgba(0,229,255,0.06)";
                }
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.color = active ? "#00e5ff" : "#8b9ab0";
                e.currentTarget.style.background = active ? "rgba(0,229,255,0.12)" : "transparent";
            }}
        >
            {children}
        </button>
    );
}

function Divider() {
    return <span className="w-px h-5 mx-0.5 shrink-0" style={{ background: "rgba(0,229,255,0.10)" }} />;
}

// ─────────────────────────────────────────────────────────────
// MOMEditor
// ─────────────────────────────────────────────────────────────

export default function MOMEditor({ content, onChange, placeholder, readOnly = false }: MOMEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3] },
            }),
            Underline,
            TextAlign.configure({ types: ["heading", "paragraph"] }),
            Placeholder.configure({
                placeholder: placeholder ?? "Write the minutes of the meeting here…",
            }),
        ],
        content,
        editable: !readOnly,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
    });

    if (!editor) return null;

    return (
        <div
            className="rounded-sm overflow-hidden"
            style={{ border: "1px solid rgba(0,229,255,0.18)", background: "#07090f" }}
        >
            {/* Toolbar */}
            {!readOnly && (
                <div
                    className="flex flex-wrap items-center gap-0.5 px-2 py-1.5"
                    style={{ borderBottom: "1px solid rgba(0,229,255,0.10)", background: "#0d1117" }}
                >
                    {/* Undo / Redo */}
                    <ToolbarBtn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo">
                        <Undo size={14} />
                    </ToolbarBtn>
                    <ToolbarBtn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo">
                        <Redo size={14} />
                    </ToolbarBtn>

                    <Divider />

                    {/* Headings */}
                    <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="Heading 1">
                        <Heading1 size={14} />
                    </ToolbarBtn>
                    <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Heading 2">
                        <Heading2 size={14} />
                    </ToolbarBtn>
                    <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Heading 3">
                        <Heading3 size={14} />
                    </ToolbarBtn>

                    <Divider />

                    {/* Inline formatting */}
                    <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold">
                        <Bold size={14} />
                    </ToolbarBtn>
                    <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic">
                        <Italic size={14} />
                    </ToolbarBtn>
                    <ToolbarBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline">
                        <UnderlineIcon size={14} />
                    </ToolbarBtn>
                    <ToolbarBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Strikethrough">
                        <Strikethrough size={14} />
                    </ToolbarBtn>
                    <ToolbarBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} title="Inline Code">
                        <Code size={14} />
                    </ToolbarBtn>

                    <Divider />

                    {/* Alignment */}
                    <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Align Left">
                        <AlignLeft size={14} />
                    </ToolbarBtn>
                    <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Align Center">
                        <AlignCenter size={14} />
                    </ToolbarBtn>
                    <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Align Right">
                        <AlignRight size={14} />
                    </ToolbarBtn>

                    <Divider />

                    {/* Lists */}
                    <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet List">
                        <List size={14} />
                    </ToolbarBtn>
                    <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Ordered List">
                        <ListOrdered size={14} />
                    </ToolbarBtn>
                    <ToolbarBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Blockquote">
                        <Quote size={14} />
                    </ToolbarBtn>
                    <ToolbarBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal Rule">
                        <Minus size={14} />
                    </ToolbarBtn>
                </div>
            )}

            {/* Editor area */}
            <div
                className={[
                    "mom-editor-content",
                    readOnly ? "cursor-default" : "cursor-text",
                ].join(" ")}
                style={{
                    background: readOnly ? "transparent" : "#07090f",
                    minHeight: readOnly ? undefined : 320,
                    padding: "16px 20px",
                }}
                onClick={() => editor.commands.focus()}
            >
                <EditorContent editor={editor} />
            </div>

            {/* Tiptap prose styles injected globally via this component */}
            <style>{`
                .mom-editor-content,
                .mom-editor-content *,
                .mom-editor-content *:focus,
                .mom-editor-content *:focus-visible,
                .mom-editor-content .ProseMirror,
                .mom-editor-content .ProseMirror:focus,
                .mom-editor-content .ProseMirror:focus-visible,
                .mom-editor-content .ProseMirror-focused {
                    outline: none !important;
                    box-shadow: none !important;
                    border: none !important;
                }
                .mom-editor-content .ProseMirror {
                    outline: none;
                    color: #d4dbe8;
                    font-size: 14px;
                    line-height: 1.75;
                    font-family: var(--font-geist-sans, Inter, sans-serif);
                }
                .mom-editor-content .ProseMirror h1 {
                    font-size: 22px;
                    font-weight: 700;
                    color: #f0f4ff;
                    margin: 1.2em 0 0.4em;
                    letter-spacing: -0.02em;
                }
                .mom-editor-content .ProseMirror h2 {
                    font-size: 18px;
                    font-weight: 600;
                    color: #e2e8f0;
                    margin: 1em 0 0.35em;
                }
                .mom-editor-content .ProseMirror h3 {
                    font-size: 15px;
                    font-weight: 600;
                    color: #c8d3e0;
                    margin: 0.9em 0 0.3em;
                    text-transform: uppercase;
                    letter-spacing: 0.06em;
                }
                .mom-editor-content .ProseMirror p {
                    margin: 0.4em 0;
                }
                .mom-editor-content .ProseMirror strong {
                    color: #f0f4ff;
                    font-weight: 700;
                }
                .mom-editor-content .ProseMirror em { font-style: italic; }
                .mom-editor-content .ProseMirror s { text-decoration: line-through; color: #8b9ab0; }
                .mom-editor-content .ProseMirror code {
                    background: rgba(0,229,255,0.08);
                    border: 1px solid rgba(0,229,255,0.18);
                    border-radius: 3px;
                    padding: 1px 5px;
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 12px;
                    color: #00e5ff;
                }
                .mom-editor-content .ProseMirror ul {
                    list-style: disc;
                    padding-left: 1.4em;
                    margin: 0.4em 0;
                }
                .mom-editor-content .ProseMirror ol {
                    list-style: decimal;
                    padding-left: 1.4em;
                    margin: 0.4em 0;
                }
                .mom-editor-content .ProseMirror li { margin: 0.15em 0; }
                .mom-editor-content .ProseMirror blockquote {
                    border-left: 3px solid rgba(0,229,255,0.4);
                    padding-left: 1em;
                    color: #8b9ab0;
                    margin: 0.6em 0;
                    font-style: italic;
                }
                .mom-editor-content .ProseMirror hr {
                    border: none;
                    border-top: 1px solid rgba(0,229,255,0.14);
                    margin: 1.2em 0;
                }
                .mom-editor-content .ProseMirror p.is-editor-empty:first-child::before {
                    content: attr(data-placeholder);
                    float: left;
                    color: #4a5568;
                    pointer-events: none;
                    height: 0;
                }
            `}</style>
        </div>
    );
}
