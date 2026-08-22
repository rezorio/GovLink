import { createHash, randomBytes } from 'crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { ExportFormat } from '@prisma/client';
import { TenantContext } from '../../common/interfaces/auth.interface';
import { PrismaService } from '../../prisma/prisma.module';

export const REPORT_COMPLIANCE_SCORECARD = 'compliance_scorecard';

@Injectable()
export class ExportDocumentService {
    constructor(private readonly prisma: PrismaService) {}

    createToken(): string {
        return randomBytes(32).toString('base64url');
    }

    hashCanonical(payload: unknown): string {
        const canonical = JSON.stringify(payload);
        return createHash('sha256').update(canonical).digest('hex');
    }

    verificationUrl(token: string): string {
        const base =
            process.env.PUBLIC_BASE_URL?.replace(/\/$/, '') ??
            `http://localhost:${process.env.PORT ?? 3000}`;
        return `${base}/api/verify/documents/${token}`;
    }

    async persist(params: {
        ctx: TenantContext;
        contentHash: string;
        reportType: string;
        format: ExportFormat;
        periodLabel?: string | null;
    }) {
        const documentToken = this.createToken();
        const doc = await this.prisma.exportDocument.create({
            data: {
                documentToken,
                contentHash: params.contentHash,
                reportType: params.reportType,
                format: params.format,
                municipalityId: params.ctx.municipality_id,
                barangayId: params.ctx.barangay_id,
                generatedById: params.ctx.user_id,
                periodLabel: params.periodLabel ?? null,
            },
        });

        return {
            ...doc,
            verificationUrl: this.verificationUrl(documentToken),
        };
    }

    async verifyByToken(token: string) {
        const doc = await this.prisma.exportDocument.findUnique({
            where: { documentToken: token },
            include: {
                municipality: {
                    select: { name: true, province: true },
                },
            },
        });

        if (!doc) {
            throw new NotFoundException('Document not found');
        }

        if (doc.revokedAt) {
            return {
                status: 'revoked' as const,
                revoked_at: doc.revokedAt.toISOString(),
                reason: doc.revokeReason ?? 'revoked',
            };
        }

        return {
            status: 'valid' as const,
            report_type: doc.reportType,
            municipality: `Municipality of ${doc.municipality.name}`,
            province: `Province of ${doc.municipality.province}`,
            generated_at: doc.generatedAt.toISOString(),
            content_hash: doc.contentHash,
            document_id: doc.id,
            period_label: doc.periodLabel,
            format: doc.format,
        };
    }
}
