"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { Extension } from "@tiptap/core";
import Suggestion, { type SuggestionProps } from "@tiptap/suggestion";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Bold, Italic, Strikethrough, Code, Code2,
  Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Minus, Table2, Link2,
  Undo2, Redo2, ImagePlus, Loader2,
} from "lucide-react";
import type { Range } from "@tiptap/core";
import { useFileUpload } from "@/hooks/use-file-upload";
import { UPLOAD_ALLOWED_TYPES } from "@/schemas";

// ── Helpers ─────────────────────────────────────────────────────

const IMAGE_TYPES = UPLOAD_ALLOWED_TYPES.filter((t) => t.startsWith("image/"));

function isImageType(type: string): boolean {
  return IMAGE_TYPES.includes(type as (typeof UPLOAD_ALLOWED_TYPES)[number]);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Slash command definitions ──────────────────────────────────

interface SlashItem {
  title: string;
  description: string;
  icon: string;
  command: (params: { editor: Editor; range: Range }) => void;
}

function buildSlashItems(
  onPickImage?: () => void,
  onPickFile?: () => void,
): SlashItem[] {
  const items: SlashItem[] = [
    {
      title: "Text",
      description: "Plain paragraph",
      icon: "¶",
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).clearNodes().run(),
    },
    {
      title: "Heading 1",
      description: "Large section heading",
      icon: "H1",
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run(),
    },
    {
      title: "Heading 2",
      description: "Medium section heading",
      icon: "H2",
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run(),
    },
    {
      title: "Heading 3",
      description: "Small section heading",
      icon: "H3",
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run(),
    },
    {
      title: "Bullet List",
      description: "Unordered list",
      icon: "•",
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).toggleBulletList().run(),
    },
    {
      title: "Numbered List",
      description: "Ordered list",
      icon: "1.",
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
    },
    {
      title: "Code Block",
      description: "Preformatted code",
      icon: "</>",
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).setCodeBlock().run(),
    },
    {
      title: "Blockquote",
      description: "Quoted text",
      icon: "❝",
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).setBlockquote().run(),
    },
    {
      title: "Divider",
      description: "Horizontal rule",
      icon: "—",
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
    },
    {
      title: "Table",
      description: "Insert a 3×3 table",
      icon: "▦",
      command: ({ editor, range }) =>
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
          .run(),
    },
  ];

  if (onPickImage) {
    items.push({
      title: "Image",
      description: "Upload an image",
      icon: "🖼",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();
        onPickImage();
      },
    });
  }

  if (onPickFile) {
    items.push({
      title: "File attachment",
      description: "Upload a file",
      icon: "📎",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();
        onPickFile();
      },
    });
  }

  return items;
}

// ── Slash command popup ────────────────────────────────────────

interface SlashState {
  items: SlashItem[];
  selectedIndex: number;
  rect: DOMRect;
  command: (item: SlashItem) => void;
}

function SlashMenu({ state, onClose }: { state: SlashState; onClose: () => void }) {
  return (
    <div
      className="fixed z-[200] rounded-xl shadow-2xl overflow-hidden"
      style={{
        top: state.rect.bottom + 6,
        left: state.rect.left,
        background: "var(--bg-secondary)",
        border: "1px solid var(--border-primary)",
        width: "272px",
        maxHeight: "340px",
        overflowY: "auto",
      }}
    >
      <div className="px-3 py-2" style={{ borderBottom: "1px solid var(--border-primary)" }}>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
          Blocks
        </p>
      </div>
      {state.items.length === 0 ? (
        <div className="px-4 py-3 text-sm" style={{ color: "var(--text-tertiary)" }}>No results</div>
      ) : (
        state.items.map((item, i) => (
          <button
            key={item.title}
            onMouseDown={(e) => { e.preventDefault(); state.command(item); onClose(); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors"
            style={{
              background: i === state.selectedIndex ? "var(--bg-tertiary)" : "transparent",
              color: "var(--text-primary)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-tertiary)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                i === state.selectedIndex ? "var(--bg-tertiary)" : "transparent";
            }}
          >
            <span
              className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 font-mono"
              style={{ background: "var(--bg-tertiary)", color: "var(--text-secondary)", border: "1px solid var(--border-primary)" }}
            >
              {item.icon}
            </span>
            <div>
              <div className="text-sm font-medium">{item.title}</div>
              <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>{item.description}</div>
            </div>
          </button>
        ))
      )}
    </div>
  );
}

// ── Toolbar ────────────────────────────────────────────────────

function ToolbarBtn({
  onClick, active, title, children, disabled,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); if (!disabled) onClick(); }}
      title={title}
      disabled={disabled}
      className="p-1.5 rounded transition-colors disabled:opacity-30"
      style={{
        color: active ? "#fff" : "var(--text-tertiary)",
        background: active ? "var(--status-todo)" : "transparent",
      }}
      onMouseEnter={(e) => {
        if (!active && !disabled)
          (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-hover)";
      }}
      onMouseLeave={(e) => {
        if (!active)
          (e.currentTarget as HTMLButtonElement).style.background = "transparent";
      }}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <div className="w-px h-4 mx-0.5 shrink-0" style={{ background: "var(--border-primary)" }} />;
}

interface ToolbarProps {
  editor: Editor;
  enableUploads: boolean;
  onPickImage: () => void;
}

function Toolbar({ editor, enableUploads, onPickImage }: ToolbarProps) {
  const setLink = useCallback(() => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL", prev ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().unsetLink().run();
    } else {
      editor.chain().focus().setLink({ href: url }).run();
    }
  }, [editor]);

  return (
    <div
      className="flex items-center gap-0.5 flex-wrap px-2 py-1.5 shrink-0"
      style={{ borderBottom: "1px solid var(--border-primary)" }}
    >
      {/* History */}
      <ToolbarBtn onClick={() => editor.chain().focus().undo().run()} title="Undo" disabled={!editor.can().undo()}>
        <Undo2 size={14} />
      </ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().redo().run()} title="Redo" disabled={!editor.can().redo()}>
        <Redo2 size={14} />
      </ToolbarBtn>
      <Sep />

      {/* Inline formatting */}
      <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold (Ctrl+B)">
        <Bold size={14} />
      </ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic (Ctrl+I)">
        <Italic size={14} />
      </ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Strikethrough">
        <Strikethrough size={14} />
      </ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} title="Inline code">
        <Code size={14} />
      </ToolbarBtn>
      <Sep />

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
      <Sep />

      {/* Lists */}
      <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet list">
        <List size={14} />
      </ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Numbered list">
        <ListOrdered size={14} />
      </ToolbarBtn>
      <Sep />

      {/* Blocks */}
      <ToolbarBtn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")} title="Code block">
        <Code2 size={14} />
      </ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Blockquote">
        <Quote size={14} />
      </ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider">
        <Minus size={14} />
      </ToolbarBtn>
      <Sep />

      {/* Table & Link */}
      <ToolbarBtn
        onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
        title="Insert table"
      >
        <Table2 size={14} />
      </ToolbarBtn>
      <ToolbarBtn onClick={setLink} active={editor.isActive("link")} title="Link">
        <Link2 size={14} />
      </ToolbarBtn>

      {/* Upload */}
      {enableUploads && (
        <>
          <Sep />
          <ToolbarBtn onClick={onPickImage} title="Upload image">
            <ImagePlus size={14} />
          </ToolbarBtn>
        </>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  fillHeight?: boolean;
  compact?: boolean;
  enableUploads?: boolean;
  onUploadingChange?: (uploading: boolean) => void;
  taskId?: string;
  commentId?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Type '/' for commands, or start writing…",
  fillHeight = false,
  compact = false,
  enableUploads = true,
  onUploadingChange,
  taskId,
  commentId,
}: RichTextEditorProps) {
  const [slashState, setSlashState] = useState<SlashState | null>(null);
  const slashRef = useRef<SlashState | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const uploadContext = taskId ? { taskId, commentId } : undefined;
  const { uploadFile, isUploading } = useFileUpload(uploadContext);

  // Notify parent of uploading state
  useEffect(() => {
    onUploadingChange?.(isUploading);
  }, [isUploading, onUploadingChange]);

  useEffect(() => {
    slashRef.current = slashState;
  }, [slashState]);

  // ── File handling ──────────────────────────────────────────

  const insertUploadResult = useCallback(
    (result: { url: string; filename: string; contentType: string }, pos?: number) => {
      const editor = editorRef.current;
      if (!editor) return;

      if (isImageType(result.contentType)) {
        if (pos !== undefined) {
          editor.chain().focus().setTextSelection(pos).setImage({ src: result.url, alt: result.filename }).run();
        } else {
          editor.chain().focus().setImage({ src: result.url, alt: result.filename }).run();
        }
      } else {
        const safeFilename = escapeHtml(result.filename);
        const linkHtml = `<a href="${result.url}" target="_blank" rel="noopener noreferrer">\u{1F4CE} ${safeFilename}</a> `;
        if (pos !== undefined) {
          editor.chain().focus().setTextSelection(pos).insertContent(linkHtml).run();
        } else {
          editor.chain().focus().insertContent(linkHtml).run();
        }
      }
    },
    [],
  );

  const handleFileUploadAndInsert = useCallback(
    async (file: File, pos?: number) => {
      const editor = editorRef.current;
      if (!editor) return;

      try {
        const result = await uploadFile(file);
        insertUploadResult(result, pos);
      } catch {
        // error is already in the hook state
      }
    },
    [uploadFile, insertUploadResult],
  );

  const openImagePicker = useCallback(() => {
    imageInputRef.current?.click();
  }, []);

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // ── Slash items (memoized per enableUploads) ───────────────

  const slashItemsRef = useRef<SlashItem[]>([]);
  slashItemsRef.current = enableUploads
    ? buildSlashItems(openImagePicker, openFilePicker)
    : buildSlashItems();

  // ── Editor ─────────────────────────────────────────────────

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      Image.configure({
        HTMLAttributes: { class: "rounded-lg max-w-full h-auto" },
        allowBase64: false,
      }),
      Extension.create({
        name: "slashCommands",
        addProseMirrorPlugins() {
          return [
            Suggestion({
              editor: this.editor,
              char: "/",
              startOfLine: false,
              items: ({ query }: { query: string }) =>
                slashItemsRef.current.filter((item) =>
                  item.title.toLowerCase().includes(query.toLowerCase())
                ),
              command: ({
                editor,
                range,
                props,
              }: {
                editor: Editor;
                range: Range;
                props: SlashItem;
              }) => {
                props.command({ editor, range });
              },
              render: () => ({
                onStart: (props: SuggestionProps<SlashItem>) => {
                  const rect = props.clientRect?.();
                  if (!rect) return;
                  setSlashState({
                    items: props.items,
                    selectedIndex: 0,
                    rect,
                    command: props.command,
                  });
                },
                onUpdate: (props: SuggestionProps<SlashItem>) => {
                  const rect = props.clientRect?.();
                  if (!rect) return;
                  setSlashState((prev) =>
                    prev
                      ? { ...prev, items: props.items, rect, command: props.command }
                      : null
                  );
                },
                onKeyDown: ({ event }: { event: KeyboardEvent }) => {
                  const state = slashRef.current;
                  if (!state || state.items.length === 0) return false;

                  if (event.key === "ArrowDown") {
                    setSlashState((s) =>
                      s ? { ...s, selectedIndex: (s.selectedIndex + 1) % s.items.length } : null
                    );
                    return true;
                  }
                  if (event.key === "ArrowUp") {
                    setSlashState((s) =>
                      s
                        ? { ...s, selectedIndex: (s.selectedIndex - 1 + s.items.length) % s.items.length }
                        : null
                    );
                    return true;
                  }
                  if (event.key === "Enter") {
                    const item = state.items[state.selectedIndex];
                    if (item) {
                      state.command(item);
                      setSlashState(null);
                    }
                    return true;
                  }
                  if (event.key === "Escape") {
                    setSlashState(null);
                    return true;
                  }
                  return false;
                },
                onExit: () => setSlashState(null),
              }),
            }),
          ];
        },
      }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class: `rich-content tiptap-body outline-none${compact ? " tiptap-body-compact" : ""}`,
      },
      handleDrop: enableUploads
        ? (view, event) => {
            const files = event.dataTransfer?.files;
            if (!files?.length) return false;

            event.preventDefault();
            const coords = { left: event.clientX, top: event.clientY };
            const dropPos = view.posAtCoords(coords)?.pos;

            for (const file of Array.from(files)) {
              if (UPLOAD_ALLOWED_TYPES.includes(file.type as (typeof UPLOAD_ALLOWED_TYPES)[number])) {
                handleFileUploadAndInsert(file, dropPos);
              }
            }
            return true;
          }
        : undefined,
      handlePaste: enableUploads
        ? (view, event) => {
            const items = event.clipboardData?.items;
            if (!items) return false;

            for (const item of Array.from(items)) {
              if (item.kind === "file" && isImageType(item.type)) {
                event.preventDefault();
                const file = item.getAsFile();
                if (file) handleFileUploadAndInsert(file);
                return true;
              }
            }
            return false;
          }
        : undefined,
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html === "<p></p>" ? "" : html);
    },
  });

  // Keep editor ref in sync
  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  // Sync external value (e.g. form reset)
  useEffect(() => {
    if (!editor) return;
    const curr = editor.getHTML();
    const next = value || "";
    if (curr !== next && !(curr === "<p></p>" && next === "")) {
      editor.commands.setContent(next);
    }
  }, [value, editor]);

  if (!editor) return null;

  const imageAccept = IMAGE_TYPES.join(",");
  const allAccept = UPLOAD_ALLOWED_TYPES.join(",");

  return (
    <div
      className={`tiptap-editor flex flex-col overflow-hidden rounded-lg${fillHeight ? " h-full" : ""}`}
      style={{ border: "1px solid var(--border-primary)", background: "var(--bg-primary)" }}
    >
      <Toolbar editor={editor} enableUploads={enableUploads} onPickImage={openImagePicker} />

      <div className="relative">
        {/* Upload indicator */}
        {isUploading && (
          <div
            className="absolute top-0 left-0 right-0 z-10 flex items-center gap-2 px-3 py-1.5 text-xs"
            style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-primary)", color: "var(--text-secondary)" }}
          >
            <Loader2 size={12} className="animate-spin" />
            Uploading…
          </div>
        )}
        <div className={`overflow-y-auto${fillHeight ? " flex-1" : ""}`} style={{ minHeight: compact ? "60px" : "140px", ...(!fillHeight && { maxHeight: compact ? "200px" : "480px" }) }}>
          <EditorContent editor={editor} />
        </div>
      </div>

      {slashState && slashState.items.length > 0 && (
        <SlashMenu state={slashState} onClose={() => setSlashState(null)} />
      )}

      {/* Hidden file inputs */}
      {enableUploads && (
        <>
          <input
            ref={imageInputRef}
            type="file"
            accept={imageAccept}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUploadAndInsert(file);
              e.target.value = "";
            }}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept={allAccept}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUploadAndInsert(file);
              e.target.value = "";
            }}
          />
        </>
      )}
    </div>
  );
}
