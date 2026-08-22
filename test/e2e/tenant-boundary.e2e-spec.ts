import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/modules/prisma/prisma.module';
import { authHeader, createTestApp } from './helpers/test-app';
import {
    cleanupTenantBoundaryFixture,
    loginAsCaptainA,
    loginAsCaptainB,
    loginAsMayor,
    seedTenantBoundaryFixture,
    TenantBoundaryFixture,
} from './helpers/fixtures';

describe('Tenant boundary (e2e)', () => {
    let app!: INestApplication;
    let prisma!: PrismaService;
    let fixture: TenantBoundaryFixture;
    let captainAToken: string;
    let captainBToken: string;
    let mayorToken: string;

    beforeAll(async () => {
        app = await createTestApp();
        prisma = app.get(PrismaService);
        fixture = await seedTenantBoundaryFixture(prisma);

        captainAToken = await loginAsCaptainA(app, fixture);
        captainBToken = await loginAsCaptainB(app, fixture);
        mayorToken = await loginAsMayor(app, fixture);
    }, 60000);

    afterAll(async () => {
        try {
            if (prisma) {
                await cleanupTenantBoundaryFixture(prisma);
            }
        } finally {
            if (app) {
                await app.close();
            }
        }
    });

    describe('Barangay Alpha accessing Barangay Beta assignment', () => {
        it('GET /assignments/:id returns 403', async () => {
            await request(app.getHttpServer())
                .get(`/api/assignments/${fixture.assignmentForBarangayBId}`)
                .set(authHeader(captainAToken))
                .expect(403);
        });

        it('POST /assignments/:id/acknowledge returns 403', async () => {
            await request(app.getHttpServer())
                .post(`/api/assignments/${fixture.assignmentForBarangayBId}/acknowledge`)
                .set(authHeader(captainAToken))
                .expect(403);
        });

        it('POST /assignments/:id/submissions returns 403', async () => {
            await request(app.getHttpServer())
                .post(`/api/assignments/${fixture.assignmentForBarangayBId}/submissions`)
                .set(authHeader(captainAToken))
                .send({
                    fileKey: `${fixture.municipalityId}/${fixture.barangayAId}/submissions/test-id/file.pdf`,
                    fileName: 'file.pdf',
                    mimeType: 'application/pdf',
                    fileSizeBytes: 1024,
                })
                .expect(403);
        });
    });

    describe('Barangay Beta accessing own assignment', () => {
        it('GET /assignments/:id returns 200', async () => {
            const response = await request(app.getHttpServer())
                .get(`/api/assignments/${fixture.assignmentForBarangayBId}`)
                .set(authHeader(captainBToken))
                .expect(200);

            expect(response.body.id).toBe(fixture.assignmentForBarangayBId);
            expect(response.body.barangayId).toBe(fixture.barangayBId);
        });

        it('POST /assignments/:id/acknowledge returns 200 or 201', async () => {
            const response = await request(app.getHttpServer())
                .post(`/api/assignments/${fixture.assignmentForBarangayBId}/acknowledge`)
                .set(authHeader(captainBToken));

            expect([200, 201]).toContain(response.status);
        });
    });

    describe('Municipal mayor scope', () => {
        it('GET /assignments lists the Beta assignment', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/assignments')
                .set(authHeader(mayorToken))
                .expect(200);

            const ids = response.body.map((row: { id: string }) => row.id);
            expect(ids).toContain(fixture.assignmentForBarangayBId);
        });

        it('GET /assignments/:id returns 200 for cross-barangay read', async () => {
            await request(app.getHttpServer())
                .get(`/api/assignments/${fixture.assignmentForBarangayBId}`)
                .set(authHeader(mayorToken))
                .expect(200);
        });

        it('GET /barangays lists municipality barangays', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/barangays')
                .set(authHeader(mayorToken))
                .expect(200);

            const ids = response.body.map((row: { id: string }) => row.id);
            expect(ids).toContain(fixture.barangayAId);
            expect(ids).toContain(fixture.barangayBId);
        });
    });

    describe('Barangay municipal-only endpoints', () => {
        it('GET /barangays returns 403 for barangay captain', async () => {
            await request(app.getHttpServer())
                .get('/api/barangays')
                .set(authHeader(captainAToken))
                .expect(403);
        });
    });

    describe('Barangay inbox isolation', () => {
        it('GET /assignments excludes other barangay tasks for Captain Alpha', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/assignments')
                .set(authHeader(captainAToken))
                .expect(200);

            const ids = response.body.map((row: { id: string }) => row.id);
            expect(ids).not.toContain(fixture.assignmentForBarangayBId);
        });
    });
});
