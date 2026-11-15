CREATE TABLE "AccountEvent" (
  "id" TEXT PRIMARY KEY,
  "accountId" TEXT NOT NULL REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "previousStatus" TEXT,
  "status" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "AccountEvent_accountId_createdAt_idx" ON "AccountEvent"("accountId", "createdAt");
-- Do not invent past events for existing accounts.
