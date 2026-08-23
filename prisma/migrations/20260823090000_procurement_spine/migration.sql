-- CreateEnum
CREATE TYPE "ProcurementRegime" AS ENUM ('RA9184', 'RA12009');

-- CreateEnum
CREATE TYPE "IncomeClass" AS ENUM (
  'BARANGAY',
  'MUNICIPALITY_1ST',
  'MUNICIPALITY_2ND',
  'MUNICIPALITY_3RD',
  'MUNICIPALITY_4TH',
  'MUNICIPALITY_5TH',
  'CITY',
  'PROVINCE'
);

-- CreateEnum
CREATE TYPE "ProcurementMode" AS ENUM ('SHOPPING', 'SVP', 'COMPETITIVE_BIDDING', 'DIRECT');

-- CreateEnum
CREATE TYPE "AppLineStatus" AS ENUM ('DRAFT', 'APPROVED');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'PLANNED', 'AWARDED', 'ACTIVE', 'COMPLETED');

-- AlterTable
ALTER TABLE "municipalities"
  ADD COLUMN "income_class" "IncomeClass" NOT NULL DEFAULT 'MUNICIPALITY_4TH',
  ADD COLUMN "procurement_regime" "ProcurementRegime" NOT NULL DEFAULT 'RA12009';

-- CreateTable
CREATE TABLE "procurement_thresholds" (
  "id" TEXT NOT NULL,
  "regime" "ProcurementRegime" NOT NULL,
  "income_class" "IncomeClass" NOT NULL,
  "mode" "ProcurementMode" NOT NULL,
  "max_amount_centavos" BIGINT NOT NULL,
  "effective_from" DATE NOT NULL,
  "gppb_reference" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "procurement_thresholds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_line_items" (
  "id" TEXT NOT NULL,
  "municipality_id" TEXT NOT NULL,
  "barangay_id" TEXT NOT NULL,
  "fiscal_year" INTEGER NOT NULL,
  "code" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "approved_amount_centavos" BIGINT NOT NULL,
  "status" "AppLineStatus" NOT NULL DEFAULT 'DRAFT',
  "sglg_pillar" "SglgPillar" NOT NULL DEFAULT 'FINANCIAL_ADMINISTRATION',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "app_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procurement_contracts" (
  "id" TEXT NOT NULL,
  "municipality_id" TEXT NOT NULL,
  "barangay_id" TEXT NOT NULL,
  "app_line_item_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "supplier_name" TEXT NOT NULL,
  "amount_centavos" BIGINT NOT NULL,
  "mode" "ProcurementMode" NOT NULL,
  "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
  "fiscal_year" INTEGER NOT NULL,
  "category" TEXT NOT NULL,
  "splitting_risk_score" INTEGER,
  "splitting_flagged" BOOLEAN NOT NULL DEFAULT false,
  "splitting_acknowledged_at" TIMESTAMP(3),
  "splitting_acknowledged_by_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "procurement_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "procurement_thresholds_regime_income_class_mode_effective_from_key"
  ON "procurement_thresholds"("regime", "income_class", "mode", "effective_from");

CREATE INDEX "procurement_thresholds_regime_income_class_mode_idx"
  ON "procurement_thresholds"("regime", "income_class", "mode");

CREATE UNIQUE INDEX "app_line_items_barangay_id_fiscal_year_code_key"
  ON "app_line_items"("barangay_id", "fiscal_year", "code");

CREATE INDEX "app_line_items_municipality_id_fiscal_year_idx"
  ON "app_line_items"("municipality_id", "fiscal_year");

CREATE INDEX "app_line_items_barangay_id_fiscal_year_idx"
  ON "app_line_items"("barangay_id", "fiscal_year");

CREATE INDEX "procurement_contracts_barangay_id_fiscal_year_idx"
  ON "procurement_contracts"("barangay_id", "fiscal_year");

CREATE INDEX "procurement_contracts_municipality_id_fiscal_year_status_idx"
  ON "procurement_contracts"("municipality_id", "fiscal_year", "status");

CREATE INDEX "procurement_contracts_municipality_id_splitting_flagged_idx"
  ON "procurement_contracts"("municipality_id", "splitting_flagged");

CREATE INDEX "procurement_contracts_barangay_id_category_fiscal_year_idx"
  ON "procurement_contracts"("barangay_id", "category", "fiscal_year");

-- AddForeignKey
ALTER TABLE "app_line_items"
  ADD CONSTRAINT "app_line_items_municipality_id_fkey"
  FOREIGN KEY ("municipality_id") REFERENCES "municipalities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "app_line_items"
  ADD CONSTRAINT "app_line_items_barangay_id_fkey"
  FOREIGN KEY ("barangay_id") REFERENCES "barangays"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "procurement_contracts"
  ADD CONSTRAINT "procurement_contracts_municipality_id_fkey"
  FOREIGN KEY ("municipality_id") REFERENCES "municipalities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "procurement_contracts"
  ADD CONSTRAINT "procurement_contracts_barangay_id_fkey"
  FOREIGN KEY ("barangay_id") REFERENCES "barangays"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "procurement_contracts"
  ADD CONSTRAINT "procurement_contracts_app_line_item_id_fkey"
  FOREIGN KEY ("app_line_item_id") REFERENCES "app_line_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "procurement_contracts"
  ADD CONSTRAINT "procurement_contracts_splitting_acknowledged_by_id_fkey"
  FOREIGN KEY ("splitting_acknowledged_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
