<script setup lang="ts">
import { Palette } from 'lucide-vue-next';
import { useCivicDensity } from '@/composables/useCivicDensity';

const { density, toggle } = useCivicDensity();
</script>

<template>
    <button
        type="button"
        class="gl-density-toggle"
        :aria-pressed="density === 'alive'"
        :title="
            density === 'alive'
                ? 'Switch to classic (flat) design'
                : 'Switch to alive (inked) design'
        "
        @click="toggle"
    >
        <Palette class="h-4 w-4 shrink-0" aria-hidden="true" />
        <span class="min-w-0">
            <span class="block text-[10px] font-semibold uppercase tracking-[0.14em] opacity-80">
                Temp design
            </span>
            <span class="block text-xs font-semibold">
                {{ density === 'alive' ? 'Alive · on' : 'Classic · on' }}
            </span>
        </span>
    </button>
</template>
