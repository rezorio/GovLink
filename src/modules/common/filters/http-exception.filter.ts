import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class HttpExceptionSanitizerFilter implements ExceptionFilter {
    private readonly logger = new Logger(HttpExceptionSanitizerFilter.name);

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();
        const isProd = process.env.NODE_ENV === 'production';

        const status =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        let message: string | string[] = 'Internal server error';
        let errorName = 'Error';

        if (exception instanceof HttpException) {
            const body = exception.getResponse();
            errorName = exception.name;
            if (typeof body === 'string') {
                message = body;
            } else if (body && typeof body === 'object') {
                const record = body as Record<string, unknown>;
                message = (record.message as string | string[]) ?? exception.message;
                if (typeof record.error === 'string') {
                    errorName = record.error;
                }
            }
        } else if (exception instanceof Error) {
            this.logger.error(
                `${request.method} ${request.url} → ${exception.message}`,
                exception.stack,
            );
            if (!isProd) {
                message = exception.message;
            }
        } else {
            this.logger.error(`${request.method} ${request.url} → unknown error`);
        }

        response.status(status).json({
            statusCode: status,
            error: errorName,
            message,
            path: request.url,
            timestamp: new Date().toISOString(),
        });
    }
}
