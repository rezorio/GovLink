<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import AppShell from '@/components/library/layout/AppShell.vue';
import StatusBadge from '@/components/library/badges/StatusBadge.vue';
import ContractChainPanel from '@/components/library/procurement/ContractChainPanel.vue';
import BacRosterPanel from '@/components/library/procurement/BacRosterPanel.vue';
import {
    advanceContract,
    createAppLine,
    createContract,
    fetchAppLines,
    fetchContracts,
} from '@/api/procurement';
import { useAuthStore } from '@/stores/auth';
import type { AppLineItem, ContractStatus, ProcurementContract } from '@/types';
import { formatPhpCentavos, pesosToCentavos } from '@/utils/money';

const auth = useAuthStore();
const fiscalYear = new Date().getFullYear();

const appLines = ref<AppLineItem[]>([]);
const contracts = ref<ProcurementContract[]>([]);
const loading = ref(true);
const actionLoading = ref(false);
const error = ref<string | null>(null);
const showAppForm = ref(false);
const showContractForm = ref(false);
const selectedContractId = ref<string | null>(null);

const appForm = ref({
    code: '',
    description: '',
    category: 'Goods',
    amountPesos: 0,
});

const contractForm = ref({
    appLineItemId: '',
    title: '',
    supplierName: '',
    amountPesos: 0,
    mode: 'SVP' as const,
});

const approvedLines = computed(() => appLines.value.filter((r) => r.status === 'APPROVED'));

const NEXT: Record<string, ContractStatus | null> = {
    DRAFT: 'PLANNED',
    PLANNED: 'RFQ_ISSUED',
    RFQ_ISSUED: 'QUOTATIONS_RECEIVED',
    QUOTATIONS_RECEIVED: 'EVALUATION',
    EVALUATION: 'AWARD_RECOMMENDED',
    AWARD_RECOMMENDED: 'AWARDED',
    AWARDED: 'ACTIVE',
    ACTIVE: 'COMPLETED',
    COMPLETED: null,
};

function railForContract(row: ProcurementContract) {
    if (row.splittingFlagged && !row.splittingAcknowledgedAt) {
        return 'gl-rail-danger';
    }
    if (row.status === 'COMPLETED' || row.status === 'ACTIVE') {
        return 'gl-rail-ok';
    }
    return 'gl-rail-warn';
}

function variantForStatus(status: string) {
    if (status === 'APPROVED' || status === 'COMPLETED' || status === 'ACTIVE' || status === 'AWARDED') {
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
        const [lines, ctrs] = await Promise.all([
            fetchAppLines(auth.token, fiscalYear),
            fetchContracts(auth.token, fiscalYear),
        ]);
        appLines.value = lines;
        contracts.value = ctrs;
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to load procurement';
    } finally {
        loading.value = false;
    }
}

async function submitAppLine() {
    if (!auth.token) {
        return;
    }
    actionLoading.value = true;
    error.value = null;
    try {
        await createAppLine(auth.token, {
            fiscalYear,
            code: appForm.value.code,
            description: appForm.value.description,
            category: appForm.value.category,
            approvedAmountCentavos: pesosToCentavos(appForm.value.amountPesos),
        });
        showAppForm.value = false;
        appForm.value = { code: '', description: '', category: 'Goods', amountPesos: 0 };
        await load();
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Create APP line failed';
    } finally {
        actionLoading.value = false;
    }
}

async function submitContract() {
    if (!auth.token) {
        return;
    }
    actionLoading.value = true;
    error.value = null;
    try {
        await createContract(auth.token, {
            appLineItemId: contractForm.value.appLineItemId,
            title: contractForm.value.title,
            supplierName: contractForm.value.supplierName,
            amountCentavos: pesosToCentavos(contractForm.value.amountPesos),
            mode: contractForm.value.mode,
        });
        showContractForm.value = false;
        contractForm.value = {
            appLineItemId: '',
            title: '',
            supplierName: '',
            amountPesos: 0,
            mode: 'SVP',
        };
        await load();
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Create contract failed';
    } finally {
        actionLoading.value = false;
    }
}

async function advance(row: ProcurementContract) {
    if (!auth.token) {
        return;
    }
    const next = NEXT[row.status];
    if (!next) {
        return;
    }
    actionLoading.value = true;
    error.value = null;
    try {
        await advanceContract(auth.token, row.id, next);
        await load();
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Advance failed';
    } finally {
        actionLoading.value = false;
    }
}

onMounted(load);
</script>

<template>
    <AppShell title="Barangay procurement" :subtitle="`FY ${fiscalYear}`">
        <p class="mb-6 max-w-2xl text-sm text-ink-muted">
            Annual Procurement Plan lines and SVP contracts. Every contract must link to an
            approved APP line.
        </p>

        <div
            v-if="error"
            class="mb-4 border border-status-danger/40 bg-status-danger/5 px-4 py-3 text-sm text-status-danger"
            style="border-radius: 2px"
        >
            {{ error }}
        </div>

        <div v-if="loading" class="text-sm text-ink-muted">Loading…</div>
        <template v-else>
            <section v-if="auth.token" class="mb-10">
                <BacRosterPanel :token="auth.token" />
            </section>

            <section class="mb-10">
                <div class="mb-3 flex flex-wrap items-end justify-between gap-3">
                    <h2 class="font-display text-lg font-semibold text-ink">APP lines</h2>
                    <button type="button" class="gl-btn-secondary" @click="showAppForm = !showAppForm">
                        {{ showAppForm ? 'Cancel' : 'Add APP line' }}
                    </button>
                </div>

                <form
                    v-if="showAppForm"
                    class="gl-panel mb-4 space-y-3 px-4 py-4 sm:px-5"
                    @submit.prevent="submitAppLine"
                >
                    <div class="grid gap-3 sm:grid-cols-2">
                        <label class="block text-sm">
                            <span class="text-ink-muted">Code</span>
                            <input v-model="appForm.code" required class="mt-1 w-full border border-rule bg-surface px-3 py-2 text-ink" style="border-radius: 2px" />
                        </label>
                        <label class="block text-sm">
                            <span class="text-ink-muted">Category</span>
                            <input v-model="appForm.category" required class="mt-1 w-full border border-rule bg-surface px-3 py-2 text-ink" style="border-radius: 2px" />
                        </label>
                    </div>
                    <label class="block text-sm">
                        <span class="text-ink-muted">Description</span>
                        <input v-model="appForm.description" required class="mt-1 w-full border border-rule bg-surface px-3 py-2 text-ink" style="border-radius: 2px" />
                    </label>
                    <label class="block text-sm">
                        <span class="text-ink-muted">Approved amount (PHP)</span>
                        <input v-model.number="appForm.amountPesos" type="number" min="1" step="0.01" required class="mt-1 w-full border border-rule bg-surface px-3 py-2 text-ink" style="border-radius: 2px" />
                    </label>
                    <button type="submit" class="gl-btn-primary" :disabled="actionLoading">Save draft</button>
                </form>

                <div class="gl-panel overflow-hidden">
                    <div
                        v-if="appLines.length === 0"
                        class="px-4 py-6 text-sm text-ink-muted sm:px-5"
                    >
                        No APP lines for this year.
                    </div>
                    <div
                        v-for="row in appLines"
                        :key="row.id"
                        class="gl-ledger-row gl-rail flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5"
                        :class="row.status === 'APPROVED' ? 'gl-rail-ok' : 'gl-rail-warn'"
                    >
                        <div class="min-w-0 flex-1">
                            <p class="font-display text-base font-semibold text-ink">
                                {{ row.code }} — {{ row.description }}
                            </p>
                            <p class="text-xs text-ink-muted">
                                {{ row.category }} ·
                                {{ formatPhpCentavos(row.approvedAmountCentavos) }}
                            </p>
                        </div>
                        <div class="flex items-center gap-2">
                            <StatusBadge :status="variantForStatus(row.status)" :label="row.status" />
                            <p v-if="row.status === 'DRAFT'" class="text-xs text-ink-muted">
                                Awaiting municipal approval
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <section>
                <div class="mb-3 flex flex-wrap items-end justify-between gap-3">
                    <h2 class="font-display text-lg font-semibold text-ink">Contracts</h2>
                    <button
                        type="button"
                        class="gl-btn-secondary"
                        :disabled="approvedLines.length === 0"
                        @click="showContractForm = !showContractForm"
                    >
                        {{ showContractForm ? 'Cancel' : 'New contract' }}
                    </button>
                </div>

                <form
                    v-if="showContractForm"
                    class="gl-panel mb-4 space-y-3 px-4 py-4 sm:px-5"
                    @submit.prevent="submitContract"
                >
                    <label class="block text-sm">
                        <span class="text-ink-muted">APP line</span>
                        <select v-model="contractForm.appLineItemId" required class="mt-1 w-full border border-rule bg-surface px-3 py-2 text-ink" style="border-radius: 2px">
                            <option value="" disabled>Select…</option>
                            <option v-for="line in approvedLines" :key="line.id" :value="line.id">
                                {{ line.code }} ({{ formatPhpCentavos(line.approvedAmountCentavos) }})
                            </option>
                        </select>
                    </label>
                    <label class="block text-sm">
                        <span class="text-ink-muted">Title</span>
                        <input v-model="contractForm.title" required class="mt-1 w-full border border-rule bg-surface px-3 py-2 text-ink" style="border-radius: 2px" />
                    </label>
                    <label class="block text-sm">
                        <span class="text-ink-muted">Supplier</span>
                        <input v-model="contractForm.supplierName" required class="mt-1 w-full border border-rule bg-surface px-3 py-2 text-ink" style="border-radius: 2px" />
                    </label>
                    <label class="block text-sm">
                        <span class="text-ink-muted">Amount (PHP)</span>
                        <input v-model.number="contractForm.amountPesos" type="number" min="1" step="0.01" required class="mt-1 w-full border border-rule bg-surface px-3 py-2 text-ink" style="border-radius: 2px" />
                    </label>
                    <button type="submit" class="gl-btn-primary" :disabled="actionLoading">Create draft</button>
                </form>

                <div class="gl-panel overflow-hidden">
                    <div
                        v-if="contracts.length === 0"
                        class="px-4 py-6 text-sm text-ink-muted sm:px-5"
                    >
                        No contracts yet.
                    </div>
                    <div
                        v-for="row in contracts"
                        :key="row.id"
                        class="gl-ledger-row gl-rail flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5"
                        :class="railForContract(row)"
                    >
                        <button
                            type="button"
                            class="min-w-0 flex-1 text-left"
                            @click="selectedContractId = row.id"
                        >
                            <p class="font-display text-base font-semibold text-ink">{{ row.title }}</p>
                            <p class="text-xs text-ink-muted">
                                {{ row.supplierName }} · {{ row.mode }} ·
                                {{ formatPhpCentavos(row.amountCentavos) }}
                                <span v-if="row.splittingFlagged && !row.splittingAcknowledgedAt">
                                    · split flag (awaiting municipal ack)
                                </span>
                            </p>
                        </button>
                        <div class="flex items-center gap-2">
                            <StatusBadge :status="variantForStatus(row.status)" :label="row.status" />
                            <button
                                v-if="NEXT[row.status]"
                                type="button"
                                class="gl-btn-secondary"
                                :disabled="actionLoading"
                                @click="advance(row)"
                            >
                                Advance to {{ NEXT[row.status] }}
                            </button>
                        </div>
                    </div>
                </div>

                <div v-if="selectedContractId && auth.token" class="mt-6">
                    <ContractChainPanel
                        :token="auth.token"
                        :contract-id="selectedContractId"
                        @refreshed="load"
                    />
                </div>
            </section>
        </template>
    </AppShell>
</template>
