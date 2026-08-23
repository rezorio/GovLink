import { BacDesignation, PrismaClient } from '@prisma/client';

const DEMO_BAC: Array<{ displayName: string; designation: BacDesignation }> = [
    { displayName: 'Maria Santos', designation: BacDesignation.CHAIR },
    { displayName: 'Jose Reyes', designation: BacDesignation.VICE_CHAIR },
    { displayName: 'Ana Cruz', designation: BacDesignation.MEMBER },
    { displayName: 'Pedro Lim', designation: BacDesignation.MEMBER },
    { displayName: 'Liza Gomez', designation: BacDesignation.MEMBER },
];

/**
 * Seed a complete barangay BAC roster for San Jose / Aguila demo.
 */
export async function seedBacRoster(prisma: PrismaClient) {
    const municipality = await prisma.municipality.findUnique({
        where: { psgcCode: '041022000' },
    });
    if (!municipality) {
        console.log('Skip BAC seed — San Jose not seeded');
        return;
    }

    const aguila = await prisma.barangay.findFirst({
        where: {
            municipalityId: municipality.id,
            name: { contains: 'Aguila', mode: 'insensitive' },
        },
    });
    const barangay =
        aguila ??
        (await prisma.barangay.findFirst({
            where: { municipalityId: municipality.id, isActive: true },
            orderBy: { name: 'asc' },
        }));
    if (!barangay) {
        console.log('Skip BAC seed — no barangay');
        return;
    }

    const captain = await prisma.user.findFirst({
        where: {
            barangayId: barangay.id,
            roles: { has: 'BARANGAY_CAPTAIN' },
            deletedAt: null,
        },
        orderBy: { createdAt: 'asc' },
    });
    if (!captain) {
        console.log('Skip BAC seed — no barangay captain');
        return;
    }

    const termStart = new Date('2026-01-01');
    const designationDate = new Date('2026-01-15');

    for (const member of DEMO_BAC) {
        const existing = await prisma.bacMember.findFirst({
            where: {
                barangayId: barangay.id,
                displayName: member.displayName,
                isActive: true,
            },
        });
        if (existing) {
            continue;
        }
        await prisma.bacMember.create({
            data: {
                municipalityId: municipality.id,
                barangayId: barangay.id,
                displayName: member.displayName,
                designation: member.designation,
                termStart,
                designationDate,
                designatedById: captain.id,
            },
        });
    }

    console.log(`Seeded BAC roster for ${barangay.name}`);
}
