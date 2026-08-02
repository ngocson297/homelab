-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'RECEIVED_AT_LAB';

-- CreateEnum
CREATE TYPE "SpecimenStatus" AS ENUM ('PLANNED', 'LABELED', 'COLLECTED', 'IN_TRANSIT', 'RECEIVED', 'ACCEPTED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SpecimenRejectionReason" AS ENUM ('HEMOLYZED', 'CLOTTED', 'INSUFFICIENT_VOLUME', 'WRONG_CONTAINER', 'UNLABELED', 'LABEL_MISMATCH', 'LEAKING', 'TRANSPORT_TEMPERATURE_FAILED', 'TRANSPORT_DELAYED', 'DAMAGED', 'OTHER');

-- CreateEnum
CREATE TYPE "SpecimenCustodyEventType" AS ENUM ('SPECIMEN_PLANNED', 'LABEL_GENERATED', 'LABEL_PRINTED', 'SPECIMEN_COLLECTED', 'HANDED_TO_TRANSPORT', 'RECEIVED_AT_LAB', 'SPECIMEN_ACCEPTED', 'SPECIMEN_REJECTED');

-- CreateEnum
CREATE TYPE "CustodyActorType" AS ENUM ('SYSTEM', 'ADMIN', 'COLLECTOR', 'LAB_STAFF');

-- Lab test collection configuration
ALTER TABLE "LabTest"
ADD COLUMN "collectionGroupKey" TEXT,
ADD COLUMN "targetCollectionVolumeMl" DECIMAL(6,2),
ADD COLUMN "specimenPreparationInstruction" TEXT,
ADD COLUMN "transportInstruction" TEXT,
ADD COLUMN "specimenStabilityHours" INTEGER;

-- Immutable order-item collection snapshots. Existing data is backfilled without
-- changing the original orders or inferring a collection group.
ALTER TABLE "OrderItem"
ADD COLUMN "containerTypeSnapshot" TEXT,
ADD COLUMN "collectionGroupKeySnapshot" TEXT,
ADD COLUMN "targetCollectionVolumeMlSnapshot" DECIMAL(6,2),
ADD COLUMN "preparationInstructionSnapshot" TEXT,
ADD COLUMN "transportInstructionSnapshot" TEXT;

UPDATE "OrderItem" AS oi
SET "containerTypeSnapshot" = lt."containerType"
FROM "LabTest" AS lt
WHERE lt."id" = oi."labTestId";

ALTER TABLE "OrderItem" ALTER COLUMN "containerTypeSnapshot" SET NOT NULL;

-- Order-level laboratory intake flags
ALTER TABLE "Order" ADD COLUMN "requiresRecollection" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Specimen" (
    "id" TEXT NOT NULL,
    "specimenCode" TEXT NOT NULL,
    "barcodeValue" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "SpecimenStatus" NOT NULL,
    "specimenType" TEXT NOT NULL,
    "containerType" TEXT NOT NULL,
    "collectionGroupKey" TEXT,
    "targetVolumeMl" DECIMAL(6,2),
    "collectedVolumeMl" DECIMAL(6,2),
    "requiresManualReview" BOOLEAN NOT NULL DEFAULT false,
    "collectedAt" TIMESTAMP(3),
    "collectedByCollectorProfileId" TEXT,
    "inTransitAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "receivedByStaffUserId" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" "SpecimenRejectionReason",
    "rejectionNote" TEXT,
    "recollectionRequired" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Specimen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpecimenOrderItem" (
    "id" TEXT NOT NULL,
    "specimenId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SpecimenOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpecimenCustodyEvent" (
    "id" TEXT NOT NULL,
    "specimenId" TEXT NOT NULL,
    "eventType" "SpecimenCustodyEventType" NOT NULL,
    "actorType" "CustodyActorType" NOT NULL,
    "actorStaffUserId" TEXT,
    "actorCollectorProfileId" TEXT,
    "operationId" UUID NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SpecimenCustodyEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Specimen_specimenCode_key" ON "Specimen"("specimenCode");
CREATE UNIQUE INDEX "Specimen_barcodeValue_key" ON "Specimen"("barcodeValue");
CREATE INDEX "Specimen_orderId_idx" ON "Specimen"("orderId");
CREATE INDEX "Specimen_status_idx" ON "Specimen"("status");
CREATE INDEX "Specimen_collectedByCollectorProfileId_idx" ON "Specimen"("collectedByCollectorProfileId");
CREATE INDEX "Specimen_receivedByStaffUserId_idx" ON "Specimen"("receivedByStaffUserId");

CREATE UNIQUE INDEX "SpecimenOrderItem_orderItemId_key" ON "SpecimenOrderItem"("orderItemId");
CREATE INDEX "SpecimenOrderItem_specimenId_idx" ON "SpecimenOrderItem"("specimenId");
CREATE UNIQUE INDEX "SpecimenOrderItem_specimenId_orderItemId_key" ON "SpecimenOrderItem"("specimenId", "orderItemId");

CREATE INDEX "SpecimenCustodyEvent_specimenId_occurredAt_idx" ON "SpecimenCustodyEvent"("specimenId", "occurredAt");
CREATE INDEX "SpecimenCustodyEvent_actorStaffUserId_occurredAt_idx" ON "SpecimenCustodyEvent"("actorStaffUserId", "occurredAt");
CREATE INDEX "SpecimenCustodyEvent_actorCollectorProfileId_occurredAt_idx" ON "SpecimenCustodyEvent"("actorCollectorProfileId", "occurredAt");
CREATE UNIQUE INDEX "SpecimenCustodyEvent_specimenId_eventType_operationId_key" ON "SpecimenCustodyEvent"("specimenId", "eventType", "operationId");

ALTER TABLE "Specimen" ADD CONSTRAINT "Specimen_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Specimen" ADD CONSTRAINT "Specimen_collectedByCollectorProfileId_fkey" FOREIGN KEY ("collectedByCollectorProfileId") REFERENCES "CollectorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Specimen" ADD CONSTRAINT "Specimen_receivedByStaffUserId_fkey" FOREIGN KEY ("receivedByStaffUserId") REFERENCES "StaffUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SpecimenOrderItem" ADD CONSTRAINT "SpecimenOrderItem_specimenId_fkey" FOREIGN KEY ("specimenId") REFERENCES "Specimen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SpecimenOrderItem" ADD CONSTRAINT "SpecimenOrderItem_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SpecimenCustodyEvent" ADD CONSTRAINT "SpecimenCustodyEvent_specimenId_fkey" FOREIGN KEY ("specimenId") REFERENCES "Specimen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SpecimenCustodyEvent" ADD CONSTRAINT "SpecimenCustodyEvent_actorStaffUserId_fkey" FOREIGN KEY ("actorStaffUserId") REFERENCES "StaffUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SpecimenCustodyEvent" ADD CONSTRAINT "SpecimenCustodyEvent_actorCollectorProfileId_fkey" FOREIGN KEY ("actorCollectorProfileId") REFERENCES "CollectorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
