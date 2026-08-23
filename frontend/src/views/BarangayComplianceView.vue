<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import AppShell from '@/components/library/layout/AppShell.vue';
import StatusBadge from '@/components/library/badges/StatusBadge.vue';
import {
    fetchComplianceInstances,
    startComplianceInstance,
    submitComplianceInstance,
} from '@/api/compliance';
import LedgerSkeleton from '@/components/library/feedback/LedgerSkeleton.vue';
import { buildCacheKey, invalidateListCache, readListCache, writeListCache } from '@/composables/useListCache';
import { useI18n } from '@/composables/useI18n';
import { useAuthStore } from '@/stores/auth';
import type { ComplianceInstance, ComplianceStatus } from '@/types';
import { formatDueDate, daysRemaining } from '@/utils/assignment-status';
import { complianceStatusToVariant } from '@/utils/compliance-status';

const auth = useAuthStore();
const { t, complianceStatus } = useI18n();

const instances = ref<ComplianceInstance[]>([]);
const loading = ref(true);
const actionLoading = ref(false);
const error = ref<string | null>(null);
const filter = ref<'all' | 'action' | 'done'>('action');

const filterOptions = computed(() => [
    { id: 'action' as const, label: t('compliance.filterAction') },
    { id: 'done' as const, label: t('compliance.filterDone') },
    { id: 'all' as const, label: t('compliance.filterAll') },
]);

const filtered = computed(() => {
    if (filter.value === 'all') {
        return instances.value;
    }
    if (filter.value === 'done') {
        return instances.value.filter((row) => row.status === 'ACCEPTED' || row.status === 'SUBMITTED');
    }
    return instances.value.filter((row) =>
        ['NOT_STARTED', 'IN_PROGRESS', 'RETURNED', 'OVERDUE'].includes(row.status),
    );
});

function railClass(status: ComplianceStatus) {
    const variant = complianceStatusToVariant(status);
    if (variant === 'approved') {
        return 'gl-rail-ok';
    }
    if (variant === 'overdue') {
        return 'gl-rail-danger';
    }
    return 'gl-rail-warn';
}

async function load(useCache = true) {
    if (!auth.token) {
        return;
    }
    const key = buildCacheKey({
        scope: 'barangay-compliance',
        barangayId: auth.user?.barangay?.id,
    });
    if (useCache) {
        const cached = readListCache<ComplianceInstance[]>(key);
        if (cached) {
            instances.value = cached;
            loading.value = false;
            return;
        }
    }
    loading.value = true;
    error.value = null;
    try {
        const rows = await fetchComplianceInstances(auth.token);
        instances.value = rows;
        writeListCache(key, rows);
    } catch (err) {
        error.value = err instanceof Error ? err.message : t('compliance.loadFailed');
    } finally {
        loading.value = false;
    }
}

async function start(id: string) {
    if (!auth.token) {
        return;
    }
    actionLoading.value = true;
    try {
        await startComplianceInstance(auth.token, id);
        invalidateListCache('scope=barangay-compliance');
        await load(false);
    } catch (err) {
        error.value = err instanceof Error ? err.message : t('compliance.startFailed');
    } finally {
        actionLoading.value = false;
    }
}

async function submit(id: string) {
    if (!auth.token) {
        return;
    }
    actionLoading.value = true;
    try {
        await submitComplianceInstance(auth.token, id);
        invalidateListCache('scope=barangay-compliance');
        await load(false);
    } catch (err) {
        error.value = err instanceof Error ? err.message : t('compliance.submitFailed');
    } finally {
        actionLoading.value = false;
    }
}

function canStart(status: ComplianceStatus) {
    return status === 'NOT_STARTED' || status === 'RETURNED';
}

function canSubmit(status: ComplianceStatus) {
    return status === 'IN_PROGRESS' || status === 'RETURNED';
}

onMounted(load);
</script>

<template>
    <AppShell
        :title="t('compliance.title')"
        :subtitle="auth.user?.barangay?.name ?? t('compliance.subtitleFallback')"
    >
        <p class="mb-6 max-w-xl text-sm leading-relaxed text-ink-muted">
            {{ t('compliance.intro') }}
        </p>

        <div class="mb-5 flex flex-wrap gap-6 border-b border-rule">
            <button
                v-for="opt in filterOptions"
                :key="opt.id"
                type="button"
                class="gl-tab"
                :class="filter === opt.id ? 'gl-tab-active' : ''"
                @click="filter = opt.id"
            >
                {{ opt.label }}
            </button>
        </div>

        <p v-if="error" class="mb-4 text-sm text-status-danger">{{ error }}</p>
        <LedgerSkeleton v-if="loading && instances.length === 0" :rows="6" />

        <div v-else class="gl-panel overflow-hidden">
            <p
                v-if="filtered.length === 0"
                class="px-4 py-10 text-center text-sm text-ink-muted"
            >
                {{ t('compliance.empty') }}
            </p>

            <article
                v-for="(row, index) in filtered"
                :key="row.id"
                class="gl-ledger-row pl-5"
                :style="{ animationDelay: `${Math.min(index, 8) * 40}ms` }"
            >
                <span class="gl-rail" :class="railClass(row.status)" aria-hidden="true" />

                <div class="flex flex-col gap-2 sm:contents">
                    <div class="flex flex-wrap items-center gap-2 sm:block">
                        <StatusBadge
                            :status="complianceStatusToVariant(row.status)"
                            :label="complianceStatus(row.status)"
                        />
                        <p class="font-mono text-[11px] font-semibold tracking-wide text-ink-muted sm:mt-2">
                            {{ row.requirement.code }}
                        </p>
                    </div>

                    <div class="min-w-0">
                        <h2 class="font-display text-lg font-semibold leading-snug text-ink">
                            {{ row.requirement.title }}
                        </h2>
                        <p class="mt-1 text-xs text-ink-muted">
                            {{ t('common.period', { label: row.periodLabel }) }} ·
                            {{ t('common.due', { date: formatDueDate(row.dueDate) }) }}
                            <span class="text-ink/70">({{ daysRemaining(row.dueDate) }}d)</span>
                        </p>
                        <p
                            v-if="row.status === 'RETURNED' && row.returnReason"
                            class="mt-3 border-l-2 border-status-danger bg-status-danger/5 px-3 py-2 text-sm text-status-danger"
                        >
                            {{ t('common.returned', { reason: row.returnReason }) }}
                        </p>
                    </div>

                    <div class="flex flex-wrap gap-2 sm:justify-end">
                        <button
                            v-if="canStart(row.status)"
                            type="button"
                            class="gl-btn-warn disabled:opacity-50"
                            :disabled="actionLoading"
                            @click="start(row.id)"
                        >
                            {{ row.status === 'RETURNED' ? t('compliance.resumeWork') : t('compliance.start') }}
                        </button>
                        <button
                            v-if="canSubmit(row.status)"
                            type="button"
                            class="gl-btn-primary disabled:opacity-50"
                            :disabled="actionLoading"
                            @click="submit(row.id)"
                        >
                            {{
                                row.status === 'RETURNED'
                                    ? t('compliance.fixResubmit')
                                    : t('compliance.submitForReview')
                            }}
                        </button>
                    </div>
                </div>
            </article>
        </div>
    </AppShell>
</template>
