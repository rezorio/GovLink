<script setup lang="ts">
import { ref } from 'vue';
import { Upload } from 'lucide-vue-next';

const ACCEPT = 'application/pdf,image/jpeg,image/png';
const MAX_BYTES = 10 * 1024 * 1024;

const props = defineProps<{
    municipalityId: string;
    barangayId: string;
    loading?: boolean;
}>();

const emit = defineEmits<{
    submit: [payload: { fileKey: string; fileName: string; mimeType: string; fileSizeBytes: number }];
}>();

const error = ref<string | null>(null);
const selectedFile = ref<File | null>(null);

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

function confirmUpload() {
    if (!selectedFile.value) {
        error.value = 'Select a file first.';
        return;
    }
    const file = selectedFile.value;
    const fileKey = `${props.municipalityId}/${props.barangayId}/submissions/${crypto.randomUUID()}/${file.name}`;
    emit('submit', {
        fileKey,
        fileName: file.name,
        mimeType: file.type,
        fileSizeBytes: file.size,
    });
}
</script>

<template>
    <div class="rounded-xl border border-dashed border-slate-300 bg-white p-4">
        <label class="flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-2 text-center">
            <Upload class="h-8 w-8 text-slate-400" />
            <span class="text-sm font-medium text-slate-700">Tap to upload proof</span>
            <span class="text-xs text-slate-500">PDF, JPG, PNG · max 10 MB</span>
            <input
                type="file"
                class="sr-only"
                :accept="ACCEPT"
                capture="environment"
                @change="onFileChange"
            />
        </label>

        <div v-if="selectedFile" class="mt-3 rounded-lg bg-slate-50 p-3 text-sm">
            <p class="font-medium text-slate-900">{{ selectedFile.name }}</p>
            <p class="text-slate-500">{{ Math.round(selectedFile.size / 1024) }} KB</p>
        </div>

        <p v-if="error" class="mt-2 text-sm text-rose-600">{{ error }}</p>

        <button
            type="button"
            class="mt-3 min-h-11 w-full rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            :disabled="!selectedFile || loading"
            @click="confirmUpload"
        >
            Submit evidence
        </button>
    </div>
</template>
