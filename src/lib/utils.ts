import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Task } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTaskKey(task: Pick<Task, "workboardKey" | "taskNumber" | "parentId" | "subtaskNumber" | "parentTaskNumber">): string {
  if (task.parentId && task.subtaskNumber != null) {
    const parentNum = task.parentTaskNumber ?? task.taskNumber;
    return `${task.workboardKey}-${parentNum}.${task.subtaskNumber}`;
  }
  return `${task.workboardKey}-${task.taskNumber}`;
}


export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatRelative(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return formatDate(dateStr);
}

export function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}

export function stripHtml(html: string): string {
  if (typeof window === "undefined") return html.replace(/<[^>]*>/g, "");
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent ?? "";
}

const ALLOWED_TAGS = new Set([
  "b", "strong", "i", "em", "u", "s", "strike", "del",
  "p", "br", "div", "span",
  "ul", "ol", "li",
  "h1", "h2", "h3", "h4",
  "a",
  "code", "pre", "blockquote",
  "table", "thead", "tbody", "tr", "th", "td",
  "hr",
]);

const ALLOWED_ATTRS: Record<string, string[]> = {
  a: ["href", "target", "rel"],
  td: ["colspan", "rowspan"],
  th: ["colspan", "rowspan"],
};

function sanitizeNode(node: Node): void {
  const children = [...node.childNodes];
  for (const child of children) {
    if (child.nodeType === Node.TEXT_NODE) continue;
    if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as Element;
      const tag = el.tagName.toLowerCase();

      if (!ALLOWED_TAGS.has(tag)) {
        while (el.firstChild) node.insertBefore(el.firstChild, el);
        node.removeChild(el);
        continue;
      }

      const allowed = ALLOWED_ATTRS[tag] ?? [];
      const attrs = [...el.attributes];
      for (const attr of attrs) {
        if (!allowed.includes(attr.name)) el.removeAttribute(attr.name);
      }

      if (tag === "a") {
        el.setAttribute("target", "_blank");
        el.setAttribute("rel", "noopener noreferrer");
      }

      sanitizeNode(el);
    } else {
      node.removeChild(child);
    }
  }
}

export function sanitizeHtml(html: string): string {
  if (typeof window === "undefined") return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  sanitizeNode(doc.body);
  return doc.body.innerHTML;
}
