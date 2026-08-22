import { Controller, Get, Param } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { ExportDocumentService } from '../services/export-document.service';

@Controller('verify')
export class VerifyController {
    constructor(private readonly documents: ExportDocumentService) {}

    @Public()
    @Get('documents/:token')
    verify(@Param('token') token: string) {
        return this.documents.verifyByToken(token);
    }
}
