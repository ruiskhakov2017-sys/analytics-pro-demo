ALTER TABLE "Transaction" ADD COLUMN "department" TEXT NOT NULL DEFAULT 'GENERAL';
ALTER TABLE "Transaction" ADD CONSTRAINT "valid_department" CHECK ("department" IN ('GENERAL','FARMING','MEDIABUYING'));
