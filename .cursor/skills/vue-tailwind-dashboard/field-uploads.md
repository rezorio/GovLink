# Mobile-First Field Uploads

## Submission view layout

```vue
<template>
  <div class="mx-auto max-w-lg space-y-4 p-4 pb-24">
    <h1 class="text-lg font-semibold text-slate-900">Submit Evidence</h1>
    <StatusBadge :status="submissionStatus" />

    <FieldUploadInput
      v-model:files="files"
      label="Proof of Barangay Assembly"
      hint="PDF or photo (JPG/PNG), max 10MB"
      @upload-complete="onUploadComplete"
    />

    <div class="fixed inset-x-0 bottom-0 border-t bg-white p-4 safe-area-pb">
      <button
        type="button"
        class="min-h-11 w-full rounded-lg bg-blue-600 font-medium text-white disabled:opacity-50"
        :disabled="!canSubmit"
        @click="submit"
      >
        Submit for Review
      </button>
    </div>
  </div>
</template>
```

## FieldUploadInput responsibilities

1. Render camera + gallery via single `<input type="file" accept="..." capture="environment">`
2. Validate MIME and size before presign request
3. Call `POST /uploads/presign` (see nestjs-multi-tenant skill)
4. PUT file to S3 with progress bar
5. Call confirm endpoint; emit `upload-complete` with `fileKey`
6. Show retry on network failure; queue locally if offline module exists

## Composable sketch

```typescript
// src/composables/usePresignedUpload.ts
export function usePresignedUpload() {
  const progress = ref(0);
  const error = ref<string | null>(null);

  async function upload(file: File): Promise<string> {
    error.value = null;
    const { uploadUrl, fileKey } = await api.post('/uploads/presign', {
      filename: file.name,
      contentType: file.type,
      contentLength: file.size,
      entityType: 'compliance_submission',
    });
    await axios.put(uploadUrl, file, {
      headers: { 'Content-Type': file.type },
      onUploadProgress: (e) => {
        progress.value = Math.round((e.loaded / (e.total ?? 1)) * 100);
      },
    });
    await api.post('/uploads/confirm', { fileKey });
    return fileKey;
  }

  return { progress, error, upload };
}
```

## Mid-range Android checklist

```
- [ ] Tested on 360×640 viewport (Chrome DevTools + real device if possible)
- [ ] No hover-only interactions
- [ ] Primary action fixed to bottom on mobile
- [ ] File input works with camera rear lens (capture="environment")
- [ ] Error messages plain language (Tagalog optional): "File too large. Maximum 10MB."
- [ ] Progress visible during upload on slow network
```

## Preview in Drawer

After upload, thumbnail or PDF icon in list; tap opens **ReviewDrawer** — not a new modal.
