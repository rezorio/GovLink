import { IsIn, IsInt, IsString, Max, Min, MinLength } from 'class-validator';
import { UPLOAD_ALLOWED_MIMES, UPLOAD_MAX_BYTES } from '../../common/constants/upload.constants';

export class SubmitEvidenceDto {
    @IsString()
    @MinLength(1)
    fileKey!: string;

    @IsString()
    @MinLength(1)
    fileName!: string;

    @IsIn([...UPLOAD_ALLOWED_MIMES])
    mimeType!: string;

    @IsInt()
    @Min(1)
    @Max(UPLOAD_MAX_BYTES)
    fileSizeBytes!: number;
}
