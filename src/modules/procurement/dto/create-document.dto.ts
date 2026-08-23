import {
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    IsUUID,
    Min,
    MinLength,
    ValidateIf,
} from 'class-validator';
import { ProcurementDocType } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateProcurementDocumentDto {
    @IsEnum(ProcurementDocType)
    docType!: ProcurementDocType;

    @IsString()
    @MinLength(2)
    title!: string;

    @IsOptional()
    @IsString()
    notes?: string;

    @ValidateIf((dto: CreateProcurementDocumentDto) => dto.docType !== ProcurementDocType.QUOTATION)
    @IsString()
    @MinLength(10)
    fileKey?: string;

    @ValidateIf((dto: CreateProcurementDocumentDto) => dto.docType !== ProcurementDocType.QUOTATION)
    @IsString()
    @MinLength(1)
    fileName?: string;

    @ValidateIf((dto: CreateProcurementDocumentDto) => dto.docType !== ProcurementDocType.QUOTATION)
    @IsString()
    @MinLength(3)
    mimeType?: string;

    @ValidateIf((dto: CreateProcurementDocumentDto) => dto.docType !== ProcurementDocType.QUOTATION)
    @Type(() => Number)
    @IsInt()
    @Min(1)
    fileSizeBytes?: number;

    @IsOptional()
    @IsString()
    @MinLength(8)
    contentSha256?: string;

    @ValidateIf((dto: CreateProcurementDocumentDto) => dto.docType === ProcurementDocType.QUOTATION)
    @IsString()
    @MinLength(2)
    quotationSupplierName?: string;

    @ValidateIf((dto: CreateProcurementDocumentDto) => dto.docType === ProcurementDocType.QUOTATION)
    @Type(() => Number)
    @IsInt()
    @Min(1)
    quotationAmountCentavos?: number;

    /** Optional file attachment on a quotation. */
    @IsOptional()
    @IsString()
    @MinLength(10)
    quotationFileKey?: string;
}

export class VoidProcurementDocumentDto {
    @IsString()
    @MinLength(3)
    reason!: string;
}

export class ContractIdParamDto {
    @IsUUID()
    id!: string;
}
