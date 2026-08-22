<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import AppShell from '@/components/library/layout/AppShell.vue';
import ReviewDrawer from '@/components/library/drawer/ReviewDrawer.vue';
import StatusBadge from '@/components/library/badges/StatusBadge.vue';
import {
    fetchAssignments,
    fetchDirectiveTemplates,
    assignTask,
    reviewAssignment,
} from '@/api/assignments';
import { fetchBarangays } from '@/api/barangays';
import { useAuthStore } from '@/stores/auth';
import type { BarangaySummary, DirectiveTemplate, TaskAssignment } from '@/types';
import { daysRemaining, formatDueDate, statusLabel, statusToVariant } from '@/utils/assignment-status';

const auth = useAuthStore();

const assignments = ref<TaskAssignment[]>([]);
const templates = ref<DirectiveTemplate[]>([]);
const barangays = ref<BarangaySummary[]>([]);
const loading = ref(true);
const actionLoading = ref(false);
const error = ref<string | null>(null);

const selectedAssignment = ref<TaskAssignment | null>(null);
const drawerOpen = ref(false);

const showAssignForm = ref(false);
const assignForm = ref({
    templateId: '',
    title: '',
    description: '',
    legalBasis: '',
    dueDate: '',
    barangayId: '',
});

const statusCounts = computed(() => {
    const counts = { pending: 0, approved: 0, overdue: 0 };
    for (const row of assignments.value) {
        const variant = statusToVariant(row.status);
        counts[variant]++;
    }
    return counts;
});

async function loadData() {
    if (!auth.token) {
        return;
    }
    loading.value = true;
    error.value = null;
    try {
        const [rows, tpls, brgys] = await Promise.all([
            fetchAssignments(auth.token),
            fetchDirectiveTemplates(auth.token),
            fetchBarangays(auth.token),
        ]);
        assignments.value = rows;
        templates.value = tpls;
        barangays.value = brgys;
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to load dashboard';
    } finally {
        loading.value = false;
    }
}

function openReview(row: TaskAssignment) {
    selectedAssignment.value = row;
    drawerOpen.value = true;
}

async function handleReview(payload: { decision: 'ACCEPTED' | 'RETURNED'; comment: string }) {
    if (!auth.token || !selectedAssignment.value) {
        return;
    }
    const submissionId = selectedAssignment.value.evidenceSubmissions[0]?.id;
    if (!submissionId) {
        return;
    }
    actionLoading.value = true;
    try {
        await reviewAssignment(auth.token, selectedAssignment.value.id, {
            submissionId,
            decision: payload.decision,
            comment: payload.comment || undefined,
        });
        drawerOpen.value = false;
        selectedAssignment.value = null;
        await loadData();
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Review failed';
    } finally {
        actionLoading.value = false;
    }
}

function onTemplateChange() {
    const tpl = templates.value.find((t) => t.id === assignForm.value.templateId);
    if (!tpl) {
        return;
    }
    assignForm.value.title = tpl.title;
    assignForm.value.description = tpl.description;
    assignForm.value.legalBasis = tpl.dilgMcNumber;
}

async function submitAssign() {
    if (!auth.token || !assignForm.value.barangayId) {
        return;
    }
    actionLoading.value = true;
    error.value = null;
    try {
        await assignTask(auth.token, {
            directiveTemplateId: assignForm.value.templateId || undefined,
            title: assignForm.value.title,
            description: assignForm.value.description,
            legalBasis: assignForm.value.legalBasis,
            dueDate: assignForm.value.dueDate,
            barangayIds: [assignForm.value.barangayId],
        });
        showAssignForm.value = false;
        assignForm.value = {
            templateId: '',
            title: '',
            description: '',
            legalBasis: '',
            dueDate: '',
            barangayId: '',
        };
        await loadData();
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Assign failed';
    } finally {
        actionLoading.value = false;
    }
}

onMounted(loadData);
</script>

<template>
    <AppShell
        title="Municipal supervision dashboard"
        :subtitle="auth.user?.municipality?.name ?? 'Municipality'"
    >
        <div class="mb-6 grid grid-cols-3 gap-3">
            <div class="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p class="text-xs font-semibold uppercase text-amber-800">Pending</p>
                <p class="text-2xl font-bold text-amber-900">{{ statusCounts.pending }}</p>
            </div>
            <div class="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p class="text-xs font-semibold uppercase text-emerald-800">Approved</p>
                <p class="text-2xl font-bold text-emerald-900">{{ statusCounts.approved }}</p>
            </div>
            <div class="rounded-xl border border-rose-200 bg-rose-50 p-4">
                <p class="text-xs font-semibold uppercase text-rose-800">Action needed</p>
                <p class="text-2xl font-bold text-rose-900">{{ statusCounts.overdue }}</p>
            </div>
        </div>

        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 class="text-base font-semibold text-slate-900">Barangay compliance matrix</h2>
            <button
                type="button"
                class="min-h-11 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800"
                @click="showAssignForm = !showAssignForm"
            >
                {{ showAssignForm ? 'Cancel assign' : 'Assign directive' }}
            </button>
        </div>

        <form
            v-if="showAssignForm"
            class="mb-6 space-y-3 rounded-xl border border-slate-200 bg-white p-4"
            @submit.prevent="submitAssign"
        >
            <div class="grid gap-3 sm:grid-cols-2">
                <div class="sm:col-span-2">
                    <label class="mb-1 block text-sm font-medium text-slate-700">DILG template (optional)</label>
                    <select
                        v-model="assignForm.templateId"
                        class="min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
                        @change="onTemplateChange"
                    >
                        <option value="">Custom task</option>
                        <option v-for="tpl in templates" :key="tpl.id" :value="tpl.id">
                            {{ tpl.dilgMcNumber }}
                        </option>
                    </select>
                </div>
                <div>
                    <label class="mb-1 block text-sm font-medium text-slate-700">Barangay</label>
                    <select
                        v-model="assignForm.barangayId"
                        required
                        class="min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
                    >
                        <option value="" disabled>Select barangay</option>
                        <option v-for="brgy in barangays" :key="brgy.id" :value="brgy.id">
                            {{ brgy.name }}
                        </option>
                    </select>
                </div>
                <div>
                    <label class="mb-1 block text-sm font-medium text-slate-700">Due date</label>
                    <input
                        v-model="assignForm.dueDate"
                        type="date"
                        required
                        class="min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
                    />
                </div>
                <div class="sm:col-span-2">
                    <label class="mb-1 block text-sm font-medium text-slate-700">Title</label>
                    <input v-model="assignForm.title" required class="min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm" />
                </div>
                <div class="sm:col-span-2">
                    <label class="mb-1 block text-sm font-medium text-slate-700">Description</label>
                    <textarea v-model="assignForm.description" required rows="2" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </div>
                <div class="sm:col-span-2">
                    <label class="mb-1 block text-sm font-medium text-slate-700">Legal basis</label>
                    <input v-model="assignForm.legalBasis" required class="min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm" />
                </div>
            </div>
            <button
                type="submit"
                class="min-h-11 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                :disabled="actionLoading"
            >
                Assign to barangay
            </button>
        </form>

        <p v-if="error" class="mb-4 text-sm text-rose-600">{{ error }}</p>
        <p v-if="loading" class="text-sm text-slate-500">Loading assignments…</p>

        <div v-else class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table class="min-w-full text-left text-sm">
                <thead class="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                        <th class="px-4 py-3">Barangay</th>
                        <th class="px-4 py-3">Directive</th>
                        <th class="px-4 py-3">Status</th>
                        <th class="px-4 py-3">Due</th>
                        <th class="px-4 py-3"></th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-if="assignments.length === 0">
                        <td colspan="5" class="px-4 py-8 text-center text-slate-500">
                            No assignments yet. Use “Assign directive” to create one.
                        </td>
                    </tr>
                    <tr
                        v-for="row in assignments"
                        :key="row.id"
                        class="border-b border-slate-100 hover:bg-slate-50"
                    >
                        <td class="px-4 py-3 font-medium text-slate-900">{{ row.barangay.name }}</td>
                        <td class="px-4 py-3 text-slate-700">{{ row.task.title }}</td>
                        <td class="px-4 py-3">
                            <StatusBadge :status="statusToVariant(row.status)" :label="statusLabel(row.status)" />
                        </td>
                        <td class="px-4 py-3 text-slate-600">
                            {{ formatDueDate(row.task.dueDate) }}
                            <span
                                class="ml-1 text-xs"
                                :class="daysRemaining(row.task.dueDate) < 0 ? 'text-rose-600' : 'text-slate-400'"
                            >
                                ({{ daysRemaining(row.task.dueDate) }}d)
                            </span>
                        </td>
                        <td class="px-4 py-3">
                            <button
                                v-if="row.status === 'SUBMITTED'"
                                type="button"
                                class="min-h-11 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-white"
                                @click="openReview(row)"
                            >
                                Review
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <ReviewDrawer
            :open="drawerOpen"
            :assignment="selectedAssignment"
            :loading="actionLoading"
            @close="drawerOpen = false"
            @review="handleReview"
        />
    </AppShell>
</template>
