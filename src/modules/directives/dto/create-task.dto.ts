import {
    ArrayMinSize,
    IsArray,
    IsDateString,
    IsOptional,
    IsString,
    IsUUID,
    MinLength,
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

    @IsArray()
    @ArrayMinSize(1)
    @IsUUID('4', { each: true })
    barangayIds!: string[];
}
