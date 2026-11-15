CREATE TABLE "Workspace" ("id" TEXT PRIMARY KEY, "expiresAt" TIMESTAMP(3) NOT NULL);
CREATE TABLE "Account" ("id" TEXT PRIMARY KEY,"workspaceId" TEXT NOT NULL REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE,"name" TEXT NOT NULL,"geo" TEXT NOT NULL,"owner" TEXT NOT NULL,"status" TEXT NOT NULL DEFAULT 'Прогрев',"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE "Transaction" ("id" TEXT PRIMARY KEY,"workspaceId" TEXT NOT NULL REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE,"title" TEXT NOT NULL,"kind" TEXT NOT NULL,"amount" INTEGER NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX "Workspace_expiresAt_idx" ON "Workspace"("expiresAt");
CREATE INDEX "Account_workspaceId_createdAt_idx" ON "Account"("workspaceId","createdAt");
CREATE INDEX "Transaction_workspaceId_createdAt_idx" ON "Transaction"("workspaceId","createdAt");
ALTER TABLE "Transaction" ADD CONSTRAINT "positive_amount" CHECK ("amount" > 0 AND "amount" <= 100000000);
ALTER TABLE "Transaction" ADD CONSTRAINT "valid_kind" CHECK ("kind" IN ('income','expense'));
ALTER TABLE "Account" ADD CONSTRAINT "valid_status" CHECK ("status" IN ('Прогрев','Готов','В работе','Проверка'));
