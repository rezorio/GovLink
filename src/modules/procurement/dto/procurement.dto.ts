import {
    IsEnum,
    IsIn,
    IsInt,
    IsOptional,
    IsString,
    IsUUID,
    Max,
    Min,
    MinLength,
} from 'class-validator';
import { ProcurementMode } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateAppLineDto {
    @Type(() => Number)
    @IsInt()
    @Min(2020)
    @Max(2100)
    fiscalYear!: number;

    @IsString()
    @MinLength(2)
    code!: string;

    @IsString()
    @MinLength(3)
    description!: string;

    @IsString()
    @MinLength(2)
    category!: string;

    /** Amount in centavos (integer). */
    @Type(() => Number)
    @IsInt()
    @Min(1)
    approvedAmountCentavos!: number;
}

export class UpdateAppLineDto {
    @IsOptional()
    @IsString()
    @MinLength(3)
    description?: string;

    @IsOptional()
    @IsString()
    @MinLength(2)
    category?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    approvedAmountCentavos?: number;
}

export class CreateContractDto {
    @IsUUID()
    appLineItemId!: string;

    @IsString()
    @MinLength(3)
    title!: string;

    @IsString()
    @MinLength(2)
    supplierName!: string;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    amountCentavos!: number;

    @IsEnum(ProcurementMode)
    mode!: ProcurementMode;
}

export class AdvanceContractDto {
    @IsIn([
        'PLANNED',
        'RFQ_ISSUED',
        'QUOTATIONS_RECEIVED',
        'EVALUATION',
        'AWARD_RECOMMENDED',
        'AWARDED',
        'ACTIVE',
        'COMPLETED',
    ])
    targetStatus!:
        | 'PLANNED'
        | 'RFQ_ISSUED'
        | 'QUOTATIONS_RECEIVED'
        | 'EVALUATION'
        | 'AWARD_RECOMMENDED'
        | 'AWARDED'
        | 'ACTIVE'
        | 'COMPLETED';
}
