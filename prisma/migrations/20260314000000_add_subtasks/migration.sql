-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "parentId" TEXT,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "subtaskNumber" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Task_parentId_subtaskNumber_key" ON "Task"("parentId", "subtaskNumber");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
