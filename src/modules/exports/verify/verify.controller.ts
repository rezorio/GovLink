import { Controller, Get, Param } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { ExportDocumentService } from '../services/export-document.service';

@Controller('verify')
export class VerifyController {
    constructor(private readonly documents: ExportDocumentService) {}

    @Public()
    @Throttle({ default: { limit: 60, ttl: 60_000 } })
    @Get('documents/:token')
    verify(@Param('token') token: string) {
        return this.documents.verifyByToken(token);
    }
}
