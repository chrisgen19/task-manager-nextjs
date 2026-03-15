/**
 * Server-side HTML sanitization.
 * Strips all tags except a safe allowlist. Runs in Node.js (no DOMParser).
 */

const ALLOWED_TAGS = new Set([
  "b", "strong", "i", "em", "u", "s", "strike", "del",
  "p", "br", "div", "span",
  "ul", "ol", "li",
  "h1", "h2", "h3", "h4",
  "a", "img",
  "code", "pre", "blockquote",
  "table", "thead", "tbody", "tr", "th", "td",
  "hr",
]);

const R2_PUBLIC_HOST = (() => {
  try {
    const url = process.env.R2_PUBLIC_URL;
    return url ? new URL(url).hostname : "";
  } catch {
    return "";
  }
})();

const ALLOWED_ATTRS: Record<string, string[]> = {
  a: ["href", "target", "rel"],
  img: ["src", "alt", "width", "height"],
  td: ["colspan", "rowspan"],
  th: ["colspan", "rowspan"],
};

// Regex-based approach for Node.js (no DOM available in API routes)
export function sanitizeHtmlServer(html: string): string {
  if (!html) return "";

  // Remove script/style/iframe/object/embed tags and their content
  let result = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<object[\s\S]*?<\/object>/gi, "")
    .replace(/<embed[^>]*>/gi, "")
    .replace(/<form[\s\S]*?<\/form>/gi, "");

  // Strip event handlers and javascript: hrefs from all tags
  result = result.replace(/<([a-z][a-z0-9]*)\s([^>]*)>/gi, (match, tag, attrs) => {
    const lowerTag = tag.toLowerCase();
    if (!ALLOWED_TAGS.has(lowerTag)) {
      // Remove disallowed tags entirely (keep inner text by stripping just the tag)
      return "";
    }

    const allowedAttrs = ALLOWED_ATTRS[lowerTag] ?? [];
    if (allowedAttrs.length === 0) return `<${lowerTag}>`;

    // Parse attributes and keep only allowed ones
    const safeAttrs: string[] = [];
    const attrRegex = /(\w[\w-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+)))?/g;
    let attrMatch;

    while ((attrMatch = attrRegex.exec(attrs)) !== null) {
      const attrName = attrMatch[1].toLowerCase();
      const attrValue = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? "";

      if (!allowedAttrs.includes(attrName)) continue;

      // Block javascript: and data: URLs in href
      if (attrName === "href") {
        const clean = attrValue.trim().toLowerCase();
        if (clean.startsWith("javascript:") || clean.startsWith("data:")) continue;
      }

      // Only allow R2 public domain for img src to prevent arbitrary image injection
      if (attrName === "src" && lowerTag === "img") {
        if (R2_PUBLIC_HOST) {
          try {
            const srcHost = new URL(attrValue).hostname;
            if (srcHost !== R2_PUBLIC_HOST) continue;
          } catch {
            continue; // malformed URL — strip it
          }
        }
      }

      safeAttrs.push(`${attrName}="${attrValue.replace(/"/g, "&quot;")}"`);
    }

    // Force safe defaults for links
    if (lowerTag === "a") {
      if (!safeAttrs.some((a) => a.startsWith("target="))) safeAttrs.push('target="_blank"');
      if (!safeAttrs.some((a) => a.startsWith("rel="))) safeAttrs.push('rel="noopener noreferrer"');
    }

    return safeAttrs.length > 0 ? `<${lowerTag} ${safeAttrs.join(" ")}>` : `<${lowerTag}>`;
  });

  // Remove closing tags for disallowed elements
  result = result.replace(/<\/([a-z][a-z0-9]*)\s*>/gi, (match, tag) => {
    return ALLOWED_TAGS.has(tag.toLowerCase()) ? match : "";
  });

  return result.trim();
}
