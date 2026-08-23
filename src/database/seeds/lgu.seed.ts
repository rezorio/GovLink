import { IncomeClass, PrismaClient, DirectiveCategory, ProcurementRegime } from '@prisma/client';
import { barangays, provinces } from 'psgc';
import { seedBacRoster } from './bac-roster.seed';
import { seedComplianceCatalog } from './compliance-catalog.seed';
import { seedComplianceInstances } from './compliance-instances.seed';
import { seedProcurementDemo } from './procurement-demo.seed';
import { seedProcurementThresholds } from './procurement-thresholds.seed';
import { seedResidentRegistry } from './resident-registry.seed';
import { seedPlanSubmissions } from './plan-submissions.seed';
import { seedDemoUsers } from './users.seed';

const prisma = new PrismaClient();

const PILOT_MUNICIPALITIES = [
    {
        name: 'San Jose',
        province: 'Batangas',
        psgcCode: '041022000',
    },
    {
        name: 'Liloan',
        province: 'Cebu',
        psgcCode: '072227000',
    },
] as const;

const DIRECTIVE_TEMPLATES = [
    {
        title: 'Submission of Barangay Disaster Risk Reduction and Management Plan (BDRRMP) 2026-2028',
        category: DirectiveCategory.DISASTER_PREPAREDNESS,
        dilgMcNumber: 'DILG MC No. 2024-021',
        description:
            'Mandatory submission of the updated 3-year BDRRM plan aligned with SGLGB indicators.',
    },
    {
        title: 'Full Disclosure Policy Portal (FDPP) Quarterly Financial Posting',
        category: DirectiveCategory.FINANCIAL_ADMINISTRATION,
        dilgMcNumber: 'DILG MC No. 2022-027',
        description:
            'Upload itemized Barangay Budget, Annual Procurement Plan (APP), and 20% Development Fund utilization.',
    },
    {
        title: 'Barangay Anti-Drug Abuse Council (BADAC) Audit & Masterlist Update',
        category: DirectiveCategory.PEACE_AND_ORDER,
        dilgMcNumber: 'DILG MC No. 2020-085',
        description:
            'Quarterly submission of BADAC functional assessment and Barangay Rehabilitation Referral Desk logs.',
    },
] as const;

function padPsgcCode(code: number | string): string {
    return String(code).padStart(9, '0');
}

function municipalityPrefix(psgcCode: string): string {
    return psgcCode.slice(0, 6);
}

function getRegionForProvince(provinceName: string): string {
    const province = provinces.all().find((p) => p.name === provinceName);
    if (!province) {
        throw new Error(`Province not found in PSGC data: ${provinceName}`);
    }
    return province.region;
}

function getBarangaysForMunicipality(psgcCode: string) {
    const prefix = municipalityPrefix(psgcCode);
    return barangays
        .all()
        .filter((brgy) => padPsgcCode(brgy.code).startsWith(prefix))
        .map((brgy) => ({
            name: brgy.name,
            psgcCode: padPsgcCode(brgy.code),
        }))
        .sort((a, b) => a.psgcCode.localeCompare(b.psgcCode));
}

async function seedMunicipality(config: (typeof PILOT_MUNICIPALITIES)[number]) {
    const region = getRegionForProvince(config.province);
    const displayName = `Municipality of ${config.name}`;

    const municipality = await prisma.municipality.upsert({
        where: { psgcCode: config.psgcCode },
        update: {
            name: displayName,
            province: config.province,
            region,
            incomeClass: IncomeClass.MUNICIPALITY_4TH,
            procurementRegime: ProcurementRegime.RA12009,
        },
        create: {
            name: displayName,
            province: config.province,
            region,
            psgcCode: config.psgcCode,
            incomeClass: IncomeClass.MUNICIPALITY_4TH,
            procurementRegime: ProcurementRegime.RA12009,
        },
    });

    const psgcBarangays = getBarangaysForMunicipality(config.psgcCode);
    if (psgcBarangays.length === 0) {
        throw new Error(`No barangays found in PSGC for municipality ${config.psgcCode}`);
    }

    for (const brgy of psgcBarangays) {
        await prisma.barangay.upsert({
            where: {
                municipalityId_psgcCode: {
                    municipalityId: municipality.id,
                    psgcCode: brgy.psgcCode,
                },
            },
            update: {
                name: brgy.name,
                isActive: true,
            },
            create: {
                name: brgy.name,
                psgcCode: brgy.psgcCode,
                municipalityId: municipality.id,
            },
        });
    }

    console.log(`Seeded ${displayName} (${config.province}) — ${psgcBarangays.length} barangays`);
    return municipality;
}

async function seedDirectiveTemplates() {
    for (const template of DIRECTIVE_TEMPLATES) {
        await prisma.directiveTemplate.upsert({
            where: { dilgMcNumber: template.dilgMcNumber },
            update: {
                title: template.title,
                category: template.category,
                description: template.description,
            },
            create: template,
        });
    }

    console.log(`Seeded ${DIRECTIVE_TEMPLATES.length} DILG directive templates`);
}

async function main() {
    console.log('Seeding pilot LGU data (PSGC-driven)...\n');

    for (const pilot of PILOT_MUNICIPALITIES) {
        await seedMunicipality(pilot);
    }

    await seedDirectiveTemplates();

    console.log('\nSeeding procurement thresholds...');
    await seedProcurementThresholds(prisma);

    console.log('\nSeeding compliance catalog...');
    await seedComplianceCatalog(prisma);

    console.log('\nSeeding compliance instances (current periods)...');
    await seedComplianceInstances(prisma);

    console.log('\nSeeding demo users...');
    await seedDemoUsers(prisma);

    console.log('\nSeeding procurement demo APP/contracts...');
    await seedProcurementDemo(prisma);

    console.log('\nSeeding BAC roster...');
    await seedBacRoster(prisma);

    console.log('\nSeeding barangay resident registry...');
    await seedResidentRegistry(prisma);

    console.log('\nSeeding BDP/AIP plan submissions...');
    await seedPlanSubmissions(prisma);

    console.log('\nSeed completed successfully.');
}

main()
    .catch((error) => {
        console.error('Seed failed:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
