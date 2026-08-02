-- The nullable order-history operation key is already present in the preceding
-- migration. This follow-up hardens specimen invariants at the database boundary.
ALTER TABLE "Specimen"
ADD CONSTRAINT "Specimen_targetVolumeMl_positive_check"
CHECK ("targetVolumeMl" IS NULL OR "targetVolumeMl" > 0),
ADD CONSTRAINT "Specimen_collectedVolumeMl_positive_check"
CHECK ("collectedVolumeMl" IS NULL OR "collectedVolumeMl" > 0),
ADD CONSTRAINT "Specimen_rejection_fields_check"
CHECK (
  (
    "status" = 'REJECTED'
    AND "rejectionReason" IS NOT NULL
    AND "rejectedAt" IS NOT NULL
  )
  OR
  (
    "status" <> 'REJECTED'
    AND "rejectionReason" IS NULL
    AND "rejectionNote" IS NULL
    AND "rejectedAt" IS NULL
    AND "recollectionRequired" = false
  )
);

ALTER TABLE "SpecimenCustodyEvent"
ADD CONSTRAINT "SpecimenCustodyEvent_actor_check"
CHECK (
  (
    "actorType" = 'SYSTEM'
    AND "actorStaffUserId" IS NULL
    AND "actorCollectorProfileId" IS NULL
  )
  OR
  (
    "actorType" IN ('ADMIN', 'LAB_STAFF')
    AND "actorStaffUserId" IS NOT NULL
    AND "actorCollectorProfileId" IS NULL
  )
  OR
  (
    "actorType" = 'COLLECTOR'
    AND "actorStaffUserId" IS NOT NULL
    AND "actorCollectorProfileId" IS NOT NULL
  )
);
