<script setup lang="ts">
import type { StatusVariant } from '@/utils/assignment-status';

const props = defineProps<{
    status: StatusVariant;
    label?: string;
}>();

const classes: Record<StatusVariant, string> = {
    approved: 'bg-status-ok/12 text-status-ok ring-1 ring-inset ring-status-ok/25',
    pending: 'bg-status-warn/12 text-status-warn ring-1 ring-inset ring-status-warn/25',
    overdue: 'bg-status-danger/12 text-status-danger ring-1 ring-inset ring-status-danger/25',
};

const defaultLabels: Record<StatusVariant, string> = {
    approved: 'Approved',
    pending: 'Pending',
    overdue: 'Action needed',
};
</script>

<template>
    <span
        class="gl-status-badge inline-flex items-center rounded-sm px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
        :class="classes[props.status]"
    >
        {{ label ?? defaultLabels[props.status] }}
    </span>
</template>
