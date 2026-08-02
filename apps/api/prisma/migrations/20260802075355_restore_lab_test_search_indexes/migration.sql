-- CreateIndex
CREATE INDEX "LabTest_code_trgm_idx" ON "LabTest" USING GIN ("code" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "LabTest_name_trgm_idx" ON "LabTest" USING GIN ("name" gin_trgm_ops);
