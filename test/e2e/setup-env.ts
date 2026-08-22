import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../../.env') });

if (!process.env.JWT_SECRET?.trim()) {
    process.env.JWT_SECRET = 'test-jwt-secret-for-e2e-only';
}

process.env.JWT_EXPIRES_IN_HOURS ??= '8';
process.env.NODE_ENV ??= 'test';

if (!process.env.DATABASE_URL) {
    throw new Error(
        'DATABASE_URL is required for e2e tests. Start PostgreSQL and set DATABASE_URL in .env',
    );
}
