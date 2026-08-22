-- CreateEnum
CREATE TYPE "ComplianceFrequency" AS ENUM ('SEMESTRAL', 'ANNUAL', 'TERM', 'ONGOING', 'AD_HOC', 'MONTHLY');

-- CreateEnum
CREATE TYPE "ComplianceScope" AS ENUM ('BARANGAY', 'MUNICIPAL');

-- CreateEnum
CREATE TYPE "ComplianceCategory" AS ENUM ('ADMINISTRATIVE', 'SOCIAL', 'YOUTH', 'MUNICIPAL_SUPERVISION');

-- CreateTable
CREATE TABLE "compliance_requirements" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "legal_basis" TEXT NOT NULL,
    "category" "ComplianceCategory" NOT NULL,
    "frequency" "ComplianceFrequency" NOT NULL,
    "evidence_types" TEXT[],
    "weight" INTEGER NOT NULL DEFAULT 1,
    "scope" "ComplianceScope" NOT NULL DEFAULT 'BARANGAY',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "compliance_requirements_code_key" ON "compliance_requirements"("code");

-- CreateIndex
CREATE INDEX "compliance_requirements_category_scope_idx" ON "compliance_requirements"("category", "scope");
