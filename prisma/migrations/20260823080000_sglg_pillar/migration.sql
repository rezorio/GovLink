-- CreateEnum
CREATE TYPE "SglgPillar" AS ENUM (
  'FINANCIAL_ADMINISTRATION',
  'DISASTER_PREPAREDNESS',
  'SOCIAL_PROTECTION',
  'HEALTH_COMPLIANCE',
  'SUSTAINABLE_EDUCATION',
  'BUSINESS_FRIENDLINESS',
  'SAFETY_PEACE_ORDER',
  'ENVIRONMENTAL_MANAGEMENT',
  'TOURISM_CULTURE',
  'YOUTH_DEVELOPMENT'
);

-- AlterTable
ALTER TABLE "compliance_requirements" ADD COLUMN "sglg_pillar" "SglgPillar";

-- CreateIndex
CREATE INDEX "compliance_requirements_sglg_pillar_idx" ON "compliance_requirements"("sglg_pillar");
