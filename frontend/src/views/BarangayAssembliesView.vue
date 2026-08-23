<script setup lang="ts">
import { onMounted, ref } from 'vue';
import AppShell from '@/components/library/layout/AppShell.vue';
import StatusBadge from '@/components/library/badges/StatusBadge.vue';
import { fetchAssemblies, submitAssembly, updateAssemblyDraft } from '@/api/assemblies';
import LedgerSkeleton from '@/components/library/feedback/LedgerSkeleton.vue';
import { buildCacheKey, invalidateListCache, readListCache, writeListCache } from '@/composables/useListCache';
import { useAuthStore } from '@/stores/auth';
import type { AssemblySubmission, AssemblySubmissionStatus } from '@/types';
import { formatDueDate, daysRemaining } from '@/utils/assignment-status';

const auth = useAuthStore();
const rows = ref<AssemblySubmission[]>([]);
const loading = ref(true);
const actionLoading = ref(false);
const error = ref<string | null>(null);
const editingId = ref<string | null>(null);
const notes = ref('');
const heldAt = ref('');
const venue = ref('');
const attendanceCount = ref('');

function statusVariant(status: AssemblySubmissionStatus) {
    if (status === 'ACCEPTED') return 'approved' as const;
    if (status === 'RETURNED') return 'overdue' as const;
    return 'pending' as const;
}

function canEdit(status: AssemblySubmissionStatus) {
    return status === 'NOT_STARTED' || status === 'DRAFT' || status === 'RETURNED';
}

function canSubmit(status: AssemblySubmissionStatus) {
    return status === 'NOT_STARTED' || status === 'DRAFT' || status === 'RETURNED';
}

async function load(useCache = true) {
    if (!auth.token) return;
    const key = buildCacheKey({
        scope: 'barangay-assemblies',
        barangayId: auth.user?.barangay?.id,
    });
    if (useCache) {
        const cached = readListCache<AssemblySubmission[]>(key);
        if (cached) {
            rows.value = cached;
            loading.value = false;
            return;
        }
    }
    loading.value = true;
    error.value = null;
    try {
        const result = await fetchAssemblies(auth.token);
        rows.value = result;
        writeListCache(key, result);
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to load assemblies';
    } finally {
        loading.value = false;
    }
}

function draftPayload() {
    const payload: {
        notes?: string;
        heldAt?: string;
        venue?: string;
        attendanceCount?: number;
    } = { notes: notes.value };
    if (heldAt.value) payload.heldAt = heldAt.value;
    if (venue.value.trim()) payload.venue = venue.value.trim();
    if (attendanceCount.value !== '') {
        payload.attendanceCount = Number(attendanceCount.value);
    }
    return payload;
}

async function saveDraft(id: string) {
    if (!auth.token) return;
    actionLoading.value = true;
    try {
        await updateAssemblyDraft(auth.token, id, draftPayload());
        editingId.value = null;
        invalidateListCache('scope=barangay-assemblies');
        await load(false);
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
            await updateAssemblyDraft(auth.token, id, draftPayload());
        }
        await submitAssembly(auth.token, id);
        editingId.value = null;
        invalidateListCache('scope=barangay-assemblies');
        await load(false);
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Submit failed';
    } finally {
        actionLoading.value = false;
    }
}

function startEdit(row: AssemblySubmission) {
    editingId.value = row.id;
    notes.value = row.notes ?? '';
    heldAt.value = row.heldAt ? row.heldAt.slice(0, 10) : '';
    venue.value = row.venue ?? '';
    attendanceCount.value = row.attendanceCount != null ? String(row.attendanceCount) : '';
}

onMounted(load);
</script>

<template>
    <AppShell
        title="Barangay assemblies"
        :subtitle="auth.user?.barangay?.name ?? 'Semestral assemblies'"
    >
        <p class="mb-6 max-w-xl text-sm text-ink-muted">
            Record each semestral barangay assembly (minutes / report) and submit to the municipality
            under RA 7160 Sec. 397(b).
        </p>

        <p v-if="error" class="mb-4 text-sm text-status-danger">{{ error }}</p>
        <LedgerSkeleton v-if="loading && rows.length === 0" :rows="4" />

        <div v-else class="gl-panel overflow-hidden">
            <p v-if="rows.length === 0" class="px-4 py-10 text-center text-sm text-ink-muted">
                No assembly periods open yet. Ask the municipality to open current H1/H2 periods.
            </p>
            <article
                v-for="row in rows"
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
                            {{ row.semester }} — {{ row.title ?? row.periodLabel }}
                        </h2>
                        <p class="mt-1 text-xs text-ink-muted">
                            Period {{ row.periodLabel }} · Due {{ formatDueDate(row.dueDate) }}
                            ({{ daysRemaining(row.dueDate) }}d)
                        </p>
                        <p v-if="row.heldAt" class="mt-1 text-xs text-ink-muted">
                            Held {{ formatDueDate(row.heldAt) }}
                            <span v-if="row.venue"> · {{ row.venue }}</span>
                            <span v-if="row.attendanceCount != null"> · {{ row.attendanceCount }} attendees</span>
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
                            Edit details
                        </button>
                        <button
                            v-if="canSubmit(row.status)"
                            type="button"
                            class="gl-btn-primary"
                            :disabled="actionLoading"
                            @click="submit(row.id)"
                        >
                            Submit to municipality
                        </button>
                    </div>
                </div>

                <div v-if="editingId === row.id" class="mt-4 grid gap-3 sm:grid-cols-2">
                    <label class="block text-xs text-ink-muted sm:col-span-1">
                        Date held
                        <input
                            v-model="heldAt"
                            type="date"
                            class="mt-1 w-full border border-rule bg-paper px-3 py-2 text-sm text-ink"
                            style="border-radius: 2px"
                        />
                    </label>
                    <label class="block text-xs text-ink-muted sm:col-span-1">
                        Attendance
                        <input
                            v-model="attendanceCount"
                            type="number"
                            min="0"
                            class="mt-1 w-full border border-rule bg-paper px-3 py-2 text-sm text-ink"
                            style="border-radius: 2px"
                            placeholder="0"
                        />
                    </label>
                    <label class="block text-xs text-ink-muted sm:col-span-2">
                        Venue
                        <input
                            v-model="venue"
                            type="text"
                            class="mt-1 w-full border border-rule bg-paper px-3 py-2 text-sm text-ink"
                            style="border-radius: 2px"
                            placeholder="Barangay hall / covered court"
                        />
                    </label>
                    <label class="block text-xs text-ink-muted sm:col-span-2">
                        Notes / minutes summary
                        <textarea
                            v-model="notes"
                            rows="3"
                            class="mt-1 w-full border border-rule bg-paper px-3 py-2 text-sm"
                            style="border-radius: 2px"
                            placeholder="Optional notes for municipal review"
                        />
                    </label>
                    <button
                        type="button"
                        class="gl-btn-secondary sm:col-span-2"
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
