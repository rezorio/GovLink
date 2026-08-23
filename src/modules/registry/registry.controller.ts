import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { AppRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantCtx } from '../common/decorators/tenant-context.decorator';
import { TenantContext } from '../common/interfaces/auth.interface';
import { CreateResidentDto, ListResidentsQueryDto, UpdateResidentDto } from './dto/resident.dto';
import { RegistryService } from './registry.service';

@Controller('registry/residents')
export class RegistryController {
    constructor(private readonly registryService: RegistryService) {}

    @Roles(AppRole.MAYOR, AppRole.DEPT_HEAD, AppRole.BARANGAY_CAPTAIN, AppRole.BARANGAY_SECRETARY)
    @Get()
    list(@TenantCtx() ctx: TenantContext, @Query() query: ListResidentsQueryDto) {
        return this.registryService.list(
            ctx,
            query.barangayId,
            query.page,
            query.pageSize,
            query.q,
        );
    }

    @Roles(AppRole.MAYOR, AppRole.DEPT_HEAD, AppRole.BARANGAY_CAPTAIN, AppRole.BARANGAY_SECRETARY)
    @Get(':id')
    findOne(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
        return this.registryService.findOne(ctx, id);
    }

    @Roles(AppRole.BARANGAY_CAPTAIN, AppRole.BARANGAY_SECRETARY)
    @Post()
    create(@TenantCtx() ctx: TenantContext, @Body() dto: CreateResidentDto) {
        return this.registryService.create(ctx, dto);
    }

    @Roles(AppRole.BARANGAY_CAPTAIN, AppRole.BARANGAY_SECRETARY)
    @Patch(':id')
    update(
        @TenantCtx() ctx: TenantContext,
        @Param('id') id: string,
        @Body() dto: UpdateResidentDto,
    ) {
        return this.registryService.update(ctx, id, dto);
    }
}
