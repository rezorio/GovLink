import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AppRole, ComplianceScope } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantCtx } from '../common/decorators/tenant-context.decorator';
import { TenantContext } from '../common/interfaces/auth.interface';
import { ComplianceService } from './compliance.service';
import { OpenPeriodDto } from './dto/open-period.dto';

@Controller('compliance')
export class ComplianceController {
    constructor(private readonly complianceService: ComplianceService) {}

    @Get('requirements')
    listRequirements(@Query('scope') scope?: ComplianceScope) {
        return this.complianceService.listRequirements(scope);
    }

    @Get('instances')
    listInstances(
        @TenantCtx() ctx: TenantContext,
        @Query('periodLabel') periodLabel?: string,
    ) {
        return this.complianceService.listInstances(ctx, periodLabel);
    }

    @Roles(AppRole.MAYOR, AppRole.DEPT_HEAD)
    @Get('matrix')
    matrix(
        @TenantCtx() ctx: TenantContext,
        @Query('periodLabel') periodLabel?: string,
    ) {
        return this.complianceService.matrix(ctx, periodLabel);
    }

    @Roles(AppRole.MAYOR, AppRole.DEPT_HEAD)
    @Post('periods/open')
    openPeriods(
        @TenantCtx() ctx: TenantContext,
        @Body() dto: OpenPeriodDto = {},
    ) {
        return this.complianceService.openCurrentPeriods(ctx, dto);
    }
}
