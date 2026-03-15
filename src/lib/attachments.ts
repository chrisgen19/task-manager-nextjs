import { db } from "@/lib/db";
import { deleteManyFromR2 } from "@/lib/r2";

const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL ?? "";

/**
 * Extract R2 URLs from HTML content (img src and anchor href).
 */
function extractR2Urls(html: string): string[] {
  if (!html || !R2_PUBLIC_URL) return [];
  const urls: string[] = [];
  const regex = /(?:src|href)="([^"]*?)"/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const url = match[1];
    if (url.startsWith(R2_PUBLIC_URL)) {
      urls.push(url);
    }
  }
  return urls;
}

/**
 * Link unlinked attachments to a task by matching R2 URLs in the HTML.
 * Only links attachments owned by the given user.
 */
export async function linkAttachmentsToTask(
  html: string,
  taskId: string,
  userId: string,
): Promise<void> {
  const urls = extractR2Urls(html);
  if (urls.length === 0) return;

  await db.attachment.updateMany({
    where: {
      url: { in: urls },
      userId,
      taskId: null,
    },
    data: { taskId },
  });
}

/**
 * Link unlinked attachments to a comment (and its parent task).
 * Only links attachments owned by the given user.
 */
export async function linkAttachmentsToComment(
  html: string,
  taskId: string,
  commentId: string,
  userId: string,
): Promise<void> {
  const urls = extractR2Urls(html);
  if (urls.length === 0) return;

  await db.attachment.updateMany({
    where: {
      url: { in: urls },
      userId,
      commentId: null,
    },
    data: { taskId, commentId },
  });
}

/**
 * Find attachments that were removed from HTML (previously linked but no
 * longer present) and delete them from R2 + DB.
 */
export async function cleanupRemovedAttachments(
  newHtml: string,
  taskId: string,
  commentId: string | null,
  userId: string,
): Promise<void> {
  const currentUrls = new Set(extractR2Urls(newHtml));

  const existing = await db.attachment.findMany({
    where: {
      taskId,
      commentId: commentId ?? null,
      userId,
    },
    select: { id: true, r2Key: true, url: true },
  });

  const removed = existing.filter((a) => !currentUrls.has(a.url));
  if (removed.length === 0) return;

  await db.attachment.deleteMany({
    where: { id: { in: removed.map((a) => a.id) } },
  });

  deleteManyFromR2(removed.map((a) => a.r2Key)).catch(() => {});
}
