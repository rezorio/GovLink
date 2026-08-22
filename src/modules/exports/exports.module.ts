import { Module } from '@nestjs/common';
import { ExportsController } from './exports.controller';
import { ComplianceScorecardService } from './services/compliance-scorecard.service';
import { ExcelExportService } from './services/excel-export.service';
import { ExportDocumentService } from './services/export-document.service';
import { ExportsService } from './services/exports.service';
import { PdfExportService } from './services/pdf-export.service';
import { VerifyController } from './verify/verify.controller';

@Module({
    controllers: [ExportsController, VerifyController],
    providers: [
        ExportsService,
        ComplianceScorecardService,
        ExportDocumentService,
        PdfExportService,
        ExcelExportService,
    ],
})
export class ExportsModule {}
