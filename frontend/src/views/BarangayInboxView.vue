<script setup lang="ts">
import { onMounted, ref } from 'vue';
import AppShell from '@/components/library/layout/AppShell.vue';
import StatusBadge from '@/components/library/badges/StatusBadge.vue';
import EvidenceUpload from '@/components/library/uploads/EvidenceUpload.vue';
import { acknowledgeAssignment, fetchAssignments, submitEvidence } from '@/api/assignments';
import { useAuthStore } from '@/stores/auth';
import type { TaskAssignment } from '@/types';
import { daysRemaining, formatDueDate, statusLabel, statusToVariant } from '@/utils/assignment-status';

const auth = useAuthStore();

const assignments = ref<TaskAssignment[]>([]);
const loading = ref(true);
const actionLoading = ref(false);
const error = ref<string | null>(null);
const expandedId = ref<string | null>(null);

async function loadInbox() {
    if (!auth.token) {
        return;
    }
    loading.value = true;
    error.value = null;
    try {
        assignments.value = await fetchAssignments(auth.token);
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to load inbox';
    } finally {
        loading.value = false;
    }
}

async function acknowledge(id: string) {
    if (!auth.token) {
        return;
    }
    actionLoading.value = true;
    try {
        await acknowledgeAssignment(auth.token, id);
        await loadInbox();
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Acknowledge failed';
    } finally {
        actionLoading.value = false;
    }
}

async function handleSubmit(
    id: string,
    payload: { fileKey: string; fileName: string; mimeType: string; fileSizeBytes: number },
) {
    if (!auth.token) {
        return;
    }
    actionLoading.value = true;
    try {
        await submitEvidence(auth.token, id, payload);
        expandedId.value = null;
        await loadInbox();
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Submit failed';
    } finally {
        actionLoading.value = false;
    }
}

function canAcknowledge(status: string) {
    return status === 'PENDING_ACK';
}

function canSubmit(status: string) {
    return ['ACKNOWLEDGED', 'IN_PROGRESS', 'RETURNED'].includes(status);
}

onMounted(loadInbox);
</script>

<template>
    <AppShell
        title="Barangay task inbox"
        :subtitle="auth.user?.barangay?.name ?? auth.user?.full_name"
    >
        <p v-if="error" class="mb-4 text-sm text-rose-600">{{ error }}</p>
        <p v-if="loading" class="text-sm text-slate-500">Loading tasks…</p>

        <div v-else class="space-y-3">
            <article
                v-for="row in assignments"
                :key="row.id"
                class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
                <div class="flex flex-wrap items-start justify-between gap-3">
                    <div class="min-w-0 flex-1">
                        <StatusBadge :status="statusToVariant(row.status)" :label="statusLabel(row.status)" />
                        <h2 class="mt-2 text-base font-semibold text-slate-900">{{ row.task.title }}</h2>
                        <p class="mt-1 text-sm text-slate-600">{{ row.task.description }}</p>
                        <p class="mt-2 text-xs text-slate-500">
                            Due {{ formatDueDate(row.task.dueDate) }} ·
                            {{ daysRemaining(row.task.dueDate) }} days remaining
                        </p>
                        <p class="mt-1 text-xs text-slate-500">{{ row.task.legalBasis }}</p>
                    </div>
                </div>

                <div class="mt-4 flex flex-wrap gap-2">
                    <button
                        v-if="canAcknowledge(row.status)"
                        type="button"
                        class="min-h-11 rounded-lg bg-amber-500 px-4 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
                        :disabled="actionLoading"
                        @click="acknowledge(row.id)"
                    >
                        Acknowledge
                    </button>
                    <button
                        v-if="canSubmit(row.status)"
                        type="button"
                        class="min-h-11 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        @click="expandedId = expandedId === row.id ? null : row.id"
                    >
                        {{ expandedId === row.id ? 'Hide upload' : 'Submit proof' }}
                    </button>
                </div>

                <div v-if="expandedId === row.id && auth.user?.municipality_id && auth.user?.barangay_id" class="mt-4">
                    <EvidenceUpload
                        :municipality-id="auth.user.municipality_id"
                        :barangay-id="auth.user.barangay_id"
                        :loading="actionLoading"
                        @submit="(payload) => handleSubmit(row.id, payload)"
                    />
                </div>
            </article>

            <p v-if="assignments.length === 0" class="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
                No tasks assigned to your barangay yet.
            </p>
        </div>
    </AppShell>
</template>
