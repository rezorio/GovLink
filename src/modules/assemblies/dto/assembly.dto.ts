import {
    IsDateString,
    IsEnum,
    IsIn,
    IsInt,
    IsOptional,
    IsString,
    Min,
    MinLength,
    ValidateIf,
} from 'class-validator';
import { AssemblySemester } from '@prisma/client';

export class OpenAssemblyPeriodsDto {
    @IsOptional()
    @IsEnum(AssemblySemester)
    semester?: AssemblySemester;

    @IsOptional()
    @IsString()
    @MinLength(2)
    periodLabel?: string;
}

export class UpdateAssemblyDto {
    @IsOptional()
    @IsString()
    @MinLength(2)
    title?: string;

    @IsOptional()
    @IsString()
    notes?: string;

    @IsOptional()
    @IsDateString()
    heldAt?: string;

    @IsOptional()
    @IsString()
    venue?: string;

    @IsOptional()
    @IsInt()
    @Min(0)
    attendanceCount?: number;

    @IsOptional()
    @IsString()
    fileKey?: string;

    @IsOptional()
    @IsString()
    fileName?: string;
}

export class ReviewAssemblyDto {
    @IsIn(['ACCEPTED', 'RETURNED'])
    decision!: 'ACCEPTED' | 'RETURNED';

    @ValidateIf((o: ReviewAssemblyDto) => o.decision === 'RETURNED')
    @IsString()
    @MinLength(3)
    returnReason?: string;

    @IsOptional()
    @IsString()
    comment?: string;
}
