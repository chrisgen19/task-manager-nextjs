import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

const MAX_RETRIES = 3;

/**
 * Allocate the next subtaskNumber and sortOrder for a parent task,
 * retrying on unique constraint violation (P2002) to handle concurrent requests.
 */
export async function allocateSubtaskNumber(
  parentId: string,
  callback: (tx: Prisma.TransactionClient, subtaskNumber: number, sortOrder: number) => Promise<unknown>,
): Promise<unknown> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await db.$transaction(async (tx) => {
        // Lock the parent row to serialize concurrent subtask allocations
        await tx.$queryRaw`SELECT id FROM "Task" WHERE id = ${parentId} FOR UPDATE`;

        const maxSubtask = await tx.task.aggregate({
          where: { parentId },
          _max: { subtaskNumber: true, sortOrder: true },
        });
        const subtaskNumber = (maxSubtask._max.subtaskNumber ?? 0) + 1;
        const sortOrder = (maxSubtask._max.sortOrder ?? -1) + 1;

        return callback(tx, subtaskNumber, sortOrder);
      });
    } catch (error: unknown) {
      const isPrismaUniqueViolation =
        error !== null &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "P2002";

      if (isPrismaUniqueViolation && attempt < MAX_RETRIES - 1) {
        continue;
      }
      throw error;
    }
  }
}
