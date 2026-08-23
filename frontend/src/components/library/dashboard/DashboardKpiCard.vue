<script setup lang="ts">
defineProps<{
    label: string;
    value: number | string;
    tone?: 'brand' | 'warn' | 'ok' | 'danger';
    hint?: string;
    active?: boolean;
}>();

defineEmits<{
    select: [];
}>();

const toneClass: Record<string, string> = {
    brand: 'border-brand text-brand',
    warn: 'border-status-warn text-status-warn',
    ok: 'border-status-ok text-status-ok',
    danger: 'border-status-danger text-status-danger',
};
</script>

<template>
    <button
        type="button"
        class="gl-panel border-l-2 p-4 text-left transition hover:bg-brand-soft/40"
        :class="[
            toneClass[tone ?? 'brand'],
            active ? 'ring-2 ring-brand/25 bg-brand-soft/30' : '',
        ]"
        @click="$emit('select')"
    >
        <p class="text-[11px] font-semibold uppercase tracking-wide">{{ label }}</p>
        <p class="mt-1 font-display text-3xl font-bold text-ink">{{ value }}</p>
        <p v-if="hint" class="mt-1 text-xs text-ink-muted">{{ hint }}</p>
    </button>
</template>
