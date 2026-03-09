-- CreateTable
CREATE TABLE "Workboard" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT,
    "taskCounter" INTEGER NOT NULL DEFAULT 0,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workboard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Workboard_userId_key_key" ON "Workboard"("userId", "key");

-- AddForeignKey
ALTER TABLE "Workboard" ADD CONSTRAINT "Workboard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable Task: add new columns
ALTER TABLE "Task"
    ADD COLUMN "taskNumber" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "workboardId" TEXT NOT NULL DEFAULT '';

-- Remove defaults after adding columns
ALTER TABLE "Task" ALTER COLUMN "taskNumber" DROP DEFAULT;
ALTER TABLE "Task" ALTER COLUMN "workboardId" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "Task_workboardId_taskNumber_key" ON "Task"("workboardId", "taskNumber");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_workboardId_fkey" FOREIGN KEY ("workboardId") REFERENCES "Workboard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
