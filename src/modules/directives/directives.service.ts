import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { AuditLogService } from '../common/services/audit-log.service';
import { TenantScopeService } from '../common/services/tenant-scope.service';
import { TenantContext } from '../common/interfaces/auth.interface';
import { PrismaService } from '../prisma/prisma.module';
import { CreateTaskDto } from './dto/create-task.dto';

@Injectable()
export class DirectivesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly auditLog: AuditLogService,
        private readonly tenantScope: TenantScopeService,
    ) {}

    listTemplates() {
        return this.prisma.directiveTemplate.findMany({
            orderBy: { dilgMcNumber: 'asc' },
        });
    }

    async createTask(ctx: TenantContext, dto: CreateTaskDto) {
        this.tenantScope.assertMunicipalScope(ctx);

        const uniqueBarangayIds = [...new Set(dto.barangayIds)];

        const barangays = await this.prisma.barangay.findMany({
            where: {
                id: { in: uniqueBarangayIds },
                municipalityId: ctx.municipality_id,
                isActive: true,
            },
        });

        if (barangays.length !== uniqueBarangayIds.length) {
            throw new BadRequestException(
                'One or more barangays are invalid or outside your municipality',
            );
        }

        if (dto.directiveTemplateId) {
            const template = await this.prisma.directiveTemplate.findUnique({
                where: { id: dto.directiveTemplateId },
            });
            if (!template) {
                throw new NotFoundException('Directive template not found');
            }
        }

        const result = await this.prisma.$transaction(async (tx) => {
            const task = await tx.supervisoryTask.create({
                data: {
                    municipalityId: ctx.municipality_id,
                    directiveTemplateId: dto.directiveTemplateId,
                    title: dto.title,
                    description: dto.description,
                    legalBasis: dto.legalBasis,
                    assignedById: ctx.user_id,
                    dueDate: new Date(dto.dueDate),
                },
            });

            const assignments = await Promise.all(
                uniqueBarangayIds.map((barangayId) =>
                    tx.taskAssignment.create({
                        data: {
                            municipalityId: ctx.municipality_id,
                            barangayId,
                            taskId: task.id,
                        },
                        include: {
                            barangay: {
                                select: { id: true, name: true, psgcCode: true },
                            },
                        },
                    }),
                ),
            );

            return { task, assignments };
        });

        await this.auditLog.record({
            ctx,
            action: 'TASK_ASSIGNED',
            entityType: 'SupervisoryTask',
            entityId: result.task.id,
            after: {
                title: result.task.title,
                barangayIds: uniqueBarangayIds,
                assignmentCount: result.assignments.length,
            },
        });

        for (const assignment of result.assignments) {
            await this.auditLog.record({
                ctx,
                action: 'ASSIGNMENT_CREATED',
                entityType: 'TaskAssignment',
                entityId: assignment.id,
                barangayId: assignment.barangayId,
                after: { taskId: result.task.id, status: assignment.status },
            });
        }

        return {
            task: result.task,
            assignments: result.assignments,
        };
    }
}
