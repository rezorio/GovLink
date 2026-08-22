import { IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { ReviewDecision } from '@prisma/client';

export class ReviewAssignmentDto {
    @IsUUID()
    submissionId!: string;

    @IsEnum(ReviewDecision)
    decision!: ReviewDecision;

    @IsOptional()
    @IsString()
    @MinLength(1)
    comment?: string;
}
