-- AlterEnum
ALTER TYPE "NotificationKind" ADD VALUE 'ASSEMBLY_SUBMITTED';
ALTER TYPE "NotificationKind" ADD VALUE 'ASSEMBLY_ACCEPTED';
ALTER TYPE "NotificationKind" ADD VALUE 'ASSEMBLY_RETURNED';

-- CreateEnum
CREATE TYPE "AssemblySemester" AS ENUM ('H1', 'H2');

-- CreateEnum
CREATE TYPE "AssemblySubmissionStatus" AS ENUM ('NOT_STARTED', 'DRAFT', 'SUBMITTED', 'ACCEPTED', 'RETURNED');

-- CreateTable
CREATE TABLE "assembly_submissions" (
    "id" TEXT NOT NULL,
    "municipality_id" TEXT NOT NULL,
    "barangay_id" TEXT NOT NULL,
    "semester" "AssemblySemester" NOT NULL,
    "period_label" TEXT NOT NULL,
    "due_date" DATE NOT NULL,
    "status" "AssemblySubmissionStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "title" TEXT,
    "notes" TEXT,
    "held_at" DATE,
    "venue" TEXT,
    "attendance_count" INTEGER,
    "file_key" TEXT,
    "file_name" TEXT,
    "submitted_at" TIMESTAMP(3),
    "submitted_by_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by_id" TEXT,
    "return_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assembly_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assembly_submissions_municipality_id_period_label_idx" ON "assembly_submissions"("municipality_id", "period_label");

-- CreateIndex
CREATE INDEX "assembly_submissions_barangay_id_status_idx" ON "assembly_submissions"("barangay_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "assembly_submissions_barangay_id_period_label_key" ON "assembly_submissions"("barangay_id", "period_label");

-- AddForeignKey
ALTER TABLE "assembly_submissions" ADD CONSTRAINT "assembly_submissions_municipality_id_fkey" FOREIGN KEY ("municipality_id") REFERENCES "municipalities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assembly_submissions" ADD CONSTRAINT "assembly_submissions_barangay_id_fkey" FOREIGN KEY ("barangay_id") REFERENCES "barangays"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assembly_submissions" ADD CONSTRAINT "assembly_submissions_submitted_by_id_fkey" FOREIGN KEY ("submitted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assembly_submissions" ADD CONSTRAINT "assembly_submissions_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
