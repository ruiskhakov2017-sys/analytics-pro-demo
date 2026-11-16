CREATE TABLE "AccountLimitEvent" (
  "id" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "limit" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AccountLimitEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "account_limit_nonnegative" CHECK ("limit" >= 0),
  CONSTRAINT "AccountLimitEvent_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "AccountLimitEvent_accountId_createdAt_idx"
  ON "AccountLimitEvent"("accountId", "createdAt");
