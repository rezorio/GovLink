<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import AppShell from '@/components/library/layout/AppShell.vue';
import ComplianceBarangayDrawer from '@/components/library/drawer/ComplianceBarangayDrawer.vue';
import StatusBadge from '@/components/library/badges/StatusBadge.vue';
import LedgerSkeleton from '@/components/library/feedback/LedgerSkeleton.vue';
import LedgerNotice from '@/components/library/feedback/LedgerNotice.vue';
import LoadingSpinner from '@/components/library/feedback/LoadingSpinner.vue';
import PaginationBar from '@/components/library/feedback/PaginationBar.vue';
import {
    downloadComplianceScorecardExcel,
    downloadComplianceScorecardPdf,
} from '@/api/exports';
import { fetchComplianceMatrix, openCompliancePeriods } from '@/api/compliance';
import { buildCacheKey, invalidateListCache, readListCache, writeListCache } from '@/composables/useListCache';
import { useAuthStore } from '@/stores/auth';
import type { BarangaySummary, ComplianceMatrix } from '@/types';
import {
    buildBarangaySummaries,
    type BarangayComplianceSummary,
    summaryTone,
} from '@/utils/barangay-compliance-summary';
import {
    complianceStatusLabel,
    complianceStatusToVariant,
} from '@/utils/compliance-status';

const auth = useAuthStore();

const matrix = ref<ComplianceMatrix | null>(null);
const loading = ref(true);
const actionLoading = ref(false);
const error = ref<string | null>(null);

const searchQuery = ref('');
const riskFilter = ref<'all' | 'urgent' | 'clear'>('all');
const page = ref(1);
const pageSize = 10;

const selectedBarangay = ref<BarangaySummary | null>(null);
const drawerOpen = ref(false);

const summaries = computed(() => buildBarangaySummaries(matrix.value));

const filtered = computed(() => {
    const q = searchQuery.value.trim().toLowerCase();
    return summaries.value.filter((row) => {
        if (q && !row.barangay.name.toLowerCase().includes(q)) {
            return false;
        }
        if (riskFilter.value === 'urgent' && row.urgent === 0) {
            return false;
        }
        if (riskFilter.value === 'clear' && row.urgent > 0) {
            return false;
        }
        return true;
    });
});

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)));

const pageRows = computed(() => {
    const start = (page.value - 1) * pageSize;
    return filtered.value.slice(start, start + pageSize);
});

watch([searchQuery, riskFilter], () => {
    page.value = 1;
});

watch(totalPages, (pages) => {
    if (page.value > pages) {
        page.value = pages;
    }
});

async function loadMatrix(useCache = true) {
    if (!auth.token) {
        return;
    }
    const key = buildCacheKey({
        scope: 'mayor-compliance-barangays',
        municipalityId: auth.user?.municipality?.id,
    });

    if (useCache) {
        const cached = readListCache<ComplianceMatrix>(key);
        if (cached) {
            matrix.value = cached;
            loading.value = false;
            return;
        }
    }

    loading.value = true;
    error.value = null;
    try {
        const data = await fetchComplianceMatrix(auth.token);
        matrix.value = data;
        writeListCache(key, data);
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to load compliance';
    } finally {
        loading.value = false;
    }
}

function bustCache() {
    invalidateListCache('scope=mayor-compliance-barangays');
    invalidateListCache('scope=mayor-dashboard');
}

function openBarangay(row: BarangayComplianceSummary) {
    selectedBarangay.value = row.barangay;
    drawerOpen.value = true;
}

async function handleOpenPeriods() {
    if (!auth.token) {
        return;
    }
    actionLoading.value = true;
    error.value = null;
    try {
        const result = await openCompliancePeriods(auth.token);
        if (result.created === 0 && result.skipped > 0) {
            error.value = `Period already open (${result.skipped} existing instances).`;
        }
        bustCache();
        await loadMatrix(false);
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to open periods';
    } finally {
        actionLoading.value = false;
    }
}

async function downloadPdf() {
    if (!auth.token) return;
    actionLoading.value = true;
    try {
        await downloadComplianceScorecardPdf(auth.token);
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'PDF download failed';
    } finally {
        actionLoading.value = false;
    }
}

async function downloadExcel() {
    if (!auth.token) return;
    actionLoading.value = true;
    try {
        await downloadComplianceScorecardExcel(auth.token);
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Excel download failed';
    } finally {
        actionLoading.value = false;
    }
}

function toneRail(row: BarangayComplianceSummary) {
    const tone = summaryTone(row);
    if (tone === 'ok') return 'gl-rail-ok';
    if (tone === 'danger') return 'gl-rail-danger';
    return 'gl-rail-warn';
}

onMounted(() => loadMatrix());
</script>

<template>
    <AppShell
        title="Barangay compliance"
        :subtitle="auth.user?.municipality?.name ?? 'Municipality'"
    >
        <p class="mb-6 max-w-2xl text-sm leading-relaxed text-ink-muted">
            Shared municipal catalog for every barangay. Search and open a barangay to see its
            Administrative, Social, and SK statuses.
        </p>

        <div class="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div class="flex min-w-0 flex-1 flex-wrap gap-3">
                <label class="block min-w-[12rem] flex-1 text-sm">
                    <span class="mb-1 block font-medium text-ink">Search barangay</span>
                    <input
                        v-model="searchQuery"
                        type="search"
                        placeholder="Type a barangay name"
                        class="min-h-11 w-full border border-rule bg-paper px-3 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                        style="border-radius: 2px"
                    />
                </label>
                <div>
                    <p class="mb-1 text-sm font-medium text-ink">Filter</p>
                    <div class="flex flex-wrap gap-2">
                        <button
                            type="button"
                            class="gl-btn-secondary"
                            :class="riskFilter === 'all' ? 'border-brand text-brand' : ''"
                            @click="riskFilter = 'all'"
                        >
                            All
                        </button>
                        <button
                            type="button"
                            class="gl-btn-secondary"
                            :class="riskFilter === 'urgent' ? 'border-brand text-brand' : ''"
                            @click="riskFilter = 'urgent'"
                        >
                            Urgent
                        </button>
                        <button
                            type="button"
                            class="gl-btn-secondary"
                            :class="riskFilter === 'clear' ? 'border-brand text-brand' : ''"
                            @click="riskFilter = 'clear'"
                        >
                            Clear
                        </button>
                    </div>
                </div>
            </div>
            <div class="flex flex-wrap gap-2">
                <button
                    type="button"
                    class="gl-btn-secondary disabled:opacity-50"
                    :disabled="actionLoading"
                    @click="downloadPdf"
                >
                    Download PDF
                </button>
                <button
                    type="button"
                    class="gl-btn-secondary disabled:opacity-50"
                    :disabled="actionLoading"
                    @click="downloadExcel"
                >
                    Download Excel
                </button>
                <RouterLink to="/mayor/catalog" class="gl-btn-secondary">
                    Manage catalog
                </RouterLink>
                <button
                    type="button"
                    class="gl-btn-primary disabled:opacity-50"
                    :disabled="actionLoading"
                    @click="handleOpenPeriods"
                >
                    Open current periods
                </button>
            </div>
        </div>

        <p v-if="error" class="mb-4 text-sm text-status-danger">{{ error }}</p>
        <div
            v-if="loading && !matrix"
            class="mb-4"
        >
            <LedgerSkeleton :rows="6" />
        </div>
        <div
            v-else-if="loading"
            class="mb-4 flex items-center gap-2 text-sm text-ink-muted"
        >
            <LoadingSpinner size="sm" />
            Refreshing compliance…
        </div>

        <div v-else class="gl-panel overflow-hidden">
            <LedgerNotice
                v-if="filtered.length === 0"
                title="No barangays match"
                description="Try another search, clear filters, or open current periods to generate instances."
            />
            <template v-else>
                <button
                    v-for="(row, index) in pageRows"
                    :key="row.barangay.id"
                    type="button"
                    class="gl-ledger-row w-full pl-5 text-left"
                    :style="{ animationDelay: `${Math.min(index, 8) * 40}ms` }"
                    @click="openBarangay(row)"
                >
                    <span class="gl-rail" :class="toneRail(row)" aria-hidden="true" />
                    <div class="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-3 sm:col-span-3">
                        <div class="min-w-0">
                            <p class="font-display text-base font-semibold text-ink">
                                {{ row.barangay.name }}
                            </p>
                            <p class="mt-1 text-sm text-ink-muted">
                                {{ row.accepted }}/{{ row.total }} accepted ·
                                {{ row.urgent }} urgent ·
                                {{ row.pending }} pending
                            </p>
                        </div>
                        <StatusBadge
                            v-if="row.worstStatus"
                            :status="complianceStatusToVariant(row.worstStatus)"
                            :label="complianceStatusLabel(row.worstStatus)"
                        />
                    </div>
                </button>
                <PaginationBar
                    :page="page"
                    :total-pages="totalPages"
                    :total="filtered.length"
                    :page-size="pageSize"
                    :loading="loading"
                    @update:page="page = $event"
                />
            </template>
        </div>

        <ComplianceBarangayDrawer
            :open="drawerOpen"
            :barangay="selectedBarangay"
            :matrix="matrix"
            @close="drawerOpen = false"
        />
    </AppShell>
</template>
