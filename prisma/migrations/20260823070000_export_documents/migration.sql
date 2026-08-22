-- CreateEnum
CREATE TYPE "ExportFormat" AS ENUM ('PDF', 'XLSX');

-- CreateTable
CREATE TABLE "export_documents" (
  "id" TEXT NOT NULL,
  "document_token" TEXT NOT NULL,
  "content_hash" TEXT NOT NULL,
  "report_type" TEXT NOT NULL,
  "format" "ExportFormat" NOT NULL,
  "municipality_id" TEXT NOT NULL,
  "barangay_id" TEXT,
  "generated_by_id" TEXT NOT NULL,
  "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revoked_at" TIMESTAMP(3),
  "revoke_reason" TEXT,
  "period_label" TEXT,

  CONSTRAINT "export_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "export_documents_document_token_key" ON "export_documents"("document_token");

-- CreateIndex
CREATE INDEX "export_documents_municipality_id_generated_at_idx"
  ON "export_documents"("municipality_id", "generated_at");

-- CreateIndex
CREATE INDEX "export_documents_municipality_id_report_type_period_label_idx"
  ON "export_documents"("municipality_id", "report_type", "period_label");

-- CreateIndex
CREATE INDEX "export_documents_municipality_id_barangay_id_idx"
  ON "export_documents"("municipality_id", "barangay_id");

-- CreateIndex
CREATE INDEX "export_documents_content_hash_idx" ON "export_documents"("content_hash");

-- AddForeignKey
ALTER TABLE "export_documents"
  ADD CONSTRAINT "export_documents_municipality_id_fkey"
  FOREIGN KEY ("municipality_id") REFERENCES "municipalities"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "export_documents"
  ADD CONSTRAINT "export_documents_barangay_id_fkey"
  FOREIGN KEY ("barangay_id") REFERENCES "barangays"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "export_documents"
  ADD CONSTRAINT "export_documents_generated_by_id_fkey"
  FOREIGN KEY ("generated_by_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
