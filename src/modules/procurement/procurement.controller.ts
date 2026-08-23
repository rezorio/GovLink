import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { AppRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantCtx } from '../common/decorators/tenant-context.decorator';
import { TenantContext } from '../common/interfaces/auth.interface';
import { BacService } from './bac/bac.service';
import {
    AdvanceContractDto,
    CreateAppLineDto,
    CreateContractDto,
    UpdateAppLineDto,
} from './dto/procurement.dto';
import { CreateBacMemberDto } from './dto/bac.dto';
import {
    CreateProcurementDocumentDto,
    VoidProcurementDocumentDto,
} from './dto/create-document.dto';
import { ProcurementDocumentsService } from './documents/procurement-documents.service';
import { ProcurementService } from './procurement.service';

@Controller('procurement')
export class ProcurementController {
    constructor(
        private readonly procurementService: ProcurementService,
        private readonly documentsService: ProcurementDocumentsService,
        private readonly bacService: BacService,
    ) {}

    @Get('thresholds')
    listThresholds() {
        return this.procurementService.listThresholds();
    }

    @Get('app-lines')
    listAppLines(
        @TenantCtx() ctx: TenantContext,
        @Query('fiscalYear') fiscalYear?: string,
    ) {
        const year = fiscalYear ? Number(fiscalYear) : undefined;
        return this.procurementService.listAppLines(
            ctx,
            year && !Number.isNaN(year) ? year : undefined,
        );
    }

    @Roles(AppRole.BARANGAY_CAPTAIN, AppRole.BARANGAY_SECRETARY)
    @Post('app-lines')
    createAppLine(@TenantCtx() ctx: TenantContext, @Body() dto: CreateAppLineDto) {
        return this.procurementService.createAppLine(ctx, dto);
    }

    @Roles(AppRole.BARANGAY_CAPTAIN, AppRole.BARANGAY_SECRETARY)
    @Patch('app-lines/:id')
    updateAppLine(
        @TenantCtx() ctx: TenantContext,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateAppLineDto,
    ) {
        return this.procurementService.updateAppLine(ctx, id, dto);
    }

    @Roles(AppRole.MAYOR, AppRole.DEPT_HEAD)
    @Post('app-lines/:id/approve')
    approveAppLine(
        @TenantCtx() ctx: TenantContext,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.procurementService.approveAppLine(ctx, id);
    }

    @Get('contracts')
    listContracts(
        @TenantCtx() ctx: TenantContext,
        @Query('fiscalYear') fiscalYear?: string,
    ) {
        const year = fiscalYear ? Number(fiscalYear) : undefined;
        return this.procurementService.listContracts(
            ctx,
            year && !Number.isNaN(year) ? year : undefined,
        );
    }

    @Get('contracts/:id')
    findContract(
        @TenantCtx() ctx: TenantContext,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.procurementService.findContract(ctx, id);
    }

    @Roles(AppRole.BARANGAY_CAPTAIN, AppRole.BARANGAY_SECRETARY)
    @Post('contracts')
    createContract(@TenantCtx() ctx: TenantContext, @Body() dto: CreateContractDto) {
        return this.procurementService.createContract(ctx, dto);
    }

    @Roles(AppRole.BARANGAY_CAPTAIN, AppRole.BARANGAY_SECRETARY)
    @Post('contracts/:id/advance')
    advance(
        @TenantCtx() ctx: TenantContext,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: AdvanceContractDto,
    ) {
        return this.procurementService.advanceContract(ctx, id, dto);
    }

    @Roles(AppRole.MAYOR, AppRole.DEPT_HEAD)
    @Post('contracts/:id/acknowledge-split')
    acknowledgeSplit(
        @TenantCtx() ctx: TenantContext,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.procurementService.acknowledgeSplit(ctx, id);
    }

    @Roles(AppRole.MAYOR, AppRole.DEPT_HEAD)
    @Get('oversight')
    oversight(
        @TenantCtx() ctx: TenantContext,
        @Query('fiscalYear') fiscalYear?: string,
    ) {
        const year = fiscalYear ? Number(fiscalYear) : undefined;
        return this.procurementService.oversight(
            ctx,
            year && !Number.isNaN(year) ? year : undefined,
        );
    }

    @Get('bac-members')
    listBacMembers(
        @TenantCtx() ctx: TenantContext,
        @Query('barangayId') barangayId?: string,
    ) {
        return this.bacService.list(ctx, barangayId);
    }

    @Roles(AppRole.BARANGAY_CAPTAIN, AppRole.BARANGAY_SECRETARY)
    @Post('bac-members')
    createBacMember(@TenantCtx() ctx: TenantContext, @Body() dto: CreateBacMemberDto) {
        return this.bacService.create(ctx, dto);
    }

    @Roles(AppRole.BARANGAY_CAPTAIN, AppRole.BARANGAY_SECRETARY)
    @Post('bac-members/:id/deactivate')
    deactivateBacMember(
        @TenantCtx() ctx: TenantContext,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.bacService.deactivate(ctx, id);
    }

    @Get('contracts/:id/documents')
    listDocuments(
        @TenantCtx() ctx: TenantContext,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.documentsService.listDocuments(ctx, id);
    }

    @Get('contracts/:id/chain')
    getChain(
        @TenantCtx() ctx: TenantContext,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.documentsService.getChain(ctx, id);
    }

    @Roles(AppRole.BARANGAY_CAPTAIN, AppRole.BARANGAY_SECRETARY)
    @Post('contracts/:id/documents')
    createDocument(
        @TenantCtx() ctx: TenantContext,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: CreateProcurementDocumentDto,
    ) {
        return this.documentsService.createDocument(ctx, id, dto);
    }

    @Roles(AppRole.BARANGAY_CAPTAIN, AppRole.BARANGAY_SECRETARY)
    @Post('contracts/:id/documents/:docId/void')
    voidDocument(
        @TenantCtx() ctx: TenantContext,
        @Param('id', ParseUUIDPipe) id: string,
        @Param('docId', ParseUUIDPipe) docId: string,
        @Body() dto: VoidProcurementDocumentDto,
    ) {
        return this.documentsService.voidDocument(ctx, id, docId, dto);
    }
}
