<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import AppShell from '@/components/library/layout/AppShell.vue';
import StatusBadge from '@/components/library/badges/StatusBadge.vue';
import BarangayRankingToolbar from '@/components/library/sglg/BarangayRankingToolbar.vue';
import LedgerSkeleton from '@/components/library/feedback/LedgerSkeleton.vue';
import LoadingSpinner from '@/components/library/feedback/LoadingSpinner.vue';
import { fetchSglgScores } from '@/api/sglg';
import { buildCacheKey, readListCache, writeListCache } from '@/composables/useListCache';
import { useAuthStore } from '@/stores/auth';
import type { SglgPillarScore, SglgScoresResponse } from '@/types';
import {
    filterAndSortSglgBarangays,
    type SglgBandFilter,
    type SglgBarangaySort,
} from '@/utils/sglg-barangay-ranking';
import {
    formatSglgScore,
    sglgRailClass,
    sglgScoreVariant,
} from '@/utils/sglg-score';

const auth = useAuthStore();

const data = ref<SglgScoresResponse | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

const search = ref('');
const band = ref<SglgBandFilter>('all');
const sort = ref<SglgBarangaySort>('score-desc');

const overallLabel = computed(() => formatSglgScore(data.value?.municipality.overallScore ?? null));

const rankedBarangays = computed(() => {
    if (!data.value) {
        return [];
    }
    return filterAndSortSglgBarangays(data.value.barangays, {
        search: search.value,
        band: band.value,
        sort: sort.value,
    });
});

function badgeVariant(score: number | null) {
    const v = sglgScoreVariant(score);
    if (v === 'muted') {
        return 'pending' as const;
    }
    return v;
}

function badgeText(row: SglgPillarScore) {
    if (row.score === null) {
        return 'Unmapped';
    }
    return formatSglgScore(row.score);
}

async function load(useCache = true) {
    if (!auth.token) {
        return;
    }

    const key = buildCacheKey({
        scope: 'mayor-sglg',
        municipalityId: auth.user?.municipality?.id,
        periodLabel: 'current',
    });

    if (useCache) {
        const cached = readListCache<SglgScoresResponse>(key);
        if (cached) {
            data.value = cached;
            loading.value = false;
            return;
        }
    }

    loading.value = true;
    error.value = null;
    try {
        const result = await fetchSglgScores(auth.token);
        data.value = result;
        writeListCache(key, result);
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to load SGLG scores';
    } finally {
        loading.value = false;
    }
}

onMounted(() => load());
</script>

<template>
    <AppShell
        title="SGLG readiness"
        :subtitle="auth.user?.municipality?.name ?? 'Municipality'"
    >
        <p class="mb-6 max-w-2xl text-sm text-ink-muted">
            {{
                data?.disclaimer ??
                'Internal SGLG-aligned readiness from GovLink obligations — not official DILG Seal assessment results.'
            }}
        </p>

        <div
            v-if="error"
            class="mb-4 border border-status-danger/40 bg-status-danger/5 px-4 py-3 text-sm text-status-danger"
            style="border-radius: 2px"
        >
            {{ error }}
        </div>

        <template v-if="loading && !data">
            <section class="mb-10">
                <h2 class="mb-3 font-display text-lg font-semibold text-ink">Governance pillars</h2>
                <LedgerSkeleton :rows="6" />
            </section>
            <section>
                <h2 class="mb-3 font-display text-lg font-semibold text-ink">Barangay ranking</h2>
                <LedgerSkeleton :rows="8" />
            </section>
        </template>

        <template v-else-if="data">
            <div
                v-if="loading"
                class="mb-4 flex items-center gap-2 text-sm text-ink-muted"
            >
                <LoadingSpinner size="sm" />
                Refreshing scores…
            </div>

            <section class="mb-10">
                <div class="mb-3 flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h2 class="font-display text-lg font-semibold text-ink">Governance pillars</h2>
                        <p class="text-sm text-ink-muted">
                            Municipality overall
                            <span class="font-semibold text-ink">{{ overallLabel }}</span>
                            <span v-if="data.periodLabel" class="text-ink-muted">
                                · period {{ data.periodLabel }}
                            </span>
                        </p>
                    </div>
                </div>

                <div class="gl-panel overflow-hidden">
                    <div
                        v-for="row in data.municipality.pillars"
                        :key="row.pillar"
                        class="gl-ledger-row pl-5"
                    >
                        <span
                            class="gl-rail"
                            :class="sglgRailClass(row.score)"
                            aria-hidden="true"
                        />
                        <div class="sm:col-span-3 flex flex-wrap items-center justify-between gap-3">
                            <div class="min-w-0 flex-1">
                                <p class="font-display text-base font-semibold text-ink">{{ row.label }}</p>
                                <p class="text-xs text-ink-muted">
                                    <template v-if="row.requirementCount === 0">
                                        No mapped obligations
                                    </template>
                                    <template v-else>
                                        {{ row.accepted }} accepted · {{ row.submitted }} submitted ·
                                        {{ row.overdue }} overdue · weight {{ row.weightedTotal }}
                                    </template>
                                </p>
                            </div>
                            <StatusBadge
                                :status="badgeVariant(row.score)"
                                :label="badgeText(row)"
                            />
                        </div>
                    </div>
                </div>
            </section>

            <section>
                <div class="mb-3">
                    <h2 class="font-display text-lg font-semibold text-ink">Barangay ranking</h2>
                    <p class="text-sm text-ink-muted">
                        Find weak barangays fast — search, filter by score band, then sort for follow-up.
                    </p>
                </div>

                <div class="gl-panel overflow-hidden">
                    <BarangayRankingToolbar
                        v-model:search="search"
                        v-model:band="band"
                        v-model:sort="sort"
                        :result-count="rankedBarangays.length"
                        :total-count="data.barangays.length"
                    />

                    <div
                        v-if="data.barangays.length === 0"
                        class="px-4 py-6 text-sm text-ink-muted sm:px-5"
                    >
                        No active barangays.
                    </div>
                    <div
                        v-else-if="rankedBarangays.length === 0"
                        class="px-4 py-6 text-sm text-ink-muted sm:px-5"
                    >
                        No barangays match this search or filter.
                    </div>
                    <div
                        v-for="(brgy, index) in rankedBarangays"
                        :key="brgy.id"
                        class="gl-ledger-row pl-5"
                        :style="{ animationDelay: `${Math.min(index, 8) * 40}ms` }"
                    >
                        <span
                            class="gl-rail"
                            :class="sglgRailClass(brgy.overallScore)"
                            aria-hidden="true"
                        />
                        <div class="sm:col-span-3 flex flex-wrap items-center justify-between gap-3">
                            <div class="min-w-0 flex-1">
                                <p class="font-display text-base font-semibold text-ink">
                                    <span class="mr-2 text-ink-muted">{{ index + 1 }}.</span>
                                    {{ brgy.name }}
                                </p>
                                <p class="text-xs text-ink-muted">
                                    <template v-if="brgy.weakestPillar">
                                        Weakest: {{ brgy.weakestPillar.label }}
                                        ({{ formatSglgScore(brgy.weakestPillar.score) }})
                                    </template>
                                    <template v-else>No scored pillars yet</template>
                                </p>
                            </div>
                            <StatusBadge
                                :status="badgeVariant(brgy.overallScore)"
                                :label="formatSglgScore(brgy.overallScore)"
                            />
                        </div>
                    </div>
                </div>
            </section>
        </template>
    </AppShell>
</template>
