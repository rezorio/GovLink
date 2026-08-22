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
import { fetchComplianceMatrix, openCompliancePeriods } from '@/api/compliance';
import { useAuthStore } from '@/stores/auth';
import type {
    BarangaySummary,
    ComplianceMatrix,
    ComplianceMatrixCell,
    ComplianceStatus,
    DirectiveTemplate,
    TaskAssignment,
} from '@/types';
import { daysRemaining, formatDueDate, statusLabel, statusToVariant } from '@/utils/assignment-status';
import {
    cellTint,
    complianceStatusLabel,
    complianceStatusToVariant,
} from '@/utils/compliance-status';

const auth = useAuthStore();

const assignments = ref<TaskAssignment[]>([]);
const templates = ref<DirectiveTemplate[]>([]);
const barangays = ref<BarangaySummary[]>([]);
const matrix = ref<ComplianceMatrix | null>(null);
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
    assignToAll: false,
});

const statusCounts = computed(() => {
    const counts = { pending: 0, approved: 0, overdue: 0 };
    for (const row of assignments.value) {
        const variant = statusToVariant(row.status);
        counts[variant]++;
    }
    return counts;
});

const matrixCellMap = computed(() => {
    const map = new Map<string, ComplianceMatrixCell>();
    for (const cell of matrix.value?.cells ?? []) {
        map.set(`${cell.barangayId}:${cell.requirementId}`, cell);
    }
    return map;
});

function cellFor(barangayId: string, requirementId: string) {
    return matrixCellMap.value.get(`${barangayId}:${requirementId}`);
}

async function loadData() {
    if (!auth.token) {
        return;
    }
    loading.value = true;
    error.value = null;
    try {
        const [rows, tpls, brgys, mx] = await Promise.all([
            fetchAssignments(auth.token),
            fetchDirectiveTemplates(auth.token),
            fetchBarangays(auth.token),
            fetchComplianceMatrix(auth.token),
        ]);
        assignments.value = rows;
        templates.value = tpls;
        barangays.value = brgys;
        matrix.value = mx;
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
    if (!auth.token) {
        return;
    }
    if (!assignForm.value.assignToAll && !assignForm.value.barangayId) {
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
            assignToAllBarangays: assignForm.value.assignToAll || undefined,
            barangayIds: assignForm.value.assignToAll
                ? undefined
                : [assignForm.value.barangayId],
        });
        showAssignForm.value = false;
        assignForm.value = {
            templateId: '',
            title: '',
            description: '',
            legalBasis: '',
            dueDate: '',
            barangayId: '',
            assignToAll: false,
        };
        await loadData();
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Assign failed';
    } finally {
        actionLoading.value = false;
    }
}

async function handleOpenPeriods() {
    if (!auth.token) {
        return;
    }
    actionLoading.value = true;
    error.value = null;
    try {
        const result = await openCompliancePeriods(auth.token);
        if (result.created === 0 && result.skipped > 0) {
            error.value = `Period already open (${result.skipped} existing instances).`;
        }
        await loadData();
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to open periods';
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
        <div class="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div class="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p class="text-xs font-semibold uppercase text-amber-800">Catalog pending</p>
                <p class="text-2xl font-bold text-amber-900">
                    {{ (matrix?.statusCounts.notStarted ?? 0) + (matrix?.statusCounts.inProgress ?? 0) }}
                </p>
            </div>
            <div class="rounded-xl border border-sky-200 bg-sky-50 p-4">
                <p class="text-xs font-semibold uppercase text-sky-800">Submitted</p>
                <p class="text-2xl font-bold text-sky-900">{{ matrix?.statusCounts.submitted ?? 0 }}</p>
            </div>
            <div class="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p class="text-xs font-semibold uppercase text-emerald-800">Accepted</p>
                <p class="text-2xl font-bold text-emerald-900">{{ matrix?.statusCounts.accepted ?? 0 }}</p>
            </div>
            <div class="rounded-xl border border-rose-200 bg-rose-50 p-4">
                <p class="text-xs font-semibold uppercase text-rose-800">Overdue / returned</p>
                <p class="text-2xl font-bold text-rose-900">
                    {{ (matrix?.statusCounts.overdue ?? 0) + (matrix?.statusCounts.returned ?? 0) }}
                </p>
            </div>
        </div>

        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
                <h2 class="text-base font-semibold text-slate-900">Compliance period matrix</h2>
                <p class="text-sm text-slate-500">
                    Per-barangay due status for current ADM/SOC/SK periods
                </p>
            </div>
            <button
                type="button"
                class="min-h-11 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                :disabled="actionLoading"
                @click="handleOpenPeriods"
            >
                Open current periods
            </button>
        </div>

        <p v-if="loading" class="mb-6 text-sm text-slate-500">Loading compliance matrix…</p>
        <div
            v-else-if="matrix && matrix.cells.length > 0"
            class="mb-8 overflow-x-auto rounded-xl border border-slate-200 bg-white"
        >
            <table class="min-w-full border-collapse text-left text-xs">
                <thead class="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                    <tr>
                        <th class="sticky left-0 z-10 bg-slate-50 px-3 py-3">Barangay</th>
                        <th
                            v-for="req in matrix.requirements"
                            :key="req.id"
                            class="min-w-[5.5rem] px-2 py-3 text-center"
                            :title="req.title"
                        >
                            {{ req.code }}
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr
                        v-for="brgy in matrix.barangays"
                        :key="brgy.id"
                        class="border-t border-slate-100"
                    >
                        <td class="sticky left-0 z-10 bg-white px-3 py-2 font-medium text-slate-900">
                            {{ brgy.name }}
                        </td>
                        <td
                            v-for="req in matrix.requirements"
                            :key="`${brgy.id}-${req.id}`"
                            class="px-1 py-1 text-center"
                            :class="cellFor(brgy.id, req.id) ? cellTint(cellFor(brgy.id, req.id)!.status) : 'bg-slate-50'"
                        >
                            <StatusBadge
                                v-if="cellFor(brgy.id, req.id)"
                                :status="complianceStatusToVariant(cellFor(brgy.id, req.id)!.status as ComplianceStatus)"
                                :label="complianceStatusLabel(cellFor(brgy.id, req.id)!.status as ComplianceStatus)"
                            />
                            <span v-else class="text-slate-300">—</span>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
        <p v-else class="mb-8 text-sm text-slate-500">
            No compliance instances yet. Click “Open current periods” to generate them for all barangays.
        </p>

        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 class="text-base font-semibold text-slate-900">Directive assignments</h2>
            <button
                type="button"
                class="min-h-11 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800"
                @click="showAssignForm = !showAssignForm"
            >
                {{ showAssignForm ? 'Cancel assign' : 'Assign directive' }}
            </button>
        </div>

        <div class="mb-4 grid grid-cols-3 gap-3">
            <div class="rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p class="text-xs font-semibold uppercase text-amber-800">Directive pending</p>
                <p class="text-xl font-bold text-amber-900">{{ statusCounts.pending }}</p>
            </div>
            <div class="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <p class="text-xs font-semibold uppercase text-emerald-800">Directive approved</p>
                <p class="text-xl font-bold text-emerald-900">{{ statusCounts.approved }}</p>
            </div>
            <div class="rounded-xl border border-rose-200 bg-rose-50 p-3">
                <p class="text-xs font-semibold uppercase text-rose-800">Directive action</p>
                <p class="text-xl font-bold text-rose-900">{{ statusCounts.overdue }}</p>
            </div>
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
                        :required="!assignForm.assignToAll"
                        :disabled="assignForm.assignToAll"
                        class="min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm disabled:bg-slate-100 disabled:text-slate-500"
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
                    <label class="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-slate-700">
                        <input
                            v-model="assignForm.assignToAll"
                            type="checkbox"
                            class="size-4 rounded border-slate-300"
                            @change="assignForm.barangayId = ''"
                        />
                        Assign to all barangays ({{ barangays.length }})
                    </label>
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
                {{ assignForm.assignToAll ? 'Assign to all barangays' : 'Assign to barangay' }}
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
