ALTER TABLE "Order" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "staffUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityReference" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdminAuditLog_staffUserId_createdAt_idx" ON "AdminAuditLog"("staffUserId", "createdAt");
CREATE INDEX "AdminAuditLog_entityType_entityReference_createdAt_idx" ON "AdminAuditLog"("entityType", "entityReference", "createdAt");
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_staffUserId_fkey" FOREIGN KEY ("staffUserId") REFERENCES "StaffUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
