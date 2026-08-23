import { IsEnum, IsIn, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';
import { PlanType } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export class PlanMatrixQueryDto extends PaginationQueryDto {
    @IsOptional()
    @IsEnum(PlanType)
    planType?: PlanType;

    @IsOptional()
    @IsString()
    @MinLength(2)
    periodLabel?: string;
}

export class OpenPlanPeriodsDto {
    @IsOptional()
    @IsEnum(PlanType)
    planType?: PlanType;

    @IsOptional()
    @IsString()
    @MinLength(2)
    periodLabel?: string;
}

export class UpdatePlanDto {
    @IsOptional()
    @IsString()
    @MinLength(2)
    title?: string;

    @IsOptional()
    @IsString()
    notes?: string;

    @IsOptional()
    @IsString()
    fileKey?: string;

    @IsOptional()
    @IsString()
    fileName?: string;
}

export class ReviewPlanDto {
    @IsIn(['ACCEPTED', 'RETURNED'])
    decision!: 'ACCEPTED' | 'RETURNED';

    @ValidateIf((o: ReviewPlanDto) => o.decision === 'RETURNED')
    @IsString()
    @MinLength(3)
    returnReason?: string;

    @IsOptional()
    @IsString()
    comment?: string;
}
