const DEFAULT_TTL_MS = 30_000;

type CacheEntry<T> = {
    data: T;
    fetchedAt: number;
};

const store = new Map<string, CacheEntry<unknown>>();

export function readListCache<T>(key: string, ttlMs = DEFAULT_TTL_MS): T | null {
    const entry = store.get(key);
    if (!entry) {
        return null;
    }
    if (Date.now() - entry.fetchedAt > ttlMs) {
        store.delete(key);
        return null;
    }
    return entry.data as T;
}

export function writeListCache<T>(key: string, data: T) {
    store.set(key, { data, fetchedAt: Date.now() });
}

export function invalidateListCache(prefix?: string) {
    if (!prefix) {
        store.clear();
        return;
    }
    for (const key of store.keys()) {
        if (key.startsWith(prefix)) {
            store.delete(key);
        }
    }
}

export function buildCacheKey(parts: Record<string, string | number | undefined | null>) {
    return Object.entries(parts)
        .filter(([, value]) => value !== undefined && value !== null && value !== '')
        .map(([key, value]) => `${key}=${value}`)
        .join('&');
}
