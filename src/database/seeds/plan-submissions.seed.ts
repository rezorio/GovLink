import { PlanSubmissionStatus, PlanType, PrismaClient } from '@prisma/client';
import { periodForPlanType, planTypeLabel } from '../../modules/plans/plan-period.util';

export async function seedPlanSubmissions(prisma: PrismaClient) {
    const municipalities = await prisma.municipality.findMany({
        select: { id: true, name: true },
    });

    let created = 0;
    for (const muni of municipalities) {
        const barangays = await prisma.barangay.findMany({
            where: { municipalityId: muni.id, isActive: true },
            select: { id: true },
        });

        for (const planType of [PlanType.BDP, PlanType.AIP]) {
            const period = periodForPlanType(planType);
            for (const brgy of barangays) {
                const existing = await prisma.planSubmission.findUnique({
                    where: {
                        barangayId_planType_periodLabel: {
                            barangayId: brgy.id,
                            planType,
                            periodLabel: period.periodLabel,
                        },
                    },
                });
                if (existing) {
                    continue;
                }
                await prisma.planSubmission.create({
                    data: {
                        municipalityId: muni.id,
                        barangayId: brgy.id,
                        planType,
                        periodLabel: period.periodLabel,
                        dueDate: period.dueDate,
                        status: PlanSubmissionStatus.NOT_STARTED,
                        title: planTypeLabel(planType),
                    },
                });
                created += 1;
            }
        }
        console.log(`   └─ Plans: ${muni.name} periods open`);
    }

    console.log(`Seeded ${created} plan submission rows (BDP + AIP)`);
}
