<script setup lang="ts">
import type { ComplianceStatus } from '@/types';
import { complianceStatusLabel, heatCellClass } from '@/utils/compliance-status';

defineProps<{
    status?: ComplianceStatus | null;
    code?: string;
}>();
</script>

<template>
    <span
        v-if="status"
        :class="heatCellClass(status)"
        :title="`${code ? code + ' — ' : ''}${complianceStatusLabel(status)}`"
        role="img"
        :aria-label="`${code ? code + ': ' : ''}${complianceStatusLabel(status)}`"
    >
        {{ complianceStatusLabel(status) }}
    </span>
    <span
        v-else
        class="gl-heat-cell gl-heat-empty"
        :title="code ? `${code} — no instance` : 'No instance'"
        aria-hidden="true"
    >
        —
    </span>
</template>
