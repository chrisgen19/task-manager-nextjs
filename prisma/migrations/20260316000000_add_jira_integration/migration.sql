-- CreateTable
CREATE TABLE "JiraConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "cloudId" TEXT NOT NULL,
    "cloudName" TEXT NOT NULL,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JiraConnection_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Task" ADD COLUMN "jiraIssueId" TEXT;
ALTER TABLE "Task" ADD COLUMN "jiraIssueKey" TEXT;
ALTER TABLE "Task" ADD COLUMN "jiraSyncedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "JiraConnection_userId_key" ON "JiraConnection"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Task_userId_jiraIssueId_key" ON "Task"("userId", "jiraIssueId");

-- AddForeignKey
ALTER TABLE "JiraConnection" ADD CONSTRAINT "JiraConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
