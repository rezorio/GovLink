import {
    BadRequestException,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { BacDesignation, Prisma } from '@prisma/client';
import { AuditLogService } from '../../common/services/audit-log.service';
import { TenantScopeService } from '../../common/services/tenant-scope.service';
import { TenantContext } from '../../common/interfaces/auth.interface';
import { PrismaService } from '../../prisma/prisma.module';
import { CreateBacMemberDto } from '../dto/bac.dto';
import { MAX_ACTIVE_BAC_MEMBERS, MIN_ACTIVE_BAC_MEMBERS } from './bac.constants';
import { maskEmail } from '../../common/pii/pii-mask.util';
import { shouldMaskLinkedUserEmail } from '../../common/pii/pii-policy';

const bacInclude = {
    user: { select: { id: true, fullName: true, email: true } },
} satisfies Prisma.BacMemberInclude;

@Injectable()
export class BacService {
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
                throw new BadRequestException('barangayId query is required for municipal BAC list');
            }
        }

        if (!ctx.barangay_id && scopeBarangayId) {
            const brgy = await this.prisma.barangay.findFirst({
                where: {
                    id: scopeBarangayId,
                    municipalityId: ctx.municipality_id,
                },
                select: { id: true },
            });
            if (!brgy) {
                throw new ForbiddenException('Barangay not found in your municipality');
            }
        }

        const rows = await this.prisma.bacMember.findMany({
            where: {
                municipalityId: ctx.municipality_id,
                barangayId: scopeBarangayId!,
            },
            include: bacInclude,
            orderBy: [{ isActive: 'desc' }, { designation: 'asc' }, { displayName: 'asc' }],
        });

        return rows.map((row) => this.maskBacRow(ctx, row));
    }

    private maskBacRow(
        ctx: TenantContext,
        row: Prisma.BacMemberGetPayload<{ include: typeof bacInclude }>,
    ) {
        if (!row.user?.email || !shouldMaskLinkedUserEmail(ctx, row.user.id)) {
            return row;
        }
        return {
            ...row,
            user: {
                ...row.user,
                email: maskEmail(row.user.email),
            },
        };
    }

    async create(ctx: TenantContext, dto: CreateBacMemberDto) {
        this.tenantScope.assertBarangayScope(ctx);
        const barangayId = ctx.barangay_id!;

        const active = await this.prisma.bacMember.findMany({
            where: { barangayId, isActive: true },
            select: { designation: true, displayName: true },
        });

        if (active.length >= MAX_ACTIVE_BAC_MEMBERS) {
            throw new BadRequestException(
                `Active BAC roster is full (max ${MAX_ACTIVE_BAC_MEMBERS})`,
            );
        }

        if (dto.designation === BacDesignation.CHAIR) {
            const hasChair = active.some((m) => m.designation === BacDesignation.CHAIR);
            if (hasChair) {
                throw new BadRequestException('Barangay already has an active BAC chair');
            }
        }

        if (dto.designation === BacDesignation.VICE_CHAIR) {
            const hasVice = active.some((m) => m.designation === BacDesignation.VICE_CHAIR);
            if (hasVice) {
                throw new BadRequestException('Barangay already has an active BAC vice-chair');
            }
        }

        const duplicateName = active.some(
            (m) => m.displayName.trim().toLowerCase() === dto.displayName.trim().toLowerCase(),
        );
        if (duplicateName) {
            throw new BadRequestException('An active BAC member with this name already exists');
        }

        if (dto.userId) {
            const user = await this.prisma.user.findFirst({
                where: {
                    id: dto.userId,
                    municipalityId: ctx.municipality_id,
                    barangayId,
                    deletedAt: null,
                },
            });
            if (!user) {
                throw new BadRequestException('userId must belong to this barangay');
            }
        }

        const row = await this.prisma.bacMember.create({
            data: {
                municipalityId: ctx.municipality_id,
                barangayId,
                displayName: dto.displayName.trim(),
                designation: dto.designation,
                termStart: new Date(dto.termStart),
                designationDate: new Date(dto.designationDate),
                designatedById: ctx.user_id,
                ...(dto.userId ? { userId: dto.userId } : {}),
            },
            include: bacInclude,
        });

        await this.auditLog.record({
            ctx,
            action: 'procurement.bac_member.create',
            entityType: 'BacMember',
            entityId: row.id,
            barangayId,
            after: {
                displayName: row.displayName,
                designation: row.designation,
            },
        });

        return this.maskBacRow(ctx, row);
    }

    async deactivate(ctx: TenantContext, id: string) {
        this.tenantScope.assertBarangayScope(ctx);
        const existing = await this.prisma.bacMember.findFirst({
            where: {
                id,
                municipalityId: ctx.municipality_id,
                barangayId: ctx.barangay_id!,
            },
        });
        if (!existing) {
            throw new ForbiddenException('BAC member not found in your tenant scope');
        }
        if (!existing.isActive) {
            return existing;
        }

        const row = await this.prisma.bacMember.update({
            where: { id },
            data: { isActive: false },
            include: bacInclude,
        });

        await this.auditLog.record({
            ctx,
            action: 'procurement.bac_member.deactivate',
            entityType: 'BacMember',
            entityId: row.id,
            barangayId: row.barangayId,
            after: { isActive: false },
        });

        return this.maskBacRow(ctx, row);
    }

    /** Gate before BAC resolution / award recommendation. */
    async assertRosterReady(barangayId: string) {
        const active = await this.prisma.bacMember.findMany({
            where: { barangayId, isActive: true },
            select: { designation: true },
        });

        if (active.length < MIN_ACTIVE_BAC_MEMBERS) {
            throw new BadRequestException(
                `Active BAC roster requires at least ${MIN_ACTIVE_BAC_MEMBERS} members (have ${active.length})`,
            );
        }

        const chairs = active.filter((m) => m.designation === BacDesignation.CHAIR).length;
        if (chairs !== 1) {
            throw new BadRequestException(
                'Active BAC roster must include exactly one designated chair',
            );
        }
    }
}
