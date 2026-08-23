<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import EvidenceUpload from '@/components/library/uploads/EvidenceUpload.vue';
import StatusBadge from '@/components/library/badges/StatusBadge.vue';
import LedgerSkeleton from '@/components/library/feedback/LedgerSkeleton.vue';
import {
    createContractDocument,
    fetchContractChain,
    fetchContractDocuments,
    voidContractDocument,
} from '@/api/procurement';
import { buildCacheKey, invalidateListCache, readListCache, writeListCache } from '@/composables/useListCache';
import type {
    ContractStatus,
    ProcurementChain,
    ProcurementDocType,
    ProcurementDocument,
} from '@/types';
import { formatPhpCentavos, pesosToCentavos } from '@/utils/money';

const POST_AWARD: ContractStatus[] = ['AWARDED', 'ACTIVE', 'COMPLETED'];
const DELIVERY_STATUSES: ContractStatus[] = ['AWARDED', 'ACTIVE'];

const props = defineProps<{
    token: string;
    contractId: string;
}>();

const emit = defineEmits<{ refreshed: [] }>();

const chain = ref<ProcurementChain | null>(null);
const documents = ref<ProcurementDocument[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const actionLoading = ref(false);

const chainEditable = computed(() => {
    const status = chain.value?.status;
    return status != null && !POST_AWARD.includes(status);
});

const deliveryEditable = computed(() => {
    const status = chain.value?.status;
    return status != null && DELIVERY_STATUSES.includes(status);
});

const canVoidDoc = computed(() => chainEditable.value || deliveryEditable.value);

const docType = ref<Exclude<ProcurementDocType, 'QUOTATION'>>('RFQ');
const deliveryDocType = ref<'CONTRACT_DOC' | 'DELIVERY_RECEIPT' | 'INSPECTION_ACCEPTANCE'>(
    'CONTRACT_DOC',
);
const docTitle = ref('');
const quoteSupplier = ref('');
const quoteAmountPesos = ref(0);

const DOC_OPTIONS: Exclude<ProcurementDocType, 'QUOTATION' | 'DELIVERY_RECEIPT' | 'INSPECTION_ACCEPTANCE'>[] = [
    'RFQ',
    'ABSTRACT',
    'BAC_RESOLUTION',
    'NOTICE_OF_AWARD',
    'CONTRACT_DOC',
];

const DELIVERY_OPTIONS: Array<'CONTRACT_DOC' | 'DELIVERY_RECEIPT' | 'INSPECTION_ACCEPTANCE'> = [
    'CONTRACT_DOC',
    'DELIVERY_RECEIPT',
    'INSPECTION_ACCEPTANCE',
];

async function load(useCache = true) {
    const key = buildCacheKey({
        scope: 'contract-chain',
        contractId: props.contractId,
    });
    if (useCache) {
        const cached = readListCache<{
            chain: ProcurementChain;
            documents: ProcurementDocument[];
        }>(key);
        if (cached) {
            chain.value = cached.chain;
            documents.value = cached.documents;
            loading.value = false;
            return;
        }
    }
    loading.value = true;
    error.value = null;
    try {
        const [c, docs] = await Promise.all([
            fetchContractChain(props.token, props.contractId),
            fetchContractDocuments(props.token, props.contractId),
        ]);
        chain.value = c;
        documents.value = docs;
        writeListCache(key, { chain: c, documents: docs });
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to load chain';
    } finally {
        loading.value = false;
    }
}

function bustChainCache() {
    invalidateListCache('scope=contract-chain');
}

async function onFileUploaded(payload: {
    fileKey: string;
    fileName: string;
    mimeType: string;
    fileSizeBytes: number;
}) {
    actionLoading.value = true;
    error.value = null;
    try {
        const type = deliveryEditable.value ? deliveryDocType.value : docType.value;
        await createContractDocument(props.token, props.contractId, {
            docType: type,
            title: docTitle.value || `${type} upload`,
            fileKey: payload.fileKey,
            fileName: payload.fileName,
            mimeType: payload.mimeType,
            fileSizeBytes: payload.fileSizeBytes,
        });
        docTitle.value = '';
        bustChainCache();
        await load(false);
        emit('refreshed');
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Attach failed';
    } finally {
        actionLoading.value = false;
    }
}

async function addQuotation() {
    actionLoading.value = true;
    error.value = null;
    try {
        await createContractDocument(props.token, props.contractId, {
            docType: 'QUOTATION',
            title: `Quotation — ${quoteSupplier.value}`,
            quotationSupplierName: quoteSupplier.value,
            quotationAmountCentavos: pesosToCentavos(quoteAmountPesos.value),
        });
        quoteSupplier.value = '';
        quoteAmountPesos.value = 0;
        bustChainCache();
        await load(false);
        emit('refreshed');
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Quotation failed';
    } finally {
        actionLoading.value = false;
    }
}

async function voidDoc(docId: string) {
    actionLoading.value = true;
    error.value = null;
    try {
        await voidContractDocument(props.token, props.contractId, docId, 'Voided by barangay user');
        bustChainCache();
        await load(false);
        emit('refreshed');
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Void failed';
    } finally {
        actionLoading.value = false;
    }
}

watch(
    () => props.contractId,
    () => {
        void load();
    },
);

onMounted(load);
</script>

<template>
    <div class="space-y-4">
        <LedgerSkeleton v-if="loading && !chain" :rows="4" />
        <div
            v-else-if="error"
            class="border border-status-danger/40 bg-status-danger/5 px-3 py-2 text-sm text-status-danger"
            style="border-radius: 2px"
        >
            {{ error }}
        </div>
        <template v-else-if="chain">
            <div class="gl-panel overflow-hidden">
                <div class="border-b border-rule px-4 py-3 sm:px-5">
                    <p class="font-display text-base font-semibold text-ink">Award document chain</p>
                    <p class="text-xs text-ink-muted">
                        Next: {{ chain.nextStatus ?? '—' }}
                        <span v-if="!chain.canAdvance && chain.nextStep.missingLabels.length">
                            · need {{ chain.nextStep.missingLabels.join(', ') }}
                        </span>
                        <span v-else-if="chain.canAdvance"> · ready to advance</span>
                    </p>
                </div>
                <div
                    v-for="item in chain.checklist"
                    :key="item.docType"
                    class="gl-ledger-row pl-5"
                >
                    <span
                        class="gl-rail"
                        :class="item.satisfied ? 'gl-rail-ok' : 'gl-rail-warn'"
                        aria-hidden="true"
                    />
                    <div class="flex min-w-0 flex-1 items-center justify-between gap-3 sm:col-span-2">
                        <div>
                            <p class="text-sm font-medium text-ink">{{ item.label }}</p>
                            <p class="text-xs text-ink-muted">
                                {{ item.present }} / {{ item.minCount }}
                            </p>
                        </div>
                        <StatusBadge
                            :status="item.satisfied ? 'approved' : 'pending'"
                            :label="item.satisfied ? 'Met' : 'Needed'"
                        />
                    </div>
                </div>
            </div>

            <template v-if="chainEditable">
                <div class="gl-panel space-y-3 px-4 py-4 sm:px-5">
                    <p class="font-display text-sm font-semibold text-ink">Attach document</p>
                    <label class="block text-sm">
                        <span class="text-ink-muted">Type</span>
                        <select
                            v-model="docType"
                            class="mt-1 w-full border border-rule bg-surface px-3 py-2 text-ink"
                            style="border-radius: 2px"
                        >
                            <option v-for="opt in DOC_OPTIONS" :key="opt" :value="opt">{{ opt }}</option>
                        </select>
                    </label>
                    <label class="block text-sm">
                        <span class="text-ink-muted">Title</span>
                        <input
                            v-model="docTitle"
                            class="mt-1 w-full border border-rule bg-surface px-3 py-2 text-ink"
                            style="border-radius: 2px"
                            placeholder="Optional title"
                        />
                    </label>
                    <EvidenceUpload
                        :token="token"
                        entity-type="procurement"
                        :loading="actionLoading"
                        @submit="onFileUploaded"
                    />
                </div>

                <div class="gl-panel space-y-3 px-4 py-4 sm:px-5">
                    <p class="font-display text-sm font-semibold text-ink">
                        Add quotation (min {{ chain.minQuotations }})
                    </p>
                    <div class="grid gap-3 sm:grid-cols-2">
                        <label class="block text-sm">
                            <span class="text-ink-muted">Supplier</span>
                            <input
                                v-model="quoteSupplier"
                                class="mt-1 w-full border border-rule bg-surface px-3 py-2 text-ink"
                                style="border-radius: 2px"
                            />
                        </label>
                        <label class="block text-sm">
                            <span class="text-ink-muted">Amount (PHP)</span>
                            <input
                                v-model.number="quoteAmountPesos"
                                type="number"
                                min="1"
                                step="0.01"
                                class="mt-1 w-full border border-rule bg-surface px-3 py-2 text-ink"
                                style="border-radius: 2px"
                            />
                        </label>
                    </div>
                    <button
                        type="button"
                        class="gl-btn-primary"
                        :disabled="actionLoading || !quoteSupplier || quoteAmountPesos <= 0"
                        @click="addQuotation"
                    >
                        Save quotation
                    </button>
                </div>
            </template>

            <div
                v-else-if="deliveryEditable"
                class="gl-panel space-y-3 px-4 py-4 sm:px-5"
            >
                <p class="font-display text-sm font-semibold text-ink">
                    Delivery &amp; acceptance
                </p>
                <p class="text-xs text-ink-muted">
                    Attach signed contract, delivery receipt, and inspection/acceptance to
                    advance toward completion.
                </p>
                <label class="block text-sm">
                    <span class="text-ink-muted">Type</span>
                    <select
                        v-model="deliveryDocType"
                        class="mt-1 w-full border border-rule bg-surface px-3 py-2 text-ink"
                        style="border-radius: 2px"
                    >
                        <option v-for="opt in DELIVERY_OPTIONS" :key="opt" :value="opt">
                            {{ opt }}
                        </option>
                    </select>
                </label>
                <label class="block text-sm">
                    <span class="text-ink-muted">Title</span>
                    <input
                        v-model="docTitle"
                        class="mt-1 w-full border border-rule bg-surface px-3 py-2 text-ink"
                        style="border-radius: 2px"
                        placeholder="Optional title"
                    />
                </label>
                <EvidenceUpload
                    :token="token"
                    entity-type="procurement"
                    :loading="actionLoading"
                    @submit="onFileUploaded"
                />
            </div>
            <p v-else class="text-xs text-ink-muted">
                Document chain is closed for completed contracts.
            </p>

            <div class="gl-panel overflow-hidden">
                <div class="border-b border-rule px-4 py-3 sm:px-5">
                    <p class="font-display text-sm font-semibold text-ink">Documents on file</p>
                </div>
                <div
                    v-if="documents.length === 0"
                    class="px-4 py-4 text-sm text-ink-muted sm:px-5"
                >
                    None yet.
                </div>
                <div
                    v-for="doc in documents"
                    :key="doc.id"
                    class="gl-ledger-row pl-5"
                >
                    <span
                        class="gl-rail"
                        :class="doc.voidedAt ? '' : 'gl-rail-ok'"
                        aria-hidden="true"
                    />
                    <div class="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-2 sm:col-span-2">
                        <div class="min-w-0">
                            <p class="text-sm font-medium text-ink">
                                {{ doc.docType }} — {{ doc.title }}
                                <span v-if="doc.voidedAt" class="text-status-danger"> (voided)</span>
                            </p>
                            <p class="text-xs text-ink-muted">
                                v{{ doc.version }}
                                <template v-if="doc.quotationSupplierName">
                                    · {{ doc.quotationSupplierName }}
                                    · {{ formatPhpCentavos(doc.quotationAmountCentavos ?? '0') }}
                                </template>
                                <template v-else-if="doc.fileName"> · {{ doc.fileName }}</template>
                            </p>
                        </div>
                        <button
                            v-if="canVoidDoc && !doc.voidedAt && (chainEditable || ['CONTRACT_DOC','DELIVERY_RECEIPT','INSPECTION_ACCEPTANCE'].includes(doc.docType))"
                            type="button"
                            class="gl-btn-warn"
                            :disabled="actionLoading"
                            @click="voidDoc(doc.id)"
                        >
                            Void
                        </button>
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>
