const API_BASE = import.meta.env.VITE_API_BASE ?? '/api';

export class ApiError extends Error {
    constructor(
        message: string,
        public status: number,
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

async function parseError(response: Response): Promise<string> {
    try {
        const body = await response.json();
        if (Array.isArray(body.message)) {
            return body.message.join(', ');
        }
        if (typeof body.message === 'string') {
            return body.message;
        }
    } catch {
        // ignore
    }
    return response.statusText || 'Request failed';
}

export async function apiRequest<T>(
    path: string,
    options: RequestInit = {},
    token?: string | null,
): Promise<T> {
    const headers = new Headers(options.headers);
    headers.set('Content-Type', 'application/json');
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        throw new ApiError(await parseError(response), response.status);
    }

    if (response.status === 204) {
        return undefined as T;
    }

    return response.json() as Promise<T>;
}
