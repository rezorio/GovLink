import { SglgPillar } from '@prisma/client';

export type SglgOutcome = 'innovation' | 'fiscal_management' | 'crisis_resilience';

export type SglgPillarMeta = {
    pillar: SglgPillar;
    label: string;
    outcome: SglgOutcome;
};

/** RA 11292 ten governance areas — display order for dashboards. */
export const SGLG_PILLARS: SglgPillarMeta[] = [
    {
        pillar: SglgPillar.FINANCIAL_ADMINISTRATION,
        label: 'Financial Administration',
        outcome: 'fiscal_management',
    },
    {
        pillar: SglgPillar.DISASTER_PREPAREDNESS,
        label: 'Disaster Preparedness',
        outcome: 'crisis_resilience',
    },
    {
        pillar: SglgPillar.SOCIAL_PROTECTION,
        label: 'Social Protection and Sensitivity',
        outcome: 'crisis_resilience',
    },
    {
        pillar: SglgPillar.HEALTH_COMPLIANCE,
        label: 'Health Compliance and Responsiveness',
        outcome: 'crisis_resilience',
    },
    {
        pillar: SglgPillar.SUSTAINABLE_EDUCATION,
        label: 'Sustainable Education',
        outcome: 'innovation',
    },
    {
        pillar: SglgPillar.BUSINESS_FRIENDLINESS,
        label: 'Business-Friendliness and Competitiveness',
        outcome: 'innovation',
    },
    {
        pillar: SglgPillar.SAFETY_PEACE_ORDER,
        label: 'Safety, Peace and Order',
        outcome: 'crisis_resilience',
    },
    {
        pillar: SglgPillar.ENVIRONMENTAL_MANAGEMENT,
        label: 'Environmental Management',
        outcome: 'crisis_resilience',
    },
    {
        pillar: SglgPillar.TOURISM_CULTURE,
        label: 'Tourism, Heritage, Culture and the Arts',
        outcome: 'innovation',
    },
    {
        pillar: SglgPillar.YOUTH_DEVELOPMENT,
        label: 'Youth Development',
        outcome: 'innovation',
    },
];

export function sglgPillarLabel(pillar: SglgPillar): string {
    return SGLG_PILLARS.find((row) => row.pillar === pillar)?.label ?? pillar;
}
