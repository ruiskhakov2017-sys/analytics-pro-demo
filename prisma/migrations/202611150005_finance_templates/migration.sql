CREATE TABLE "FinanceTemplate" (
 "id" TEXT PRIMARY KEY,
 "workspaceId" TEXT NOT NULL REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "title" TEXT NOT NULL,
 "kind" TEXT NOT NULL CHECK ("kind" IN ('income','expense')),
 "department" TEXT NOT NULL CHECK ("department" IN ('GENERAL','FARMING','MEDIABUYING')),
 "amount" INTEGER NOT NULL CHECK ("amount" BETWEEN 1 AND 100000000),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "FinanceTemplate_workspaceId_createdAt_idx" ON "FinanceTemplate"("workspaceId","createdAt");
