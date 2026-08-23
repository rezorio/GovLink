import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import {
    assertProductionEnv,
    resolveCorsOrigins,
} from './modules/common/config/assert-production-env';
import { HttpExceptionSanitizerFilter } from './modules/common/filters/http-exception.filter';
import { securityHeadersMiddleware } from './modules/common/middleware/security-headers.middleware';

async function bootstrap() {
    assertProductionEnv();

    const app = await NestFactory.create(AppModule);

    app.use(securityHeadersMiddleware);
    app.useGlobalFilters(new HttpExceptionSanitizerFilter());
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }),
    );

    app.setGlobalPrefix('api');

    const origins = resolveCorsOrigins();
    app.enableCors({
        origin: origins.length === 1 ? origins[0] : origins,
        credentials: true,
    });

    const port = Number(process.env.PORT ?? 3000);
    await app.listen(port);
    console.log(`GovLink API running on http://localhost:${port}/api`);
}

bootstrap();
