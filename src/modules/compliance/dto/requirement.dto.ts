import {
    ArrayMinSize,
    IsArray,
    IsBoolean,
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    Max,
    Min,
    MinLength,
} from 'class-validator';
import {
    ComplianceCategory,
    ComplianceFrequency,
    ComplianceScope,
    SglgPillar,
} from '@prisma/client';

export class CreateComplianceRequirementDto {
    @IsString()
    @MinLength(3)
    code!: string;

    @IsString()
    @MinLength(3)
    title!: string;

    @IsString()
    @MinLength(3)
    legalBasis!: string;

    @IsEnum(ComplianceCategory)
    category!: ComplianceCategory;

    @IsEnum(ComplianceFrequency)
    frequency!: ComplianceFrequency;

    @IsArray()
    @ArrayMinSize(1)
    @IsString({ each: true })
    evidenceTypes!: string[];

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(10)
    weight?: number;

    @IsOptional()
    @IsEnum(ComplianceScope)
    scope?: ComplianceScope;

    @IsOptional()
    @IsEnum(SglgPillar)
    sglgPillar?: SglgPillar;
}

export class UpdateComplianceRequirementDto {
    @IsOptional()
    @IsString()
    @MinLength(3)
    title?: string;

    @IsOptional()
    @IsString()
    @MinLength(3)
    legalBasis?: string;

    @IsOptional()
    @IsEnum(ComplianceCategory)
    category?: ComplianceCategory;

    @IsOptional()
    @IsEnum(ComplianceFrequency)
    frequency?: ComplianceFrequency;

    @IsOptional()
    @IsArray()
    @ArrayMinSize(1)
    @IsString({ each: true })
    evidenceTypes?: string[];

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(10)
    weight?: number;

    @IsOptional()
    @IsEnum(ComplianceScope)
    scope?: ComplianceScope;

    @IsOptional()
    @IsEnum(SglgPillar)
    sglgPillar?: SglgPillar | null;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
