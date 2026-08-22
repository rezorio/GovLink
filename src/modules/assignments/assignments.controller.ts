import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { AppRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantCtx } from '../common/decorators/tenant-context.decorator';
import { TenantContext } from '../common/interfaces/auth.interface';
import { AssignmentsService } from './assignments.service';
import { ReviewAssignmentDto } from './dto/review-assignment.dto';
import { SubmitEvidenceDto } from './dto/submit-evidence.dto';

@Controller('assignments')
export class AssignmentsController {
    constructor(private readonly assignmentsService: AssignmentsService) {}

    @Get()
    list(@TenantCtx() ctx: TenantContext) {
        return this.assignmentsService.list(ctx);
    }

    @Get(':id')
    findOne(@TenantCtx() ctx: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
        return this.assignmentsService.findOne(ctx, id);
    }

    @Roles(AppRole.BARANGAY_CAPTAIN, AppRole.BARANGAY_SECRETARY)
    @Post(':id/acknowledge')
    acknowledge(@TenantCtx() ctx: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
        return this.assignmentsService.acknowledge(ctx, id);
    }

    @Roles(AppRole.BARANGAY_CAPTAIN, AppRole.BARANGAY_SECRETARY)
    @Post(':id/submissions')
    submitEvidence(
        @TenantCtx() ctx: TenantContext,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: SubmitEvidenceDto,
    ) {
        return this.assignmentsService.submitEvidence(ctx, id, dto);
    }

    @Roles(AppRole.MAYOR, AppRole.DEPT_HEAD)
    @Post(':id/review')
    review(
        @TenantCtx() ctx: TenantContext,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: ReviewAssignmentDto,
    ) {
        return this.assignmentsService.review(ctx, id, dto);
    }
}
