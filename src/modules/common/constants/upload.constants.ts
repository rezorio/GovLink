export const UPLOAD_ALLOWED_MIMES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
] as const;

export type UploadMimeType = (typeof UPLOAD_ALLOWED_MIMES)[number];

export const UPLOAD_MAX_BYTES = Number(process.env.UPLOAD_MAX_BYTES ?? 10 * 1024 * 1024);
