-- Preserve existing DRAFT values while adopting the public-facing initial status.
ALTER TYPE "OrderStatus" RENAME VALUE 'DRAFT' TO 'PENDING_CONFIRMATION';

ALTER TABLE "Order"
ALTER COLUMN "status" SET DEFAULT 'PENDING_CONFIRMATION';

CREATE TABLE "OrderStatusHistory" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderStatusHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrderStatusHistory_orderId_occurredAt_idx"
ON "OrderStatusHistory"("orderId", "occurredAt");

ALTER TABLE "OrderStatusHistory"
ADD CONSTRAINT "OrderStatusHistory_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill exactly one synthetic, non-sensitive event for every existing order.
INSERT INTO "OrderStatusHistory" (
    "id", "orderId", "status", "title", "description", "occurredAt", "createdAt"
)
SELECT
    CONCAT(
      SUBSTRING(MD5(o."id") FROM 1 FOR 8), '-',
      SUBSTRING(MD5(o."id") FROM 9 FOR 4), '-',
      SUBSTRING(MD5(o."id") FROM 13 FOR 4), '-',
      SUBSTRING(MD5(o."id") FROM 17 FOR 4), '-',
      SUBSTRING(MD5(o."id") FROM 21 FOR 12)
    ),
    o."id",
    o."status",
    CASE o."status"
      WHEN 'CONFIRMED' THEN 'Đơn đã được xác nhận'
      WHEN 'CANCELLED' THEN 'Đơn đã được hủy'
      ELSE 'Đã tiếp nhận yêu cầu'
    END,
    NULL,
    o."createdAt",
    o."createdAt"
FROM "Order" o
WHERE NOT EXISTS (
    SELECT 1 FROM "OrderStatusHistory" h WHERE h."orderId" = o."id"
);
