<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import DashboardAssignForm, {
    type AssignFormState,
} from '@/components/library/dashboard/DashboardAssignForm.vue';
import DashboardDirectivesTable from '@/components/library/dashboard/DashboardDirectivesTable.vue';
import DashboardKpiCard from '@/components/library/dashboard/DashboardKpiCard.vue';
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

type WorkspaceTab = 'attention' | 'directives';

const props = defineProps<{
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

const router = useRouter();
const workspace = ref<WorkspaceTab>('attention');

const catalogRisk = computed(
    () => (props.matrix?.statusCounts.overdue ?? 0) + (props.matrix?.statusCounts.returned ?? 0),
);
const catalogSubmitted = computed(() => props.matrix?.statusCounts.submitted ?? 0);

function openWorkspace(tab: WorkspaceTab) {
    workspace.value = tab;
}

function goCompliance() {
    void router.push({ name: 'mayor-compliance' });
}
</script>

<template>
    <div>
        <p class="mb-6 max-w-2xl text-sm leading-relaxed text-ink-muted">
            Urgent compliance and directive work only. Open a barangay’s full catalog from Barangay
            compliance when you need the complete picture.
        </p>

        <div class="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <DashboardKpiCard
                label="Needs review"
                :value="reviewQueue.length"
                tone="warn"
                hint="Open queue"
                :active="workspace === 'attention'"
                @select="openWorkspace('attention')"
            />
            <DashboardKpiCard
                label="Overdue / returned"
                :value="catalogRisk"
                tone="danger"
                hint="See all barangays"
                @select="goCompliance"
            />
            <DashboardKpiCard
                label="Submitted"
                :value="catalogSubmitted"
                tone="brand"
                hint="In review queue"
                :active="workspace === 'attention'"
                @select="openWorkspace('attention')"
            />
            <DashboardKpiCard
                label="Directive action"
                :value="statusCounts.overdue + statusCounts.pending"
                tone="danger"
                hint="Open directives"
                :active="workspace === 'directives'"
                @select="openWorkspace('directives')"
            />
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

        <nav class="mb-6 flex flex-wrap gap-5 border-b border-rule/80" aria-label="Dashboard workspace">
            <button
                type="button"
                class="gl-tab"
                :class="{ 'gl-tab-active': workspace === 'attention' }"
                @click="openWorkspace('attention')"
            >
                Needs attention
                <span v-if="reviewQueue.length" class="ml-1 text-status-warn">({{ reviewQueue.length }})</span>
            </button>
            <button
                type="button"
                class="gl-tab"
                :class="{ 'gl-tab-active': workspace === 'directives' }"
                @click="openWorkspace('directives')"
            >
                Directives
            </button>
        </nav>

        <p v-if="error" class="mb-4 text-sm text-status-danger">{{ error }}</p>

        <div v-if="loading && !matrix && assignments.length === 0" class="space-y-6">
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

        <section v-show="workspace === 'attention'" class="mb-4 space-y-4">
            <DashboardNeedsAttention
                :items="reviewQueue"
                @review="$emit('reviewCompliance', $event)"
            />
            <div class="gl-panel px-4 py-3 text-sm text-ink-muted">
                Need the full Administrative / Social / SK list per barangay?
                <RouterLink to="/mayor/compliance" class="ml-1 font-semibold text-brand underline">
                    Open barangay compliance
                </RouterLink>
            </div>
        </section>

        <section v-show="workspace === 'directives'" class="mb-4 space-y-4">
            <div class="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h2 class="gl-section-label">Directive assignments</h2>
                    <p class="mt-1 text-sm text-ink-muted">
                        Ad-hoc and DILG-templated tasks by barangay
                    </p>
                </div>
                <button
                    type="button"
                    class="gl-btn-primary"
                    @click="$emit('update:showAssignForm', !showAssignForm)"
                >
                    {{ showAssignForm ? 'Cancel assign' : 'Assign directive' }}
                </button>
            </div>

            <div class="grid grid-cols-3 gap-3">
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
                :form="assignForm"
                :templates="templates"
                :barangays="barangays"
                :action-loading="actionLoading"
                @update:form="$emit('update:assignForm', $event)"
                @template-change="$emit('templateChange', $event)"
                @submit="$emit('submitAssign')"
            />

            <LedgerSkeleton v-if="loading && assignments.length === 0" :rows="5" />
            <DashboardDirectivesTable
                v-else
                :assignments="assignments"
                :loading="loading"
                @review="$emit('reviewAssignment', $event)"
            />
        </section>
    </div>
</template>
