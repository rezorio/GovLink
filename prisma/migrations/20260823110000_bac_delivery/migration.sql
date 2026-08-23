-- AlterEnum
ALTER TYPE "ProcurementDocType" ADD VALUE 'DELIVERY_RECEIPT';
ALTER TYPE "ProcurementDocType" ADD VALUE 'INSPECTION_ACCEPTANCE';

-- CreateEnum
CREATE TYPE "BacDesignation" AS ENUM ('CHAIR', 'VICE_CHAIR', 'MEMBER');

-- CreateTable
CREATE TABLE "bac_members" (
    "id" TEXT NOT NULL,
    "municipality_id" TEXT NOT NULL,
    "barangay_id" TEXT NOT NULL,
    "user_id" TEXT,
    "display_name" TEXT NOT NULL,
    "designation" "BacDesignation" NOT NULL,
    "term_start" DATE NOT NULL,
    "designation_date" DATE NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "designated_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bac_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bac_members_barangay_id_is_active_idx" ON "bac_members"("barangay_id", "is_active");

-- CreateIndex
CREATE INDEX "bac_members_municipality_id_barangay_id_idx" ON "bac_members"("municipality_id", "barangay_id");

-- AddForeignKey
ALTER TABLE "bac_members" ADD CONSTRAINT "bac_members_municipality_id_fkey" FOREIGN KEY ("municipality_id") REFERENCES "municipalities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "bac_members" ADD CONSTRAINT "bac_members_barangay_id_fkey" FOREIGN KEY ("barangay_id") REFERENCES "barangays"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "bac_members" ADD CONSTRAINT "bac_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "bac_members" ADD CONSTRAINT "bac_members_designated_by_id_fkey" FOREIGN KEY ("designated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
