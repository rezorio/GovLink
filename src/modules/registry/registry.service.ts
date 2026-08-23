import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { AuditLogService } from '../common/services/audit-log.service';
import { TenantScopeService } from '../common/services/tenant-scope.service';
import { TenantContext } from '../common/interfaces/auth.interface';
import { toResidentResponse } from '../common/pii/resident.mapper';
import { PrismaService } from '../prisma/prisma.module';
import { CreateResidentDto, UpdateResidentDto } from './dto/resident.dto';

@Injectable()
export class RegistryService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly tenantScope: TenantScopeService,
        private readonly auditLog: AuditLogService,
    ) {}

    async list(ctx: TenantContext, barangayId?: string) {
        const scopeBarangayId = ctx.barangay_id ?? barangayId;
        if (ctx.barangay_id) {
            this.tenantScope.assertBarangayScope(ctx);
        } else {
            this.tenantScope.assertMunicipalScope(ctx);
            if (!scopeBarangayId) {
                throw new BadRequestException('barangayId query is required for municipal registry list');
            }
        }

        if (!ctx.barangay_id && scopeBarangayId) {
            await this.assertBarangayInMunicipality(ctx.municipality_id, scopeBarangayId);
        }

        const rows = await this.prisma.barangayResident.findMany({
            where: {
                municipalityId: ctx.municipality_id,
                barangayId: scopeBarangayId!,
            },
            orderBy: [{ fullName: 'asc' }],
        });

        return rows.map((row) => toResidentResponse(ctx, row));
    }

    async findOne(ctx: TenantContext, id: string) {
        const row = await this.prisma.barangayResident.findFirst({
            where: {
                id,
                municipalityId: ctx.municipality_id,
            },
        });

        if (!row) {
            throw new NotFoundException('Registry record not found');
        }

        if (ctx.barangay_id && row.barangayId !== ctx.barangay_id) {
            throw new ForbiddenException('Access denied for this barangay registry record');
        }

        return toResidentResponse(ctx, row);
    }

    async create(ctx: TenantContext, dto: CreateResidentDto) {
        this.tenantScope.assertBarangayScope(ctx);
        const barangayId = ctx.barangay_id!;

        const row = await this.prisma.barangayResident.create({
            data: {
                municipalityId: ctx.municipality_id,
                barangayId,
                fullName: dto.fullName.trim(),
                addressLine: dto.addressLine.trim(),
                phone: dto.phone.trim(),
                birthYear: dto.birthYear ?? null,
                recordType: dto.recordType ?? 'RESIDENT',
            },
        });

        await this.auditLog.record({
            ctx,
            action: 'registry.resident.create',
            entityType: 'BarangayResident',
            entityId: row.id,
            barangayId,
            after: {
                fullName: row.fullName,
                recordType: row.recordType,
            },
        });

        return toResidentResponse(ctx, row);
    }

    async update(ctx: TenantContext, id: string, dto: UpdateResidentDto) {
        this.tenantScope.assertBarangayScope(ctx);

        const existing = await this.prisma.barangayResident.findFirst({
            where: {
                id,
                municipalityId: ctx.municipality_id,
                barangayId: ctx.barangay_id!,
            },
        });

        if (!existing) {
            throw new ForbiddenException('Registry record not found in your barangay scope');
        }

        const row = await this.prisma.barangayResident.update({
            where: { id },
            data: {
                ...(dto.fullName !== undefined ? { fullName: dto.fullName.trim() } : {}),
                ...(dto.addressLine !== undefined ? { addressLine: dto.addressLine.trim() } : {}),
                ...(dto.phone !== undefined ? { phone: dto.phone.trim() } : {}),
                ...(dto.birthYear !== undefined ? { birthYear: dto.birthYear } : {}),
                ...(dto.recordType !== undefined ? { recordType: dto.recordType } : {}),
            },
        });

        await this.auditLog.record({
            ctx,
            action: 'registry.resident.update',
            entityType: 'BarangayResident',
            entityId: row.id,
            barangayId: row.barangayId,
            after: {
                fullName: row.fullName,
                recordType: row.recordType,
            },
        });

        return toResidentResponse(ctx, row);
    }

    private async assertBarangayInMunicipality(municipalityId: string, barangayId: string) {
        const brgy = await this.prisma.barangay.findFirst({
            where: { id: barangayId, municipalityId },
            select: { id: true },
        });
        if (!brgy) {
            throw new ForbiddenException('Barangay not found in your municipality');
        }
    }
}
