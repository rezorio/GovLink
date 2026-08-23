import { Module } from '@nestjs/common';
import { ComplianceController } from './compliance.controller';
import { ComplianceService } from './compliance.service';
import { SglgScoreService } from './sglg/sglg-score.service';

@Module({
    controllers: [ComplianceController],
    providers: [ComplianceService, SglgScoreService],
})
export class ComplianceModule {}
