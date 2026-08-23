<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import AppShell from '@/components/library/layout/AppShell.vue';
import ReviewDrawer from '@/components/library/drawer/ReviewDrawer.vue';
import ComplianceReviewDrawer from '@/components/library/drawer/ComplianceReviewDrawer.vue';
import MayorDashboardClassic from '@/components/library/dashboard/MayorDashboardClassic.vue';
import MayorDashboardFocused from '@/components/library/dashboard/MayorDashboardFocused.vue';
import type { AssignFormState } from '@/components/library/dashboard/DashboardAssignForm.vue';
import {
    fetchAssignments,
    fetchAssignment,
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
import { buildCacheKey, invalidateListCache, readListCache, writeListCache } from '@/composables/useListCache';
import { useDashboardLayout } from '@/composables/useDashboardLayout';
import { useAuthStore } from '@/stores/auth';
import type {
    BarangaySummary,
    ComplianceInstance,
    ComplianceMatrix,
    DirectiveTemplate,
    TaskAssignment,
} from '@/types';
import { statusToVariant } from '@/utils/assignment-status';

const auth = useAuthStore();
const { isFocused } = useDashboardLayout();

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
const assignForm = ref<AssignFormState>({
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

async function loadData(useCache = true) {
    if (!auth.token) {
        return;
    }

    const key = buildCacheKey({
        scope: 'mayor-dashboard',
        municipalityId: auth.user?.municipality?.id,
    });

    type DashboardPayload = {
        assignments: TaskAssignment[];
        templates: DirectiveTemplate[];
        barangays: BarangaySummary[];
        matrix: ComplianceMatrix | null;
        reviewQueue: ComplianceInstance[];
    };

    if (useCache) {
        const cached = readListCache<DashboardPayload>(key);
        if (cached) {
            assignments.value = cached.assignments;
            templates.value = cached.templates;
            barangays.value = cached.barangays;
            matrix.value = cached.matrix;
            reviewQueue.value = cached.reviewQueue;
            loading.value = false;
            return;
        }
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
        writeListCache(key, {
            assignments: rows,
            templates: tpls,
            barangays: brgys,
            matrix: mx,
            reviewQueue: queue,
        });
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to load dashboard';
    } finally {
        loading.value = false;
    }
}

function bustDashboardCache() {
    invalidateListCache('scope=mayor-dashboard');
}

function openReview(row: TaskAssignment) {
    selectedAssignment.value = row;
    drawerOpen.value = true;
    void refreshSelectedAssignment(row.id);
}

async function refreshSelectedAssignment(id: string) {
    if (!auth.token) {
        return;
    }
    try {
        const fresh = await fetchAssignment(auth.token, id);
        if (selectedAssignment.value?.id === id) {
            selectedAssignment.value = fresh;
        }
        const idx = assignments.value.findIndex((row) => row.id === id);
        if (idx >= 0) {
            assignments.value[idx] = fresh;
        }
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to load assignment detail';
    }
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
        bustDashboardCache();
        await loadData(false);
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Review failed';
    } finally {
        actionLoading.value = false;
    }
}

function onTemplateChange(templateId: string) {
    const tpl = templates.value.find((t) => t.id === templateId);
    if (!tpl) {
        return;
    }
    assignForm.value = {
        ...assignForm.value,
        templateId,
        title: tpl.title,
        description: tpl.description,
        legalBasis: tpl.dilgMcNumber,
    };
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
        bustDashboardCache();
        await loadData(false);
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
        bustDashboardCache();
        await loadData(false);
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
        bustDashboardCache();
        await loadData(false);
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
        <MayorDashboardFocused
            v-if="isFocused"
            v-model:show-assign-form="showAssignForm"
            v-model:assign-form="assignForm"
            :assignments="assignments"
            :templates="templates"
            :barangays="barangays"
            :matrix="matrix"
            :review-queue="reviewQueue"
            :loading="loading"
            :action-loading="actionLoading"
            :error="error"
            :status-counts="statusCounts"
            @download-pdf="downloadPdf"
            @download-excel="downloadExcel"
            @open-periods="handleOpenPeriods"
            @review-compliance="openComplianceReview"
            @review-assignment="openReview"
            @template-change="onTemplateChange"
            @submit-assign="submitAssign"
        />
        <MayorDashboardClassic
            v-else
            v-model:show-assign-form="showAssignForm"
            v-model:assign-form="assignForm"
            :assignments="assignments"
            :templates="templates"
            :barangays="barangays"
            :matrix="matrix"
            :review-queue="reviewQueue"
            :loading="loading"
            :action-loading="actionLoading"
            :error="error"
            :status-counts="statusCounts"
            @download-pdf="downloadPdf"
            @download-excel="downloadExcel"
            @open-periods="handleOpenPeriods"
            @review-compliance="openComplianceReview"
            @review-assignment="openReview"
            @template-change="onTemplateChange"
            @submit-assign="submitAssign"
        />

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
