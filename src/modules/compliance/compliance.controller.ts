import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    Query,
} from '@nestjs/common';
import { AppRole, ComplianceScope } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantCtx } from '../common/decorators/tenant-context.decorator';
import { TenantContext } from '../common/interfaces/auth.interface';
import { ComplianceService } from './compliance.service';
import { OpenPeriodDto } from './dto/open-period.dto';
import {
    CreateComplianceRequirementDto,
    UpdateComplianceRequirementDto,
} from './dto/requirement.dto';
import { ReviewComplianceInstanceDto } from './dto/review-instance.dto';
import { SglgScoreService } from './sglg/sglg-score.service';

@Controller('compliance')
export class ComplianceController {
    constructor(
        private readonly complianceService: ComplianceService,
        private readonly sglgScoreService: SglgScoreService,
    ) {}

    @Get('requirements')
    listRequirements(
        @TenantCtx() ctx: TenantContext,
        @Query('scope') scope?: ComplianceScope,
    ) {
        return this.complianceService.listRequirements(ctx, scope);
    }

    @Roles(AppRole.MAYOR, AppRole.DEPT_HEAD)
    @Post('requirements')
    createRequirement(
        @TenantCtx() ctx: TenantContext,
        @Body() dto: CreateComplianceRequirementDto,
    ) {
        return this.complianceService.createRequirement(ctx, dto);
    }

    @Roles(AppRole.MAYOR, AppRole.DEPT_HEAD)
    @Patch('requirements/:id')
    updateRequirement(
        @TenantCtx() ctx: TenantContext,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateComplianceRequirementDto,
    ) {
        return this.complianceService.updateRequirement(ctx, id, dto);
    }

    @Roles(AppRole.MAYOR, AppRole.DEPT_HEAD)
    @Delete('requirements/:id')
    deactivateRequirement(
        @TenantCtx() ctx: TenantContext,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.complianceService.deactivateRequirement(ctx, id);
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
    @Get('sglg-scores')
    sglgScores(
        @TenantCtx() ctx: TenantContext,
        @Query('periodLabel') periodLabel?: string,
    ) {
        return this.sglgScoreService.scores(ctx, periodLabel);
    }

    @Roles(AppRole.MAYOR, AppRole.DEPT_HEAD)
    @Get('review-queue')
    reviewQueue(@TenantCtx() ctx: TenantContext) {
        return this.complianceService.reviewQueue(ctx);
    }

    @Get('instances/:id')
    findOne(
        @TenantCtx() ctx: TenantContext,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.complianceService.findOne(ctx, id);
    }

    @Roles(AppRole.MAYOR, AppRole.DEPT_HEAD)
    @Post('periods/open')
    openPeriods(
        @TenantCtx() ctx: TenantContext,
        @Body() dto: OpenPeriodDto = {},
    ) {
        return this.complianceService.openCurrentPeriods(ctx, dto);
    }

    @Roles(AppRole.BARANGAY_CAPTAIN, AppRole.BARANGAY_SECRETARY)
    @Post('instances/:id/start')
    start(
        @TenantCtx() ctx: TenantContext,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.complianceService.start(ctx, id);
    }

    @Roles(AppRole.BARANGAY_CAPTAIN, AppRole.BARANGAY_SECRETARY)
    @Post('instances/:id/submit')
    submit(
        @TenantCtx() ctx: TenantContext,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.complianceService.submit(ctx, id);
    }

    @Roles(AppRole.MAYOR, AppRole.DEPT_HEAD)
    @Post('instances/:id/review')
    review(
        @TenantCtx() ctx: TenantContext,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: ReviewComplianceInstanceDto,
    ) {
        return this.complianceService.review(ctx, id, dto);
    }
}
