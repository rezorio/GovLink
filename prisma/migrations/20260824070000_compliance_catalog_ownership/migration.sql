-- Municipal catalog ownership: system rows (municipality_id null) + LGU-owned additions
ALTER TABLE "compliance_requirements" ADD COLUMN "municipality_id" TEXT;
ALTER TABLE "compliance_requirements" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "compliance_requirements"
  ADD CONSTRAINT "compliance_requirements_municipality_id_fkey"
  FOREIGN KEY ("municipality_id") REFERENCES "municipalities"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "compliance_requirements_municipality_id_is_active_idx"
  ON "compliance_requirements"("municipality_id", "is_active");
