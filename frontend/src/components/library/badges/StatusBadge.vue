<script setup lang="ts">
import type { StatusVariant } from '@/utils/assignment-status';

const props = defineProps<{
    status: StatusVariant;
    label?: string;
}>();

const classes: Record<StatusVariant, string> = {
    approved: 'bg-emerald-500 text-white',
    pending: 'bg-amber-500 text-white',
    overdue: 'bg-rose-500 text-white',
};

const defaultLabels: Record<StatusVariant, string> = {
    approved: 'Approved',
    pending: 'Pending',
    overdue: 'Action needed',
};
</script>

<template>
    <span
        class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
        :class="classes[props.status]"
    >
        {{ label ?? defaultLabels[props.status] }}
    </span>
</template>
