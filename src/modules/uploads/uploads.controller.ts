import { Body, Controller, Post } from '@nestjs/common';
import { AppRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantCtx } from '../common/decorators/tenant-context.decorator';
import { TenantContext } from '../common/interfaces/auth.interface';
import { ConfirmUploadDto } from './dto/confirm-upload.dto';
import { PresignUploadDto } from './dto/presign-upload.dto';
import { UploadsService } from './uploads.service';

@Controller('uploads')
export class UploadsController {
    constructor(private readonly uploadsService: UploadsService) {}

    @Roles(AppRole.BARANGAY_CAPTAIN, AppRole.BARANGAY_SECRETARY)
    @Post('presign')
    presign(@TenantCtx() ctx: TenantContext, @Body() dto: PresignUploadDto) {
        return this.uploadsService.createPresignedPut(ctx, dto);
    }

    @Roles(AppRole.BARANGAY_CAPTAIN, AppRole.BARANGAY_SECRETARY)
    @Post('confirm')
    confirm(@TenantCtx() ctx: TenantContext, @Body() dto: ConfirmUploadDto) {
        return this.uploadsService.confirmUpload(ctx, dto);
    }
}
