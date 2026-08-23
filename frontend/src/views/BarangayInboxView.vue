<script setup lang="ts">
import { onMounted, ref } from 'vue';
import AppShell from '@/components/library/layout/AppShell.vue';
import StatusBadge from '@/components/library/badges/StatusBadge.vue';
import EvidenceUpload from '@/components/library/uploads/EvidenceUpload.vue';
import OfflineUploadBanner from '@/components/library/uploads/OfflineUploadBanner.vue';
import { acknowledgeAssignment, fetchAssignments, submitEvidence } from '@/api/assignments';
import { useI18n } from '@/composables/useI18n';
import { useAuthStore } from '@/stores/auth';
import type { TaskAssignment } from '@/types';
import { daysRemaining, formatDueDate, statusToVariant } from '@/utils/assignment-status';

const auth = useAuthStore();
const { t, assignmentStatus } = useI18n();

const assignments = ref<TaskAssignment[]>([]);
const loading = ref(true);
const actionLoading = ref(false);
const error = ref<string | null>(null);
const expandedId = ref<string | null>(null);
const offlineBannerRef = ref<InstanceType<typeof OfflineUploadBanner> | null>(null);

async function loadInbox() {
    if (!auth.token) {
        return;
    }
    loading.value = true;
    error.value = null;
    try {
        assignments.value = await fetchAssignments(auth.token);
    } catch (err) {
        error.value = err instanceof Error ? err.message : t('inbox.loadFailed');
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
        error.value = err instanceof Error ? err.message : t('inbox.acknowledgeFailed');
    } finally {
        actionLoading.value = false;
    }
}

async function handleSubmit(
    id: string,
    payload: {
        fileKey: string;
        fileName: string;
        mimeType: string;
        fileSizeBytes: number;
    },
) {
    if (!auth.token) {
        return;
    }
    actionLoading.value = true;
    try {
        await submitEvidence(auth.token, id, payload);
        expandedId.value = null;
        await loadInbox();
        await offlineBannerRef.value?.refreshCount?.();
    } catch (err) {
        error.value = err instanceof Error ? err.message : t('inbox.submitFailed');
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
        :title="t('inbox.title')"
        :subtitle="auth.user?.barangay?.name ?? auth.user?.full_name"
    >
        <p class="mb-6 max-w-xl text-sm leading-relaxed text-ink-muted">
            {{ t('inbox.intro') }}
        </p>

        <OfflineUploadBanner
            v-if="auth.token"
            ref="offlineBannerRef"
            :token="auth.token"
            @synced="loadInbox"
        />

        <p v-if="error" class="mb-4 text-sm text-status-danger">{{ error }}</p>
        <p v-if="loading" class="text-sm text-ink-muted">{{ t('inbox.loadingTasks') }}</p>

        <div v-else class="gl-panel overflow-hidden">
            <p
                v-if="assignments.length === 0"
                class="px-4 py-10 text-center text-sm text-ink-muted"
            >
                {{ t('inbox.empty') }}
            </p>

            <article
                v-for="(row, index) in assignments"
                :key="row.id"
                class="gl-ledger-row pl-5"
                :style="{ animationDelay: `${Math.min(index, 8) * 40}ms` }"
            >
                <span
                    class="gl-rail"
                    :class="{
                        'gl-rail-ok': statusToVariant(row.status) === 'approved',
                        'gl-rail-danger': statusToVariant(row.status) === 'overdue',
                        'gl-rail-warn': statusToVariant(row.status) === 'pending',
                    }"
                    aria-hidden="true"
                />

                <div class="sm:col-span-3">
                    <div class="flex flex-wrap items-start justify-between gap-3">
                        <div class="min-w-0 flex-1">
                            <StatusBadge
                                :status="statusToVariant(row.status)"
                                :label="assignmentStatus(row.status)"
                            />
                            <h2 class="mt-2 font-display text-lg font-semibold text-ink">{{ row.task.title }}</h2>
                            <p class="mt-1 text-sm text-ink-muted">{{ row.task.description }}</p>
                            <p class="mt-2 text-xs text-ink-muted">
                                {{ t('common.due', { date: formatDueDate(row.task.dueDate) }) }} ·
                                {{ t('common.daysRemaining', { days: daysRemaining(row.task.dueDate) }) }}
                            </p>
                            <p class="mt-1 text-xs text-ink-muted">{{ row.task.legalBasis }}</p>
                        </div>
                    </div>

                    <div class="mt-4 flex flex-wrap gap-2">
                        <button
                            v-if="canAcknowledge(row.status)"
                            type="button"
                            class="gl-btn-warn disabled:opacity-50"
                            :disabled="actionLoading"
                            @click="acknowledge(row.id)"
                        >
                            {{ t('inbox.acknowledge') }}
                        </button>
                        <button
                            v-if="canSubmit(row.status)"
                            type="button"
                            class="gl-btn-secondary"
                            @click="expandedId = expandedId === row.id ? null : row.id"
                        >
                            {{ expandedId === row.id ? t('inbox.hideUpload') : t('inbox.submitProof') }}
                        </button>
                    </div>

                    <div v-if="expandedId === row.id && auth.token" class="mt-4">
                        <EvidenceUpload
                            :token="auth.token"
                            :loading="actionLoading"
                            enable-offline-queue
                            :assignment-id="row.id"
                            @submit="(payload) => handleSubmit(row.id, payload)"
                            @queued="offlineBannerRef?.refreshCount?.()"
                        />
                    </div>
                </div>
            </article>
        </div>
    </AppShell>
</template>
