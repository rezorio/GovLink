import {
    ComplianceCategory,
    ComplianceFrequency,
    ComplianceScope,
    PrismaClient,
    SglgPillar,
} from '@prisma/client';

type CatalogEntry = {
    code: string;
    title: string;
    legalBasis: string;
    category: ComplianceCategory;
    frequency: ComplianceFrequency;
    evidenceTypes: string[];
    weight: number;
    scope: ComplianceScope;
    sglgPillar: SglgPillar;
};

/**
 * Lean municipal catalog â€” same list for every barangay.
 * ADM capped at 6 core administrative obligations for demo clarity.
 */
export const COMPLIANCE_CATALOG: CatalogEntry[] = [
    {
        code: 'ADM-001',
        title: 'Conduct Barangay Assembly (1st sem)',
        legalBasis: 'RA 7160 Sec. 397(b); Proc. 260',
        category: ComplianceCategory.ADMINISTRATIVE,
        frequency: ComplianceFrequency.SEMESTRAL,
        evidenceTypes: ['Minutes', 'Attendance', 'Semestral report'],
        weight: 3,
        scope: ComplianceScope.BARANGAY,
        sglgPillar: SglgPillar.SOCIAL_PROTECTION,
    },
    {
        code: 'ADM-002',
        title: 'Conduct Barangay Assembly (2nd sem)',
        legalBasis: 'RA 7160 Sec. 397(b); Proc. 260',
        category: ComplianceCategory.ADMINISTRATIVE,
        frequency: ComplianceFrequency.SEMESTRAL,
        evidenceTypes: ['Minutes', 'Attendance', 'Semestral report'],
        weight: 3,
        scope: ComplianceScope.BARANGAY,
        sglgPillar: SglgPillar.SOCIAL_PROTECTION,
    },
    {
        code: 'ADM-003',
        title: 'Submit semestral activity & finance report',
        legalBasis: 'RA 7160 Sec. 397(b)',
        category: ComplianceCategory.ADMINISTRATIVE,
        frequency: ComplianceFrequency.SEMESTRAL,
        evidenceTypes: ['Signed report', 'Assembly minutes'],
        weight: 2,
        scope: ComplianceScope.BARANGAY,
        sglgPillar: SglgPillar.FINANCIAL_ADMINISTRATION,
    },
    {
        code: 'ADM-004',
        title: 'Formulate/update Barangay Development Plan',
        legalBasis: 'RA 7160 Sec. 106',
        category: ComplianceCategory.ADMINISTRATIVE,
        frequency: ComplianceFrequency.TERM,
        evidenceTypes: ['SB-approved BDP document'],
        weight: 3,
        scope: ComplianceScope.BARANGAY,
        sglgPillar: SglgPillar.FINANCIAL_ADMINISTRATION,
    },
    {
        code: 'ADM-006',
        title: 'Formulate Annual Investment Program',
        legalBasis: 'IRR Art. 410',
        category: ComplianceCategory.ADMINISTRATIVE,
        frequency: ComplianceFrequency.ANNUAL,
        evidenceTypes: ['SB-approved AIP'],
        weight: 3,
        scope: ComplianceScope.BARANGAY,
        sglgPillar: SglgPillar.FINANCIAL_ADMINISTRATION,
    },
    {
        code: 'ADM-013',
        title: 'Prepare SGBR',
        legalBasis: 'DILG BGPMS',
        category: ComplianceCategory.ADMINISTRATIVE,
        frequency: ComplianceFrequency.ANNUAL,
        evidenceTypes: ['Completed SGBR'],
        weight: 2,
        scope: ComplianceScope.BARANGAY,
        sglgPillar: SglgPillar.FINANCIAL_ADMINISTRATION,
    },
    {
        code: 'MAY-001',
        title: 'Barangay visit/inspection',
        legalBasis: 'RA 7160 Secs. 444/455',
        category: ComplianceCategory.MUNICIPAL_SUPERVISION,
        frequency: ComplianceFrequency.SEMESTRAL,
        evidenceTypes: ['Visit date', 'Findings', 'Counsel given'],
        weight: 2,
        scope: ComplianceScope.MUNICIPAL,
        sglgPillar: SglgPillar.FINANCIAL_ADMINISTRATION,
    },
    {
        code: 'MAY-005',
        title: 'Ensure barangay budget review via LFC',
        legalBasis: 'RA 7160 Sec. 316(f)',
        category: ComplianceCategory.MUNICIPAL_SUPERVISION,
        frequency: ComplianceFrequency.ANNUAL,
        evidenceTypes: ['LFC review record'],
        weight: 2,
        scope: ComplianceScope.MUNICIPAL,
        sglgPillar: SglgPillar.FINANCIAL_ADMINISTRATION,
    },
    {
        code: 'SOC-001',
        title: 'VAWC info/education programs',
        legalBasis: 'RA 9262',
        category: ComplianceCategory.SOCIAL,
        frequency: ComplianceFrequency.ONGOING,
        evidenceTypes: ['Activity reports'],
        weight: 1,
        scope: ComplianceScope.BARANGAY,
        sglgPillar: SglgPillar.SOCIAL_PROTECTION,
    },
    {
        code: 'SOC-004',
        title: 'Barangay Council for Protection of Children',
        legalBasis: 'RA 9344 / JJWC',
        category: ComplianceCategory.SOCIAL,
        frequency: ComplianceFrequency.ONGOING,
        evidenceTypes: ['Committee composition'],
        weight: 1,
        scope: ComplianceScope.BARANGAY,
        sglgPillar: SglgPillar.SOCIAL_PROTECTION,
    },
    {
        code: 'SK-001',
        title: 'Appropriate 10% GF to SK',
        legalBasis: 'RA 10742 Sec. 20(a)',
        category: ComplianceCategory.YOUTH,
        frequency: ComplianceFrequency.ANNUAL,
        evidenceTypes: ['Budget ordinance line item'],
        weight: 2,
        scope: ComplianceScope.BARANGAY,
        sglgPillar: SglgPillar.YOUTH_DEVELOPMENT,
    },
    {
        code: 'SK-002',
        title: 'Conduct Linggo ng Kabataan',
        legalBasis: 'RA 10742 Sec. 30(a)',
        category: ComplianceCategory.YOUTH,
        frequency: ComplianceFrequency.ANNUAL,
        evidenceTypes: ['Activity report'],
        weight: 1,
        scope: ComplianceScope.BARANGAY,
        sglgPillar: SglgPillar.YOUTH_DEVELOPMENT,
    },
];

export async function seedComplianceCatalog(prisma: PrismaClient) {
    const keepCodes = COMPLIANCE_CATALOG.map((entry) => entry.code);

    for (const entry of COMPLIANCE_CATALOG) {
        await prisma.complianceRequirement.upsert({
            where: { code: entry.code },
            update: {
                title: entry.title,
                legalBasis: entry.legalBasis,
                category: entry.category,
                frequency: entry.frequency,
                evidenceTypes: entry.evidenceTypes,
                weight: entry.weight,
                scope: entry.scope,
                sglgPillar: entry.sglgPillar,
            },
            create: entry,
        });
    }

    // Only retire unused *system* codes — never delete municipal custom catalog rows
    const removed = await prisma.complianceRequirement.deleteMany({
        where: {
            municipalityId: null,
            code: { notIn: keepCodes },
        },
    });

    console.log(
        `Seeded ${COMPLIANCE_CATALOG.length} compliance requirements (6 ADM + lean SOC/SK/MAY); removed ${removed.count} retired system codes`,
    );
}

async function main() {
    const prisma = new PrismaClient();
    try {
        await seedComplianceCatalog(prisma);
        console.log('Compliance catalog seed completed.');
    } finally {
        await prisma.$disconnect();
    }
}

if (require.main === module) {
    main().catch((error) => {
        console.error('Compliance seed failed:', error);
        process.exit(1);
    });
}
