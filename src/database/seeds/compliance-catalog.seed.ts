import {
    ComplianceCategory,
    ComplianceFrequency,
    ComplianceScope,
    PrismaClient,
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
};

/** Source: .cursor/skills/ph-lgu-governance/compliance-catalog.md */
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
    },
    {
        code: 'ADM-005',
        title: 'Submit BDP to municipal LDC',
        legalBasis: 'RA 7160 Sec. 114',
        category: ComplianceCategory.ADMINISTRATIVE,
        frequency: ComplianceFrequency.AD_HOC,
        evidenceTypes: ['Transmittal', 'Acceptance receipt'],
        weight: 2,
        scope: ComplianceScope.BARANGAY,
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
    },
    {
        code: 'ADM-007',
        title: 'BDC regular meeting',
        legalBasis: 'RA 7160 Sec. 109',
        category: ComplianceCategory.ADMINISTRATIVE,
        frequency: ComplianceFrequency.SEMESTRAL,
        evidenceTypes: ['Minutes', 'Agenda'],
        weight: 1,
        scope: ComplianceScope.BARANGAY,
    },
    {
        code: 'ADM-008',
        title: "Maintain Barangay Citizen's Charter",
        legalBasis: 'RA 11032',
        category: ComplianceCategory.ADMINISTRATIVE,
        frequency: ComplianceFrequency.ONGOING,
        evidenceTypes: ['Published charter', 'Update log'],
        weight: 1,
        scope: ComplianceScope.BARANGAY,
    },
    {
        code: 'ADM-009',
        title: 'Update Registry of Barangay Inhabitants',
        legalBasis: 'DILG MC 2005-69',
        category: ComplianceCategory.ADMINISTRATIVE,
        frequency: ComplianceFrequency.ONGOING,
        evidenceTypes: ['Registry snapshot', 'Update date'],
        weight: 1,
        scope: ComplianceScope.BARANGAY,
    },
    {
        code: 'ADM-010',
        title: 'Kasambahay registration desk operational',
        legalBasis: 'DILG MC 2013-61',
        category: ComplianceCategory.ADMINISTRATIVE,
        frequency: ComplianceFrequency.ONGOING,
        evidenceTypes: ['Desk officer designation', 'Masterlist'],
        weight: 1,
        scope: ComplianceScope.BARANGAY,
    },
    {
        code: 'ADM-011',
        title: 'Monthly Kasambahay Report to PESO',
        legalBasis: 'DILG MC 2013-61',
        category: ComplianceCategory.ADMINISTRATIVE,
        frequency: ComplianceFrequency.MONTHLY,
        evidenceTypes: ['Transmittal record'],
        weight: 1,
        scope: ComplianceScope.BARANGAY,
    },
    {
        code: 'ADM-012',
        title: 'Smooth turnover of funds/properties (election)',
        legalBasis: 'DILG MC 2013-115',
        category: ComplianceCategory.ADMINISTRATIVE,
        frequency: ComplianceFrequency.AD_HOC,
        evidenceTypes: ['Inventory', 'Turnover minutes'],
        weight: 2,
        scope: ComplianceScope.BARANGAY,
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
    },
    {
        code: 'MAY-002',
        title: 'Review barangay executive orders',
        legalBasis: 'RA 7160 Sec. 30',
        category: ComplianceCategory.MUNICIPAL_SUPERVISION,
        frequency: ComplianceFrequency.AD_HOC,
        evidenceTypes: ['EO copy', 'Review status', 'SP/SB concurrence'],
        weight: 2,
        scope: ComplianceScope.MUNICIPAL,
    },
    {
        code: 'MAY-003',
        title: 'Act on punong barangay leave',
        legalBasis: 'RA 7160 Sec. 47(a)(4)',
        category: ComplianceCategory.MUNICIPAL_SUPERVISION,
        frequency: ComplianceFrequency.AD_HOC,
        evidenceTypes: ['Leave request', 'Approval'],
        weight: 1,
        scope: ComplianceScope.MUNICIPAL,
    },
    {
        code: 'MAY-004',
        title: 'Act on barangay official resignation',
        legalBasis: 'RA 7160 Sec. 82(a)(4)',
        category: ComplianceCategory.MUNICIPAL_SUPERVISION,
        frequency: ComplianceFrequency.AD_HOC,
        evidenceTypes: ['Resignation letter', 'Acceptance'],
        weight: 1,
        scope: ComplianceScope.MUNICIPAL,
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
    },
    {
        code: 'SOC-002',
        title: 'Anti-trafficking barangay coordination',
        legalBasis: 'RA 9208',
        category: ComplianceCategory.SOCIAL,
        frequency: ComplianceFrequency.ONGOING,
        evidenceTypes: ['Committee activation record'],
        weight: 1,
        scope: ComplianceScope.BARANGAY,
    },
    {
        code: 'SOC-003',
        title: 'ECCD service coordination',
        legalBasis: 'RA 8980 IRR',
        category: ComplianceCategory.SOCIAL,
        frequency: ComplianceFrequency.ONGOING,
        evidenceTypes: ['Service delivery reports'],
        weight: 1,
        scope: ComplianceScope.BARANGAY,
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
    },
];

export async function seedComplianceCatalog(prisma: PrismaClient) {
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
            },
            create: entry,
        });
    }

    console.log(`Seeded ${COMPLIANCE_CATALOG.length} compliance requirements (ADM/SOC/SK/MAY)`);
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
