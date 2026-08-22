import { Controller, Get, Query, Res, StreamableFile } from '@nestjs/common';
import { AppRole } from '@prisma/client';
import type { Response } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantCtx } from '../common/decorators/tenant-context.decorator';
import { TenantContext } from '../common/interfaces/auth.interface';
import { ExportsService } from './services/exports.service';

@Controller('exports')
export class ExportsController {
    constructor(private readonly exportsService: ExportsService) {}

    @Roles(AppRole.MAYOR, AppRole.DEPT_HEAD)
    @Get('compliance-scorecard.pdf')
    async downloadPdf(
        @TenantCtx() ctx: TenantContext,
        @Query('periodLabel') periodLabel: string | undefined,
        @Res({ passthrough: true }) res: Response,
    ) {
        const result = await this.exportsService.complianceScorecardPdf(ctx, periodLabel);
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${result.filename}"`,
            'X-Export-Document-Id': result.document.id,
            'X-Content-Hash': result.document.contentHash,
        });
        return new StreamableFile(result.buffer);
    }

    @Roles(AppRole.MAYOR, AppRole.DEPT_HEAD)
    @Get('compliance-scorecard.xlsx')
    async downloadExcel(
        @TenantCtx() ctx: TenantContext,
        @Query('periodLabel') periodLabel: string | undefined,
        @Res({ passthrough: true }) res: Response,
    ) {
        const result = await this.exportsService.complianceScorecardExcel(ctx, periodLabel);
        res.set({
            'Content-Type':
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${result.filename}"`,
            'X-Export-Document-Id': result.document.id,
            'X-Content-Hash': result.document.contentHash,
        });
        return new StreamableFile(result.buffer);
    }
}
