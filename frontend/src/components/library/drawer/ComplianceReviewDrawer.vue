<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { X } from 'lucide-vue-next';
import type { ComplianceInstance } from '@/types';
import { daysRemaining, formatDueDate } from '@/utils/assignment-status';
import {
    complianceStatusLabel,
    complianceStatusToVariant,
} from '@/utils/compliance-status';
import StatusBadge from '@/components/library/badges/StatusBadge.vue';

const props = defineProps<{
    instance: ComplianceInstance | null;
    open: boolean;
    loading?: boolean;
}>();

const emit = defineEmits<{
    close: [];
    review: [payload: { decision: 'ACCEPTED' | 'RETURNED'; returnReason?: string; comment: string }];
}>();

const comment = ref('');
const decision = ref<'ACCEPTED' | 'RETURNED'>('ACCEPTED');

const canReview = computed(
    () => props.instance?.status === 'SUBMITTED' || props.instance?.status === 'UNDER_REVIEW',
);

watch(
    () => props.open,
    (open) => {
        if (open) {
            comment.value = '';
            decision.value = 'ACCEPTED';
        }
    },
);

function submitReview() {
    if (!canReview.value) {
        return;
    }
    emit('review', {
        decision: decision.value,
        returnReason: decision.value === 'RETURNED' ? comment.value.trim() : undefined,
        comment: comment.value.trim(),
    });
}

function handleClose() {
    emit('close');
}
</script>

<template>
    <Teleport to="body">
        <div v-if="open" class="fixed inset-0 z-50 flex justify-end">
            <div class="absolute inset-0 bg-ink/40" @click="handleClose" />
            <aside
                class="relative flex h-full w-full max-w-md flex-col border-l border-rule bg-surface shadow-lg"
                role="dialog"
                aria-modal="true"
            >
                <div class="flex items-center justify-between border-b border-rule bg-brand-soft/30 px-4 py-4">
                    <h2 class="font-display text-lg font-semibold text-ink">Review compliance</h2>
                    <button
                        type="button"
                        class="inline-flex min-h-11 min-w-11 items-center justify-center text-ink-muted hover:bg-brand-soft/50 hover:text-ink"
                        style="border-radius: 2px"
                        aria-label="Close"
                        @click="handleClose"
                    >
                        <X class="h-5 w-5" />
                    </button>
                </div>

                <div v-if="instance" class="flex-1 space-y-4 overflow-y-auto px-4 py-4">
                    <div>
                        <StatusBadge
                            :status="complianceStatusToVariant(instance.status)"
                            :label="complianceStatusLabel(instance.status)"
                        />
                        <h3 class="mt-2 font-display text-base font-semibold text-ink">
                            {{ instance.requirement.code }} — {{ instance.requirement.title }}
                        </h3>
                        <p class="text-sm text-ink-muted">{{ instance.barangay.name }}</p>
                        <p class="mt-1 text-sm text-ink-muted">
                            Period {{ instance.periodLabel }} · Due {{ formatDueDate(instance.dueDate) }}
                            ({{ daysRemaining(instance.dueDate) }}d)
                        </p>
                    </div>

                    <template v-if="canReview">
                        <div>
                            <label class="mb-2 block text-sm font-medium text-ink">Decision</label>
                            <div class="flex gap-2">
                                <button
                                    type="button"
                                    class="min-h-11 flex-1 border px-3 text-sm font-medium"
                                    style="border-radius: 2px"
                                    :class="
                                        decision === 'ACCEPTED'
                                            ? 'border-status-ok bg-status-ok/10 text-status-ok'
                                            : 'border-rule bg-paper text-ink-muted'
                                    "
                                    @click="decision = 'ACCEPTED'"
                                >
                                    Accept
                                </button>
                                <button
                                    type="button"
                                    class="min-h-11 flex-1 border px-3 text-sm font-medium"
                                    style="border-radius: 2px"
                                    :class="
                                        decision === 'RETURNED'
                                            ? 'border-status-danger bg-status-danger/10 text-status-danger'
                                            : 'border-rule bg-paper text-ink-muted'
                                    "
                                    @click="decision = 'RETURNED'"
                                >
                                    Return
                                </button>
                            </div>
                        </div>

                        <div>
                            <label for="compliance-review-comment" class="mb-2 block text-sm font-medium text-ink">
                                {{ decision === 'RETURNED' ? 'Return reason (required)' : 'Comment' }}
                            </label>
                            <textarea
                                id="compliance-review-comment"
                                v-model="comment"
                                rows="3"
                                class="w-full border border-rule bg-paper px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                                style="border-radius: 2px"
                                :placeholder="
                                    decision === 'RETURNED'
                                        ? 'Explain what the barangay must correct'
                                        : 'Optional feedback'
                                "
                                :required="decision === 'RETURNED'"
                            />
                        </div>

                        <button
                            type="button"
                            class="gl-btn-primary w-full disabled:opacity-50"
                            :disabled="loading || (decision === 'RETURNED' && comment.trim().length < 3)"
                            @click="submitReview"
                        >
                            Submit review
                        </button>
                    </template>
                </div>
            </aside>
        </div>
    </Teleport>
</template>
