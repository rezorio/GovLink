import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import type { ScorecardPayload } from './compliance-scorecard.service';

@Injectable()
export class PdfExportService {
    async buildComplianceScorecardPdf(params: {
        payload: ScorecardPayload;
        contentHash: string;
        verificationUrl: string;
        documentId: string;
        generatedAt: Date;
    }): Promise<Buffer> {
        const { payload, contentHash, verificationUrl, documentId, generatedAt } = params;
        const qrDataUrl = await QRCode.toDataURL(verificationUrl, { width: 200, margin: 1 });
        const qrBuffer = Buffer.from(qrDataUrl.split(',')[1] ?? '', 'base64');

        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({
                size: 'A4',
                margins: { top: 70, bottom: 110, left: 50, right: 50 },
                info: {
                    Title: 'Compliance Scorecard',
                    Author: `Municipality of ${payload.municipality.name}`,
                    Creator: 'GovLink',
                },
            });

            const chunks: Buffer[] = [];
            doc.on('data', (chunk: Buffer) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            // Letterhead (text placeholders — seal assets deferred)
            doc.font('Times-Bold').fontSize(11).text('REPUBLIC OF THE PHILIPPINES', {
                align: 'center',
            });
            doc.font('Times-Roman').fontSize(10);
            doc.text(`Province of ${payload.municipality.province}`, { align: 'center' });
            doc.text(`Municipality of ${payload.municipality.name}`, { align: 'center' });
            doc.moveDown(0.4);
            doc.font('Times-Bold').text("OFFICE OF THE MUNICIPAL MAYOR", { align: 'center' });
            doc.moveDown(0.6);
            doc
                .moveTo(50, doc.y)
                .lineTo(doc.page.width - 50, doc.y)
                .stroke();
            doc.moveDown(0.8);

            doc.font('Helvetica-Bold').fontSize(14).text('Compliance Scorecard', {
                align: 'center',
            });
            doc.font('Helvetica').fontSize(10);
            doc.text(
                `Period: ${payload.periodLabel ?? 'All open periods'} · Records: ${payload.rows.length}`,
                { align: 'center' },
            );
            doc.text(
                `Generated: ${this.formatManila(generatedAt)} · Prepared by ${payload.generatedBy.fullName}`,
                { align: 'center' },
            );
            doc.moveDown(1);

            doc.font('Helvetica-Bold').fontSize(8);
            const startY = doc.y;
            doc.text('PSGC', 50, startY, { width: 70 });
            doc.text('Barangay', 120, startY, { width: 80 });
            doc.text('Code', 200, startY, { width: 50 });
            doc.text('Due', 255, startY, { width: 60 });
            doc.text('Status', 320, startY, { width: 70 });
            doc.text('P/F', 400, startY, { width: 40 });
            doc.y = startY + 12;
            doc
                .moveTo(50, doc.y)
                .lineTo(doc.page.width - 50, doc.y)
                .stroke();
            doc.moveDown(0.4);

            doc.font('Helvetica').fontSize(8);
            for (const row of payload.rows.slice(0, 80)) {
                if (doc.y > doc.page.height - 130) {
                    doc.addPage();
                    doc.font('Helvetica').fontSize(9).text(
                        `Municipality of ${payload.municipality.name} — Compliance Scorecard (continued)`,
                    );
                    doc.moveDown(0.5);
                    doc.font('Helvetica').fontSize(8);
                }
                const y = doc.y;
                doc.text(row.psgc, 50, y, { width: 70 });
                doc.text(row.barangay.slice(0, 16), 120, y, { width: 80 });
                doc.text(row.requirementCode, 200, y, { width: 50 });
                doc.text(row.dueDate, 255, y, { width: 60 });
                doc.text(row.status, 320, y, { width: 70 });
                doc.text(row.passFail, 400, y, { width: 40 });
                doc.y = y + 11;
            }

            if (payload.rows.length > 80) {
                doc.moveDown(0.5);
                doc.font('Helvetica-Oblique').text(
                    `Showing first 80 of ${payload.rows.length} rows. Full dataset available in Excel export.`,
                );
            }

            // Footer QR band
            const footerY = doc.page.height - 95;
            doc.font('Helvetica').fontSize(7);
            doc.text(
                `Compliance Scorecard | Period: ${payload.periodLabel ?? 'all'} | Hash: ${contentHash.slice(0, 16)}… | Doc: ${documentId}`,
                50,
                footerY,
                { width: 340 },
            );
            doc.text('Scan to verify authenticity', 50, footerY + 22);
            doc.fontSize(6).fillColor('#334155').text(verificationUrl, 50, footerY + 34, {
                width: 340,
                link: verificationUrl,
            });
            doc.fillColor('#000000');
            doc.image(qrBuffer, doc.page.width - 120, footerY, { width: 70, height: 70 });

            doc.end();
        });
    }

    private formatManila(date: Date): string {
        return new Intl.DateTimeFormat('en-PH', {
            timeZone: 'Asia/Manila',
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        }).format(date);
    }
}
