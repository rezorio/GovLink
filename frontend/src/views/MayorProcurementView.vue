<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import AppShell from '@/components/library/layout/AppShell.vue';
import StatusBadge from '@/components/library/badges/StatusBadge.vue';
import {
    acknowledgeSplit,
    approveAppLine,
    fetchAppLines,
    fetchProcurementOversight,
} from '@/api/procurement';
import { useAuthStore } from '@/stores/auth';
import type { AppLineItem, ProcurementContract, ProcurementOversight } from '@/types';
import { formatPhpCentavos } from '@/utils/money';

const auth = useAuthStore();
const data = ref<ProcurementOversight | null>(null);
const appLines = ref<AppLineItem[]>([]);
const loading = ref(true);
const actionLoading = ref(false);
const error = ref<string | null>(null);

const fiscalYear = computed(() => data.value?.fiscalYear ?? new Date().getFullYear());
const pendingAppLines = computed(() =>
    appLines.value.filter((row) => row.status === 'DRAFT'),
);

function contractRail(row: ProcurementContract) {
    if (row.splittingFlagged && !row.splittingAcknowledgedAt) {
        return 'gl-rail-danger';
    }
    if (row.status === 'COMPLETED' || row.status === 'ACTIVE') {
        return 'gl-rail-ok';
    }
    return 'gl-rail-warn';
}

function statusVariant(row: ProcurementContract) {
    if (row.splittingFlagged && !row.splittingAcknowledgedAt) {
        return 'overdue' as const;
    }
    if (row.status === 'COMPLETED' || row.status === 'ACTIVE' || row.status === 'AWARDED') {
        return 'approved' as const;
    }
    return 'pending' as const;
}

async function load() {
    if (!auth.token) {
        return;
    }
    loading.value = true;
    error.value = null;
    try {
        const year = new Date().getFullYear();
        const [oversight, lines] = await Promise.all([
            fetchProcurementOversight(auth.token),
            fetchAppLines(auth.token, year),
        ]);
        data.value = oversight;
        appLines.value = lines;
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to load oversight';
    } finally {
        loading.value = false;
    }
}

async function approveLine(id: string) {
    if (!auth.token) {
        return;
    }
    actionLoading.value = true;
    error.value = null;
    try {
        await approveAppLine(auth.token, id);
        await load();
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Approve failed';
    } finally {
        actionLoading.value = false;
    }
}

async function ack(id: string) {
    if (!auth.token) {
        return;
    }
    actionLoading.value = true;
    try {
        await acknowledgeSplit(auth.token, id);
        await load();
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Acknowledge failed';
    } finally {
        actionLoading.value = false;
    }
}

onMounted(load);
</script>

<template>
    <AppShell
        title="Procurement oversight"
        :subtitle="auth.user?.municipality?.name ?? 'Municipality'"
    >
        <p class="mb-6 max-w-2xl text-sm text-ink-muted">
            Barangay APP-linked contracts (FY {{ fiscalYear }}). Internal readiness for
            Financial Administration — SVP ceilings are config-driven, not hardcoded.
        </p>

        <div v-if="loading" class="text-sm text-ink-muted">Loading procurement…</div>
        <div
            v-else-if="error"
            class="mb-4 border border-status-danger/40 bg-status-danger/5 px-4 py-3 text-sm text-status-danger"
            style="border-radius: 2px"
        >
            {{ error }}
        </div>
        <template v-else-if="data">
            <section class="mb-8">
                <h2 class="mb-3 font-display text-lg font-semibold text-ink">Summary</h2>
                <div class="gl-panel px-4 py-4 text-sm text-ink-muted sm:px-5">
                    <p>
                        <span class="font-medium text-ink">{{ data.totals.appLineCount }}</span>
                        APP lines ·
                        <span class="font-medium text-ink">{{ data.totals.contractCount }}</span>
                        contracts · APP total
                        <span class="font-medium text-ink">{{
                            formatPhpCentavos(data.totals.totalAppCentavos)
                        }}</span>
                        · obligated
                        <span class="font-medium text-ink">{{
                            formatPhpCentavos(data.totals.totalContractCentavos)
                        }}</span>
                    </p>
                    <p class="mt-1">
                        APP link coverage
                        <span class="font-medium text-ink">
                            {{
                                data.totals.appComplianceRate == null
                                    ? '—'
                                    : `${data.totals.appComplianceRate}%`
                            }}
                        </span>
                        · pending split flags
                        <span class="font-medium text-ink">{{ data.totals.pendingSplitFlags }}</span>
                        · pending APP approvals
                        <span class="font-medium text-ink">{{ pendingAppLines.length }}</span>
                    </p>
                </div>
            </section>

            <section v-if="pendingAppLines.length" class="mb-10">
                <h2 class="mb-3 font-display text-lg font-semibold text-ink">
                    APP lines awaiting approval
                </h2>
                <div class="gl-panel overflow-hidden">
                    <div
                        v-for="row in pendingAppLines"
                        :key="row.id"
                        class="gl-ledger-row pl-5"
                    >
                        <span class="gl-rail gl-rail-warn" aria-hidden="true" />
                        <div class="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-3 sm:col-span-2">
                            <div class="min-w-0 flex-1">
                                <p class="font-display text-base font-semibold text-ink">
                                    {{ row.code }} — {{ row.description }}
                                </p>
                                <p class="text-xs text-ink-muted">
                                    {{ row.barangay?.name }} · {{ row.category }} ·
                                    {{ formatPhpCentavos(row.approvedAmountCentavos) }}
                                </p>
                            </div>
                            <button
                                type="button"
                                class="gl-btn-primary"
                                :disabled="actionLoading"
                                @click="approveLine(row.id)"
                            >
                                Approve APP
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <section v-if="data.flaggedContracts.length" class="mb-10">
                <h2 class="mb-3 font-display text-lg font-semibold text-ink">
                    Split flags needing acknowledgment
                </h2>
                <div class="gl-panel overflow-hidden">
                    <div
                        v-for="row in data.flaggedContracts"
                        :key="row.id"
                        class="gl-ledger-row pl-5"
                    >
                        <span class="gl-rail gl-rail-danger" aria-hidden="true" />
                        <div class="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-3 sm:col-span-2">
                            <div class="min-w-0 flex-1">
                                <p class="font-display text-base font-semibold text-ink">
                                    {{ row.title }}
                                </p>
                                <p class="text-xs text-ink-muted">
                                    {{ row.barangay?.name }} · {{ row.supplierName }} ·
                                    {{ formatPhpCentavos(row.amountCentavos) }} · risk
                                    {{ row.splittingRiskScore ?? '—' }}
                                </p>
                            </div>
                            <button
                                type="button"
                                class="gl-btn-warn"
                                :disabled="actionLoading"
                                @click="ack(row.id)"
                            >
                                Acknowledge split
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <section>
                <h2 class="mb-3 font-display text-lg font-semibold text-ink">All contracts</h2>
                <div class="gl-panel overflow-hidden">
                    <div
                        v-if="data.contracts.length === 0"
                        class="px-4 py-6 text-sm text-ink-muted sm:px-5"
                    >
                        No contracts for this fiscal year.
                    </div>
                    <div
                        v-for="row in data.contracts"
                        :key="row.id"
                        class="gl-ledger-row pl-5"
                    >
                        <span class="gl-rail" :class="contractRail(row)" aria-hidden="true" />
                        <div class="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-3 sm:col-span-2">
                            <div class="min-w-0 flex-1">
                                <p class="font-display text-base font-semibold text-ink">
                                    {{ row.title }}
                                </p>
                                <p class="text-xs text-ink-muted">
                                    {{ row.barangay?.name }} · {{ row.mode }} ·
                                    {{ row.appLineItem?.code }} ·
                                    {{ formatPhpCentavos(row.amountCentavos) }}
                                    <span
                                        v-if="
                                            [
                                                'RFQ_ISSUED',
                                                'QUOTATIONS_RECEIVED',
                                                'EVALUATION',
                                                'AWARD_RECOMMENDED',
                                            ].includes(row.status)
                                        "
                                    >
                                        · chain in progress
                                    </span>
                                </p>
                            </div>
                            <StatusBadge :status="statusVariant(row)" :label="row.status" />
                        </div>
                    </div>
                </div>
            </section>
        </template>
    </AppShell>
</template>
