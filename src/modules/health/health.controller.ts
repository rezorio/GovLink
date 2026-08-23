import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator';

@Controller('health')
@SkipThrottle()
export class HealthController {
    @Public()
    @Get()
    check() {
        return {
            status: 'ok',
            service: 'govlink-api',
            timestamp: new Date().toISOString(),
            env: process.env.NODE_ENV ?? 'development',
        };
    }
}
