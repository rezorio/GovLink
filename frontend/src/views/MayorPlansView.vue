<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import AppShell from '@/components/library/layout/AppShell.vue';
import StatusBadge from '@/components/library/badges/StatusBadge.vue';
import LedgerSkeleton from '@/components/library/feedback/LedgerSkeleton.vue';
import PaginationBar from '@/components/library/feedback/PaginationBar.vue';
import LoadingSpinner from '@/components/library/feedback/LoadingSpinner.vue';
import { fetchPlanMatrix, openPlanPeriods, reviewPlan } from '@/api/plans';
import { buildCacheKey, invalidateListCache, readListCache, writeListCache } from '@/composables/useListCache';
import { useAuthStore } from '@/stores/auth';
import type { PlanMatrix, PlanSubmissionStatus, PlanType } from '@/types';

const auth = useAuthStore();
const matrix = ref<PlanMatrix | null>(null);
const filterType = ref<PlanType | ''>('');
const searchQuery = ref('');
const page = ref(1);
const pageSize = ref(15);
const loading = ref(true);
const actionLoading = ref(false);
const error = ref<string | null>(null);
const reviewId = ref<string | null>(null);
const returnReason = ref('');

function statusVariant(status: PlanSubmissionStatus) {
    if (status === 'ACCEPTED') return 'approved' as const;
    if (status === 'RETURNED') return 'overdue' as const;
    return 'pending' as const;
}

function statusLabel(status: PlanSubmissionStatus) {
    return status.replace(/_/g, ' ');
}

const submittedCells = computed(() =>
    (matrix.value?.cells ?? []).filter((c) => c.status === 'SUBMITTED'),
);

function cacheKey() {
    return buildCacheKey({
        scope: 'mayor-plans-matrix',
        planType: filterType.value || undefined,
        page: page.value,
        pageSize: pageSize.value,
        q: searchQuery.value.trim(),
    });
}

async function load(useCache = true) {
    if (!auth.token) return;

    const key = cacheKey();
    if (useCache) {
        const cached = readListCache<PlanMatrix>(key);
        if (cached) {
            matrix.value = cached;
            loading.value = false;
            return;
        }
    }

    loading.value = true;
    error.value = null;
    try {
        const result = await fetchPlanMatrix(auth.token, {
            planType: filterType.value || undefined,
            page: page.value,
            pageSize: pageSize.value,
            q: searchQuery.value.trim() || undefined,
        });
        matrix.value = result;
        page.value = result.pagination.page;
        writeListCache(key, result);
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to load plan matrix';
    } finally {
        loading.value = false;
    }
}

async function openPeriods() {
    if (!auth.token) return;
    actionLoading.value = true;
    try {
        await openPlanPeriods(auth.token);
        invalidateListCache('scope=mayor-plans-matrix');
        await load(false);
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Open periods failed';
    } finally {
        actionLoading.value = false;
    }
}

async function decide(id: string, decision: 'ACCEPTED' | 'RETURNED') {
    if (!auth.token) return;
    if (decision === 'RETURNED' && returnReason.value.trim().length < 3) {
        error.value = 'Return reason required (min 3 characters)';
        return;
    }
    actionLoading.value = true;
    error.value = null;
    try {
        await reviewPlan(auth.token, id, {
            decision,
            returnReason: decision === 'RETURNED' ? returnReason.value.trim() : undefined,
        });
        reviewId.value = null;
        returnReason.value = '';
        invalidateListCache('scope=mayor-plans-matrix');
        await load(false);
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Review failed';
    } finally {
        actionLoading.value = false;
    }
}

function cellFor(barangayId: string, planType: PlanType) {
    return matrix.value?.cells.find((c) => c.barangayId === barangayId && c.planType === planType);
}

function onPageChange(next: number) {
    page.value = next;
    void load(false);
}

function onFilterChange() {
    page.value = 1;
    invalidateListCache('scope=mayor-plans-matrix');
    void load(false);
}

function onSearch() {
    page.value = 1;
    invalidateListCache('scope=mayor-plans-matrix');
    void load(false);
}

onMounted(() => load());
</script>

<template>
    <AppShell title="BDP / AIP tracker" subtitle="Municipal LDC oversight">
        <p class="mb-6 max-w-2xl text-sm text-ink-muted">
            Track Barangay Development Plans (term) and Annual Investment Programs (fiscal year)
            submitted to the municipal Local Development Council.
        </p>

        <div class="mb-5 flex flex-wrap items-center gap-3">
            <select
                v-model="filterType"
                class="border border-rule bg-surface px-3 py-2 text-sm text-ink"
                style="border-radius: 2px"
                @change="onFilterChange"
            >
                <option value="">All plan types</option>
                <option value="BDP">BDP only</option>
                <option value="AIP">AIP only</option>
            </select>
            <input
                v-model="searchQuery"
                type="search"
                placeholder="Search barangay"
                class="min-w-[12rem] border border-rule bg-surface px-3 py-2 text-sm text-ink"
                style="border-radius: 2px"
                @keydown.enter.prevent="onSearch"
            />
            <button type="button" class="gl-btn-secondary" @click="onSearch">Search</button>
            <button type="button" class="gl-btn-secondary inline-flex items-center gap-2" :disabled="actionLoading" @click="openPeriods">
                <LoadingSpinner v-if="actionLoading" size="sm" />
                Open current periods
            </button>
        </div>

        <div
            v-if="matrix"
            class="mb-6 flex flex-wrap gap-4 text-sm text-ink-muted"
        >
            <span>Not started: {{ matrix.statusCounts.notStarted }}</span>
            <span>Draft: {{ matrix.statusCounts.draft }}</span>
            <span>Submitted: {{ matrix.statusCounts.submitted }}</span>
            <span>Accepted: {{ matrix.statusCounts.accepted }}</span>
            <span>Returned: {{ matrix.statusCounts.returned }}</span>
        </div>

        <p v-if="error" class="mb-4 text-sm text-status-danger">{{ error }}</p>
        <LedgerSkeleton v-if="loading && !matrix" :rows="8" />

        <div v-else-if="matrix" class="gl-panel overflow-x-auto">
            <table class="min-w-full text-left text-sm">
                <thead class="border-b border-rule bg-paper text-xs uppercase tracking-wide text-ink-muted">
                    <tr>
                        <th class="px-4 py-3 font-semibold">Barangay</th>
                        <th
                            v-for="period in matrix.periods"
                            :key="period.planType"
                            class="px-4 py-3 font-semibold"
                        >
                            {{ period.planType }}
                            <span class="block font-normal normal-case tracking-normal">{{ period.periodLabel }}</span>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr
                        v-for="brgy in matrix.barangays"
                        :key="brgy.id"
                        class="border-b border-rule/60"
                    >
                        <td class="px-4 py-3 font-medium text-ink">{{ brgy.name }}</td>
                        <td
                            v-for="period in matrix.periods"
                            :key="`${brgy.id}-${period.planType}`"
                            class="px-4 py-3"
                        >
                            <template v-if="cellFor(brgy.id, period.planType)">
                                <StatusBadge
                                    :status="statusVariant(cellFor(brgy.id, period.planType)!.status)"
                                    :label="statusLabel(cellFor(brgy.id, period.planType)!.status)"
                                />
                            </template>
                            <span v-else class="text-xs text-ink-muted">—</span>
                        </td>
                    </tr>
                </tbody>
            </table>
            <PaginationBar
                :page="matrix.pagination.page"
                :total-pages="matrix.pagination.totalPages"
                :total="matrix.pagination.total"
                :page-size="matrix.pagination.pageSize"
                :loading="loading"
                @update:page="onPageChange"
            />
        </div>

        <section v-if="submittedCells.length" class="mt-10">
            <h2 class="mb-3 font-display text-lg font-semibold text-ink">Needs review</h2>
            <div class="gl-panel overflow-hidden">
                <article
                    v-for="row in submittedCells"
                    :key="row.id"
                    class="gl-ledger-row pl-5"
                >
                    <span class="gl-rail gl-rail-warn" aria-hidden="true" />
                    <div class="sm:col-span-2">
                    <div class="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <p class="font-display text-base font-semibold text-ink">
                                {{ row.planType }} · {{ matrix?.barangays.find((b) => b.id === row.barangayId)?.name }}
                            </p>
                            <p class="text-xs text-ink-muted">{{ row.periodLabel }} · {{ row.title }}</p>
                        </div>
                        <button
                            type="button"
                            class="gl-btn-secondary"
                            @click="reviewId = reviewId === row.id ? null : row.id"
                        >
                            Review
                        </button>
                    </div>
                    <div v-if="reviewId === row.id" class="mt-4 space-y-3">
                        <textarea
                            v-model="returnReason"
                            rows="2"
                            class="w-full border border-rule bg-paper px-3 py-2 text-sm"
                            style="border-radius: 2px"
                            placeholder="Return reason (required if returning)"
                        />
                        <div class="flex flex-wrap gap-2">
                            <button
                                type="button"
                                class="gl-btn-primary"
                                :disabled="actionLoading"
                                @click="decide(row.id, 'ACCEPTED')"
                            >
                                Accept
                            </button>
                            <button
                                type="button"
                                class="gl-btn-warn"
                                :disabled="actionLoading"
                                @click="decide(row.id, 'RETURNED')"
                            >
                                Return
                            </button>
                        </div>
                    </div>
                    </div>
                </article>
            </div>
        </section>
    </AppShell>
</template>
