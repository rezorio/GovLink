<script setup lang="ts">
import { ref } from 'vue';
import { Upload } from 'lucide-vue-next';
import { confirmUpload, putToPresignedUrl, requestPresign } from '@/api/uploads';

const ACCEPT = 'application/pdf,image/jpeg,image/png';
const MAX_BYTES = 10 * 1024 * 1024;

const props = defineProps<{
    token: string;
    loading?: boolean;
}>();

const emit = defineEmits<{
    submit: [payload: { fileKey: string; fileName: string; mimeType: string; fileSizeBytes: number }];
}>();

const error = ref<string | null>(null);
const selectedFile = ref<File | null>(null);
const progress = ref(0);
const uploading = ref(false);

function validateFile(file: File): string | null {
    if (!ACCEPT.split(',').includes(file.type)) {
        return 'Only PDF, JPG, and PNG files are allowed.';
    }
    if (file.size > MAX_BYTES) {
        return 'File must be 10 MB or smaller.';
    }
    return null;
}

function onFileChange(event: Event) {
    error.value = null;
    progress.value = 0;
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
        selectedFile.value = null;
        return;
    }
    const validationError = validateFile(file);
    if (validationError) {
        error.value = validationError;
        selectedFile.value = null;
        input.value = '';
        return;
    }
    selectedFile.value = file;
}

async function confirmAndSubmit() {
    if (!selectedFile.value) {
        error.value = 'Select a file first.';
        return;
    }
    const file = selectedFile.value;
    uploading.value = true;
    error.value = null;
    progress.value = 0;
    try {
        const presign = await requestPresign(props.token, {
            filename: file.name,
            contentType: file.type,
            contentLength: file.size,
            entityType: 'submissions',
        });
        await putToPresignedUrl(presign.uploadUrl, file, (pct) => {
            progress.value = pct;
        });
        await confirmUpload(props.token, presign.fileKey);
        emit('submit', {
            fileKey: presign.fileKey,
            fileName: file.name,
            mimeType: file.type,
            fileSizeBytes: file.size,
        });
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Upload failed';
    } finally {
        uploading.value = false;
    }
}
</script>

<template>
    <div class="border border-dashed border-rule bg-paper p-4" style="border-radius: 2px">
        <label class="flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-2 text-center">
            <Upload class="h-8 w-8 text-brand" />
            <span class="text-sm font-medium text-ink">Tap to upload proof</span>
            <span class="text-xs text-ink-muted">PDF, JPG, PNG · max 10 MB</span>
            <input
                type="file"
                class="sr-only"
                :accept="ACCEPT"
                capture="environment"
                @change="onFileChange"
            />
        </label>

        <div
            v-if="selectedFile"
            class="mt-3 border border-rule bg-surface p-3 text-sm"
            style="border-radius: 2px"
        >
            <p class="font-medium text-ink">{{ selectedFile.name }}</p>
            <p class="text-ink-muted">{{ Math.round(selectedFile.size / 1024) }} KB</p>
            <div v-if="uploading" class="mt-2 h-2 overflow-hidden bg-brand-soft">
                <div class="h-full bg-brand transition-all" :style="{ width: `${progress}%` }" />
            </div>
            <p v-if="uploading" class="mt-1 text-xs text-ink-muted">Uploading… {{ progress }}%</p>
        </div>

        <p v-if="error" class="mt-2 text-sm text-status-danger">{{ error }}</p>

        <button
            type="button"
            class="gl-btn-primary mt-3 w-full disabled:opacity-50"
            :disabled="!selectedFile || loading || uploading"
            @click="confirmAndSubmit"
        >
            {{ uploading ? 'Uploading…' : 'Submit evidence' }}
        </button>
    </div>
</template>
