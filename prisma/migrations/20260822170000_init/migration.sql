-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AppRole" AS ENUM ('MAYOR', 'DEPT_HEAD', 'BARANGAY_CAPTAIN', 'BARANGAY_SECRETARY');

-- CreateEnum
CREATE TYPE "DirectiveCategory" AS ENUM ('DISASTER_PREPAREDNESS', 'FINANCIAL_ADMINISTRATION', 'PEACE_AND_ORDER', 'SOCIAL_PROTECTION', 'ADMINISTRATIVE_GOVERNANCE');

-- CreateEnum
CREATE TYPE "TaskAssignmentStatus" AS ENUM ('PENDING_ACK', 'ACKNOWLEDGED', 'IN_PROGRESS', 'SUBMITTED', 'ACCEPTED', 'RETURNED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "EvidenceSubmissionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'RETURNED');

-- CreateEnum
CREATE TYPE "ReviewDecision" AS ENUM ('ACCEPTED', 'RETURNED');

-- CreateTable
CREATE TABLE "municipalities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "psgc_code" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "municipalities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "barangays" (
    "id" TEXT NOT NULL,
    "municipality_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "psgc_code" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "barangays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "municipality_id" TEXT NOT NULL,
    "barangay_id" TEXT,
    "roles" "AppRole"[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "directive_templates" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "DirectiveCategory" NOT NULL,
    "dilg_mc_number" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "directive_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supervisory_tasks" (
    "id" TEXT NOT NULL,
    "municipality_id" TEXT NOT NULL,
    "directive_template_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "legal_basis" TEXT NOT NULL,
    "assigned_by_id" TEXT NOT NULL,
    "due_date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "supervisory_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_assignments" (
    "id" TEXT NOT NULL,
    "municipality_id" TEXT NOT NULL,
    "barangay_id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "status" "TaskAssignmentStatus" NOT NULL DEFAULT 'PENDING_ACK',
    "acknowledged_at" TIMESTAMP(3),
    "acknowledged_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_submissions" (
    "id" TEXT NOT NULL,
    "municipality_id" TEXT NOT NULL,
    "barangay_id" TEXT NOT NULL,
    "assignment_id" TEXT NOT NULL,
    "file_key" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size_bytes" INTEGER NOT NULL,
    "status" "EvidenceSubmissionStatus" NOT NULL DEFAULT 'DRAFT',
    "submitted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evidence_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "municipal_reviews" (
    "id" TEXT NOT NULL,
    "municipality_id" TEXT NOT NULL,
    "assignment_id" TEXT NOT NULL,
    "submission_id" TEXT,
    "reviewer_id" TEXT NOT NULL,
    "decision" "ReviewDecision" NOT NULL,
    "comment" TEXT,
    "reviewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "municipal_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "municipality_id" TEXT NOT NULL,
    "barangay_id" TEXT,
    "actor_user_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "municipalities_psgc_code_key" ON "municipalities"("psgc_code");

-- CreateIndex
CREATE INDEX "barangays_municipality_id_idx" ON "barangays"("municipality_id");

-- CreateIndex
CREATE UNIQUE INDEX "barangays_municipality_id_psgc_code_key" ON "barangays"("municipality_id", "psgc_code");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_municipality_id_barangay_id_idx" ON "users"("municipality_id", "barangay_id");

-- CreateIndex
CREATE UNIQUE INDEX "directive_templates_dilg_mc_number_key" ON "directive_templates"("dilg_mc_number");

-- CreateIndex
CREATE INDEX "supervisory_tasks_municipality_id_due_date_idx" ON "supervisory_tasks"("municipality_id", "due_date");

-- CreateIndex
CREATE INDEX "task_assignments_municipality_id_barangay_id_status_idx" ON "task_assignments"("municipality_id", "barangay_id", "status");

-- CreateIndex
CREATE INDEX "task_assignments_barangay_id_status_idx" ON "task_assignments"("barangay_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "task_assignments_task_id_barangay_id_key" ON "task_assignments"("task_id", "barangay_id");

-- CreateIndex
CREATE INDEX "evidence_submissions_municipality_id_barangay_id_idx" ON "evidence_submissions"("municipality_id", "barangay_id");

-- CreateIndex
CREATE INDEX "evidence_submissions_assignment_id_idx" ON "evidence_submissions"("assignment_id");

-- CreateIndex
CREATE INDEX "municipal_reviews_municipality_id_assignment_id_idx" ON "municipal_reviews"("municipality_id", "assignment_id");

-- CreateIndex
CREATE INDEX "audit_logs_municipality_id_created_at_idx" ON "audit_logs"("municipality_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- AddForeignKey
ALTER TABLE "barangays" ADD CONSTRAINT "barangays_municipality_id_fkey" FOREIGN KEY ("municipality_id") REFERENCES "municipalities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_municipality_id_fkey" FOREIGN KEY ("municipality_id") REFERENCES "municipalities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_barangay_id_fkey" FOREIGN KEY ("barangay_id") REFERENCES "barangays"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervisory_tasks" ADD CONSTRAINT "supervisory_tasks_municipality_id_fkey" FOREIGN KEY ("municipality_id") REFERENCES "municipalities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervisory_tasks" ADD CONSTRAINT "supervisory_tasks_directive_template_id_fkey" FOREIGN KEY ("directive_template_id") REFERENCES "directive_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervisory_tasks" ADD CONSTRAINT "supervisory_tasks_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_municipality_id_fkey" FOREIGN KEY ("municipality_id") REFERENCES "municipalities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "supervisory_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_barangay_id_fkey" FOREIGN KEY ("barangay_id") REFERENCES "barangays"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_acknowledged_by_id_fkey" FOREIGN KEY ("acknowledged_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_submissions" ADD CONSTRAINT "evidence_submissions_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "task_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "municipal_reviews" ADD CONSTRAINT "municipal_reviews_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "task_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "municipal_reviews" ADD CONSTRAINT "municipal_reviews_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "evidence_submissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "municipal_reviews" ADD CONSTRAINT "municipal_reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_municipality_id_fkey" FOREIGN KEY ("municipality_id") REFERENCES "municipalities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_barangay_id_fkey" FOREIGN KEY ("barangay_id") REFERENCES "barangays"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
