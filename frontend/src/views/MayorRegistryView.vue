<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import AppShell from '@/components/library/layout/AppShell.vue';
import StatusBadge from '@/components/library/badges/StatusBadge.vue';
import LedgerSkeleton from '@/components/library/feedback/LedgerSkeleton.vue';
import PaginationBar from '@/components/library/feedback/PaginationBar.vue';
import LoadingSpinner from '@/components/library/feedback/LoadingSpinner.vue';
import { fetchBarangays } from '@/api/barangays';
import { fetchResidents } from '@/api/registry';
import { buildCacheKey, readListCache, writeListCache, invalidateListCache } from '@/composables/useListCache';
import { useAuthStore } from '@/stores/auth';
import type { BarangayResident, BarangaySummary } from '@/types';

const auth = useAuthStore();

const barangays = ref<BarangaySummary[]>([]);
const selectedBarangayId = ref('');
const residents = ref<BarangayResident[]>([]);
const page = ref(1);
const pageSize = ref(25);
const total = ref(0);
const totalPages = ref(1);
const searchQuery = ref('');
const loading = ref(true);
const error = ref<string | null>(null);

function cacheKey() {
    return buildCacheKey({
        scope: 'mayor-registry',
        barangayId: selectedBarangayId.value,
        page: page.value,
        pageSize: pageSize.value,
        q: searchQuery.value.trim(),
    });
}

async function loadBarangays() {
    if (!auth.token) {
        return;
    }
    barangays.value = await fetchBarangays(auth.token);
    if (!selectedBarangayId.value && barangays.value.length > 0) {
        selectedBarangayId.value = barangays.value[0].id;
    }
}

async function loadResidents(useCache = true) {
    if (!auth.token || !selectedBarangayId.value) {
        residents.value = [];
        total.value = 0;
        totalPages.value = 1;
        return;
    }

    const key = cacheKey();
    if (useCache) {
        const cached = readListCache<{
            items: BarangayResident[];
            total: number;
            totalPages: number;
        }>(key);
        if (cached) {
            residents.value = cached.items;
            total.value = cached.total;
            totalPages.value = cached.totalPages;
            loading.value = false;
            return;
        }
    }

    loading.value = true;
    error.value = null;
    try {
        const result = await fetchResidents(auth.token, {
            barangayId: selectedBarangayId.value,
            page: page.value,
            pageSize: pageSize.value,
            q: searchQuery.value.trim() || undefined,
        });
        residents.value = result.items;
        total.value = result.total;
        totalPages.value = result.totalPages;
        page.value = result.page;
        writeListCache(key, {
            items: result.items,
            total: result.total,
            totalPages: result.totalPages,
        });
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to load registry';
    } finally {
        loading.value = false;
    }
}

function onPageChange(next: number) {
    page.value = next;
    void loadResidents(false);
}

function onSearch() {
    page.value = 1;
    invalidateListCache('scope=mayor-registry');
    void loadResidents(false);
}

onMounted(async () => {
    try {
        await loadBarangays();
        await loadResidents();
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to load barangays';
        loading.value = false;
    }
});

watch(selectedBarangayId, () => {
    page.value = 1;
    invalidateListCache('scope=mayor-registry');
    void loadResidents();
});
</script>

<template>
    <AppShell title="Registry oversight" subtitle="RA 10173 masked view">
        <p class="mb-6 max-w-2xl text-sm leading-relaxed text-ink-muted">
            Supervisory view — contact fields are masked per RA 10173. Select a barangay to review records.
        </p>

        <div class="mb-5 flex flex-wrap items-end gap-3">
            <label class="block min-w-[12rem] flex-1 text-sm">
                <span class="text-ink-muted">Barangay</span>
                <select
                    v-model="selectedBarangayId"
                    class="mt-1 w-full border border-rule bg-surface px-3 py-2 text-ink"
                    style="border-radius: 2px"
                >
                    <option v-for="row in barangays" :key="row.id" :value="row.id">
                        {{ row.name }}
                    </option>
                </select>
            </label>
            <label class="block min-w-[12rem] flex-1 text-sm">
                <span class="text-ink-muted">Search name</span>
                <input
                    v-model="searchQuery"
                    type="search"
                    placeholder="Resident name"
                    class="mt-1 w-full border border-rule bg-surface px-3 py-2 text-ink"
                    style="border-radius: 2px"
                    @keydown.enter.prevent="onSearch"
                />
            </label>
            <button type="button" class="gl-btn-secondary" @click="onSearch">Search</button>
        </div>

        <p v-if="error" class="mb-4 text-sm text-status-danger">{{ error }}</p>
        <LedgerSkeleton v-if="loading && residents.length === 0" :rows="6" />

        <div v-else class="gl-panel overflow-hidden">
            <p v-if="residents.length === 0" class="px-4 py-10 text-center text-sm text-ink-muted">
                No registry records for this barangay.
            </p>
            <article
                v-for="row in residents"
                :key="row.id"
                class="gl-ledger-row pl-5"
            >
                <span class="gl-rail gl-rail-warn" aria-hidden="true" />
                <div class="flex flex-wrap items-start justify-between gap-3 sm:col-span-2">
                    <div class="min-w-0">
                        <p class="font-display text-base font-semibold text-ink">{{ row.fullName }}</p>
                        <p class="mt-1 text-xs text-ink-muted">{{ row.recordType }}</p>
                        <p class="mt-2 text-sm text-ink">{{ row.addressLine }}</p>
                        <p class="mt-1 text-sm text-ink-muted">{{ row.phone }}</p>
                    </div>
                    <StatusBadge
                        v-if="row.piiMasked"
                        status="pending"
                        label="PII masked"
                    />
                </div>
            </article>
            <PaginationBar
                :page="page"
                :total-pages="totalPages"
                :total="total"
                :page-size="pageSize"
                :loading="loading"
                @update:page="onPageChange"
            />
        </div>

        <div v-if="loading && residents.length > 0" class="mt-3 flex items-center gap-2 text-sm text-ink-muted">
            <LoadingSpinner size="sm" />
            Refreshing page…
        </div>
    </AppShell>
</template>
