<script setup lang="ts">
import { RouterLink } from 'vue-router';
import DashboardAssignForm, {
    type AssignFormState,
} from '@/components/library/dashboard/DashboardAssignForm.vue';
import DashboardDirectivesTable from '@/components/library/dashboard/DashboardDirectivesTable.vue';
import DashboardNeedsAttention from '@/components/library/dashboard/DashboardNeedsAttention.vue';
import LedgerSkeleton from '@/components/library/feedback/LedgerSkeleton.vue';
import LoadingSpinner from '@/components/library/feedback/LoadingSpinner.vue';
import type {
    BarangaySummary,
    ComplianceInstance,
    ComplianceMatrix,
    DirectiveTemplate,
    TaskAssignment,
} from '@/types';

defineProps<{
    assignments: TaskAssignment[];
    templates: DirectiveTemplate[];
    barangays: BarangaySummary[];
    matrix: ComplianceMatrix | null;
    reviewQueue: ComplianceInstance[];
    loading: boolean;
    actionLoading: boolean;
    error: string | null;
    statusCounts: { pending: number; approved: number; overdue: number };
    showAssignForm: boolean;
    assignForm: AssignFormState;
}>();

defineEmits<{
    'update:showAssignForm': [value: boolean];
    'update:assignForm': [value: AssignFormState];
    downloadPdf: [];
    downloadExcel: [];
    openPeriods: [];
    reviewCompliance: [row: ComplianceInstance];
    reviewAssignment: [row: TaskAssignment];
    templateChange: [templateId: string];
    submitAssign: [];
}>();
</script>

<template>
    <div>
        <p class="mb-6 max-w-2xl text-sm leading-relaxed text-ink-muted">
            Urgent compliance reviews and directive assignments. Full barangay catalogs live under
            Barangay compliance.
        </p>

        <div class="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div class="gl-panel border-l-2 border-status-warn p-4">
                <p class="text-[11px] font-semibold uppercase tracking-wide text-status-warn">
                    Needs review
                </p>
                <p class="mt-1 font-display text-3xl font-bold text-ink">
                    {{ reviewQueue.length }}
                </p>
            </div>
            <div class="gl-panel border-l-2 border-brand p-4">
                <p class="text-[11px] font-semibold uppercase tracking-wide text-brand">Submitted</p>
                <p class="mt-1 font-display text-3xl font-bold text-ink">
                    {{ matrix?.statusCounts.submitted ?? 0 }}
                </p>
            </div>
            <div class="gl-panel border-l-2 border-status-ok p-4">
                <p class="text-[11px] font-semibold uppercase tracking-wide text-status-ok">Accepted</p>
                <p class="mt-1 font-display text-3xl font-bold text-ink">
                    {{ matrix?.statusCounts.accepted ?? 0 }}
                </p>
            </div>
            <div class="gl-panel border-l-2 border-status-danger p-4">
                <p class="text-[11px] font-semibold uppercase tracking-wide text-status-danger">
                    Overdue / returned
                </p>
                <p class="mt-1 font-display text-3xl font-bold text-ink">
                    {{ (matrix?.statusCounts.overdue ?? 0) + (matrix?.statusCounts.returned ?? 0) }}
                </p>
            </div>
        </div>

        <div class="gl-summary-strip mb-6 flex flex-wrap items-center justify-between gap-3 text-sm text-ink-muted">
            <p>
                Dashboard shows
                <span class="font-medium text-ink">urgent and important</span>
                items only.
            </p>
            <RouterLink to="/mayor/compliance" class="gl-btn-secondary">
                View all barangays
            </RouterLink>
        </div>

        <p v-if="error" class="mb-4 text-sm text-status-danger">{{ error }}</p>

        <div v-if="loading && !matrix && assignments.length === 0" class="mb-10 space-y-6">
            <LedgerSkeleton :rows="4" />
            <LedgerSkeleton :rows="6" />
        </div>
        <div
            v-else-if="loading"
            class="mb-4 flex items-center gap-2 text-sm text-ink-muted"
        >
            <LoadingSpinner size="sm" />
            Refreshing dashboard…
        </div>

        <div class="mb-10">
            <DashboardNeedsAttention
                :items="reviewQueue"
                :preview-limit="8"
                @review="$emit('reviewCompliance', $event)"
            />
        </div>

        <div class="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
                <h2 class="gl-section-label">Directive assignments</h2>
                <p class="mt-1 text-sm text-ink-muted">Ad-hoc and DILG-templated tasks by barangay</p>
            </div>
            <button
                type="button"
                class="gl-btn-primary"
                @click="$emit('update:showAssignForm', !showAssignForm)"
            >
                {{ showAssignForm ? 'Cancel assign' : 'Assign directive' }}
            </button>
        </div>

        <div class="mb-4 grid grid-cols-3 gap-3">
            <div class="gl-panel border-l-2 border-status-warn p-3">
                <p class="text-[11px] font-semibold uppercase tracking-wide text-status-warn">
                    Pending
                </p>
                <p class="font-display text-2xl font-bold text-ink">{{ statusCounts.pending }}</p>
            </div>
            <div class="gl-panel border-l-2 border-status-ok p-3">
                <p class="text-[11px] font-semibold uppercase tracking-wide text-status-ok">
                    Approved
                </p>
                <p class="font-display text-2xl font-bold text-ink">{{ statusCounts.approved }}</p>
            </div>
            <div class="gl-panel border-l-2 border-status-danger p-3">
                <p class="text-[11px] font-semibold uppercase tracking-wide text-status-danger">
                    Action
                </p>
                <p class="font-display text-2xl font-bold text-ink">{{ statusCounts.overdue }}</p>
            </div>
        </div>

        <DashboardAssignForm
            v-if="showAssignForm"
            class="mb-6"
            :form="assignForm"
            :templates="templates"
            :barangays="barangays"
            :action-loading="actionLoading"
            @update:form="$emit('update:assignForm', $event)"
            @template-change="$emit('templateChange', $event)"
            @submit="$emit('submitAssign')"
        />

        <p v-if="error" class="mb-4 text-sm text-status-danger">{{ error }}</p>
        <LedgerSkeleton v-if="loading && assignments.length === 0" :rows="5" />
        <DashboardDirectivesTable
            v-else
            :assignments="assignments"
            :loading="loading"
            @review="$emit('reviewAssignment', $event)"
        />
    </div>
</template>
