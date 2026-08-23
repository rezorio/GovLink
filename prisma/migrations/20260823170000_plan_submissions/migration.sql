-- AlterEnum
ALTER TYPE "NotificationKind" ADD VALUE 'PLAN_SUBMITTED';
ALTER TYPE "NotificationKind" ADD VALUE 'PLAN_ACCEPTED';
ALTER TYPE "NotificationKind" ADD VALUE 'PLAN_RETURNED';

-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('BDP', 'AIP');

-- CreateEnum
CREATE TYPE "PlanSubmissionStatus" AS ENUM ('NOT_STARTED', 'DRAFT', 'SUBMITTED', 'ACCEPTED', 'RETURNED');

-- CreateTable
CREATE TABLE "plan_submissions" (
    "id" TEXT NOT NULL,
    "municipality_id" TEXT NOT NULL,
    "barangay_id" TEXT NOT NULL,
    "plan_type" "PlanType" NOT NULL,
    "period_label" TEXT NOT NULL,
    "due_date" DATE NOT NULL,
    "status" "PlanSubmissionStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "title" TEXT,
    "notes" TEXT,
    "file_key" TEXT,
    "file_name" TEXT,
    "submitted_at" TIMESTAMP(3),
    "submitted_by_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by_id" TEXT,
    "return_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "plan_submissions_municipality_id_plan_type_period_label_idx" ON "plan_submissions"("municipality_id", "plan_type", "period_label");

-- CreateIndex
CREATE INDEX "plan_submissions_barangay_id_status_idx" ON "plan_submissions"("barangay_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "plan_submissions_barangay_id_plan_type_period_label_key" ON "plan_submissions"("barangay_id", "plan_type", "period_label");

-- AddForeignKey
ALTER TABLE "plan_submissions" ADD CONSTRAINT "plan_submissions_municipality_id_fkey" FOREIGN KEY ("municipality_id") REFERENCES "municipalities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_submissions" ADD CONSTRAINT "plan_submissions_barangay_id_fkey" FOREIGN KEY ("barangay_id") REFERENCES "barangays"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_submissions" ADD CONSTRAINT "plan_submissions_submitted_by_id_fkey" FOREIGN KEY ("submitted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_submissions" ADD CONSTRAINT "plan_submissions_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
