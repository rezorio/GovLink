import { Injectable } from '@nestjs/common';
import { TenantScopeService } from '../common/services/tenant-scope.service';
import { TenantContext } from '../common/interfaces/auth.interface';
import { PrismaService } from '../prisma/prisma.module';

@Injectable()
export class BarangaysService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly tenantScope: TenantScopeService,
    ) {}

    listForMunicipality(ctx: TenantContext) {
        this.tenantScope.assertMunicipalScope(ctx);

        return this.prisma.barangay.findMany({
            where: {
                municipalityId: ctx.municipality_id,
                isActive: true,
            },
            select: {
                id: true,
                name: true,
                psgcCode: true,
            },
            orderBy: { name: 'asc' },
        });
    }
}
