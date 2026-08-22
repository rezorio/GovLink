<script setup lang="ts">
import { computed, ref } from 'vue';
import { X } from 'lucide-vue-next';
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
            <div class="absolute inset-0 bg-slate-900/40" @click="handleClose" />
            <aside
                class="relative flex h-full w-full max-w-md flex-col bg-white shadow-xl"
                role="dialog"
                aria-modal="true"
            >
                <div class="flex items-center justify-between border-b border-slate-200 px-4 py-4">
                    <h2 class="text-lg font-semibold text-slate-900">Review submission</h2>
                    <button
                        type="button"
                        class="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg hover:bg-slate-100"
                        aria-label="Close"
                        @click="handleClose"
                    >
                        <X class="h-5 w-5" />
                    </button>
                </div>

                <div v-if="assignment" class="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                    <div>
                        <StatusBadge
                            :status="statusToVariant(assignment.status)"
                            :label="statusLabel(assignment.status)"
                        />
                        <h3 class="mt-2 text-base font-semibold text-slate-900">{{ assignment.task.title }}</h3>
                        <p class="text-sm text-slate-600">{{ assignment.barangay.name }}</p>
                        <p class="mt-1 text-sm text-slate-500">
                            Due {{ formatDueDate(assignment.task.dueDate) }}
                            ({{ daysRemaining(assignment.task.dueDate) }} days)
                        </p>
                    </div>

                    <div class="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                        <p class="font-medium text-slate-900">Legal basis</p>
                        <p>{{ assignment.task.legalBasis }}</p>
                    </div>

                    <div v-if="latestSubmission" class="rounded-lg border border-slate-200 p-3">
                        <p class="text-sm font-medium text-slate-900">Latest submission</p>
                        <p class="text-sm text-slate-600">{{ latestSubmission.fileName }}</p>
                        <p class="text-xs text-slate-500">
                            {{ Math.round(latestSubmission.fileSizeBytes / 1024) }} KB ·
                            {{ latestSubmission.mimeType }}
                        </p>
                    </div>

                    <template v-if="canReview">
                        <div>
                            <label class="mb-2 block text-sm font-medium text-slate-700">Decision</label>
                            <div class="flex gap-2">
                                <button
                                    type="button"
                                    class="min-h-11 flex-1 rounded-lg border px-3 text-sm font-medium"
                                    :class="
                                        decision === 'ACCEPTED'
                                            ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                                            : 'border-slate-200 bg-white text-slate-700'
                                    "
                                    @click="decision = 'ACCEPTED'"
                                >
                                    Accept
                                </button>
                                <button
                                    type="button"
                                    class="min-h-11 flex-1 rounded-lg border px-3 text-sm font-medium"
                                    :class="
                                        decision === 'RETURNED'
                                            ? 'border-rose-600 bg-rose-50 text-rose-800'
                                            : 'border-slate-200 bg-white text-slate-700'
                                    "
                                    @click="decision = 'RETURNED'"
                                >
                                    Return
                                </button>
                            </div>
                        </div>

                        <div>
                            <label for="review-comment" class="mb-2 block text-sm font-medium text-slate-700">
                                Comment
                            </label>
                            <textarea
                                id="review-comment"
                                v-model="comment"
                                rows="3"
                                class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                                placeholder="Optional feedback for the barangay"
                            />
                        </div>

                        <button
                            type="button"
                            class="min-h-11 w-full rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
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
