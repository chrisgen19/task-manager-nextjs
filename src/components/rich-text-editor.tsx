"use client";

import { useEffect, useRef, useCallback } from "react";
import { sanitizeHtml, stripHtml } from "@/lib/utils";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}

export function RichTextEditor({ value, onChange, placeholder = "Add a description…", readOnly = false }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);

  // Sync value → DOM (only when value changes externally)
  useEffect(() => {
    const el = editorRef.current;
    if (!el || isInternalChange.current) return;
    if (el.innerHTML !== value) {
      el.innerHTML = value;
    }
  }, [value]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const html = e.clipboardData.getData("text/html");
    const plain = e.clipboardData.getData("text/plain");

    if (html) {
      const clean = sanitizeHtml(html);
      document.execCommand("insertHTML", false, clean);
    } else if (plain) {
      document.execCommand("insertText", false, plain);
    }
  }, []);

  const handleInput = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    isInternalChange.current = true;
    const content = el.innerHTML === "<br>" ? "" : el.innerHTML;
    onChange(content);
    // Reset after a tick so the useEffect above doesn't overwrite
    requestAnimationFrame(() => { isInternalChange.current = false; });
  }, [onChange]);

  if (readOnly) {
    return (
      <div
        className="rich-content text-sm"
        style={{
          padding: "10px 12px",
          minHeight: "60px",
          color: value && stripHtml(value).trim() ? "var(--text-secondary)" : "var(--text-tertiary)",
        }}
        // This is intentional: read-only display of previously-sanitized HTML content
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: value ? sanitizeHtml(value) : `<span>${placeholder}</span>` }}
      />
    );
  }

  return (
    <div
      ref={editorRef}
      contentEditable
      suppressContentEditableWarning
      onInput={handleInput}
      onPaste={handlePaste}
      className="rich-content outline-none"
      style={{
        padding: "10px 12px",
        minHeight: "120px",
        background: "var(--bg-primary)",
        border: "1px solid var(--border-primary)",
        borderRadius: "8px",
        color: "var(--text-primary)",
        fontSize: "0.875rem",
        lineHeight: "1.6",
        transition: "border-color 150ms ease",
      }}
      data-placeholder={placeholder}
      onFocus={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--status-todo)"; }}
      onBlur={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border-primary)"; }}
    />
  );
}
