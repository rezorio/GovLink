<script setup lang="ts">
import { Search } from 'lucide-vue-next';
import {
    SGLG_BAND_OPTIONS,
    SGLG_SORT_OPTIONS,
    type SglgBandFilter,
    type SglgBarangaySort,
} from '@/utils/sglg-barangay-ranking';

defineProps<{
    search: string;
    band: SglgBandFilter;
    sort: SglgBarangaySort;
    resultCount: number;
    totalCount: number;
}>();

const emit = defineEmits<{
    'update:search': [value: string];
    'update:band': [value: SglgBandFilter];
    'update:sort': [value: SglgBarangaySort];
}>();
</script>

<template>
    <div class="border-b border-rule bg-surface px-4 pt-3 sm:px-5">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label class="min-w-0 flex-1">
                <span class="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    Search
                </span>
                <div class="relative">
                    <Search
                        class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
                        aria-hidden="true"
                    />
                    <input
                        type="search"
                        class="min-h-11 w-full border border-rule bg-paper pl-10 pr-3 text-sm text-ink placeholder:text-ink-muted/70 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                        style="border-radius: 2px"
                        placeholder="Barangay name…"
                        :value="search"
                        @input="emit('update:search', ($event.target as HTMLInputElement).value)"
                    />
                </div>
            </label>

            <label class="sm:w-56">
                <span class="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    Sort
                </span>
                <select
                    class="min-h-11 w-full border border-rule bg-paper px-3 text-sm text-ink focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                    style="border-radius: 2px"
                    :value="sort"
                    @change="emit('update:sort', ($event.target as HTMLSelectElement).value as SglgBarangaySort)"
                >
                    <option v-for="opt in SGLG_SORT_OPTIONS" :key="opt.id" :value="opt.id">
                        {{ opt.label }}
                    </option>
                </select>
            </label>
        </div>

        <div class="mt-3 flex flex-wrap items-end justify-between gap-3">
            <div class="flex flex-wrap gap-5" role="tablist" aria-label="Score band">
                <button
                    v-for="opt in SGLG_BAND_OPTIONS"
                    :key="opt.id"
                    type="button"
                    role="tab"
                    class="gl-tab"
                    :class="band === opt.id ? 'gl-tab-active' : ''"
                    :aria-selected="band === opt.id"
                    @click="emit('update:band', opt.id)"
                >
                    {{ opt.label }}
                </button>
            </div>
            <p class="pb-2 text-xs text-ink-muted">
                Showing
                <span class="font-semibold text-ink">{{ resultCount }}</span>
                of {{ totalCount }}
            </p>
        </div>
    </div>
</template>
