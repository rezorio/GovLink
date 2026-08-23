<script setup lang="ts">
import LoadingSpinner from '@/components/library/feedback/LoadingSpinner.vue';

const props = defineProps<{
    page: number;
    totalPages: number;
    total: number;
    pageSize: number;
    loading?: boolean;
}>();

const emit = defineEmits<{
    'update:page': [page: number];
}>();

function goTo(page: number) {
    if (props.loading || page < 1 || page > props.totalPages || page === props.page) {
        return;
    }
    emit('update:page', page);
}

const rangeStart = () => (props.total === 0 ? 0 : (props.page - 1) * props.pageSize + 1);
const rangeEnd = () => Math.min(props.page * props.pageSize, props.total);
</script>

<template>
    <div class="flex flex-wrap items-center justify-between gap-3 border-t border-rule px-4 py-3 text-sm text-ink-muted">
        <p>
            <template v-if="total > 0">
                Showing {{ rangeStart() }}–{{ rangeEnd() }} of {{ total }}
            </template>
            <template v-else>No results</template>
        </p>
        <div class="flex items-center gap-2">
            <LoadingSpinner v-if="loading" size="sm" />
            <button
                type="button"
                class="gl-btn-secondary min-h-9 px-3 py-1 text-xs"
                :disabled="loading || page <= 1"
                @click="goTo(page - 1)"
            >
                Previous
            </button>
            <span class="min-w-[4.5rem] text-center text-xs font-semibold text-ink">
                {{ page }} / {{ totalPages }}
            </span>
            <button
                type="button"
                class="gl-btn-secondary min-h-9 px-3 py-1 text-xs"
                :disabled="loading || page >= totalPages"
                @click="goTo(page + 1)"
            >
                Next
            </button>
        </div>
    </div>
</template>
