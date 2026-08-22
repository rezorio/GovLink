# S3 Presigned Uploads

## PresignUploadDto

```typescript
export class PresignUploadDto {
  @IsString()
  @MaxLength(255)
  filename: string;

  @IsIn(UPLOAD_ALLOWED_MIMES)
  contentType: (typeof UPLOAD_ALLOWED_MIMES)[number];

  @IsInt()
  @Min(1)
  @Max(UPLOAD_MAX_BYTES)
  contentLength: number;

  @IsString()
  entityType: string; // e.g. 'compliance_submission'
}
```

## Presign service (AWS SDK v3)

```typescript
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class UploadsService {
  async createPresignedPut(
    dto: PresignUploadDto,
    ctx: TenantContext,
  ): Promise<{ uploadUrl: string; fileKey: string; expiresIn: number }> {
    this.validateUpload(dto);

    const ext = this.safeExtension(dto.filename, dto.contentType);
    const fileKey = [
      ctx.municipality_id,
      ctx.barangay_id ?? 'municipal',
      dto.entityType,
      randomUUID(),
      `file${ext}`,
    ].join('/');

    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: fileKey,
      ContentType: dto.contentType,
      ContentLength: dto.contentLength,
    });

    const expiresIn = 900; // 15 minutes
    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn });

    return { uploadUrl, fileKey, expiresIn };
  }

  private validateUpload(dto: PresignUploadDto): void {
    if (!UPLOAD_ALLOWED_MIMES.includes(dto.contentType)) {
      throw new BadRequestException('MIME type not allowed');
    }
    if (dto.contentLength > UPLOAD_MAX_BYTES) {
      throw new BadRequestException('File exceeds 10MB limit');
    }
  }
}
```

## Post-upload verification

```typescript
async confirmUpload(fileKey: string, ctx: TenantContext): Promise<void> {
  const head = await this.s3.send(new HeadObjectCommand({ Bucket, Key: fileKey }));

  if (!UPLOAD_ALLOWED_MIMES.includes(head.ContentType as any)) {
    await this.deleteObject(fileKey);
    throw new BadRequestException('Invalid uploaded content type');
  }
  if ((head.ContentLength ?? 0) > UPLOAD_MAX_BYTES) {
    await this.deleteObject(fileKey);
    throw new BadRequestException('Uploaded file exceeds 10MB');
  }

  // Persist UploadFile record extending BaseTenantEntity
}
```

## Controller

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AppRole.BARANGAY_CAPTAIN, AppRole.BARANGAY_SECRETARY, AppRole.DEPT_HEAD)
@Post('presign')
presign(@TenantCtx() ctx: TenantContext, @Body() dto: PresignUploadDto) {
  return this.uploadsService.createPresignedPut(dto, ctx);
}
```

## Security notes

- Bucket policy: deny public read; all access via presigned URLs or IAM role.
- CORS on bucket: restrict to app origin only.
- Never log presigned URLs or expose bucket name in client errors.
- Virus scan hook (optional) runs async after `confirmUpload` before acceptance.
