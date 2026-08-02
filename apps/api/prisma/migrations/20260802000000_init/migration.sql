-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- EnableExtension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('REQUESTED', 'CONFIRMED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "LabTestStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'REQUESTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabTest" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "specimenType" TEXT NOT NULL,
    "containerType" TEXT NOT NULL,
    "minimumVolumeMl" DECIMAL(6,2),
    "preparationInstruction" TEXT,
    "turnaroundTimeHours" INTEGER NOT NULL,
    "homeCollectable" BOOLEAN NOT NULL DEFAULT false,
    "price" DECIMAL(12,2) NOT NULL,
    "status" "LabTestStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LabTest_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "LabTest_minimumVolumeMl_check" CHECK ("minimumVolumeMl" IS NULL OR "minimumVolumeMl" >= 0),
    CONSTRAINT "LabTest_turnaroundTimeHours_check" CHECK ("turnaroundTimeHours" > 0),
    CONSTRAINT "LabTest_price_check" CHECK ("price" >= 0)
);

-- CreateIndex
CREATE INDEX "Booking_scheduledAt_idx" ON "Booking"("scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "LabTest_code_key" ON "LabTest"("code");

-- CreateIndex
CREATE INDEX "LabTest_name_idx" ON "LabTest"("name");

-- CreateIndex
CREATE INDEX "LabTest_homeCollectable_status_idx" ON "LabTest"("homeCollectable", "status");

-- CreateIndex
CREATE INDEX "LabTest_code_trgm_idx" ON "LabTest" USING GIN ("code" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "LabTest_name_trgm_idx" ON "LabTest" USING GIN ("name" gin_trgm_ops);
