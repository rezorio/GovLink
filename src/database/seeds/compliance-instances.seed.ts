import {
    ComplianceScope,
    ComplianceStatus,
    PrismaClient,
} from '@prisma/client';
import { currentPeriodForFrequency } from '../../modules/compliance/period.util';

type DemoProfile = {
    label: string;
    /** Per-requirement status by catalog code order index */
    byIndex: ComplianceStatus[];
    /** Fallback for extra requirements beyond byIndex length */
    rest: ComplianceStatus;
};

/**
 * Rotating demo profiles so the mayor UI shows clear differences between barangays.
 * Same shared catalog; only statuses differ.
 */
const DEMO_PROFILES: DemoProfile[] = [
    {
        label: 'mostly-clear',
        byIndex: [
            ComplianceStatus.ACCEPTED,
            ComplianceStatus.ACCEPTED,
            ComplianceStatus.ACCEPTED,
            ComplianceStatus.IN_PROGRESS,
            ComplianceStatus.ACCEPTED,
            ComplianceStatus.NOT_STARTED,
        ],
        rest: ComplianceStatus.ACCEPTED,
    },
    {
        label: 'needs-review',
        byIndex: [
            ComplianceStatus.SUBMITTED,
            ComplianceStatus.UNDER_REVIEW,
            ComplianceStatus.ACCEPTED,
            ComplianceStatus.SUBMITTED,
            ComplianceStatus.IN_PROGRESS,
            ComplianceStatus.NOT_STARTED,
        ],
        rest: ComplianceStatus.SUBMITTED,
    },
    {
        label: 'at-risk',
        byIndex: [
            ComplianceStatus.OVERDUE,
            ComplianceStatus.RETURNED,
            ComplianceStatus.OVERDUE,
            ComplianceStatus.IN_PROGRESS,
            ComplianceStatus.RETURNED,
            ComplianceStatus.NOT_STARTED,
        ],
        rest: ComplianceStatus.OVERDUE,
    },
    {
        label: 'in-flight',
        byIndex: [
            ComplianceStatus.IN_PROGRESS,
            ComplianceStatus.IN_PROGRESS,
            ComplianceStatus.NOT_STARTED,
            ComplianceStatus.SUBMITTED,
            ComplianceStatus.IN_PROGRESS,
            ComplianceStatus.NOT_STARTED,
        ],
        rest: ComplianceStatus.IN_PROGRESS,
    },
    {
        label: 'mixed',
        byIndex: [
            ComplianceStatus.ACCEPTED,
            ComplianceStatus.SUBMITTED,
            ComplianceStatus.RETURNED,
            ComplianceStatus.OVERDUE,
            ComplianceStatus.IN_PROGRESS,
            ComplianceStatus.NOT_STARTED,
        ],
        rest: ComplianceStatus.NOT_STARTED,
    },
];

function stampForStatus(status: ComplianceStatus): {
    status: ComplianceStatus;
    submittedAt: Date | null;
    reviewedAt: Date | null;
    returnReason: string | null;
} {
    const now = new Date();
    switch (status) {
        case ComplianceStatus.ACCEPTED:
            return {
                status,
                submittedAt: now,
                reviewedAt: now,
                returnReason: null,
            };
        case ComplianceStatus.SUBMITTED:
        case ComplianceStatus.UNDER_REVIEW:
            return {
                status,
                submittedAt: now,
                reviewedAt: null,
                returnReason: null,
            };
        case ComplianceStatus.RETURNED:
            return {
                status,
                submittedAt: now,
                reviewedAt: now,
                returnReason: 'Incomplete evidence — please resubmit with signed minutes.',
            };
        default:
            return {
                status,
                submittedAt: null,
                reviewedAt: null,
                returnReason: null,
            };
    }
}

/**
 * Opens current reporting periods for every BARANGAY-scoped requirement × active barangay.
 * Idempotent via unique (barangayId, requirementId, periodLabel).
 * Then paints demo statuses so dashboards/drawers show varied urgency.
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

    const painted = await applyDemoComplianceStatuses(prisma);

    console.log(
        `Seeded compliance instances: ${created} created, ${skipped} already present, ` +
            `${painted} statuses painted for demo ` +
            `(${requirements.length} barangay requirements × ${barangays.length} barangays)`,
    );
}

/** Spread clear / review / at-risk / in-flight / mixed profiles across barangays. */
export async function applyDemoComplianceStatuses(prisma: PrismaClient): Promise<number> {
    const municipalities = await prisma.municipality.findMany({
        include: {
            barangays: {
                where: { isActive: true },
                orderBy: { name: 'asc' },
            },
        },
    });

    let painted = 0;

    for (const muni of municipalities) {
        for (let i = 0; i < muni.barangays.length; i += 1) {
            const barangay = muni.barangays[i];
            const profile = DEMO_PROFILES[i % DEMO_PROFILES.length];

            const instances = await prisma.complianceInstance.findMany({
                where: { barangayId: barangay.id },
                include: { requirement: { select: { code: true } } },
                orderBy: { requirement: { code: 'asc' } },
            });

            for (let r = 0; r < instances.length; r += 1) {
                const instance = instances[r];
                const status = profile.byIndex[r] ?? profile.rest;
                const stamp = stampForStatus(status);
                await prisma.complianceInstance.update({
                    where: { id: instance.id },
                    data: stamp,
                });
                painted += 1;
            }
        }
    }

    return painted;
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
