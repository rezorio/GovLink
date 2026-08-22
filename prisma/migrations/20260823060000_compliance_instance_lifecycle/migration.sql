-- AlterTable
ALTER TABLE "compliance_instances" ADD COLUMN "submitted_by_id" TEXT;
ALTER TABLE "compliance_instances" ADD COLUMN "return_reason" TEXT;

-- AddForeignKey
ALTER TABLE "compliance_instances"
  ADD CONSTRAINT "compliance_instances_submitted_by_id_fkey"
  FOREIGN KEY ("submitted_by_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
