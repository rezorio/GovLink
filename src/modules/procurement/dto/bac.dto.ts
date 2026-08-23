import {
    IsDateString,
    IsEnum,
    IsOptional,
    IsString,
    IsUUID,
    MinLength,
} from 'class-validator';
import { BacDesignation } from '@prisma/client';

export class CreateBacMemberDto {
    @IsString()
    @MinLength(2)
    displayName!: string;

    @IsEnum(BacDesignation)
    designation!: BacDesignation;

    @IsDateString()
    termStart!: string;

    @IsDateString()
    designationDate!: string;

    @IsOptional()
    @IsUUID()
    userId?: string;
}
