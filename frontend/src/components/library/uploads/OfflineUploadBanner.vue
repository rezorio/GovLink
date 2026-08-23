<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { useOfflineUploadQueue } from '@/composables/useOfflineUploadQueue';

const props = defineProps<{
    token: string;
}>();

const emit = defineEmits<{ synced: [] }>();

const { pendingCount, syncing, lastError, flushQueue, refreshCount } = useOfflineUploadQueue();
const isOnline = ref(typeof navigator !== 'undefined' ? navigator.onLine : true);

async function syncNow() {
    const count = await flushQueue(props.token);
    if (count > 0) {
        emit('synced');
    }
}

function updateOnlineStatus() {
    isOnline.value = navigator.onLine;
}

onMounted(() => {
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
});

onUnmounted(() => {
    window.removeEventListener('online', updateOnlineStatus);
    window.removeEventListener('offline', updateOnlineStatus);
});

defineExpose({ refreshCount });
</script>

<template>
    <div
        v-if="pendingCount > 0"
        class="mb-4 border border-status-warn/40 bg-status-warn/5 px-4 py-3 text-sm"
        style="border-radius: 2px"
    >
        <p class="font-medium text-ink">
            {{ pendingCount }} proof upload{{ pendingCount === 1 ? '' : 's' }} waiting to sync
        </p>
        <p class="mt-1 text-xs text-ink-muted">
            Saved on this device while offline. Sync when you have connectivity.
        </p>
        <p v-if="lastError" class="mt-2 text-xs text-status-danger">{{ lastError }}</p>
        <button
            type="button"
            class="gl-btn-warn mt-3"
            :disabled="syncing || !isOnline"
            @click="syncNow"
        >
            {{ syncing ? 'Syncing…' : 'Sync now' }}
        </button>
    </div>
</template>
