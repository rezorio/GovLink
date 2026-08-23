import { ref, type Ref } from 'vue';
import {
    buildCacheKey,
    invalidateListCache,
    readListCache,
    writeListCache,
} from '@/composables/useListCache';

type CacheParts = Record<string, string | number | undefined | null>;

type UseCachedLoaderOptions<T> = {
    /** Stable cache key parts (scope required). */
    keyParts: () => CacheParts;
    /** Fetches fresh data from the API. */
    fetcher: () => Promise<T>;
    /** Optional error message fallback. */
    errorMessage?: string;
    /** Cache TTL override (ms). Default 30s. */
    ttlMs?: number;
};

/**
 * Shared load + 30s memory cache + loading/error state for list screens.
 * Use with LedgerSkeleton: show skeleton when `loading && !data` (or empty list).
 */
export function useCachedLoader<T>(options: UseCachedLoaderOptions<T>) {
    const data = ref<T | null>(null) as Ref<T | null>;
    const loading = ref(true);
    const error = ref<string | null>(null);

    function cacheKey() {
        return buildCacheKey(options.keyParts());
    }

    async function load(useCache = true) {
        const key = cacheKey();

        if (useCache) {
            const cached = readListCache<T>(key, options.ttlMs);
            if (cached !== null) {
                data.value = cached;
                loading.value = false;
                error.value = null;
                return cached;
            }
        }

        loading.value = true;
        error.value = null;
        try {
            const result = await options.fetcher();
            data.value = result;
            writeListCache(key, result);
            return result;
        } catch (err) {
            error.value =
                err instanceof Error
                    ? err.message
                    : (options.errorMessage ?? 'Failed to load data');
            return null;
        } finally {
            loading.value = false;
        }
    }

    function invalidate() {
        const parts = options.keyParts();
        const scope = parts.scope;
        if (typeof scope === 'string' && scope.length > 0) {
            invalidateListCache(`scope=${scope}`);
        } else {
            invalidateListCache(cacheKey());
        }
    }

    async function reload() {
        invalidate();
        return load(false);
    }

    return {
        data,
        loading,
        error,
        load,
        reload,
        invalidate,
    };
}
