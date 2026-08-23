<script setup lang="ts">
import { computed, ref } from 'vue';
import { MapPin, X } from 'lucide-vue-next';
import type { TaskAssignment } from '@/types';
import { daysRemaining, formatDueDate, statusLabel, statusToVariant } from '@/utils/assignment-status';
import StatusBadge from '@/components/library/badges/StatusBadge.vue';

const props = defineProps<{
    assignment: TaskAssignment | null;
    open: boolean;
    loading?: boolean;
}>();

const emit = defineEmits<{
    close: [];
    review: [payload: { decision: 'ACCEPTED' | 'RETURNED'; comment: string }];
}>();

const comment = ref('');
const decision = ref<'ACCEPTED' | 'RETURNED'>('ACCEPTED');

const latestSubmission = computed(() => props.assignment?.evidenceSubmissions[0] ?? null);

const canReview = computed(() => props.assignment?.status === 'SUBMITTED' && latestSubmission.value);

function submitReview() {
    if (!canReview.value || !latestSubmission.value) {
        return;
    }
    emit('review', {
        decision: decision.value,
        comment: comment.value.trim(),
    });
}

function handleClose() {
    comment.value = '';
    decision.value = 'ACCEPTED';
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
                    <h2 class="font-display text-lg font-semibold text-ink">Review submission</h2>
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

                <div v-if="assignment" class="flex-1 space-y-4 overflow-y-auto px-4 py-4">
                    <div>
                        <StatusBadge
                            :status="statusToVariant(assignment.status)"
                            :label="statusLabel(assignment.status)"
                        />
                        <h3 class="mt-2 font-display text-base font-semibold text-ink">
                            {{ assignment.task.title }}
                        </h3>
                        <p class="text-sm text-ink-muted">{{ assignment.barangay.name }}</p>
                        <p class="mt-1 text-sm text-ink-muted">
                            Due {{ formatDueDate(assignment.task.dueDate) }}
                            ({{ daysRemaining(assignment.task.dueDate) }} days)
                        </p>
                    </div>

                    <div class="border border-rule bg-paper p-3 text-sm text-ink-muted" style="border-radius: 2px">
                        <p class="font-medium text-ink">Legal basis</p>
                        <p class="mt-1">{{ assignment.task.legalBasis }}</p>
                    </div>

                    <div
                        v-if="latestSubmission"
                        class="border border-rule bg-paper p-3"
                        style="border-radius: 2px"
                    >
                        <p class="text-sm font-medium text-ink">Latest submission</p>
                        <p class="text-sm text-ink-muted">{{ latestSubmission.fileName }}</p>
                        <p class="text-xs text-ink-muted">
                            {{ Math.round(latestSubmission.fileSizeBytes / 1024) }} KB ·
                            {{ latestSubmission.mimeType }}
                        </p>

                        <div class="mt-3 border-t border-rule pt-3">
                            <p class="text-xs font-semibold uppercase tracking-wide text-ink">
                                Submitted from
                            </p>
                            <p class="mt-1 flex items-start gap-1.5 text-sm text-ink">
                                <MapPin class="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                                <span>Barangay {{ assignment.barangay.name }}</span>
                            </p>
                            <p
                                v-if="latestSubmission.submittedAt"
                                class="mt-1 text-xs text-ink-muted"
                            >
                                {{ new Date(latestSubmission.submittedAt).toLocaleString() }}
                            </p>
                        </div>
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
                            <label for="review-comment" class="mb-2 block text-sm font-medium text-ink">
                                Comment
                            </label>
                            <textarea
                                id="review-comment"
                                v-model="comment"
                                rows="3"
                                class="w-full border border-rule bg-paper px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                                style="border-radius: 2px"
                                placeholder="Optional feedback for the barangay"
                            />
                        </div>

                        <button
                            type="button"
                            class="gl-btn-primary w-full disabled:opacity-50"
                            :disabled="loading"
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
