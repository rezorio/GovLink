<script setup lang="ts">
withDefaults(
    defineProps<{
        size?: 'sm' | 'lg';
    }>(),
    { size: 'sm' },
);
</script>

<template>
    <div class="inline-flex items-center" :class="size === 'lg' ? 'gap-3' : 'gap-2'">
        <img
            src="/brand/govlink-icon.svg"
            alt=""
            aria-hidden="true"
            class="shrink-0"
            :class="size === 'lg' ? 'h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem]' : 'h-11 w-11 sm:h-12 sm:w-12'"
        />
        <span
            class="font-display font-bold tracking-tight text-ink"
            :class="size === 'lg' ? 'text-5xl sm:text-6xl' : 'text-3xl sm:text-4xl'"
        >
            GovLink
        </span>
    </div>
</template>
