<script setup lang="ts">
import { computed, ref } from 'vue';
import StatusBadge from '@/components/library/badges/StatusBadge.vue';
import LedgerNotice from '@/components/library/feedback/LedgerNotice.vue';
import type { ComplianceInstance } from '@/types';
import {
    complianceStatusLabel,
    complianceStatusToVariant,
} from '@/utils/compliance-status';

const props = withDefaults(
    defineProps<{
        items: ComplianceInstance[];
        previewLimit?: number;
    }>(),
    { previewLimit: 4 },
);

defineEmits<{
    review: [row: ComplianceInstance];
}>();

const expanded = ref(false);

const visibleItems = computed(() =>
    expanded.value ? props.items : props.items.slice(0, props.previewLimit),
);

const hiddenCount = computed(() =>
    Math.max(0, props.items.length - props.previewLimit),
);
</script>

<template>
    <div class="gl-panel overflow-hidden">
        <div class="border-b border-rule bg-status-warn/5 px-4 py-3">
            <div class="flex flex-wrap items-end justify-between gap-2">
                <div>
                    <h3 class="font-display text-base font-semibold text-ink">Needs attention</h3>
                    <p class="mt-1 text-xs text-ink-muted">
                        Submitted, under review, or returned catalog items
                    </p>
                </div>
                <p v-if="items.length" class="text-xs font-semibold text-ink-muted">
                    {{ items.length }} in queue
                </p>
            </div>
        </div>

        <LedgerNotice
            v-if="items.length === 0"
            title="Queue is clear"
            description="When barangays submit catalog evidence, reviews will appear here first."
            variant="info"
        />

        <ul v-else>
            <li
                v-for="(item, index) in visibleItems"
                :key="item.id"
                class="gl-ledger-row pl-5"
                :style="{ animationDelay: `${Math.min(index, 8) * 40}ms` }"
            >
                <span
                    class="gl-rail"
                    :class="{
                        'gl-rail-ok': complianceStatusToVariant(item.status) === 'approved',
                        'gl-rail-danger': complianceStatusToVariant(item.status) === 'overdue',
                        'gl-rail-warn': complianceStatusToVariant(item.status) === 'pending',
                    }"
                    aria-hidden="true"
                />
                <div class="flex flex-wrap items-center justify-between gap-2 sm:col-span-3">
                    <div class="min-w-0">
                        <StatusBadge
                            :status="complianceStatusToVariant(item.status)"
                            :label="complianceStatusLabel(item.status)"
                        />
                        <p class="mt-1 font-display text-base font-semibold text-ink">
                            {{ item.barangay.name }} · {{ item.requirement.code }}
                        </p>
                        <p class="text-xs text-ink-muted">{{ item.requirement.title }}</p>
                    </div>
                    <button
                        v-if="item.status === 'SUBMITTED' || item.status === 'UNDER_REVIEW'"
                        type="button"
                        class="gl-btn-secondary"
                        @click="$emit('review', item)"
                    >
                        Review
                    </button>
                </div>
            </li>
        </ul>

        <div
            v-if="hiddenCount > 0"
            class="border-t border-rule px-4 py-3"
        >
            <button
                type="button"
                class="gl-btn-secondary"
                @click="expanded = !expanded"
            >
                {{ expanded ? 'Show fewer' : `Show ${hiddenCount} more` }}
            </button>
        </div>
    </div>
</template>
