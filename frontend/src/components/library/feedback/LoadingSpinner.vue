<script setup lang="ts">
withDefaults(
    defineProps<{
        size?: 'sm' | 'md';
        label?: string;
    }>(),
    { size: 'md', label: 'Loading' },
);
</script>

<template>
    <span
        class="gl-spinner"
        :class="size === 'sm' ? 'gl-spinner-sm' : 'gl-spinner-md'"
        role="status"
        :aria-label="label"
    />
</template>
