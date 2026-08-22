import { IsOptional, IsString, MaxLength } from 'class-validator';

export class OpenPeriodDto {
    /** Optional filter — open only this period label. Default: all current periods by frequency. */
    @IsOptional()
    @IsString()
    @MaxLength(64)
    periodLabel?: string;
}
