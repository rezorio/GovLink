import { Module } from '@nestjs/common';
import { UploadsModule } from '../uploads/uploads.module';
import { BacService } from './bac/bac.service';
import { ProcurementDocumentsService } from './documents/procurement-documents.service';
import { ProcurementController } from './procurement.controller';
import { ProcurementService } from './procurement.service';
import { ThresholdsService } from './thresholds.service';

@Module({
    imports: [UploadsModule],
    controllers: [ProcurementController],
    providers: [ProcurementService, ThresholdsService, ProcurementDocumentsService, BacService],
})
export class ProcurementModule {}
