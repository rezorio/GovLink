-- AlterEnum
ALTER TYPE "ContractStatus" ADD VALUE 'RFQ_ISSUED';
ALTER TYPE "ContractStatus" ADD VALUE 'QUOTATIONS_RECEIVED';
ALTER TYPE "ContractStatus" ADD VALUE 'EVALUATION';
ALTER TYPE "ContractStatus" ADD VALUE 'AWARD_RECOMMENDED';

-- CreateEnum
CREATE TYPE "ProcurementDocType" AS ENUM (
  'RFQ',
  'QUOTATION',
  'ABSTRACT',
  'BAC_RESOLUTION',
  'NOTICE_OF_AWARD',
  'CONTRACT_DOC'
);

-- CreateTable
CREATE TABLE "procurement_documents" (
  "id" TEXT NOT NULL,
  "municipality_id" TEXT NOT NULL,
  "barangay_id" TEXT NOT NULL,
  "contract_id" TEXT NOT NULL,
  "doc_type" "ProcurementDocType" NOT NULL,
  "title" TEXT NOT NULL,
  "file_key" TEXT,
  "file_name" TEXT,
  "mime_type" TEXT,
  "file_size_bytes" INTEGER,
  "content_sha256" TEXT,
  "notes" TEXT,
  "quotation_supplier_name" TEXT,
  "quotation_amount_centavos" BIGINT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "voided_at" TIMESTAMP(3),
  "void_reason" TEXT,
  "voided_by_id" TEXT,
  "uploaded_by_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "procurement_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "procurement_documents_contract_id_doc_type_idx"
  ON "procurement_documents"("contract_id", "doc_type");

CREATE INDEX "procurement_documents_municipality_id_barangay_id_idx"
  ON "procurement_documents"("municipality_id", "barangay_id");

CREATE INDEX "procurement_documents_contract_id_voided_at_idx"
  ON "procurement_documents"("contract_id", "voided_at");

-- AddForeignKey
ALTER TABLE "procurement_documents"
  ADD CONSTRAINT "procurement_documents_municipality_id_fkey"
  FOREIGN KEY ("municipality_id") REFERENCES "municipalities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "procurement_documents"
  ADD CONSTRAINT "procurement_documents_barangay_id_fkey"
  FOREIGN KEY ("barangay_id") REFERENCES "barangays"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "procurement_documents"
  ADD CONSTRAINT "procurement_documents_contract_id_fkey"
  FOREIGN KEY ("contract_id") REFERENCES "procurement_contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "procurement_documents"
  ADD CONSTRAINT "procurement_documents_uploaded_by_id_fkey"
  FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "procurement_documents"
  ADD CONSTRAINT "procurement_documents_voided_by_id_fkey"
  FOREIGN KEY ("voided_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
