<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import AppShell from '@/components/library/layout/AppShell.vue';
import ReviewDrawer from '@/components/library/drawer/ReviewDrawer.vue';
import ComplianceReviewDrawer from '@/components/library/drawer/ComplianceReviewDrawer.vue';
import StatusBadge from '@/components/library/badges/StatusBadge.vue';
import {
    fetchAssignments,
    fetchDirectiveTemplates,
    assignTask,
    reviewAssignment,
} from '@/api/assignments';
import { fetchBarangays } from '@/api/barangays';
import {
    fetchComplianceMatrix,
    fetchComplianceReviewQueue,
    openCompliancePeriods,
    reviewComplianceInstance,
} from '@/api/compliance';
import {
    downloadComplianceScorecardExcel,
    downloadComplianceScorecardPdf,
} from '@/api/exports';
import { useAuthStore } from '@/stores/auth';
import type {
    BarangaySummary,
    ComplianceInstance,
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
const reviewQueue = ref<ComplianceInstance[]>([]);
const loading = ref(true);
const actionLoading = ref(false);
const error = ref<string | null>(null);

const selectedAssignment = ref<TaskAssignment | null>(null);
const drawerOpen = ref(false);
const selectedCompliance = ref<ComplianceInstance | null>(null);
const complianceDrawerOpen = ref(false);

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
        const [rows, tpls, brgys, mx, queue] = await Promise.all([
            fetchAssignments(auth.token),
            fetchDirectiveTemplates(auth.token),
            fetchBarangays(auth.token),
            fetchComplianceMatrix(auth.token),
            fetchComplianceReviewQueue(auth.token),
        ]);
        assignments.value = rows;
        templates.value = tpls;
        barangays.value = brgys;
        matrix.value = mx;
        reviewQueue.value = queue;
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

function openComplianceReview(row: ComplianceInstance) {
    selectedCompliance.value = row;
    complianceDrawerOpen.value = true;
}

async function handleComplianceReview(payload: {
    decision: 'ACCEPTED' | 'RETURNED';
    returnReason?: string;
    comment: string;
}) {
    if (!auth.token || !selectedCompliance.value) {
        return;
    }
    actionLoading.value = true;
    try {
        await reviewComplianceInstance(auth.token, selectedCompliance.value.id, {
            decision: payload.decision,
            returnReason: payload.returnReason,
            comment: payload.comment || undefined,
        });
        complianceDrawerOpen.value = false;
        selectedCompliance.value = null;
        await loadData();
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Compliance review failed';
    } finally {
        actionLoading.value = false;
    }
}

async function downloadPdf() {
    if (!auth.token) {
        return;
    }
    actionLoading.value = true;
    error.value = null;
    try {
        await downloadComplianceScorecardPdf(auth.token);
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'PDF download failed';
    } finally {
        actionLoading.value = false;
    }
}

async function downloadExcel() {
    if (!auth.token) {
        return;
    }
    actionLoading.value = true;
    error.value = null;
    try {
        await downloadComplianceScorecardExcel(auth.token);
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Excel download failed';
    } finally {
        actionLoading.value = false;
    }
}

onMounted(loadData);
</script>

<template>
    <AppShell
        title="Municipal supervision"
        :subtitle="auth.user?.municipality?.name ?? 'Municipality'"
    >
        <p class="mb-6 max-w-2xl text-sm leading-relaxed text-ink-muted">
            Catalog periods, review queue, and directive assignments across all barangays in your municipality.
        </p>

        <div class="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div class="gl-panel border-l-2 border-status-warn p-4">
                <p class="text-[11px] font-semibold uppercase tracking-wide text-status-warn">Catalog pending</p>
                <p class="mt-1 font-display text-3xl font-bold text-ink">
                    {{ (matrix?.statusCounts.notStarted ?? 0) + (matrix?.statusCounts.inProgress ?? 0) }}
                </p>
            </div>
            <div class="gl-panel border-l-2 border-brand p-4">
                <p class="text-[11px] font-semibold uppercase tracking-wide text-brand">Submitted</p>
                <p class="mt-1 font-display text-3xl font-bold text-ink">{{ matrix?.statusCounts.submitted ?? 0 }}</p>
            </div>
            <div class="gl-panel border-l-2 border-status-ok p-4">
                <p class="text-[11px] font-semibold uppercase tracking-wide text-status-ok">Accepted</p>
                <p class="mt-1 font-display text-3xl font-bold text-ink">{{ matrix?.statusCounts.accepted ?? 0 }}</p>
            </div>
            <div class="gl-panel border-l-2 border-status-danger p-4">
                <p class="text-[11px] font-semibold uppercase tracking-wide text-status-danger">Overdue / returned</p>
                <p class="mt-1 font-display text-3xl font-bold text-ink">
                    {{ (matrix?.statusCounts.overdue ?? 0) + (matrix?.statusCounts.returned ?? 0) }}
                </p>
            </div>
        </div>

        <div class="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
                <h2 class="font-display text-xl font-semibold text-ink">Compliance period matrix</h2>
                <p class="mt-1 text-sm text-ink-muted">
                    Per-barangay due status for current ADM/SOC/SK periods
                </p>
            </div>
            <div class="flex flex-wrap gap-2">
                <button type="button" class="gl-btn-secondary disabled:opacity-50" :disabled="actionLoading" @click="downloadPdf">
                    Download PDF
                </button>
                <button type="button" class="gl-btn-secondary disabled:opacity-50" :disabled="actionLoading" @click="downloadExcel">
                    Download Excel
                </button>
                <button type="button" class="gl-btn-primary disabled:opacity-50" :disabled="actionLoading" @click="handleOpenPeriods">
                    Open current periods
                </button>
            </div>
        </div>

        <div
            v-if="!loading && reviewQueue.length > 0"
            class="gl-panel mb-6 overflow-hidden"
        >
            <div class="border-b border-rule bg-status-warn/5 px-4 py-3">
                <h3 class="font-display text-base font-semibold text-ink">Needs attention</h3>
                <p class="text-xs text-ink-muted">
                    Submitted, under review, or returned catalog items
                </p>
            </div>
            <ul>
                <li
                    v-for="(item, index) in reviewQueue"
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
                    <div class="sm:col-span-3 flex flex-wrap items-center justify-between gap-2">
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
                            @click="openComplianceReview(item)"
                        >
                            Review
                        </button>
                    </div>
                </li>
            </ul>
        </div>

        <p v-if="loading" class="mb-6 text-sm text-ink-muted">Loading compliance matrix…</p>
        <div
            v-else-if="matrix && matrix.cells.length > 0"
            class="gl-panel mb-10 overflow-x-auto"
        >
            <table class="min-w-full border-collapse text-left text-xs">
                <thead class="bg-brand-soft/50 text-[11px] uppercase tracking-wide text-ink-muted">
                    <tr>
                        <th class="sticky left-0 z-10 bg-brand-soft/80 px-3 py-3 text-ink">Barangay</th>
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
                        class="border-t border-rule"
                    >
                        <td class="sticky left-0 z-10 bg-surface px-3 py-2 font-medium text-ink">
                            {{ brgy.name }}
                        </td>
                        <td
                            v-for="req in matrix.requirements"
                            :key="`${brgy.id}-${req.id}`"
                            class="px-1 py-1 text-center"
                            :class="cellFor(brgy.id, req.id) ? cellTint(cellFor(brgy.id, req.id)!.status) : 'bg-paper/60'"
                        >
                            <StatusBadge
                                v-if="cellFor(brgy.id, req.id)"
                                :status="complianceStatusToVariant(cellFor(brgy.id, req.id)!.status as ComplianceStatus)"
                                :label="complianceStatusLabel(cellFor(brgy.id, req.id)!.status as ComplianceStatus)"
                            />
                            <span v-else class="text-rule">—</span>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
        <p v-else class="mb-10 text-sm text-ink-muted">
            No compliance instances yet. Click “Open current periods” to generate them for all barangays.
        </p>

        <div class="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
                <h2 class="font-display text-xl font-semibold text-ink">Directive assignments</h2>
                <p class="mt-1 text-sm text-ink-muted">Ad-hoc and DILG-templated tasks by barangay</p>
            </div>
            <button type="button" class="gl-btn-primary" @click="showAssignForm = !showAssignForm">
                {{ showAssignForm ? 'Cancel assign' : 'Assign directive' }}
            </button>
        </div>

        <div class="mb-4 grid grid-cols-3 gap-3">
            <div class="gl-panel border-l-2 border-status-warn p-3">
                <p class="text-[11px] font-semibold uppercase tracking-wide text-status-warn">Pending</p>
                <p class="font-display text-2xl font-bold text-ink">{{ statusCounts.pending }}</p>
            </div>
            <div class="gl-panel border-l-2 border-status-ok p-3">
                <p class="text-[11px] font-semibold uppercase tracking-wide text-status-ok">Approved</p>
                <p class="font-display text-2xl font-bold text-ink">{{ statusCounts.approved }}</p>
            </div>
            <div class="gl-panel border-l-2 border-status-danger p-3">
                <p class="text-[11px] font-semibold uppercase tracking-wide text-status-danger">Action</p>
                <p class="font-display text-2xl font-bold text-ink">{{ statusCounts.overdue }}</p>
            </div>
        </div>

        <form
            v-if="showAssignForm"
            class="gl-panel mb-6 space-y-3 p-4"
            @submit.prevent="submitAssign"
        >
            <div class="grid gap-3 sm:grid-cols-2">
                <div class="sm:col-span-2">
                    <label class="mb-1 block text-sm font-medium text-ink">DILG template (optional)</label>
                    <select
                        v-model="assignForm.templateId"
                        class="min-h-11 w-full border border-rule bg-paper px-3 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                        style="border-radius: 2px"
                        @change="onTemplateChange"
                    >
                        <option value="">Custom task</option>
                        <option v-for="tpl in templates" :key="tpl.id" :value="tpl.id">
                            {{ tpl.dilgMcNumber }}
                        </option>
                    </select>
                </div>
                <div>
                    <label class="mb-1 block text-sm font-medium text-ink">Barangay</label>
                    <select
                        v-model="assignForm.barangayId"
                        :required="!assignForm.assignToAll"
                        :disabled="assignForm.assignToAll"
                        class="min-h-11 w-full border border-rule bg-paper px-3 text-sm text-ink disabled:bg-brand-soft/40 disabled:text-ink-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                        style="border-radius: 2px"
                    >
                        <option value="" disabled>Select barangay</option>
                        <option v-for="brgy in barangays" :key="brgy.id" :value="brgy.id">
                            {{ brgy.name }}
                        </option>
                    </select>
                </div>
                <div>
                    <label class="mb-1 block text-sm font-medium text-ink">Due date</label>
                    <input
                        v-model="assignForm.dueDate"
                        type="date"
                        required
                        class="min-h-11 w-full border border-rule bg-paper px-3 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                        style="border-radius: 2px"
                    />
                </div>
                <div class="sm:col-span-2">
                    <label class="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-ink">
                        <input
                            v-model="assignForm.assignToAll"
                            type="checkbox"
                            class="size-4 border-rule"
                            @change="assignForm.barangayId = ''"
                        />
                        Assign to all barangays ({{ barangays.length }})
                    </label>
                </div>
                <div class="sm:col-span-2">
                    <label class="mb-1 block text-sm font-medium text-ink">Title</label>
                    <input
                        v-model="assignForm.title"
                        required
                        class="min-h-11 w-full border border-rule bg-paper px-3 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                        style="border-radius: 2px"
                    />
                </div>
                <div class="sm:col-span-2">
                    <label class="mb-1 block text-sm font-medium text-ink">Description</label>
                    <textarea
                        v-model="assignForm.description"
                        required
                        rows="2"
                        class="w-full border border-rule bg-paper px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                        style="border-radius: 2px"
                    />
                </div>
                <div class="sm:col-span-2">
                    <label class="mb-1 block text-sm font-medium text-ink">Legal basis</label>
                    <input
                        v-model="assignForm.legalBasis"
                        required
                        class="min-h-11 w-full border border-rule bg-paper px-3 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                        style="border-radius: 2px"
                    />
                </div>
            </div>
            <button type="submit" class="gl-btn-primary disabled:opacity-50" :disabled="actionLoading">
                {{ assignForm.assignToAll ? 'Assign to all barangays' : 'Assign to barangay' }}
            </button>
        </form>

        <p v-if="error" class="mb-4 text-sm text-status-danger">{{ error }}</p>
        <p v-if="loading" class="text-sm text-ink-muted">Loading assignments…</p>

        <div v-else class="gl-panel overflow-x-auto">
            <table class="min-w-full text-left text-sm">
                <thead class="border-b border-rule bg-brand-soft/40 text-xs uppercase tracking-wide text-ink-muted">
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
                        <td colspan="5" class="px-4 py-8 text-center text-ink-muted">
                            No assignments yet. Use “Assign directive” to create one.
                        </td>
                    </tr>
                    <tr
                        v-for="row in assignments"
                        :key="row.id"
                        class="border-b border-rule hover:bg-brand-soft/30"
                    >
                        <td class="px-4 py-3 font-medium text-ink">{{ row.barangay.name }}</td>
                        <td class="px-4 py-3 text-ink-muted">{{ row.task.title }}</td>
                        <td class="px-4 py-3">
                            <StatusBadge :status="statusToVariant(row.status)" :label="statusLabel(row.status)" />
                        </td>
                        <td class="px-4 py-3 text-ink-muted">
                            {{ formatDueDate(row.task.dueDate) }}
                            <span
                                class="ml-1 text-xs"
                                :class="daysRemaining(row.task.dueDate) < 0 ? 'text-status-danger' : 'text-ink-muted'"
                            >
                                ({{ daysRemaining(row.task.dueDate) }}d)
                            </span>
                        </td>
                        <td class="px-4 py-3">
                            <button
                                v-if="row.status === 'SUBMITTED'"
                                type="button"
                                class="gl-btn-secondary"
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
        <ComplianceReviewDrawer
            :open="complianceDrawerOpen"
            :instance="selectedCompliance"
            :loading="actionLoading"
            @close="complianceDrawerOpen = false"
            @review="handleComplianceReview"
        />
    </AppShell>
</template>
