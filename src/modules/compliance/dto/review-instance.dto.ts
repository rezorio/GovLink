import { IsIn, IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';

export class ReviewComplianceInstanceDto {
    @IsIn(['ACCEPTED', 'RETURNED'])
    decision!: 'ACCEPTED' | 'RETURNED';

    @ValidateIf((o: ReviewComplianceInstanceDto) => o.decision === 'RETURNED')
    @IsString()
    @MinLength(3)
    @MaxLength(2000)
    returnReason?: string;

    @IsOptional()
    @IsString()
    @MaxLength(2000)
    comment?: string;
}
