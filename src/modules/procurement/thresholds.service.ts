import { Injectable, NotFoundException } from '@nestjs/common';
import {
    IncomeClass,
    ProcurementMode,
    ProcurementRegime,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';

@Injectable()
export class ThresholdsService {
    constructor(private readonly prisma: PrismaService) {}

    listAll() {
        return this.prisma.procurementThreshold.findMany({
            orderBy: [
                { regime: 'asc' },
                { incomeClass: 'asc' },
                { mode: 'asc' },
            ],
        });
    }

    /**
     * Latest effective ceiling for regime + income class + mode (Asia/Manila "today").
     */
    async getMaxAmountCentavos(params: {
        regime: ProcurementRegime;
        incomeClass: IncomeClass;
        mode: ProcurementMode;
        asOf?: Date;
    }): Promise<bigint | null> {
        const asOf = params.asOf ?? new Date();
        const row = await this.prisma.procurementThreshold.findFirst({
            where: {
                regime: params.regime,
                incomeClass: params.incomeClass,
                mode: params.mode,
                effectiveFrom: { lte: asOf },
            },
            orderBy: { effectiveFrom: 'desc' },
        });

        return row?.maxAmountCentavos ?? null;
    }

    async requireMaxAmountCentavos(params: {
        regime: ProcurementRegime;
        incomeClass: IncomeClass;
        mode: ProcurementMode;
    }): Promise<bigint> {
        const max = await this.getMaxAmountCentavos(params);
        if (max === null) {
            throw new NotFoundException(
                `No procurement threshold configured for ${params.regime}/${params.incomeClass}/${params.mode}`,
            );
        }
        return max;
    }
}
