ALTER TYPE "OrderStatus" ADD VALUE 'COLLECTOR_ASSIGNED';

CREATE TYPE "CollectorOperationalStatus" AS ENUM ('AVAILABLE', 'OFF_DUTY', 'INACTIVE');
CREATE TYPE "CollectorAssignmentAction" AS ENUM ('ASSIGNED', 'REASSIGNED', 'UNASSIGNED');

ALTER TABLE "Order" ADD COLUMN "currentCollectorProfileId" TEXT;

CREATE TABLE "CollectorProfile" (
  "id" TEXT NOT NULL,
  "staffUserId" TEXT NOT NULL,
  "employeeCode" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "phoneNormalized" TEXT NOT NULL,
  "operationalStatus" "CollectorOperationalStatus" NOT NULL DEFAULT 'OFF_DUTY',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CollectorProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CollectorServiceArea" (
  "id" TEXT NOT NULL,
  "collectorProfileId" TEXT NOT NULL,
  "province" TEXT NOT NULL,
  "district" TEXT,
  "provinceNormalized" TEXT NOT NULL,
  "districtNormalized" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CollectorServiceArea_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CollectorAssignmentHistory" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "collectorProfileId" TEXT,
  "previousCollectorProfileId" TEXT,
  "action" "CollectorAssignmentAction" NOT NULL,
  "performedByStaffUserId" TEXT NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CollectorAssignmentHistory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CollectorProfile_staffUserId_key" ON "CollectorProfile"("staffUserId");
CREATE UNIQUE INDEX "CollectorProfile_employeeCode_key" ON "CollectorProfile"("employeeCode");
CREATE INDEX "CollectorProfile_employeeCode_idx" ON "CollectorProfile"("employeeCode");
CREATE INDEX "CollectorProfile_phoneNormalized_idx" ON "CollectorProfile"("phoneNormalized");
CREATE INDEX "CollectorProfile_operationalStatus_idx" ON "CollectorProfile"("operationalStatus");
CREATE INDEX "CollectorServiceArea_collectorProfileId_idx" ON "CollectorServiceArea"("collectorProfileId");
CREATE INDEX "CollectorServiceArea_provinceNormalized_districtNormalized_idx" ON "CollectorServiceArea"("provinceNormalized", "districtNormalized");
CREATE UNIQUE INDEX "CollectorServiceArea_normalized_key" ON "CollectorServiceArea"("collectorProfileId", "provinceNormalized", COALESCE("districtNormalized", ''));
CREATE INDEX "CollectorAssignmentHistory_orderId_createdAt_idx" ON "CollectorAssignmentHistory"("orderId", "createdAt");
CREATE INDEX "CollectorAssignmentHistory_collectorProfileId_createdAt_idx" ON "CollectorAssignmentHistory"("collectorProfileId", "createdAt");
CREATE INDEX "CollectorAssignmentHistory_previousCollectorProfileId_createdAt_idx" ON "CollectorAssignmentHistory"("previousCollectorProfileId", "createdAt");
CREATE INDEX "CollectorAssignmentHistory_performedByStaffUserId_createdAt_idx" ON "CollectorAssignmentHistory"("performedByStaffUserId", "createdAt");
CREATE INDEX "Order_currentCollectorProfileId_idx" ON "Order"("currentCollectorProfileId");

ALTER TABLE "CollectorProfile" ADD CONSTRAINT "CollectorProfile_staffUserId_fkey" FOREIGN KEY ("staffUserId") REFERENCES "StaffUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CollectorServiceArea" ADD CONSTRAINT "CollectorServiceArea_collectorProfileId_fkey" FOREIGN KEY ("collectorProfileId") REFERENCES "CollectorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CollectorAssignmentHistory" ADD CONSTRAINT "CollectorAssignmentHistory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CollectorAssignmentHistory" ADD CONSTRAINT "CollectorAssignmentHistory_collectorProfileId_fkey" FOREIGN KEY ("collectorProfileId") REFERENCES "CollectorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CollectorAssignmentHistory" ADD CONSTRAINT "CollectorAssignmentHistory_previousCollectorProfileId_fkey" FOREIGN KEY ("previousCollectorProfileId") REFERENCES "CollectorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CollectorAssignmentHistory" ADD CONSTRAINT "CollectorAssignmentHistory_performedByStaffUserId_fkey" FOREIGN KEY ("performedByStaffUserId") REFERENCES "StaffUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_currentCollectorProfileId_fkey" FOREIGN KEY ("currentCollectorProfileId") REFERENCES "CollectorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
