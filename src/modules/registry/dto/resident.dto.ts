import {
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    Max,
    Min,
    MinLength,
} from 'class-validator';
import { ResidentRecordType } from '@prisma/client';

export class CreateResidentDto {
    @IsString()
    @MinLength(2)
    fullName!: string;

    @IsString()
    @MinLength(5)
    addressLine!: string;

    @IsString()
    @MinLength(7)
    phone!: string;

    @IsOptional()
    @IsInt()
    @Min(1900)
    @Max(new Date().getFullYear())
    birthYear?: number;

    @IsOptional()
    @IsEnum(ResidentRecordType)
    recordType?: ResidentRecordType;
}

export class UpdateResidentDto {
    @IsOptional()
    @IsString()
    @MinLength(2)
    fullName?: string;

    @IsOptional()
    @IsString()
    @MinLength(5)
    addressLine?: string;

    @IsOptional()
    @IsString()
    @MinLength(7)
    phone?: string;

    @IsOptional()
    @IsInt()
    @Min(1900)
    @Max(new Date().getFullYear())
    birthYear?: number;

    @IsOptional()
    @IsEnum(ResidentRecordType)
    recordType?: ResidentRecordType;
}
