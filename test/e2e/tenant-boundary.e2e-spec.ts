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

        it('GET /compliance/requirements lists seeded catalog', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/compliance/requirements')
                .set(authHeader(mayorToken))
                .expect(200);

            expect(response.body.length).toBeGreaterThanOrEqual(24);
            const codes = response.body.map((row: { code: string }) => row.code);
            expect(codes).toContain('ADM-001');
            expect(codes).toContain('SK-002');
        });

        it('POST /compliance/periods/open creates barangay instances', async () => {
            const response = await request(app.getHttpServer())
                .post('/api/compliance/periods/open')
                .set(authHeader(mayorToken))
                .send({})
                .expect(201);

            expect(response.body.created).toBeGreaterThan(0);

            const matrix = await request(app.getHttpServer())
                .get('/api/compliance/matrix')
                .set(authHeader(mayorToken))
                .expect(200);

            expect(matrix.body.barangays.length).toBe(2);
            expect(matrix.body.cells.length).toBeGreaterThan(0);
            expect(matrix.body.statusCounts).toBeDefined();
        });

        it('GET /compliance/instances is tenant-scoped for barangay captain', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/compliance/instances')
                .set(authHeader(captainAToken))
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThan(0);
            const barangayIds = response.body.map(
                (row: { barangayId: string }) => row.barangayId,
            );
            expect(barangayIds.every((id: string) => id === fixture.barangayAId)).toBe(true);
            expect(barangayIds).not.toContain(fixture.barangayBId);
        });

        it('GET /compliance/matrix returns 403 for barangay captain', async () => {
            await request(app.getHttpServer())
                .get('/api/compliance/matrix')
                .set(authHeader(captainAToken))
                .expect(403);
        });

        it('POST /compliance/periods/open returns 403 for barangay captain', async () => {
            await request(app.getHttpServer())
                .post('/api/compliance/periods/open')
                .set(authHeader(captainAToken))
                .send({})
                .expect(403);
        });

        it('compliance start → submit → review lifecycle', async () => {
            const list = await request(app.getHttpServer())
                .get('/api/compliance/instances')
                .set(authHeader(captainAToken))
                .expect(200);

            const target = list.body.find(
                (row: { status: string }) => row.status === 'NOT_STARTED',
            );
            expect(target).toBeDefined();

            await request(app.getHttpServer())
                .post(`/api/compliance/instances/${target.id}/start`)
                .set(authHeader(captainAToken))
                .expect(201);

            const submitted = await request(app.getHttpServer())
                .post(`/api/compliance/instances/${target.id}/submit`)
                .set(authHeader(captainAToken))
                .expect(201);
            expect(submitted.body.status).toBe('SUBMITTED');

            await request(app.getHttpServer())
                .post(`/api/compliance/instances/${target.id}/review`)
                .set(authHeader(captainBToken))
                .send({ decision: 'ACCEPTED' })
                .expect(403);

            const accepted = await request(app.getHttpServer())
                .post(`/api/compliance/instances/${target.id}/review`)
                .set(authHeader(mayorToken))
                .send({ decision: 'ACCEPTED' })
                .expect(201);
            expect(accepted.body.status).toBe('ACCEPTED');

            const queue = await request(app.getHttpServer())
                .get('/api/compliance/review-queue')
                .set(authHeader(mayorToken))
                .expect(200);
            const queuedIds = queue.body.map((row: { id: string }) => row.id);
            expect(queuedIds).not.toContain(target.id);
        });

        it('exports compliance scorecard PDF/Excel with verifiable QR token', async () => {
            const pdf = await request(app.getHttpServer())
                .get('/api/exports/compliance-scorecard.pdf')
                .set(authHeader(mayorToken))
                .expect(200);

            expect(pdf.headers['content-type']).toContain('application/pdf');
            expect(pdf.headers['x-export-document-id']).toBeDefined();
            expect(Buffer.isBuffer(pdf.body) || pdf.body.length > 100).toBeTruthy();

            const documentId = pdf.headers['x-export-document-id'] as string;
            const exportDoc = await prisma.exportDocument.findUniqueOrThrow({
                where: { id: documentId },
            });

            const verified = await request(app.getHttpServer())
                .get(`/api/verify/documents/${exportDoc.documentToken}`)
                .expect(200);
            expect(verified.body.status).toBe('valid');
            expect(verified.body.report_type).toBe('compliance_scorecard');
            expect(verified.body.content_hash).toBe(exportDoc.contentHash);

            await request(app.getHttpServer())
                .get('/api/exports/compliance-scorecard.xlsx')
                .set(authHeader(mayorToken))
                .expect(200)
                .expect('Content-Type', /spreadsheetml/);

            await request(app.getHttpServer())
                .get('/api/exports/compliance-scorecard.pdf')
                .set(authHeader(captainAToken))
                .expect(403);
        });

        it('presign → PUT → confirm evidence upload for barangay captain', async () => {
            await request(app.getHttpServer())
                .post('/api/uploads/presign')
                .set(authHeader(mayorToken))
                .send({
                    filename: 'proof.pdf',
                    contentType: 'application/pdf',
                    contentLength: 12,
                    entityType: 'submissions',
                })
                .expect(403);

            const pdfBytes = Buffer.from('%PDF-1.4 demo');
            const presign = await request(app.getHttpServer())
                .post('/api/uploads/presign')
                .set(authHeader(captainAToken))
                .send({
                    filename: 'proof.pdf',
                    contentType: 'application/pdf',
                    contentLength: pdfBytes.length,
                    entityType: 'submissions',
                })
                .expect(201);

            expect(presign.body.uploadUrl).toContain('http');
            expect(presign.body.fileKey).toContain(`${fixture.municipalityId}/${fixture.barangayAId}/submissions/`);

            const put = await fetch(presign.body.uploadUrl as string, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/pdf' },
                body: pdfBytes,
            });
            expect(put.ok).toBe(true);

            const confirmed = await request(app.getHttpServer())
                .post('/api/uploads/confirm')
                .set(authHeader(captainAToken))
                .send({ fileKey: presign.body.fileKey })
                .expect(201);
            expect(confirmed.body.fileKey).toBe(presign.body.fileKey);

            await request(app.getHttpServer())
                .post(`/api/assignments/${fixture.assignmentForBarangayBId}/submissions`)
                .set(authHeader(captainAToken))
                .send({
                    fileKey: presign.body.fileKey,
                    fileName: 'proof.pdf',
                    mimeType: 'application/pdf',
                    fileSizeBytes: pdfBytes.length,
                })
                .expect(403);
        });

        it('POST /directives/tasks with assignToAllBarangays creates all assignments', async () => {
            const response = await request(app.getHttpServer())
                .post('/api/directives/tasks')
                .set(authHeader(mayorToken))
                .send({
                    title: 'Municipality-wide directive',
                    description: 'Bulk assign to all barangays',
                    legalBasis: 'RA 7160 Sec. 32',
                    dueDate: '2026-12-31',
                    assignToAllBarangays: true,
                });

            expect([200, 201]).toContain(response.status);
            expect(response.body.assignments).toHaveLength(2);
            const barangayIds = response.body.assignments.map(
                (row: { barangayId: string }) => row.barangayId,
            );
            expect(barangayIds).toContain(fixture.barangayAId);
            expect(barangayIds).toContain(fixture.barangayBId);
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
