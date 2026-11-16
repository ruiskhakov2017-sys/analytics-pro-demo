ALTER TABLE "AuditEvent"
ADD COLUMN "entityType" TEXT NOT NULL DEFAULT 'finance',
ADD COLUMN "oldValue" TEXT,
ADD COLUMN "newValue" TEXT;
