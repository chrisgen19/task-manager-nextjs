-- AlterTable
ALTER TABLE "Attachment" ALTER COLUMN "taskId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Attachment_userId_taskId_idx" ON "Attachment"("userId", "taskId");
