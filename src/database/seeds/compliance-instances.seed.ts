import {
    ComplianceScope,
    ComplianceStatus,
    PrismaClient,
} from '@prisma/client';
import { currentPeriodForFrequency } from '../../modules/compliance/period.util';

/**
 * Opens current reporting periods for every BARANGAY-scoped requirement × active barangay.
 * Idempotent via unique (barangayId, requirementId, periodLabel).
 */
export async function seedComplianceInstances(prisma: PrismaClient) {
    const requirements = await prisma.complianceRequirement.findMany({
        where: { scope: ComplianceScope.BARANGAY },
        orderBy: { code: 'asc' },
    });

    const barangays = await prisma.barangay.findMany({
        where: { isActive: true },
        select: { id: true, municipalityId: true, name: true },
        orderBy: { name: 'asc' },
    });

    let created = 0;
    let skipped = 0;

    for (const requirement of requirements) {
        const period = currentPeriodForFrequency(requirement.frequency);
        if (!period) {
            continue;
        }

        for (const barangay of barangays) {
            const existing = await prisma.complianceInstance.findUnique({
                where: {
                    barangayId_requirementId_periodLabel: {
                        barangayId: barangay.id,
                        requirementId: requirement.id,
                        periodLabel: period.periodLabel,
                    },
                },
            });

            if (existing) {
                skipped += 1;
                continue;
            }

            await prisma.complianceInstance.create({
                data: {
                    municipalityId: barangay.municipalityId,
                    barangayId: barangay.id,
                    requirementId: requirement.id,
                    periodLabel: period.periodLabel,
                    dueDate: period.dueDate,
                    status: ComplianceStatus.NOT_STARTED,
                },
            });
            created += 1;
        }
    }

    // Demo variety: mark a few instances accepted / in progress for the first barangay of each muni
    const municipalities = await prisma.municipality.findMany({
        include: {
            barangays: {
                where: { isActive: true },
                orderBy: { name: 'asc' },
                take: 1,
            },
        },
    });

    for (const muni of municipalities) {
        const barangay = muni.barangays[0];
        if (!barangay) {
            continue;
        }

        const samples = await prisma.complianceInstance.findMany({
            where: { barangayId: barangay.id },
            include: { requirement: { select: { code: true } } },
            orderBy: { createdAt: 'asc' },
            take: 4,
        });

        if (samples[0]) {
            await prisma.complianceInstance.update({
                where: { id: samples[0].id },
                data: {
                    status: ComplianceStatus.ACCEPTED,
                    submittedAt: new Date(),
                    reviewedAt: new Date(),
                },
            });
        }
        if (samples[1]) {
            await prisma.complianceInstance.update({
                where: { id: samples[1].id },
                data: {
                    status: ComplianceStatus.SUBMITTED,
                    submittedAt: new Date(),
                },
            });
        }
        if (samples[2]) {
            await prisma.complianceInstance.update({
                where: { id: samples[2].id },
                data: { status: ComplianceStatus.IN_PROGRESS },
            });
        }
    }

    console.log(
        `Seeded compliance instances: ${created} created, ${skipped} already present ` +
            `(${requirements.length} barangay requirements × ${barangays.length} barangays)`,
    );
}

async function standalone() {
    const prisma = new PrismaClient();
    try {
        await seedComplianceInstances(prisma);
        console.log('Compliance instances seed completed.');
    } catch (error) {
        console.error('Compliance instances seed failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

if (require.main === module) {
    void standalone();
}
