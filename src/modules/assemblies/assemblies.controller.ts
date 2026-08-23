import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { AppRole, AssemblySemester } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantCtx } from '../common/decorators/tenant-context.decorator';
import { TenantContext } from '../common/interfaces/auth.interface';
import { AssembliesService } from './assemblies.service';
import {
    OpenAssemblyPeriodsDto,
    ReviewAssemblyDto,
    UpdateAssemblyDto,
} from './dto/assembly.dto';

@Controller('assemblies')
export class AssembliesController {
    constructor(private readonly assembliesService: AssembliesService) {}

    @Roles(AppRole.MAYOR, AppRole.DEPT_HEAD, AppRole.BARANGAY_CAPTAIN, AppRole.BARANGAY_SECRETARY)
    @Get()
    list(
        @TenantCtx() ctx: TenantContext,
        @Query('semester') semester?: AssemblySemester,
        @Query('periodLabel') periodLabel?: string,
    ) {
        return this.assembliesService.list(ctx, semester, periodLabel);
    }

    @Roles(AppRole.MAYOR, AppRole.DEPT_HEAD)
    @Get('matrix')
    matrix(
        @TenantCtx() ctx: TenantContext,
        @Query('semester') semester?: AssemblySemester,
        @Query('periodLabel') periodLabel?: string,
    ) {
        return this.assembliesService.matrix(ctx, semester, periodLabel);
    }

    @Roles(AppRole.MAYOR, AppRole.DEPT_HEAD)
    @Post('periods/open')
    openPeriods(@TenantCtx() ctx: TenantContext, @Body() dto: OpenAssemblyPeriodsDto) {
        return this.assembliesService.openPeriods(ctx, dto);
    }

    @Roles(AppRole.MAYOR, AppRole.DEPT_HEAD, AppRole.BARANGAY_CAPTAIN, AppRole.BARANGAY_SECRETARY)
    @Get(':id')
    findOne(@TenantCtx() ctx: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
        return this.assembliesService.findOne(ctx, id);
    }

    @Roles(AppRole.BARANGAY_CAPTAIN, AppRole.BARANGAY_SECRETARY)
    @Patch(':id')
    update(
        @TenantCtx() ctx: TenantContext,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateAssemblyDto,
    ) {
        return this.assembliesService.updateDraft(ctx, id, dto);
    }

    @Roles(AppRole.BARANGAY_CAPTAIN, AppRole.BARANGAY_SECRETARY)
    @Post(':id/submit')
    submit(@TenantCtx() ctx: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
        return this.assembliesService.submit(ctx, id);
    }

    @Roles(AppRole.MAYOR, AppRole.DEPT_HEAD)
    @Post(':id/review')
    review(
        @TenantCtx() ctx: TenantContext,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: ReviewAssemblyDto,
    ) {
        return this.assembliesService.review(ctx, id, dto);
    }
}
