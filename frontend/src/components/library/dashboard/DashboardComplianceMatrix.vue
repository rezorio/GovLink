<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import ComplianceHeatCell from '@/components/library/dashboard/ComplianceHeatCell.vue';
import StatusBadge from '@/components/library/badges/StatusBadge.vue';
import LedgerNotice from '@/components/library/feedback/LedgerNotice.vue';
import type {
    ComplianceMatrix,
    ComplianceMatrixCell,
    ComplianceRequirementSummary,
    ComplianceStatus,
} from '@/types';
import { formatDueDate } from '@/utils/assignment-status';
import {
    cellTint,
    complianceStatusLabel,
    complianceStatusToVariant,
} from '@/utils/compliance-status';

const props = withDefaults(
    defineProps<{
        matrix: ComplianceMatrix | null;
        loading: boolean;
        actionLoading: boolean;
        /** hybrid = category tabs + heat + expand; table = classic badge grid */
        variant?: 'hybrid' | 'panels' | 'table';
    }>(),
    { variant: 'hybrid' },
);

defineEmits<{
    downloadPdf: [];
    downloadExcel: [];
    openPeriods: [];
}>();

const isHybrid = computed(() => props.variant === 'hybrid' || props.variant === 'panels');

const cellMap = computed(() => {
    const map = new Map<string, ComplianceMatrixCell>();
    for (const cell of props.matrix?.cells ?? []) {
        map.set(`${cell.barangayId}:${cell.requirementId}`, cell);
    }
    return map;
});

function cellFor(barangayId: string, requirementId: string) {
    return cellMap.value.get(`${barangayId}:${requirementId}`);
}

const categoryTabs = computed(() => {
    const cats = new Set<string>();
    for (const req of props.matrix?.requirements ?? []) {
        const key = (req.category || '').trim() || 'Other';
        cats.add(key);
    }
    return ['All', ...Array.from(cats).sort((a, b) => {
        if (a === 'Other') return 1;
        if (b === 'Other') return -1;
        return a.localeCompare(b);
    })];
});

const activeCategory = ref('All');

watch(
    categoryTabs,
    (tabs) => {
        if (!tabs.includes(activeCategory.value)) {
            activeCategory.value = 'All';
        }
    },
    { immediate: true },
);

const filteredRequirements = computed((): ComplianceRequirementSummary[] => {
    const reqs = props.matrix?.requirements ?? [];
    if (activeCategory.value === 'All') {
        return reqs;
    }
    return reqs.filter((req) => {
        const key = (req.category || '').trim() || 'Other';
        return key === activeCategory.value;
    });
});

const expandedBarangayId = ref<string | null>(null);

watch(activeCategory, () => {
    expandedBarangayId.value = null;
});

function toggleExpand(barangayId: string) {
    expandedBarangayId.value = expandedBarangayId.value === barangayId ? null : barangayId;
}

function railClass(status: ComplianceStatus) {
    const variant = complianceStatusToVariant(status);
    if (variant === 'approved') return 'gl-rail-ok';
    if (variant === 'overdue') return 'gl-rail-danger';
    return 'gl-rail-warn';
}
</script>

<template>
    <section>
        <div class="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
                <h2 class="gl-section-label">Compliance period matrix</h2>
                <p class="mt-1 text-sm text-ink-muted">
                    <template v-if="isHybrid">
                        Dense status grid with full labels — filter by family, expand a barangay for detail
                    </template>
                    <template v-else>
                        Per-barangay due status for current ADM/SOC/SK periods
                    </template>
                </p>
            </div>
            <div class="flex flex-wrap gap-2">
                <button
                    type="button"
                    class="gl-btn-secondary disabled:opacity-50"
                    :disabled="actionLoading"
                    @click="$emit('downloadPdf')"
                >
                    Download PDF
                </button>
                <button
                    type="button"
                    class="gl-btn-secondary disabled:opacity-50"
                    :disabled="actionLoading"
                    @click="$emit('downloadExcel')"
                >
                    Download Excel
                </button>
                <button
                    type="button"
                    class="gl-btn-primary disabled:opacity-50"
                    :disabled="actionLoading"
                    @click="$emit('openPeriods')"
                >
                    Open current periods
                </button>
            </div>
        </div>

        <!-- Hybrid: category tabs + compact status grid + expand -->
        <template v-if="isHybrid && matrix && matrix.cells.length > 0">
            <nav
                class="mb-4 flex flex-wrap gap-5 border-b border-rule/80"
                aria-label="Requirement category"
            >
                <button
                    v-for="tab in categoryTabs"
                    :key="tab"
                    type="button"
                    class="gl-tab"
                    :class="{ 'gl-tab-active': activeCategory === tab }"
                    @click="activeCategory = tab"
                >
                    {{ tab }}
                </button>
            </nav>

            <div class="gl-panel overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="gl-heat-table min-w-full border-collapse text-left">
                        <thead class="bg-brand-soft/40 text-ink-muted">
                            <tr>
                                <th
                                    class="sticky left-0 z-10 min-w-[9rem] bg-brand-soft/80 px-3 py-2 text-left text-sm font-semibold normal-case tracking-normal text-ink"
                                >
                                    Barangay
                                </th>
                                <th
                                    v-for="req in filteredRequirements"
                                    :key="req.id"
                                    class="min-w-[5.5rem] text-center"
                                    :title="req.title"
                                >
                                    <span class="gl-heat-col-head">{{ req.code }}</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <template v-for="brgy in matrix.barangays" :key="brgy.id">
                                <tr
                                    class="cursor-pointer border-t border-rule transition-colors hover:bg-brand-soft/25"
                                    :class="
                                        expandedBarangayId === brgy.id ? 'bg-brand-soft/35' : ''
                                    "
                                    @click="toggleExpand(brgy.id)"
                                >
                                    <td
                                        class="sticky left-0 z-10 bg-surface px-3 py-1.5 text-sm font-semibold text-ink"
                                        :class="
                                            expandedBarangayId === brgy.id
                                                ? 'bg-brand-soft/50'
                                                : ''
                                        "
                                    >
                                        <span class="inline-flex items-center gap-1.5">
                                            <span
                                                class="text-xs text-ink-muted"
                                                aria-hidden="true"
                                            >
                                                {{ expandedBarangayId === brgy.id ? '▾' : '▸' }}
                                            </span>
                                            {{ brgy.name }}
                                        </span>
                                    </td>
                                    <td
                                        v-for="req in filteredRequirements"
                                        :key="`${brgy.id}-${req.id}`"
                                        class="text-center"
                                    >
                                        <ComplianceHeatCell
                                            :status="cellFor(brgy.id, req.id)?.status"
                                            :code="req.code"
                                        />
                                    </td>
                                </tr>
                                <tr
                                    v-if="expandedBarangayId === brgy.id"
                                    class="border-t border-rule bg-paper/40"
                                >
                                    <td
                                        :colspan="filteredRequirements.length + 1"
                                        class="p-0"
                                    >
                                        <ul>
                                            <li
                                                v-for="req in filteredRequirements"
                                                :key="`detail-${brgy.id}-${req.id}`"
                                                class="gl-ledger-row pl-5"
                                            >
                                                <span
                                                    v-if="cellFor(brgy.id, req.id)"
                                                    class="gl-rail"
                                                    :class="
                                                        railClass(
                                                            cellFor(brgy.id, req.id)!.status,
                                                        )
                                                    "
                                                    aria-hidden="true"
                                                />
                                                <div
                                                    class="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-3 sm:col-span-3"
                                                >
                                                    <div class="min-w-0">
                                                        <p
                                                            class="font-display text-sm font-semibold text-ink"
                                                        >
                                                            {{ req.code }} — {{ req.title }}
                                                        </p>
                                                        <p
                                                            v-if="cellFor(brgy.id, req.id)"
                                                            class="mt-0.5 text-xs text-ink-muted"
                                                        >
                                                            {{
                                                                cellFor(brgy.id, req.id)!
                                                                    .periodLabel
                                                            }}
                                                            · due
                                                            {{
                                                                formatDueDate(
                                                                    cellFor(brgy.id, req.id)!
                                                                        .dueDate,
                                                                )
                                                            }}
                                                        </p>
                                                        <p
                                                            v-else
                                                            class="mt-0.5 text-xs text-ink-muted"
                                                        >
                                                            No period instance
                                                        </p>
                                                    </div>
                                                    <StatusBadge
                                                        v-if="cellFor(brgy.id, req.id)"
                                                        :status="
                                                            complianceStatusToVariant(
                                                                cellFor(brgy.id, req.id)!.status,
                                                            )
                                                        "
                                                        :label="
                                                            complianceStatusLabel(
                                                                cellFor(brgy.id, req.id)!.status,
                                                            )
                                                        "
                                                    />
                                                    <span v-else class="text-xs text-ink-muted">
                                                        —
                                                    </span>
                                                </div>
                                            </li>
                                        </ul>
                                    </td>
                                </tr>
                            </template>
                        </tbody>
                    </table>
                </div>
            </div>
        </template>

        <!-- Classic table variant (stacked layout toggle) -->
        <div
            v-else-if="variant === 'table' && matrix && matrix.cells.length > 0"
            class="gl-panel overflow-x-auto"
        >
            <table class="min-w-full border-collapse text-left text-xs">
                <thead class="bg-brand-soft/50 text-[11px] uppercase tracking-wide text-ink-muted">
                    <tr>
                        <th class="sticky left-0 z-10 bg-brand-soft/80 px-3 py-3 text-ink">
                            Barangay
                        </th>
                        <th
                            v-for="req in matrix.requirements"
                            :key="req.id"
                            class="min-w-[5.5rem] px-2 py-3 text-center"
                            :title="req.title"
                        >
                            {{ req.code }}
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr
                        v-for="brgy in matrix.barangays"
                        :key="brgy.id"
                        class="border-t border-rule"
                    >
                        <td class="sticky left-0 z-10 bg-surface px-3 py-2 font-medium text-ink">
                            {{ brgy.name }}
                        </td>
                        <td
                            v-for="req in matrix.requirements"
                            :key="`${brgy.id}-${req.id}`"
                            class="px-1 py-1 text-center"
                            :class="
                                cellFor(brgy.id, req.id)
                                    ? cellTint(cellFor(brgy.id, req.id)!.status)
                                    : 'bg-paper/60'
                            "
                        >
                            <StatusBadge
                                v-if="cellFor(brgy.id, req.id)"
                                :status="
                                    complianceStatusToVariant(
                                        cellFor(brgy.id, req.id)!.status as ComplianceStatus,
                                    )
                                "
                                :label="
                                    complianceStatusLabel(
                                        cellFor(brgy.id, req.id)!.status as ComplianceStatus,
                                    )
                                "
                            />
                            <span v-else class="text-rule">—</span>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div v-else-if="!loading" class="gl-panel overflow-hidden">
            <LedgerNotice
                title="No compliance instances yet"
                description="Open current periods to generate ADM/SOC/SK instances for all barangays."
            />
        </div>
    </section>
</template>
