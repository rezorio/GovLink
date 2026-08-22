-- CreateEnum
CREATE TYPE "ComplianceStatus" AS ENUM (
  'NOT_STARTED',
  'IN_PROGRESS',
  'SUBMITTED',
  'UNDER_REVIEW',
  'ACCEPTED',
  'RETURNED',
  'OVERDUE'
);

-- CreateTable
CREATE TABLE "compliance_instances" (
  "id" TEXT NOT NULL,
  "municipality_id" TEXT NOT NULL,
  "barangay_id" TEXT NOT NULL,
  "requirement_id" TEXT NOT NULL,
  "period_label" TEXT NOT NULL,
  "due_date" DATE NOT NULL,
  "status" "ComplianceStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "submitted_at" TIMESTAMP(3),
  "reviewed_at" TIMESTAMP(3),
  "reviewed_by_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "compliance_instances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "compliance_instances_municipality_id_barangay_id_status_idx"
  ON "compliance_instances"("municipality_id", "barangay_id", "status");

-- CreateIndex
CREATE INDEX "compliance_instances_municipality_id_period_label_idx"
  ON "compliance_instances"("municipality_id", "period_label");

-- CreateIndex
CREATE INDEX "compliance_instances_barangay_id_status_due_date_idx"
  ON "compliance_instances"("barangay_id", "status", "due_date");

-- CreateIndex
CREATE UNIQUE INDEX "compliance_instances_barangay_id_requirement_id_period_label_key"
  ON "compliance_instances"("barangay_id", "requirement_id", "period_label");

-- AddForeignKey
ALTER TABLE "compliance_instances"
  ADD CONSTRAINT "compliance_instances_municipality_id_fkey"
  FOREIGN KEY ("municipality_id") REFERENCES "municipalities"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "compliance_instances"
  ADD CONSTRAINT "compliance_instances_barangay_id_fkey"
  FOREIGN KEY ("barangay_id") REFERENCES "barangays"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "compliance_instances"
  ADD CONSTRAINT "compliance_instances_requirement_id_fkey"
  FOREIGN KEY ("requirement_id") REFERENCES "compliance_requirements"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "compliance_instances"
  ADD CONSTRAINT "compliance_instances_reviewed_by_id_fkey"
  FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
