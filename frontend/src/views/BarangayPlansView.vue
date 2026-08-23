<script setup lang="ts">
import { onMounted, ref } from 'vue';
import AppShell from '@/components/library/layout/AppShell.vue';
import StatusBadge from '@/components/library/badges/StatusBadge.vue';
import { fetchPlans, submitPlan, updatePlanDraft } from '@/api/plans';
import { useAuthStore } from '@/stores/auth';
import type { PlanSubmission, PlanSubmissionStatus } from '@/types';
import { formatDueDate, daysRemaining } from '@/utils/assignment-status';

const auth = useAuthStore();
const plans = ref<PlanSubmission[]>([]);
const loading = ref(true);
const actionLoading = ref(false);
const error = ref<string | null>(null);
const editingId = ref<string | null>(null);
const notes = ref('');

function statusVariant(status: PlanSubmissionStatus) {
    if (status === 'ACCEPTED') return 'approved' as const;
    if (status === 'RETURNED') return 'overdue' as const;
    return 'pending' as const;
}

function canEdit(status: PlanSubmissionStatus) {
    return status === 'NOT_STARTED' || status === 'DRAFT' || status === 'RETURNED';
}

function canSubmit(status: PlanSubmissionStatus) {
    return status === 'NOT_STARTED' || status === 'DRAFT' || status === 'RETURNED';
}

async function load() {
    if (!auth.token) return;
    loading.value = true;
    error.value = null;
    try {
        plans.value = await fetchPlans(auth.token);
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to load plans';
    } finally {
        loading.value = false;
    }
}

async function saveDraft(id: string) {
    if (!auth.token) return;
    actionLoading.value = true;
    try {
        await updatePlanDraft(auth.token, id, { notes: notes.value });
        editingId.value = null;
        await load();
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Save failed';
    } finally {
        actionLoading.value = false;
    }
}

async function submit(id: string) {
    if (!auth.token) return;
    actionLoading.value = true;
    try {
        if (editingId.value === id) {
            await updatePlanDraft(auth.token, id, { notes: notes.value });
        }
        await submitPlan(auth.token, id);
        editingId.value = null;
        await load();
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Submit failed';
    } finally {
        actionLoading.value = false;
    }
}

function startEdit(row: PlanSubmission) {
    editingId.value = row.id;
    notes.value = row.notes ?? '';
}

onMounted(load);
</script>

<template>
    <AppShell
        title="BDP & AIP"
        :subtitle="auth.user?.barangay?.name ?? 'Barangay plans'"
    >
        <p class="mb-6 max-w-xl text-sm text-ink-muted">
            Prepare and submit your Barangay Development Plan and Annual Investment Program to the
            municipal Local Development Council.
        </p>

        <p v-if="error" class="mb-4 text-sm text-status-danger">{{ error }}</p>
        <p v-if="loading" class="text-sm text-ink-muted">Loading plans…</p>

        <div v-else class="gl-panel overflow-hidden">
            <p v-if="plans.length === 0" class="px-4 py-10 text-center text-sm text-ink-muted">
                No plan periods open yet. Ask the municipality to open current BDP/AIP periods.
            </p>
            <article
                v-for="row in plans"
                :key="row.id"
                class="gl-ledger-row pl-5"
            >
                <span
                    class="gl-rail"
                    :class="{
                        'gl-rail-ok': row.status === 'ACCEPTED',
                        'gl-rail-danger': row.status === 'RETURNED',
                        'gl-rail-warn': row.status !== 'ACCEPTED' && row.status !== 'RETURNED',
                    }"
                    aria-hidden="true"
                />
                <div class="sm:col-span-2">
                <div class="flex flex-wrap items-start justify-between gap-3">
                    <div class="min-w-0">
                        <StatusBadge :status="statusVariant(row.status)" :label="row.status.replace(/_/g, ' ')" />
                        <h2 class="mt-2 font-display text-lg font-semibold text-ink">
                            {{ row.planType }} — {{ row.title ?? row.planType }}
                        </h2>
                        <p class="mt-1 text-xs text-ink-muted">
                            Period {{ row.periodLabel }} · Due {{ formatDueDate(row.dueDate) }}
                            ({{ daysRemaining(row.dueDate) }}d)
                        </p>
                        <p
                            v-if="row.status === 'RETURNED' && row.returnReason"
                            class="mt-3 border-l-2 border-status-danger bg-status-danger/5 px-3 py-2 text-sm text-status-danger"
                        >
                            Returned: {{ row.returnReason }}
                        </p>
                        <p v-else-if="row.notes" class="mt-2 text-sm text-ink-muted">{{ row.notes }}</p>
                    </div>
                    <div class="flex flex-wrap gap-2">
                        <button
                            v-if="canEdit(row.status)"
                            type="button"
                            class="gl-btn-secondary"
                            @click="startEdit(row)"
                        >
                            Edit notes
                        </button>
                        <button
                            v-if="canSubmit(row.status)"
                            type="button"
                            class="gl-btn-primary"
                            :disabled="actionLoading"
                            @click="submit(row.id)"
                        >
                            Submit to LDC
                        </button>
                    </div>
                </div>

                <div v-if="editingId === row.id" class="mt-4 space-y-3">
                    <textarea
                        v-model="notes"
                        rows="3"
                        class="w-full border border-rule bg-paper px-3 py-2 text-sm"
                        style="border-radius: 2px"
                        placeholder="Notes for municipal LDC (optional)"
                    />
                    <button
                        type="button"
                        class="gl-btn-secondary"
                        :disabled="actionLoading"
                        @click="saveDraft(row.id)"
                    >
                        Save draft
                    </button>
                </div>
                </div>
            </article>
        </div>
    </AppShell>
</template>
