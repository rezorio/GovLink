<script setup lang="ts">
withDefaults(
    defineProps<{
        rows?: number;
    }>(),
    { rows: 5 },
);
</script>

<template>
    <div class="gl-panel overflow-hidden" aria-busy="true" aria-label="Loading">
        <article
            v-for="n in rows"
            :key="n"
            class="gl-ledger-row pl-5"
        >
            <span class="gl-skeleton-rail" aria-hidden="true" />
            <div class="space-y-2 sm:col-span-2">
                <div class="gl-skeleton-line gl-skeleton-line-md" />
                <div class="gl-skeleton-line gl-skeleton-line-sm" />
                <div class="gl-skeleton-line gl-skeleton-line-lg" />
            </div>
        </article>
    </div>
</template>
