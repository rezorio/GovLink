-- CreateEnum
CREATE TYPE "ResidentRecordType" AS ENUM ('RESIDENT', 'KASAMBAHAY');

-- CreateTable
CREATE TABLE "barangay_residents" (
    "id" TEXT NOT NULL,
    "municipality_id" TEXT NOT NULL,
    "barangay_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "address_line" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "birth_year" INTEGER,
    "record_type" "ResidentRecordType" NOT NULL DEFAULT 'RESIDENT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "barangay_residents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "barangay_residents_barangay_id_idx" ON "barangay_residents"("barangay_id");

-- CreateIndex
CREATE INDEX "barangay_residents_municipality_id_barangay_id_idx" ON "barangay_residents"("municipality_id", "barangay_id");

-- AddForeignKey
ALTER TABLE "barangay_residents" ADD CONSTRAINT "barangay_residents_municipality_id_fkey" FOREIGN KEY ("municipality_id") REFERENCES "municipalities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "barangay_residents" ADD CONSTRAINT "barangay_residents_barangay_id_fkey" FOREIGN KEY ("barangay_id") REFERENCES "barangays"("id") ON DELETE CASCADE ON UPDATE CASCADE;
