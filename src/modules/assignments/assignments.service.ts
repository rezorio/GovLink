import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import {
    EvidenceSubmissionStatus,
    ReviewDecision,
    TaskAssignmentStatus,
} from '@prisma/client';
import { AuditLogService } from '../common/services/audit-log.service';
import { TenantScopeService } from '../common/services/tenant-scope.service';
import { assertEvidenceFileKey } from '../common/utils/file-key.util';
import { TenantContext } from '../common/interfaces/auth.interface';
import { PrismaService } from '../prisma/prisma.module';
import { ReviewAssignmentDto } from './dto/review-assignment.dto';
import { SubmitEvidenceDto } from './dto/submit-evidence.dto';

const assignmentInclude = {
    barangay: { select: { id: true, name: true, psgcCode: true } },
    task: {
        select: {
            id: true,
            title: true,
            description: true,
            legalBasis: true,
            dueDate: true,
            directiveTemplateId: true,
        },
    },
    evidenceSubmissions: {
        orderBy: { createdAt: 'desc' as const },
    },
    reviews: {
        orderBy: { reviewedAt: 'desc' as const },
        take: 5,
    },
};

@Injectable()
export class AssignmentsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly tenantScope: TenantScopeService,
        private readonly auditLog: AuditLogService,
    ) {}

    list(ctx: TenantContext) {
        return this.prisma.taskAssignment.findMany({
            where: this.tenantScope.assignmentListFilter(ctx),
            include: assignmentInclude,
            orderBy: { updatedAt: 'desc' },
        });
    }

    async findOne(ctx: TenantContext, assignmentId: string) {
        const assignment = await this.prisma.taskAssignment.findFirst({
            where: {
                id: assignmentId,
                municipalityId: ctx.municipality_id,
            },
            include: assignmentInclude,
        });

        if (!assignment) {
            throw new NotFoundException('Task assignment not found');
        }

        if (ctx.barangay_id && assignment.barangayId !== ctx.barangay_id) {
            throw new ForbiddenException('Access denied for this barangay assignment');
        }

        return assignment;
    }

    async acknowledge(ctx: TenantContext, assignmentId: string) {
        this.tenantScope.assertBarangayScope(ctx);

        const assignment = await this.findOne(ctx, assignmentId);

        if (assignment.barangayId !== ctx.barangay_id) {
            throw new ForbiddenException('Access denied for this barangay assignment');
        }

        if (assignment.status !== TaskAssignmentStatus.PENDING_ACK) {
            throw new BadRequestException('Assignment is not pending acknowledgment');
        }

        const before = { status: assignment.status };
        const updated = await this.prisma.taskAssignment.update({
            where: {
                id: assignment.id,
                ...this.tenantScope.assignmentMutationFilter(ctx),
            },
            data: {
                status: TaskAssignmentStatus.ACKNOWLEDGED,
                acknowledgedAt: new Date(),
                acknowledgedById: ctx.user_id,
            },
            include: assignmentInclude,
        });

        await this.auditLog.record({
            ctx,
            action: 'ASSIGNMENT_ACKNOWLEDGED',
            entityType: 'TaskAssignment',
            entityId: assignment.id,
            barangayId: assignment.barangayId,
            before,
            after: { status: updated.status, acknowledgedAt: updated.acknowledgedAt },
        });

        return updated;
    }

    async submitEvidence(ctx: TenantContext, assignmentId: string, dto: SubmitEvidenceDto) {
        this.tenantScope.assertBarangayScope(ctx);
        assertEvidenceFileKey(ctx, dto.fileKey);

        const assignment = await this.findOne(ctx, assignmentId);

        if (assignment.barangayId !== ctx.barangay_id) {
            throw new ForbiddenException('Access denied for this barangay assignment');
        }

        const submittableStatuses: TaskAssignmentStatus[] = [
            TaskAssignmentStatus.ACKNOWLEDGED,
            TaskAssignmentStatus.IN_PROGRESS,
            TaskAssignmentStatus.RETURNED,
        ];

        if (!submittableStatuses.includes(assignment.status)) {
            throw new BadRequestException('Assignment is not ready for evidence submission');
        }

        const result = await this.prisma.$transaction(async (tx) => {
            const submission = await tx.evidenceSubmission.create({
                data: {
                    municipalityId: ctx.municipality_id,
                    barangayId: ctx.barangay_id!,
                    assignmentId: assignment.id,
                    fileKey: dto.fileKey,
                    fileName: dto.fileName,
                    mimeType: dto.mimeType,
                    fileSizeBytes: dto.fileSizeBytes,
                    status: EvidenceSubmissionStatus.SUBMITTED,
                    submittedAt: new Date(),
                },
            });

            const updatedAssignment = await tx.taskAssignment.update({
                where: {
                    id: assignment.id,
                    ...this.tenantScope.assignmentMutationFilter(ctx),
                },
                data: { status: TaskAssignmentStatus.SUBMITTED },
                include: assignmentInclude,
            });

            return { submission, assignment: updatedAssignment };
        });

        await this.auditLog.record({
            ctx,
            action: 'EVIDENCE_SUBMITTED',
            entityType: 'EvidenceSubmission',
            entityId: result.submission.id,
            barangayId: assignment.barangayId,
            after: {
                assignmentId: assignment.id,
                fileName: dto.fileName,
                mimeType: dto.mimeType,
                barangayId: assignment.barangayId,
                assignmentStatus: TaskAssignmentStatus.SUBMITTED,
            },
        });

        return result;
    }

    async review(ctx: TenantContext, assignmentId: string, dto: ReviewAssignmentDto) {
        this.tenantScope.assertMunicipalScope(ctx);

        const assignment = await this.findOne(ctx, assignmentId);

        if (assignment.status !== TaskAssignmentStatus.SUBMITTED) {
            throw new BadRequestException('Assignment has no submission pending review');
        }

        const submission = await this.prisma.evidenceSubmission.findFirst({
            where: {
                id: dto.submissionId,
                assignmentId: assignment.id,
                municipalityId: ctx.municipality_id,
            },
        });

        if (!submission) {
            throw new NotFoundException('Evidence submission not found for this assignment');
        }

        if (submission.status !== EvidenceSubmissionStatus.SUBMITTED) {
            throw new BadRequestException('Submission is not pending review');
        }

        const assignmentStatus =
            dto.decision === ReviewDecision.ACCEPTED
                ? TaskAssignmentStatus.ACCEPTED
                : TaskAssignmentStatus.RETURNED;

        const submissionStatus =
            dto.decision === ReviewDecision.ACCEPTED
                ? EvidenceSubmissionStatus.ACCEPTED
                : EvidenceSubmissionStatus.RETURNED;

        const result = await this.prisma.$transaction(async (tx) => {
            await tx.evidenceSubmission.update({
                where: {
                    id: submission.id,
                    municipalityId: ctx.municipality_id,
                    barangayId: assignment.barangayId,
                },
                data: { status: submissionStatus },
            });

            const review = await tx.municipalReview.create({
                data: {
                    municipalityId: ctx.municipality_id,
                    assignmentId: assignment.id,
                    submissionId: submission.id,
                    reviewerId: ctx.user_id,
                    decision: dto.decision,
                    comment: dto.comment,
                },
            });

            const updatedAssignment = await tx.taskAssignment.update({
                where: {
                    id: assignment.id,
                    municipalityId: ctx.municipality_id,
                },
                data: { status: assignmentStatus },
                include: assignmentInclude,
            });

            return { review, assignment: updatedAssignment };
        });

        await this.auditLog.record({
            ctx,
            action: dto.decision === ReviewDecision.ACCEPTED ? 'REVIEW_ACCEPTED' : 'REVIEW_RETURNED',
            entityType: 'MunicipalReview',
            entityId: result.review.id,
            barangayId: assignment.barangayId,
            after: {
                assignmentId: assignment.id,
                submissionId: submission.id,
                decision: dto.decision,
                comment: dto.comment ?? null,
                assignmentStatus,
            },
        });

        return result;
    }
}
