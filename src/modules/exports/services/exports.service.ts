import { Injectable } from '@nestjs/common';
import { ExportFormat } from '@prisma/client';
import { AuditLogService } from '../../common/services/audit-log.service';
import { TenantContext } from '../../common/interfaces/auth.interface';
import { ComplianceScorecardService } from './compliance-scorecard.service';
import {
    ExportDocumentService,
    REPORT_COMPLIANCE_SCORECARD,
} from './export-document.service';
import { ExcelExportService } from './excel-export.service';
import { PdfExportService } from './pdf-export.service';

@Injectable()
export class ExportsService {
    constructor(
        private readonly scorecard: ComplianceScorecardService,
        private readonly documents: ExportDocumentService,
        private readonly pdf: PdfExportService,
        private readonly excel: ExcelExportService,
        private readonly auditLog: AuditLogService,
    ) {}

    async complianceScorecardPdf(ctx: TenantContext, periodLabel?: string) {
        const payload = await this.scorecard.buildPayload(ctx, periodLabel);
        const canonical = this.scorecard.canonicalForHash(payload);
        const contentHash = this.documents.hashCanonical(canonical);
        const generatedAt = new Date();

        const doc = await this.documents.persist({
            ctx,
            contentHash,
            reportType: REPORT_COMPLIANCE_SCORECARD,
            format: ExportFormat.PDF,
            periodLabel: periodLabel ?? null,
        });

        const buffer = await this.pdf.buildComplianceScorecardPdf({
            payload,
            contentHash,
            verificationUrl: doc.verificationUrl,
            documentId: doc.id,
            generatedAt,
        });

        await this.auditLog.record({
            ctx,
            action: 'EXPORT_COMPLIANCE_SCORECARD_PDF',
            entityType: 'ExportDocument',
            entityId: doc.id,
            after: { contentHash, periodLabel: periodLabel ?? null, rows: payload.rows.length },
        });

        return {
            buffer,
            filename: this.filename('pdf', payload.municipality.name, generatedAt),
            document: doc,
        };
    }

    async complianceScorecardExcel(ctx: TenantContext, periodLabel?: string) {
        const payload = await this.scorecard.buildPayload(ctx, periodLabel);
        const canonical = this.scorecard.canonicalForHash(payload);
        const contentHash = this.documents.hashCanonical(canonical);
        const generatedAt = new Date();

        const doc = await this.documents.persist({
            ctx,
            contentHash,
            reportType: REPORT_COMPLIANCE_SCORECARD,
            format: ExportFormat.XLSX,
            periodLabel: periodLabel ?? null,
        });

        const buffer = await this.excel.buildComplianceScorecardWorkbook({
            payload,
            contentHash,
            verificationUrl: doc.verificationUrl,
            documentId: doc.id,
            generatedAt,
        });

        await this.auditLog.record({
            ctx,
            action: 'EXPORT_COMPLIANCE_SCORECARD_XLSX',
            entityType: 'ExportDocument',
            entityId: doc.id,
            after: { contentHash, periodLabel: periodLabel ?? null, rows: payload.rows.length },
        });

        return {
            buffer,
            filename: this.filename('xlsx', payload.municipality.name, generatedAt),
            document: doc,
        };
    }

    private filename(ext: 'pdf' | 'xlsx', municipalityName: string, at: Date): string {
        const slug = municipalityName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
        const parts = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Manila',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        }).formatToParts(at);
        const get = (type: Intl.DateTimeFormatPartTypes) =>
            parts.find((p) => p.type === type)?.value ?? '00';
        const stamp = `${get('year')}${get('month')}${get('day')}_${get('hour')}${get('minute')}`;
        return `compliance_scorecard_${slug}_${stamp}_PST.${ext}`;
    }
}
