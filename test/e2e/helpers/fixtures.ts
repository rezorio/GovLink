import * as bcrypt from 'bcrypt';
import {
    AppRole,
    PrismaClient,
    TaskAssignmentStatus,
} from '@prisma/client';
import { DEMO_PASSWORD } from '../../../src/database/seeds/users.seed';

export const FIXTURE = {
    municipalityPsgc: '041099000',
    barangayAPsgc: '041099001',
    barangayBPsgc: '041099002',
    mayorEmail: 'e2e-mayor@test.gov.ph',
    captainAEmail: 'e2e-captain-a@test.gov.ph',
    captainBEmail: 'e2e-captain-b@test.gov.ph',
} as const;

export interface TenantBoundaryFixture {
    municipalityId: string;
    barangayAId: string;
    barangayBId: string;
    assignmentForBarangayBId: string;
    mayorEmail: string;
    captainAEmail: string;
    captainBEmail: string;
    password: string;
}

export async function seedTenantBoundaryFixture(
    prisma: PrismaClient,
): Promise<TenantBoundaryFixture> {
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 4);

    const municipality = await prisma.municipality.upsert({
        where: { psgcCode: FIXTURE.municipalityPsgc },
        update: { name: 'E2E Test Municipality', province: 'Test', region: 'Test Region' },
        create: {
            name: 'E2E Test Municipality',
            province: 'Test',
            region: 'Test Region',
            psgcCode: FIXTURE.municipalityPsgc,
        },
    });

    const barangayA = await prisma.barangay.upsert({
        where: {
            municipalityId_psgcCode: {
                municipalityId: municipality.id,
                psgcCode: FIXTURE.barangayAPsgc,
            },
        },
        update: { name: 'E2E Barangay Alpha' },
        create: {
            name: 'E2E Barangay Alpha',
            psgcCode: FIXTURE.barangayAPsgc,
            municipalityId: municipality.id,
        },
    });

    const barangayB = await prisma.barangay.upsert({
        where: {
            municipalityId_psgcCode: {
                municipalityId: municipality.id,
                psgcCode: FIXTURE.barangayBPsgc,
            },
        },
        update: { name: 'E2E Barangay Beta' },
        create: {
            name: 'E2E Barangay Beta',
            psgcCode: FIXTURE.barangayBPsgc,
            municipalityId: municipality.id,
        },
    });

    const mayor = await prisma.user.upsert({
        where: { email: FIXTURE.mayorEmail },
        update: {
            passwordHash,
            municipalityId: municipality.id,
            barangayId: null,
            roles: [AppRole.MAYOR],
            isActive: true,
            deletedAt: null,
        },
        create: {
            email: FIXTURE.mayorEmail,
            fullName: 'E2E Mayor',
            passwordHash,
            municipalityId: municipality.id,
            roles: [AppRole.MAYOR],
        },
    });

    await prisma.user.upsert({
        where: { email: FIXTURE.captainAEmail },
        update: {
            passwordHash,
            municipalityId: municipality.id,
            barangayId: barangayA.id,
            roles: [AppRole.BARANGAY_CAPTAIN],
            isActive: true,
            deletedAt: null,
        },
        create: {
            email: FIXTURE.captainAEmail,
            fullName: 'E2E Captain Alpha',
            passwordHash,
            municipalityId: municipality.id,
            barangayId: barangayA.id,
            roles: [AppRole.BARANGAY_CAPTAIN],
        },
    });

    await prisma.user.upsert({
        where: { email: FIXTURE.captainBEmail },
        update: {
            passwordHash,
            municipalityId: municipality.id,
            barangayId: barangayB.id,
            roles: [AppRole.BARANGAY_CAPTAIN],
            isActive: true,
            deletedAt: null,
        },
        create: {
            email: FIXTURE.captainBEmail,
            fullName: 'E2E Captain Beta',
            passwordHash,
            municipalityId: municipality.id,
            barangayId: barangayB.id,
            roles: [AppRole.BARANGAY_CAPTAIN],
        },
    });

    const task = await prisma.supervisoryTask.create({
        data: {
            municipalityId: municipality.id,
            title: 'E2E Boundary Test Task',
            description: 'Assigned only to Barangay Beta',
            legalBasis: 'E2E Test',
            assignedById: mayor.id,
            dueDate: new Date('2026-12-31'),
        },
    });

    const assignment = await prisma.taskAssignment.create({
        data: {
            municipalityId: municipality.id,
            barangayId: barangayB.id,
            taskId: task.id,
            status: TaskAssignmentStatus.PENDING_ACK,
        },
    });

    return {
        municipalityId: municipality.id,
        barangayAId: barangayA.id,
        barangayBId: barangayB.id,
        assignmentForBarangayBId: assignment.id,
        mayorEmail: FIXTURE.mayorEmail,
        captainAEmail: FIXTURE.captainAEmail,
        captainBEmail: FIXTURE.captainBEmail,
        password: DEMO_PASSWORD,
    };
}

export async function cleanupTenantBoundaryFixture(prisma: PrismaClient) {
    const municipality = await prisma.municipality.findUnique({
        where: { psgcCode: FIXTURE.municipalityPsgc },
    });

    if (!municipality) {
        return;
    }

    await prisma.auditLog.deleteMany({ where: { municipalityId: municipality.id } });
    await prisma.complianceInstance.deleteMany({ where: { municipalityId: municipality.id } });
    await prisma.municipalReview.deleteMany({ where: { municipalityId: municipality.id } });
    await prisma.evidenceSubmission.deleteMany({ where: { municipalityId: municipality.id } });
    await prisma.taskAssignment.deleteMany({ where: { municipalityId: municipality.id } });
    await prisma.supervisoryTask.deleteMany({ where: { municipalityId: municipality.id } });
    await prisma.user.deleteMany({ where: { municipalityId: municipality.id } });
    await prisma.barangay.deleteMany({ where: { municipalityId: municipality.id } });
    await prisma.municipality.delete({ where: { id: municipality.id } });
}

async function login(app: import('@nestjs/common').INestApplication, email: string, password: string) {
    const { default: request } = await import('supertest');
    const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password })
        .expect(200);

    return response.body.access_token as string;
}

export async function loginAsCaptainA(
    app: import('@nestjs/common').INestApplication,
    fixture: TenantBoundaryFixture,
) {
    return login(app, fixture.captainAEmail, fixture.password);
}

export async function loginAsCaptainB(
    app: import('@nestjs/common').INestApplication,
    fixture: TenantBoundaryFixture,
) {
    return login(app, fixture.captainBEmail, fixture.password);
}

export async function loginAsMayor(
    app: import('@nestjs/common').INestApplication,
    fixture: TenantBoundaryFixture,
) {
    return login(app, fixture.mayorEmail, fixture.password);
}
