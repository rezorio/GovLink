import { Controller, Get, Query } from '@nestjs/common';
import { ComplianceScope } from '@prisma/client';
import { ComplianceService } from './compliance.service';

@Controller('compliance')
export class ComplianceController {
    constructor(private readonly complianceService: ComplianceService) {}

    @Get('requirements')
    listRequirements(@Query('scope') scope?: ComplianceScope) {
        return this.complianceService.listRequirements(scope);
    }
}
