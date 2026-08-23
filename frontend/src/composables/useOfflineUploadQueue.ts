import { onMounted, onUnmounted, ref } from 'vue';
import { submitEvidence } from '@/api/assignments';
import { confirmUpload, putToPresignedUrl, requestPresign } from '@/api/uploads';
import {
    countQueuedEvidenceUploads,
    listQueuedEvidenceUploads,
    removeQueuedEvidenceUpload,
    type QueuedEvidenceUpload,
} from '@/utils/offline-upload-queue';

export function useOfflineUploadQueue() {
    const pendingCount = ref(0);
    const syncing = ref(false);
    const lastError = ref<string | null>(null);

    async function refreshCount() {
        pendingCount.value = await countQueuedEvidenceUploads();
    }

    async function flushQueue(token: string): Promise<number> {
        if (syncing.value) {
            return 0;
        }
        syncing.value = true;
        lastError.value = null;
        let synced = 0;

        try {
            const queue = await listQueuedEvidenceUploads();
            for (const item of queue) {
                await uploadQueuedItem(token, item);
                await removeQueuedEvidenceUpload(item.id);
                synced += 1;
            }
        } catch (err) {
            lastError.value = err instanceof Error ? err.message : 'Offline sync failed';
        } finally {
            syncing.value = false;
            await refreshCount();
        }

        return synced;
    }

    async function uploadQueuedItem(token: string, item: QueuedEvidenceUpload) {
        const presign = await requestPresign(token, {
            filename: item.fileName,
            contentType: item.mimeType,
            contentLength: item.fileSizeBytes,
            entityType: 'submissions',
        });
        await putToPresignedUrl(presign.uploadUrl, item.blob);
        await confirmUpload(token, presign.fileKey);
        await submitEvidence(token, item.assignmentId, {
            fileKey: presign.fileKey,
            fileName: item.fileName,
            mimeType: item.mimeType,
            fileSizeBytes: item.fileSizeBytes,
        });
    }

    function onOnline() {
        void refreshCount();
    }

    onMounted(() => {
        void refreshCount();
        window.addEventListener('online', onOnline);
    });

    onUnmounted(() => {
        window.removeEventListener('online', onOnline);
    });

    return {
        pendingCount,
        syncing,
        lastError,
        refreshCount,
        flushQueue,
    };
}
