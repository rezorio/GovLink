<script setup lang="ts">
import { computed } from 'vue';
import { X } from 'lucide-vue-next';
import StatusBadge from '@/components/library/badges/StatusBadge.vue';
import LedgerNotice from '@/components/library/feedback/LedgerNotice.vue';
import type { BarangaySummary, ComplianceMatrix } from '@/types';
import { formatDueDate } from '@/utils/assignment-status';
import {
    cellsForBarangay,
    groupCellsByCategory,
} from '@/utils/barangay-compliance-summary';
import {
    complianceStatusLabel,
    complianceStatusToVariant,
} from '@/utils/compliance-status';

const props = defineProps<{
    open: boolean;
    barangay: BarangaySummary | null;
    matrix: ComplianceMatrix | null;
}>();

defineEmits<{
    close: [];
}>();

const rows = computed(() =>
    props.barangay ? cellsForBarangay(props.matrix, props.barangay.id) : [],
);

const groups = computed(() => groupCellsByCategory(rows.value));

function categoryLabel(raw: string) {
    const map: Record<string, string> = {
        ADMINISTRATIVE: 'Administrative',
        SOCIAL: 'Social',
        YOUTH: 'SK / Youth',
        MUNICIPAL_SUPERVISION: 'Municipal supervision',
    };
    return map[raw] ?? raw;
}

function railClass(status: string) {
    const variant = complianceStatusToVariant(status as never);
    if (variant === 'approved') return 'gl-rail-ok';
    if (variant === 'overdue') return 'gl-rail-danger';
    return 'gl-rail-warn';
}
</script>

<template>
    <Teleport to="body">
        <div v-if="open" class="fixed inset-0 z-50 flex justify-end">
            <div class="absolute inset-0 bg-ink/40" @click="$emit('close')" />
            <aside
                class="relative flex h-full w-full max-w-lg flex-col border-l border-rule bg-surface shadow-lg"
                role="dialog"
                aria-modal="true"
                :aria-label="barangay ? `${barangay.name} compliance` : 'Barangay compliance'"
            >
                <div class="flex items-start justify-between gap-3 border-b border-rule bg-brand-soft/30 px-4 py-4">
                    <div class="min-w-0">
                        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-brand">
                            Barangay compliance
                        </p>
                        <h2 class="mt-1 font-display text-lg font-semibold text-ink">
                            {{ barangay?.name ?? 'Barangay' }}
                        </h2>
                        <p class="mt-1 text-sm text-ink-muted">
                            Shared municipal catalog — statuses for this barangay only
                        </p>
                    </div>
                    <button
                        type="button"
                        class="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center text-ink-muted hover:bg-brand-soft/50 hover:text-ink"
                        style="border-radius: 2px"
                        aria-label="Close"
                        @click="$emit('close')"
                    >
                        <X class="h-5 w-5" />
                    </button>
                </div>

                <div class="flex-1 overflow-y-auto">
                    <LedgerNotice
                        v-if="rows.length === 0"
                        title="No period instances yet"
                        description="Open current periods from the compliance page to generate obligations for all barangays."
                    />

                    <section
                        v-for="group in groups"
                        :key="group.category"
                        class="border-b border-rule"
                    >
                        <div class="bg-brand-soft/25 px-4 py-2.5">
                            <h3 class="font-display text-sm font-semibold text-ink">
                                {{ categoryLabel(group.category) }}
                            </h3>
                            <p class="text-xs text-ink-muted">
                                {{ group.items.length }} requirement{{
                                    group.items.length === 1 ? '' : 's'
                                }}
                            </p>
                        </div>
                        <ul>
                            <li
                                v-for="row in group.items"
                                :key="row.cell.id"
                                class="gl-ledger-row pl-5"
                            >
                                <span
                                    class="gl-rail"
                                    :class="railClass(row.cell.status)"
                                    aria-hidden="true"
                                />
                                <div
                                    class="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-3 sm:col-span-3"
                                >
                                    <div class="min-w-0">
                                        <p class="font-display text-sm font-semibold text-ink">
                                            {{ row.requirement.code }} —
                                            {{ row.requirement.title }}
                                        </p>
                                        <p class="mt-0.5 text-xs text-ink-muted">
                                            {{ row.cell.periodLabel }} · due
                                            {{ formatDueDate(row.cell.dueDate) }}
                                        </p>
                                    </div>
                                    <StatusBadge
                                        :status="complianceStatusToVariant(row.cell.status)"
                                        :label="complianceStatusLabel(row.cell.status)"
                                    />
                                </div>
                            </li>
                        </ul>
                    </section>
                </div>
            </aside>
        </div>
    </Teleport>
</template>
