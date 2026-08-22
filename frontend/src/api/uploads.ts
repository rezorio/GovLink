import { apiRequest } from '@/api/client';

export interface PresignResponse {
    uploadUrl: string;
    fileKey: string;
    expiresIn: number;
}

export function requestPresign(
    token: string,
    payload: {
        filename: string;
        contentType: string;
        contentLength: number;
        entityType: string;
    },
) {
    return apiRequest<PresignResponse>(
        '/uploads/presign',
        {
            method: 'POST',
            body: JSON.stringify(payload),
        },
        token,
    );
}

export function confirmUpload(token: string, fileKey: string) {
    return apiRequest<{ fileKey: string; contentType: string; contentLength: number }>(
        '/uploads/confirm',
        {
            method: 'POST',
            body: JSON.stringify({ fileKey }),
        },
        token,
    );
}

export async function putToPresignedUrl(
    uploadUrl: string,
    file: File,
    onProgress?: (pct: number) => void,
): Promise<void> {
    await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable && onProgress) {
                onProgress(Math.round((event.loaded / event.total) * 100));
            }
        };
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve();
            } else {
                reject(new Error(`Upload to storage failed (${xhr.status})`));
            }
        };
        xhr.onerror = () => reject(new Error('Upload to storage failed'));
        xhr.send(file);
    });
}
