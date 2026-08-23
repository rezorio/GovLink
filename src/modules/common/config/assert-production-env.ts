const WEAK_JWT_SECRETS = new Set([
    'change-me-in-production-use-openssl-rand-hex-32',
    'change-me',
    'secret',
    'jwt-secret',
    'govlink',
]);

/**
 * Fail fast when NODE_ENV=production if required secrets / URLs are unsafe.
 * Local `start:dev` is unaffected.
 */
export function assertProductionEnv(env: NodeJS.ProcessEnv = process.env): void {
    if (env.NODE_ENV !== 'production') {
        return;
    }

    const errors: string[] = [];

    const jwtSecret = env.JWT_SECRET?.trim() ?? '';
    if (!jwtSecret || WEAK_JWT_SECRETS.has(jwtSecret) || jwtSecret.length < 32) {
        errors.push(
            'JWT_SECRET must be set to a strong secret (≥32 chars); demo placeholders are not allowed',
        );
    }

    if (!env.DATABASE_URL?.trim()) {
        errors.push('DATABASE_URL is required');
    }

    const frontendUrl = env.FRONTEND_URL?.trim() ?? '';
    if (!frontendUrl) {
        errors.push('FRONTEND_URL is required (comma-separated origins allowed)');
    }

    const publicBase = env.PUBLIC_BASE_URL?.trim() ?? '';
    if (!publicBase) {
        errors.push('PUBLIC_BASE_URL is required for QR verification links');
    } else if (!publicBase.startsWith('https://') && env.ALLOW_INSECURE_PUBLIC_URL !== 'true') {
        errors.push(
            'PUBLIC_BASE_URL must use https:// in production (set ALLOW_INSECURE_PUBLIC_URL=true only for private LAN pilots)',
        );
    }

    const s3Key = env.S3_ACCESS_KEY_ID?.trim() ?? '';
    const s3Secret = env.S3_SECRET_ACCESS_KEY?.trim() ?? '';
    if (s3Key === 'govlink' || s3Secret === 'govlinksecret') {
        errors.push('S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY must not use local MinIO demo credentials');
    }

    if (errors.length > 0) {
        throw new Error(
            `GovLink production boot blocked:\n${errors.map((e) => `  - ${e}`).join('\n')}`,
        );
    }
}

/** Parse FRONTEND_URL (or ALLOWED_ORIGINS) into a CORS origin list. */
export function resolveCorsOrigins(env: NodeJS.ProcessEnv = process.env): string[] {
    const raw = env.ALLOWED_ORIGINS?.trim() || env.FRONTEND_URL?.trim() || 'http://localhost:5173';
    return raw
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean);
}
