-- Drop geotag columns; provenance is tenant barangay_id on the submission row.
ALTER TABLE "evidence_submissions" DROP COLUMN IF EXISTS "captured_at",
DROP COLUMN IF EXISTS "latitude",
DROP COLUMN IF EXISTS "longitude",
DROP COLUMN IF EXISTS "location_accuracy_meters";
