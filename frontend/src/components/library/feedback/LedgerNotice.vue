<script setup lang="ts">
withDefaults(
    defineProps<{
        title: string;
        description?: string;
        variant?: 'empty' | 'error' | 'info';
    }>(),
    { variant: 'empty' },
);
</script>

<template>
    <div
        class="gl-ledger-notice"
        :class="{
            'gl-ledger-notice-error': variant === 'error',
            'gl-ledger-notice-info': variant === 'info',
        }"
        role="status"
    >
        <span class="gl-ledger-notice-mark" aria-hidden="true" />
        <div class="min-w-0">
            <p class="font-display text-base font-semibold text-ink">{{ title }}</p>
            <p v-if="description" class="mt-1 text-sm leading-relaxed text-ink-muted">
                {{ description }}
            </p>
            <slot />
        </div>
    </div>
</template>
