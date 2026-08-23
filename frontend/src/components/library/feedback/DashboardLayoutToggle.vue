<script setup lang="ts">
import { LayoutPanelTop } from 'lucide-vue-next';
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useDashboardLayout } from '@/composables/useDashboardLayout';

const route = useRoute();
const { layout, toggle } = useDashboardLayout();

const visible = computed(() => route.name === 'mayor');
</script>

<template>
    <button
        v-if="visible"
        type="button"
        class="gl-density-toggle gl-density-toggle-stack"
        :aria-pressed="layout === 'focused'"
        :title="
            layout === 'focused'
                ? 'Switch to stacked urgent dashboard'
                : 'Switch to focused urgent dashboard'
        "
        @click="toggle"
    >
        <LayoutPanelTop class="h-4 w-4 shrink-0" aria-hidden="true" />
        <span class="min-w-0">
            <span class="block text-[10px] font-semibold uppercase tracking-[0.14em] opacity-80">
                Temp layout
            </span>
            <span class="block text-xs font-semibold">
                {{ layout === 'focused' ? 'Focused · urgent' : 'Stacked · urgent' }}
            </span>
        </span>
    </button>
</template>
