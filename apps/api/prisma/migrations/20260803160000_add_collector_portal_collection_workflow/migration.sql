-- CreateEnum
CREATE TYPE "SubjectSex" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "CollectionAttemptStatus" AS ENUM ('ON_THE_WAY', 'COLLECTED', 'IN_TRANSIT', 'FAILED');

-- CreateEnum
CREATE TYPE "CollectionFailureReason" AS ENUM ('PATIENT_UNAVAILABLE', 'IDENTITY_MISMATCH', 'PATIENT_DECLINED', 'UNSAFE_ENVIRONMENT', 'COLLECTION_NOT_POSSIBLE', 'OTHER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OrderStatus" ADD VALUE 'COLLECTOR_ON_THE_WAY';
ALTER TYPE "OrderStatus" ADD VALUE 'COLLECTED';
ALTER TYPE "OrderStatus" ADD VALUE 'IN_TRANSIT';

-- CreateTable
CREATE TABLE "OrderSubject" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "dateOfBirth" DATE NOT NULL,
    "sex" "SubjectSex" NOT NULL,
    "relationshipToContact" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderSubject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionAttempt" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "collectorProfileId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "status" "CollectionAttemptStatus" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "collectedAt" TIMESTAMP(3),
    "inTransitAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" "CollectionFailureReason",
    "failureNote" TEXT,
    "identityVerifiedAt" TIMESTAMP(3),
    "consentConfirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollectionAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrderSubject_orderId_key" ON "OrderSubject"("orderId");

-- CreateIndex
CREATE INDEX "CollectionAttempt_orderId_idx" ON "CollectionAttempt"("orderId");

-- CreateIndex
CREATE INDEX "CollectionAttempt_collectorProfileId_idx" ON "CollectionAttempt"("collectorProfileId");

-- CreateIndex
CREATE INDEX "CollectionAttempt_status_idx" ON "CollectionAttempt"("status");

-- CreateIndex
CREATE INDEX "CollectionAttempt_startedAt_idx" ON "CollectionAttempt"("startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionAttempt_orderId_attemptNumber_key" ON "CollectionAttempt"("orderId", "attemptNumber");

-- AddForeignKey
ALTER TABLE "OrderSubject" ADD CONSTRAINT "OrderSubject_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionAttempt" ADD CONSTRAINT "CollectionAttempt_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionAttempt" ADD CONSTRAINT "CollectionAttempt_collectorProfileId_fkey" FOREIGN KEY ("collectorProfileId") REFERENCES "CollectorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "CollectorAssignmentHistory_previousCollectorProfileId_createdAt" RENAME TO "CollectorAssignmentHistory_previousCollectorProfileId_creat_idx";
