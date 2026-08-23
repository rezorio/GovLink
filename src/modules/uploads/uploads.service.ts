import {
    BadRequestException,
    Injectable,
    Logger,
    OnModuleInit,
    ServiceUnavailableException,
} from '@nestjs/common';
import {
    CreateBucketCommand,
    HeadBucketCommand,
    HeadObjectCommand,
    PutBucketCorsCommand,
    PutObjectCommand,
    S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { AppRole } from '@prisma/client';
import { UPLOAD_ALLOWED_MIMES, UPLOAD_MAX_BYTES } from '../common/constants/upload.constants';
import { TenantContext } from '../common/interfaces/auth.interface';
import { AuditLogService } from '../common/services/audit-log.service';
import { assertTenantFileKey } from '../common/utils/file-key.util';
import { ConfirmUploadDto } from './dto/confirm-upload.dto';
import { PresignUploadDto } from './dto/presign-upload.dto';

const MIME_EXT: Record<string, string> = {
    'application/pdf': '.pdf',
    'image/jpeg': '.jpg',
    'image/png': '.png',
};

@Injectable()
export class UploadsService implements OnModuleInit {
    private readonly logger = new Logger(UploadsService.name);
    private client: S3Client | null = null;
    private bucket = '';

    constructor(private readonly auditLog: AuditLogService) {}

    async onModuleInit() {
        try {
            this.ensureClient();
            await this.ensureBucket();
        } catch (error) {
            this.logger.warn(
                `S3/MinIO not ready at startup: ${error instanceof Error ? error.message : error}`,
            );
        }
    }

    async createPresignedPut(ctx: TenantContext, dto: PresignUploadDto) {
        this.assertBarangayUploader(ctx);
        this.validateUpload(dto);

        const client = this.ensureClient();
        const ext = MIME_EXT[dto.contentType] ?? '.bin';
        const safeEntity = dto.entityType.replace(/[^a-z0-9_-]/gi, '').toLowerCase() || 'submissions';
        if (
            safeEntity !== 'submissions' &&
            safeEntity !== 'procurement' &&
            safeEntity !== 'plans' &&
            safeEntity !== 'assemblies'
        ) {
            throw new BadRequestException(
                'entityType must be submissions, procurement, plans, or assemblies',
            );
        }
        const fileKey = [
            ctx.municipality_id,
            ctx.barangay_id,
            safeEntity,
            randomUUID(),
            `file${ext}`,
        ].join('/');

        const command = new PutObjectCommand({
            Bucket: this.bucket,
            Key: fileKey,
            ContentType: dto.contentType,
            ContentLength: dto.contentLength,
        });

        const expiresIn = 900;
        const uploadUrl = await getSignedUrl(client, command, { expiresIn });

        return { uploadUrl, fileKey, expiresIn };
    }

    async confirmUpload(ctx: TenantContext, dto: ConfirmUploadDto) {
        this.assertBarangayUploader(ctx);
        const entity = dto.fileKey.split('/')[2] ?? 'submissions';
        assertTenantFileKey(ctx, dto.fileKey, entity);

        const client = this.ensureClient();
        let head;
        try {
            head = await client.send(
                new HeadObjectCommand({
                    Bucket: this.bucket,
                    Key: dto.fileKey,
                }),
            );
        } catch {
            throw new BadRequestException('Uploaded object not found — complete PUT before confirm');
        }

        const contentType = head.ContentType ?? '';
        if (!(UPLOAD_ALLOWED_MIMES as readonly string[]).includes(contentType)) {
            throw new BadRequestException('Invalid uploaded content type');
        }
        if ((head.ContentLength ?? 0) > UPLOAD_MAX_BYTES) {
            throw new BadRequestException('Uploaded file exceeds 10MB');
        }

        await this.auditLog.record({
            ctx,
            action: 'UPLOAD_CONFIRMED',
            entityType: 'UploadObject',
            entityId: dto.fileKey,
            barangayId: ctx.barangay_id,
            after: {
                contentType,
                contentLength: head.ContentLength ?? 0,
            },
        });

        return {
            fileKey: dto.fileKey,
            contentType,
            contentLength: head.ContentLength ?? 0,
        };
    }

    /** Verify a tenant file key points at an existing object (used by procurement docs). */
    async assertObjectExists(ctx: TenantContext, fileKey: string) {
        const entity = fileKey.split('/')[2] ?? 'submissions';
        assertTenantFileKey(ctx, fileKey, entity);
        const client = this.ensureClient();
        try {
            await client.send(
                new HeadObjectCommand({
                    Bucket: this.bucket,
                    Key: fileKey,
                }),
            );
        } catch {
            throw new BadRequestException(
                'Uploaded object not found — complete presign PUT + confirm before attaching',
            );
        }
    }

    private assertBarangayUploader(ctx: TenantContext) {
        if (!ctx.barangay_id) {
            throw new BadRequestException('Barangay scope required for evidence uploads');
        }
        const allowed: AppRole[] = [AppRole.BARANGAY_CAPTAIN, AppRole.BARANGAY_SECRETARY];
        if (!ctx.roles.some((r) => allowed.includes(r))) {
            throw new BadRequestException('Insufficient role for evidence uploads');
        }
    }

    private validateUpload(dto: PresignUploadDto) {
        if (!(UPLOAD_ALLOWED_MIMES as readonly string[]).includes(dto.contentType)) {
            throw new BadRequestException('MIME type not allowed');
        }
        if (dto.contentLength > UPLOAD_MAX_BYTES) {
            throw new BadRequestException('File exceeds 10MB limit');
        }
    }

    private ensureClient(): S3Client {
        if (this.client) {
            return this.client;
        }

        const accessKeyId = process.env.S3_ACCESS_KEY_ID;
        const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
        this.bucket = process.env.S3_BUCKET ?? '';

        if (!accessKeyId || !secretAccessKey || !this.bucket) {
            throw new ServiceUnavailableException(
                'Object storage is not configured (S3_BUCKET / S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY)',
            );
        }

        this.client = new S3Client({
            region: process.env.S3_REGION ?? 'us-east-1',
            endpoint: process.env.S3_ENDPOINT || undefined,
            forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false',
            credentials: { accessKeyId, secretAccessKey },
        });

        return this.client;
    }

    private async ensureBucket() {
        const client = this.ensureClient();
        try {
            await client.send(new HeadBucketCommand({ Bucket: this.bucket }));
        } catch {
            await client.send(new CreateBucketCommand({ Bucket: this.bucket }));
            this.logger.log(`Created bucket ${this.bucket}`);
        }

        const frontend = process.env.FRONTEND_URL ?? 'http://localhost:5173';
        const origins = [
            frontend,
            'http://localhost:5173',
            'http://localhost:5174',
            'http://127.0.0.1:5173',
            'http://127.0.0.1:5174',
        ];

        try {
            await client.send(
                new PutBucketCorsCommand({
                    Bucket: this.bucket,
                    CORSConfiguration: {
                        CORSRules: [
                            {
                                AllowedOrigins: [...new Set(origins)],
                                AllowedMethods: ['GET', 'PUT', 'HEAD'],
                                AllowedHeaders: ['*'],
                                ExposeHeaders: ['ETag', 'Content-Length'],
                                MaxAgeSeconds: 3600,
                            },
                        ],
                    },
                }),
            );
        } catch (error) {
            this.logger.warn(
                `Could not set bucket CORS: ${error instanceof Error ? error.message : error}`,
            );
        }
    }
}
