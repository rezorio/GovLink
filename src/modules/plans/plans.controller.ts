import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { AppRole, PlanType } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantCtx } from '../common/decorators/tenant-context.decorator';
import { TenantContext } from '../common/interfaces/auth.interface';
import { OpenPlanPeriodsDto, ReviewPlanDto, UpdatePlanDto } from './dto/plan.dto';
import { PlansService } from './plans.service';

@Controller('plans')
export class PlansController {
    constructor(private readonly plansService: PlansService) {}

    @Roles(AppRole.MAYOR, AppRole.DEPT_HEAD, AppRole.BARANGAY_CAPTAIN, AppRole.BARANGAY_SECRETARY)
    @Get()
    list(
        @TenantCtx() ctx: TenantContext,
        @Query('planType') planType?: PlanType,
        @Query('periodLabel') periodLabel?: string,
    ) {
        return this.plansService.list(ctx, planType, periodLabel);
    }

    @Roles(AppRole.MAYOR, AppRole.DEPT_HEAD)
    @Get('matrix')
    matrix(
        @TenantCtx() ctx: TenantContext,
        @Query('planType') planType?: PlanType,
        @Query('periodLabel') periodLabel?: string,
    ) {
        return this.plansService.matrix(ctx, planType, periodLabel);
    }

    @Roles(AppRole.MAYOR, AppRole.DEPT_HEAD)
    @Post('periods/open')
    openPeriods(@TenantCtx() ctx: TenantContext, @Body() dto: OpenPlanPeriodsDto) {
        return this.plansService.openPeriods(ctx, dto);
    }

    @Roles(AppRole.MAYOR, AppRole.DEPT_HEAD, AppRole.BARANGAY_CAPTAIN, AppRole.BARANGAY_SECRETARY)
    @Get(':id')
    findOne(@TenantCtx() ctx: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
        return this.plansService.findOne(ctx, id);
    }

    @Roles(AppRole.BARANGAY_CAPTAIN, AppRole.BARANGAY_SECRETARY)
    @Patch(':id')
    update(
        @TenantCtx() ctx: TenantContext,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdatePlanDto,
    ) {
        return this.plansService.updateDraft(ctx, id, dto);
    }

    @Roles(AppRole.BARANGAY_CAPTAIN, AppRole.BARANGAY_SECRETARY)
    @Post(':id/submit')
    submit(@TenantCtx() ctx: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
        return this.plansService.submit(ctx, id);
    }

    @Roles(AppRole.MAYOR, AppRole.DEPT_HEAD)
    @Post(':id/review')
    review(
        @TenantCtx() ctx: TenantContext,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: ReviewPlanDto,
    ) {
        return this.plansService.review(ctx, id, dto);
    }
}
