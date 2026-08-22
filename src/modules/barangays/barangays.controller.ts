import { Controller, Get } from '@nestjs/common';
import { AppRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantCtx } from '../common/decorators/tenant-context.decorator';
import { TenantContext } from '../common/interfaces/auth.interface';
import { BarangaysService } from './barangays.service';

@Controller('barangays')
export class BarangaysController {
    constructor(private readonly barangaysService: BarangaysService) {}

    @Roles(AppRole.MAYOR, AppRole.DEPT_HEAD)
    @Get()
    list(@TenantCtx() ctx: TenantContext) {
        return this.barangaysService.listForMunicipality(ctx);
    }
}
