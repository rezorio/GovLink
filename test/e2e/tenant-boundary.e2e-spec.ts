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
import { seedProcurementThresholds } from '../../src/database/seeds/procurement-thresholds.seed';

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
        await seedProcurementThresholds(prisma);
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

        it('GET /compliance/sglg-scores returns pillar readiness for mayor', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/compliance/sglg-scores')
                .set(authHeader(mayorToken))
                .expect(200);

            expect(response.body.municipality).toBeDefined();
            expect(Array.isArray(response.body.municipality.pillars)).toBe(true);
            expect(response.body.municipality.pillars).toHaveLength(10);
            expect(response.body.disclaimer).toMatch(/not official DILG/i);

            const financial = response.body.municipality.pillars.find(
                (row: { pillar: string }) => row.pillar === 'FINANCIAL_ADMINISTRATION',
            );
            expect(financial).toBeDefined();
            expect(financial.requirementCount).toBeGreaterThan(0);
            expect(typeof financial.score).toBe('number');

            const disaster = response.body.municipality.pillars.find(
                (row: { pillar: string }) => row.pillar === 'DISASTER_PREPAREDNESS',
            );
            expect(disaster.requirementCount).toBe(0);
            expect(disaster.score).toBeNull();

            expect(Array.isArray(response.body.barangays)).toBe(true);
            expect(response.body.barangays.length).toBe(2);
            const barangayIds = response.body.barangays.map((row: { id: string }) => row.id);
            expect(barangayIds).toContain(fixture.barangayAId);
            expect(barangayIds).toContain(fixture.barangayBId);
        });

        it('GET /compliance/sglg-scores returns 403 for barangay captain', async () => {
            await request(app.getHttpServer())
                .get('/api/compliance/sglg-scores')
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

        it('submits photo evidence scoped to the uploading barangay', async () => {
            await prisma.taskAssignment.update({
                where: { id: fixture.assignmentForBarangayBId },
                data: {
                    status: 'ACKNOWLEDGED',
                    acknowledgedAt: new Date(),
                },
            });

            const jpegBytes = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
            const presign = await request(app.getHttpServer())
                .post('/api/uploads/presign')
                .set(authHeader(captainBToken))
                .send({
                    filename: 'field-proof.jpg',
                    contentType: 'image/jpeg',
                    contentLength: jpegBytes.length,
                    entityType: 'submissions',
                })
                .expect(201);

            const put = await fetch(presign.body.uploadUrl as string, {
                method: 'PUT',
                headers: { 'Content-Type': 'image/jpeg' },
                body: jpegBytes,
            });
            expect(put.ok).toBe(true);

            await request(app.getHttpServer())
                .post('/api/uploads/confirm')
                .set(authHeader(captainBToken))
                .send({ fileKey: presign.body.fileKey })
                .expect(201);

            const submit = await request(app.getHttpServer())
                .post(`/api/assignments/${fixture.assignmentForBarangayBId}/submissions`)
                .set(authHeader(captainBToken))
                .send({
                    fileKey: presign.body.fileKey,
                    fileName: 'field-proof.jpg',
                    mimeType: 'image/jpeg',
                    fileSizeBytes: jpegBytes.length,
                })
                .expect(201);

            expect(submit.body.submission.barangayId).toBe(fixture.barangayBId);
            expect(submit.body.submission.fileName).toBe('field-proof.jpg');
            expect(submit.body.submission.submittedAt).toBeTruthy();
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

        it('procurement APP + contract spine with tenant isolation and split ack', async () => {
            const appLineDraft = await request(app.getHttpServer())
                .post('/api/procurement/app-lines')
                .set(authHeader(captainAToken))
                .send({
                    fiscalYear: 2026,
                    code: 'E2E-APP-001',
                    description: 'E2E IT equipment',
                    category: 'IT Equipment',
                    approvedAmountCentavos: 200_000_000,
                })
                .expect(201);

            expect(appLineDraft.body.code).toBe('E2E-APP-001');
            expect(appLineDraft.body.status).toBe('DRAFT');

            await request(app.getHttpServer())
                .post(`/api/procurement/app-lines/${appLineDraft.body.id}/approve`)
                .set(authHeader(captainAToken))
                .expect(403);

            const appLine = await request(app.getHttpServer())
                .post(`/api/procurement/app-lines/${appLineDraft.body.id}/approve`)
                .set(authHeader(mayorToken))
                .expect(201);
            expect(appLine.body.status).toBe('APPROVED');

            const appLineBDraft = await request(app.getHttpServer())
                .post('/api/procurement/app-lines')
                .set(authHeader(captainBToken))
                .send({
                    fiscalYear: 2026,
                    code: 'E2E-APP-B',
                    description: 'Beta APP',
                    category: 'Goods',
                    approvedAmountCentavos: 50_000_00,
                })
                .expect(201);

            await request(app.getHttpServer())
                .post(`/api/procurement/app-lines/${appLineBDraft.body.id}/approve`)
                .set(authHeader(mayorToken))
                .expect(201);

            const listA = await request(app.getHttpServer())
                .get('/api/procurement/app-lines')
                .set(authHeader(captainAToken))
                .expect(200);
            expect(
                listA.body.every((row: { barangayId: string }) => row.barangayId === fixture.barangayAId),
            ).toBe(true);

            const first = await request(app.getHttpServer())
                .post('/api/procurement/contracts')
                .set(authHeader(captainAToken))
                .send({
                    appLineItemId: appLine.body.id,
                    title: 'Laptops batch 1',
                    supplierName: 'Split Demo Supplier',
                    amountCentavos: 600_000_00,
                    mode: 'SVP',
                })
                .expect(201);
            expect(first.body.splittingFlagged).toBe(false);

            const second = await request(app.getHttpServer())
                .post('/api/procurement/contracts')
                .set(authHeader(captainAToken))
                .send({
                    appLineItemId: appLine.body.id,
                    title: 'Laptops batch 2',
                    supplierName: 'Split Demo Supplier',
                    amountCentavos: 600_000_00,
                    mode: 'SVP',
                })
                .expect(201);
            expect(second.body.splittingFlagged).toBe(true);

            const contractId = second.body.id as string;

            async function uploadProcurementPdf(name: string) {
                const pdfBytes = Buffer.from(`%PDF-1.4 e2e-${name}`);
                const presign = await request(app.getHttpServer())
                    .post('/api/uploads/presign')
                    .set(authHeader(captainAToken))
                    .send({
                        filename: `${name}.pdf`,
                        contentType: 'application/pdf',
                        contentLength: pdfBytes.length,
                        entityType: 'procurement',
                    })
                    .expect(201);

                const put = await fetch(presign.body.uploadUrl as string, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/pdf' },
                    body: pdfBytes,
                });
                expect(put.ok).toBe(true);

                await request(app.getHttpServer())
                    .post('/api/uploads/confirm')
                    .set(authHeader(captainAToken))
                    .send({ fileKey: presign.body.fileKey })
                    .expect(201);

                return {
                    fileKey: presign.body.fileKey as string,
                    fileName: `${name}.pdf`,
                    mimeType: 'application/pdf',
                    fileSizeBytes: pdfBytes.length,
                };
            }

            async function attachDoc(docType: string, title: string, name: string) {
                const file = await uploadProcurementPdf(name);
                await request(app.getHttpServer())
                    .post(`/api/procurement/contracts/${contractId}/documents`)
                    .set(authHeader(captainAToken))
                    .send({
                        docType,
                        title,
                        ...file,
                    })
                    .expect(201);
            }

            async function addQuote(supplier: string, amount: number) {
                await request(app.getHttpServer())
                    .post(`/api/procurement/contracts/${contractId}/documents`)
                    .set(authHeader(captainAToken))
                    .send({
                        docType: 'QUOTATION',
                        title: `Quote ${supplier}`,
                        quotationSupplierName: supplier,
                        quotationAmountCentavos: amount,
                    })
                    .expect(201);
            }

            await request(app.getHttpServer())
                .post(`/api/procurement/contracts/${contractId}/advance`)
                .set(authHeader(captainAToken))
                .send({ targetStatus: 'PLANNED' })
                .expect(201);

            await request(app.getHttpServer())
                .post(`/api/procurement/contracts/${contractId}/advance`)
                .set(authHeader(captainAToken))
                .send({ targetStatus: 'RFQ_ISSUED' })
                .expect(400);

            await attachDoc('RFQ', 'RFQ for laptops', 'rfq');
            await request(app.getHttpServer())
                .post(`/api/procurement/contracts/${contractId}/advance`)
                .set(authHeader(captainAToken))
                .send({ targetStatus: 'RFQ_ISSUED' })
                .expect(201);

            await addQuote('Supplier A', 10_000_00);
            await addQuote('Supplier B', 11_000_00);
            await request(app.getHttpServer())
                .post(`/api/procurement/contracts/${contractId}/documents`)
                .set(authHeader(captainAToken))
                .send({
                    docType: 'QUOTATION',
                    title: 'Duplicate supplier quote',
                    quotationSupplierName: 'supplier a',
                    quotationAmountCentavos: 9_500_00,
                })
                .expect(400);

            await request(app.getHttpServer())
                .post(`/api/procurement/contracts/${contractId}/advance`)
                .set(authHeader(captainAToken))
                .send({ targetStatus: 'QUOTATIONS_RECEIVED' })
                .expect(400);

            await addQuote('Supplier C', 12_000_00);
            await request(app.getHttpServer())
                .post(`/api/procurement/contracts/${contractId}/advance`)
                .set(authHeader(captainAToken))
                .send({ targetStatus: 'QUOTATIONS_RECEIVED' })
                .expect(201);

            await attachDoc('ABSTRACT', 'Abstract of quotations', 'abstract');
            await request(app.getHttpServer())
                .post(`/api/procurement/contracts/${contractId}/advance`)
                .set(authHeader(captainAToken))
                .send({ targetStatus: 'EVALUATION' })
                .expect(201);

            await attachDoc('BAC_RESOLUTION', 'BAC resolution', 'bac');

            const existingBac = await request(app.getHttpServer())
                .get('/api/procurement/bac-members')
                .set(authHeader(captainAToken))
                .expect(200);
            for (const member of existingBac.body as Array<{ id: string; isActive: boolean }>) {
                if (member.isActive) {
                    await request(app.getHttpServer())
                        .post(`/api/procurement/bac-members/${member.id}/deactivate`)
                        .set(authHeader(captainAToken))
                        .expect(201);
                }
            }

            await request(app.getHttpServer())
                .post(`/api/procurement/contracts/${contractId}/advance`)
                .set(authHeader(captainAToken))
                .send({ targetStatus: 'AWARD_RECOMMENDED' })
                .expect(400);

            const bacMembers = [
                { displayName: 'E2E Chair', designation: 'CHAIR' },
                { displayName: 'E2E Vice', designation: 'VICE_CHAIR' },
                { displayName: 'E2E Member 1', designation: 'MEMBER' },
                { displayName: 'E2E Member 2', designation: 'MEMBER' },
                { displayName: 'E2E Member 3', designation: 'MEMBER' },
            ];
            for (const member of bacMembers) {
                await request(app.getHttpServer())
                    .post('/api/procurement/bac-members')
                    .set(authHeader(captainAToken))
                    .send({
                        ...member,
                        termStart: '2026-01-01',
                        designationDate: '2026-01-15',
                    })
                    .expect(201);
            }

            await request(app.getHttpServer())
                .get('/api/procurement/bac-members')
                .set(authHeader(captainBToken))
                .expect(200)
                .expect((res) => {
                    expect(res.body.every((row: { barangayId: string }) => row.barangayId === fixture.barangayBId)).toBe(
                        true,
                    );
                });

            await request(app.getHttpServer())
                .post(`/api/procurement/contracts/${contractId}/advance`)
                .set(authHeader(captainAToken))
                .send({ targetStatus: 'AWARD_RECOMMENDED' })
                .expect(201);

            await request(app.getHttpServer())
                .post(`/api/procurement/contracts/${contractId}/advance`)
                .set(authHeader(captainAToken))
                .send({ targetStatus: 'AWARDED' })
                .expect(400);

            await request(app.getHttpServer())
                .post(`/api/procurement/contracts/${contractId}/acknowledge-split`)
                .set(authHeader(captainAToken))
                .expect(403);

            await request(app.getHttpServer())
                .post(`/api/procurement/contracts/${contractId}/acknowledge-split`)
                .set(authHeader(mayorToken))
                .expect(201);

            await request(app.getHttpServer())
                .post(`/api/procurement/contracts/${contractId}/advance`)
                .set(authHeader(captainAToken))
                .send({ targetStatus: 'AWARDED' })
                .expect(400);

            await attachDoc('NOTICE_OF_AWARD', 'Notice of Award', 'noa');
            await request(app.getHttpServer())
                .post(`/api/procurement/contracts/${contractId}/advance`)
                .set(authHeader(captainAToken))
                .send({ targetStatus: 'AWARDED' })
                .expect(201);

            await request(app.getHttpServer())
                .post(`/api/procurement/contracts/${contractId}/advance`)
                .set(authHeader(captainAToken))
                .send({ targetStatus: 'ACTIVE' })
                .expect(400);

            await attachDoc('CONTRACT_DOC', 'Signed contract', 'contract');
            await request(app.getHttpServer())
                .post(`/api/procurement/contracts/${contractId}/advance`)
                .set(authHeader(captainAToken))
                .send({ targetStatus: 'ACTIVE' })
                .expect(201);

            await attachDoc('DELIVERY_RECEIPT', 'Delivery receipt', 'delivery');
            await attachDoc('INSPECTION_ACCEPTANCE', 'Inspection acceptance', 'acceptance');
            await request(app.getHttpServer())
                .post(`/api/procurement/contracts/${contractId}/advance`)
                .set(authHeader(captainAToken))
                .send({ targetStatus: 'COMPLETED' })
                .expect(201);

            await request(app.getHttpServer())
                .get(`/api/procurement/contracts/${contractId}/documents`)
                .set(authHeader(captainBToken))
                .expect(403);

            await request(app.getHttpServer())
                .get(`/api/procurement/contracts/${contractId}`)
                .set(authHeader(captainBToken))
                .expect(403);

            const chain = await request(app.getHttpServer())
                .get(`/api/procurement/contracts/${contractId}/chain`)
                .set(authHeader(mayorToken))
                .expect(200);
            expect(chain.body.status).toBe('COMPLETED');
            expect(chain.body.minQuotations).toBe(3);

            const oversight = await request(app.getHttpServer())
                .get('/api/procurement/oversight?fiscalYear=2026')
                .set(authHeader(mayorToken))
                .expect(200);
            expect(oversight.body.totals.contractCount).toBeGreaterThanOrEqual(2);

            await request(app.getHttpServer())
                .get('/api/procurement/oversight')
                .set(authHeader(captainAToken))
                .expect(403);
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
