import { IsIn, IsInt, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { UPLOAD_ALLOWED_MIMES, UPLOAD_MAX_BYTES } from '../../common/constants/upload.constants';

export class PresignUploadDto {
    @IsString()
    @MinLength(1)
    @MaxLength(255)
    filename!: string;

    @IsIn([...UPLOAD_ALLOWED_MIMES])
    contentType!: (typeof UPLOAD_ALLOWED_MIMES)[number];

    @IsInt()
    @Min(1)
    @Max(UPLOAD_MAX_BYTES)
    contentLength!: number;

    @IsString()
    @MinLength(1)
    @MaxLength(64)
    entityType!: string;
}
