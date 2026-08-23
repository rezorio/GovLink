<script setup lang="ts">
import StatusBadge from '@/components/library/badges/StatusBadge.vue';
import LedgerNotice from '@/components/library/feedback/LedgerNotice.vue';
import type { TaskAssignment } from '@/types';
import { daysRemaining, formatDueDate, statusLabel, statusToVariant } from '@/utils/assignment-status';

defineProps<{
    assignments: TaskAssignment[];
    loading: boolean;
}>();

defineEmits<{
    review: [row: TaskAssignment];
}>();
</script>

<template>
    <div class="gl-panel overflow-x-auto">
        <LedgerNotice
            v-if="!loading && assignments.length === 0"
            title="No assignments yet"
            description="Use Assign directive to issue an ad-hoc or DILG-templated task to one or all barangays."
        />
        <table v-else class="min-w-full text-left text-sm">
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
                <tr
                    v-for="row in assignments"
                    :key="row.id"
                    class="border-b border-rule hover:bg-brand-soft/30"
                >
                    <td class="px-4 py-3 font-medium text-ink">{{ row.barangay.name }}</td>
                    <td class="px-4 py-3 text-ink-muted">{{ row.task.title }}</td>
                    <td class="px-4 py-3">
                        <StatusBadge
                            :status="statusToVariant(row.status)"
                            :label="statusLabel(row.status)"
                        />
                    </td>
                    <td class="px-4 py-3 text-ink-muted">
                        {{ formatDueDate(row.task.dueDate) }}
                        <span
                            class="ml-1 text-xs"
                            :class="
                                daysRemaining(row.task.dueDate) < 0
                                    ? 'text-status-danger'
                                    : 'text-ink-muted'
                            "
                        >
                            ({{ daysRemaining(row.task.dueDate) }}d)
                        </span>
                    </td>
                    <td class="px-4 py-3">
                        <button
                            v-if="row.status === 'SUBMITTED'"
                            type="button"
                            class="gl-btn-secondary"
                            @click="$emit('review', row)"
                        >
                            Review
                        </button>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</template>
