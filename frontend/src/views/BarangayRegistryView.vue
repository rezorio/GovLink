<script setup lang="ts">
import { onMounted, ref } from 'vue';
import AppShell from '@/components/library/layout/AppShell.vue';
import LedgerSkeleton from '@/components/library/feedback/LedgerSkeleton.vue';
import PaginationBar from '@/components/library/feedback/PaginationBar.vue';
import LoadingSpinner from '@/components/library/feedback/LoadingSpinner.vue';
import { createResident, fetchResidents } from '@/api/registry';
import { buildCacheKey, invalidateListCache, readListCache, writeListCache } from '@/composables/useListCache';
import { useI18n } from '@/composables/useI18n';
import { useAuthStore } from '@/stores/auth';
import type { BarangayResident, ResidentRecordType } from '@/types';

const auth = useAuthStore();
const { t } = useI18n();

const residents = ref<BarangayResident[]>([]);
const page = ref(1);
const pageSize = ref(25);
const total = ref(0);
const totalPages = ref(1);
const searchQuery = ref('');
const loading = ref(true);
const actionLoading = ref(false);
const error = ref<string | null>(null);
const showForm = ref(false);

const form = ref({
    fullName: '',
    addressLine: '',
    phone: '',
    birthYear: new Date().getFullYear() - 30,
    recordType: 'RESIDENT' as ResidentRecordType,
});

function cacheKey() {
    return buildCacheKey({
        scope: 'barangay-registry',
        page: page.value,
        pageSize: pageSize.value,
        q: searchQuery.value.trim(),
    });
}

async function load(useCache = true) {
    if (!auth.token) {
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
        error.value = err instanceof Error ? err.message : t('registry.loadFailed');
    } finally {
        loading.value = false;
    }
}

async function submit() {
    if (!auth.token) {
        return;
    }
    actionLoading.value = true;
    error.value = null;
    try {
        await createResident(auth.token, { ...form.value });
        showForm.value = false;
        form.value.fullName = '';
        form.value.addressLine = '';
        form.value.phone = '';
        invalidateListCache('scope=barangay-registry');
        await load(false);
    } catch (err) {
        error.value = err instanceof Error ? err.message : t('registry.saveFailed');
    } finally {
        actionLoading.value = false;
    }
}

function onPageChange(next: number) {
    page.value = next;
    void load(false);
}

function onSearch() {
    page.value = 1;
    invalidateListCache('scope=barangay-registry');
    void load(false);
}

onMounted(() => load());
</script>

<template>
    <AppShell
        :title="t('registry.title')"
        :subtitle="auth.user?.barangay?.name ?? auth.user?.full_name"
    >
        <p class="mb-6 max-w-xl text-sm leading-relaxed text-ink-muted">
            {{ t('registry.intro') }}
        </p>

        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
            <button type="button" class="gl-btn-secondary" @click="showForm = !showForm">
                {{ showForm ? t('common.cancel') : t('registry.addRecord') }}
            </button>
            <div class="flex flex-wrap items-end gap-2">
                <input
                    v-model="searchQuery"
                    type="search"
                    :placeholder="t('registry.searchPlaceholder')"
                    class="min-w-[12rem] border border-rule bg-surface px-3 py-2 text-sm text-ink"
                    style="border-radius: 2px"
                    @keydown.enter.prevent="onSearch"
                />
                <button type="button" class="gl-btn-secondary" @click="onSearch">Search</button>
            </div>
        </div>

        <form
            v-if="showForm"
            class="gl-panel mb-6 space-y-3 px-4 py-4 sm:px-5"
            @submit.prevent="submit"
        >
            <label class="block text-sm">
                <span class="text-ink-muted">{{ t('registry.fullName') }}</span>
                <input v-model="form.fullName" required class="mt-1 w-full border border-rule bg-surface px-3 py-2 text-ink" style="border-radius: 2px" />
            </label>
            <label class="block text-sm">
                <span class="text-ink-muted">{{ t('registry.address') }}</span>
                <input v-model="form.addressLine" required class="mt-1 w-full border border-rule bg-surface px-3 py-2 text-ink" style="border-radius: 2px" />
            </label>
            <label class="block text-sm">
                <span class="text-ink-muted">{{ t('registry.phone') }}</span>
                <input v-model="form.phone" required class="mt-1 w-full border border-rule bg-surface px-3 py-2 text-ink" style="border-radius: 2px" />
            </label>
            <div class="grid gap-3 sm:grid-cols-2">
                <label class="block text-sm">
                    <span class="text-ink-muted">{{ t('registry.birthYear') }}</span>
                    <input v-model.number="form.birthYear" type="number" min="1900" class="mt-1 w-full border border-rule bg-surface px-3 py-2 text-ink" style="border-radius: 2px" />
                </label>
                <label class="block text-sm">
                    <span class="text-ink-muted">{{ t('registry.recordType') }}</span>
                    <select v-model="form.recordType" class="mt-1 w-full border border-rule bg-surface px-3 py-2 text-ink" style="border-radius: 2px">
                        <option value="RESIDENT">RESIDENT</option>
                        <option value="KASAMBAHAY">KASAMBAHAY</option>
                    </select>
                </label>
            </div>
            <button type="submit" class="gl-btn-primary inline-flex items-center gap-2" :disabled="actionLoading">
                <LoadingSpinner v-if="actionLoading" size="sm" />
                {{ t('registry.saveRecord') }}
            </button>
        </form>

        <p v-if="error" class="mb-4 text-sm text-status-danger">{{ error }}</p>
        <LedgerSkeleton v-if="loading && residents.length === 0" :rows="5" />

        <div v-else class="gl-panel overflow-hidden">
            <p v-if="residents.length === 0" class="px-4 py-10 text-center text-sm text-ink-muted">
                {{ t('registry.empty') }}
            </p>
            <article
                v-for="row in residents"
                :key="row.id"
                class="gl-ledger-row pl-5"
            >
                <span class="gl-rail gl-rail-warn" aria-hidden="true" />
                <div class="min-w-0 sm:col-span-2">
                    <p class="font-display text-base font-semibold text-ink">{{ row.fullName }}</p>
                    <p class="mt-1 text-xs text-ink-muted">{{ row.recordType }}</p>
                    <p class="mt-2 text-sm text-ink">{{ row.addressLine }}</p>
                    <p class="mt-1 text-sm text-ink-muted">{{ row.phone }}</p>
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
    </AppShell>
</template>
