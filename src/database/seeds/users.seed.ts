import * as bcrypt from 'bcrypt';
import { AppRole, PrismaClient } from '@prisma/client';

/** Demo password for all seeded accounts — change in production. */
export const DEMO_PASSWORD = 'GovLinkDemo1!';

const DEMO_USERS = [
    {
        email: 'mayor@san-jose-batangas.gov.ph',
        fullName: 'Mayor — San Jose, Batangas',
        municipalityPsgc: '041022000',
        barangayPsgc: null,
        roles: [AppRole.MAYOR] as AppRole[],
    },
    {
        email: 'captain@aguila-sj-batangas.gov.ph',
        fullName: 'Punong Barangay — Aguila',
        municipalityPsgc: '041022000',
        barangayPsgc: '041022001',
        roles: [AppRole.BARANGAY_CAPTAIN] as AppRole[],
    },
    {
        email: 'mayor@liloan-cebu.gov.ph',
        fullName: 'Mayor — Liloan, Cebu',
        municipalityPsgc: '072227000',
        barangayPsgc: null,
        roles: [AppRole.MAYOR] as AppRole[],
    },
    {
        email: 'captain@catarman-liloan-cebu.gov.ph',
        fullName: 'Punong Barangay — Catarman',
        municipalityPsgc: '072227000',
        barangayPsgc: '072227001',
        roles: [AppRole.BARANGAY_CAPTAIN] as AppRole[],
    },
] as const;

export async function seedDemoUsers(prisma: PrismaClient) {
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

    for (const demoUser of DEMO_USERS) {
        const municipality = await prisma.municipality.findUniqueOrThrow({
            where: { psgcCode: demoUser.municipalityPsgc },
        });

        let barangayId: string | null = null;
        if (demoUser.barangayPsgc) {
            const barangay = await prisma.barangay.findFirstOrThrow({
                where: {
                    municipalityId: municipality.id,
                    psgcCode: demoUser.barangayPsgc,
                },
            });
            barangayId = barangay.id;
        }

        await prisma.user.upsert({
            where: { email: demoUser.email },
            update: {
                fullName: demoUser.fullName,
                passwordHash,
                municipalityId: municipality.id,
                barangayId,
                roles: [...demoUser.roles],
                isActive: true,
                deletedAt: null,
            },
            create: {
                email: demoUser.email,
                fullName: demoUser.fullName,
                passwordHash,
                municipalityId: municipality.id,
                barangayId,
                roles: [...demoUser.roles],
            },
        });

        console.log(`   └─ User: ${demoUser.email} (${demoUser.roles.join(', ')})`);
    }

    console.log(`Seeded ${DEMO_USERS.length} demo users (see docs/GETTING-STARTED.md for credentials)`);
}
