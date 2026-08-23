-- AlterTable
ALTER TABLE "evidence_submissions" ADD COLUMN "captured_at" TIMESTAMP(3),
ADD COLUMN "latitude" DOUBLE PRECISION,
ADD COLUMN "longitude" DOUBLE PRECISION,
ADD COLUMN "location_accuracy_meters" DOUBLE PRECISION;
