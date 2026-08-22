import {
    ArrayMinSize,
    IsArray,
    IsBoolean,
    IsDateString,
    IsOptional,
    IsString,
    IsUUID,
    MinLength,
    ValidateIf,
} from 'class-validator';

export class CreateTaskDto {
    @IsOptional()
    @IsUUID()
    directiveTemplateId?: string;

    @IsString()
    @MinLength(3)
    title!: string;

    @IsString()
    @MinLength(3)
    description!: string;

    @IsString()
    @MinLength(3)
    legalBasis!: string;

    @IsDateString()
    dueDate!: string;

    @IsOptional()
    @IsBoolean()
    assignToAllBarangays?: boolean;

    @ValidateIf((dto: CreateTaskDto) => !dto.assignToAllBarangays)
    @IsArray()
    @ArrayMinSize(1)
    @IsUUID('4', { each: true })
    barangayIds?: string[];
}
