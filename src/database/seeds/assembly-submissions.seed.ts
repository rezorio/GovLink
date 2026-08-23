import { AssemblySemester, AssemblySubmissionStatus, PrismaClient } from '@prisma/client';
import { periodForSemester, semesterLabel } from '../../modules/assemblies/assembly-period.util';

export async function seedAssemblySubmissions(prisma: PrismaClient) {
    const municipalities = await prisma.municipality.findMany({
        select: { id: true, name: true },
    });

    let created = 0;
    for (const muni of municipalities) {
        const barangays = await prisma.barangay.findMany({
            where: { municipalityId: muni.id, isActive: true },
            select: { id: true },
        });

        for (const semester of [AssemblySemester.H1, AssemblySemester.H2]) {
            const period = periodForSemester(semester);
            for (const brgy of barangays) {
                const existing = await prisma.assemblySubmission.findUnique({
                    where: {
                        barangayId_periodLabel: {
                            barangayId: brgy.id,
                            periodLabel: period.periodLabel,
                        },
                    },
                });
                if (existing) {
                    continue;
                }
                await prisma.assemblySubmission.create({
                    data: {
                        municipalityId: muni.id,
                        barangayId: brgy.id,
                        semester,
                        periodLabel: period.periodLabel,
                        dueDate: period.dueDate,
                        status: AssemblySubmissionStatus.NOT_STARTED,
                        title: semesterLabel(semester),
                    },
                });
                created += 1;
            }
        }
        console.log(`   └─ Assemblies: ${muni.name} H1/H2 periods open`);
    }

    console.log(`Seeded ${created} assembly submission rows (H1 + H2)`);
}
