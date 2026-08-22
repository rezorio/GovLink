import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantCtx } from '../common/decorators/tenant-context.decorator';
import { TenantContext } from '../common/interfaces/auth.interface';
import { DirectivesService } from './directives.service';
import { CreateTaskDto } from './dto/create-task.dto';

@Controller('directives')
export class DirectivesController {
    constructor(private readonly directivesService: DirectivesService) {}

    @Get('templates')
    listTemplates() {
        return this.directivesService.listTemplates();
    }

    @Roles(AppRole.MAYOR, AppRole.DEPT_HEAD)
    @Post('tasks')
    createTask(@TenantCtx() ctx: TenantContext, @Body() dto: CreateTaskDto) {
        return this.directivesService.createTask(ctx, dto);
    }
}
