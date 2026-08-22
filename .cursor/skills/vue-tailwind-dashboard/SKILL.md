---
name: vue-tailwind-dashboard
description: Sets Vue 3 Composition API and Tailwind CSS standards for high-density LGU government dashboards — status badge colors, mobile-first field uploads for Android browsers, and slide-over Drawer patterns. Use when building or modifying Vue components, submission views, compliance dashboards, or frontend code under src/components or apps/frontend.
paths:
  - "src/components/**"
  - "apps/frontend/**"
---

# Vue + Tailwind Dashboard (LGU)

Frontend design standards for GovLink: **Vue 3** (`<script setup lang="ts">`), **Tailwind CSS**, high-density government dashboards for municipal and barangay staff.

Complements [ph-lgu-governance](../ph-lgu-governance/SKILL.md) for LGU terminology and [nestjs-multi-tenant](../nestjs-multi-tenant/SKILL.md) for upload constraints (PDF/JPG/PNG, 10MB).

## Stack defaults

- Vue 3 Composition API with `<script setup lang="ts">`
- Tailwind CSS for all styling — no scoped CSS unless animating Drawer transitions
- Icons: **Lucide Vue Next** (preferred) or Heroicons
- Place reusable UI in `src/components/library/[category]/`
- Use Vite raw imports (`?raw`) for stringified component code in code-view tabs

## High-contrast status indicators

**High-Contrast Status Indicators:** Use distinct Tailwind badge colors for LGU staff usability (bg-emerald-500 for Compliant/Approved, bg-amber-500 for Pending, bg-rose-500 for Overdue).

### Status color map (mandatory)

| Status | Tailwind classes | Use for |
|--------|------------------|---------|
| Compliant / Approved | `bg-emerald-500 text-white` | Accepted submissions, on-time compliance, approved reviews |
| Pending | `bg-amber-500 text-white` | Awaiting review, in progress, submitted-not-reviewed |
| Overdue | `bg-rose-500 text-white` | Past deadline, rejected requiring action, escalated items |

### Badge component pattern

Centralize status styling — never invent ad-hoc colors per view.

```vue
<!-- src/components/library/badges/StatusBadge.vue -->
<script setup lang="ts">
type StatusVariant = 'compliant' | 'approved' | 'pending' | 'overdue';

const props = defineProps<{ status: StatusVariant; label?: string }>();

const classes: Record<StatusVariant, string> = {
  compliant: 'bg-emerald-500 text-white',
  approved: 'bg-emerald-500 text-white',
  pending: 'bg-amber-500 text-white',
  overdue: 'bg-rose-500 text-white',
};

const defaultLabels: Record<StatusVariant, string> = {
  compliant: 'Compliant',
  approved: 'Approved',
  pending: 'Pending',
  overdue: 'Overdue',
};
</script>

<template>
  <span
    class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
    :class="classes[status]"
  >
    {{ label ?? defaultLabels[status] }}
  </span>
</template>
```

### Dashboard density rules

- Compliance heatmaps and tables: badge + short label only; full detail in Drawer (see below).
- Pair color with text label — never rely on color alone (accessibility).
- Use `ring-2 ring-offset-1` sparingly for keyboard focus, not as a fourth status color.

Detail: [status-badges.md](status-badges.md)

## Mobile-first field uploads

**Mobile-First Field Uploads:** Ensure all submission views use responsive camera/file-upload flows optimized for mid-range Android mobile browsers used by field workers.

### Requirements

Every submission / evidence-upload view must:

- Work on **320px–428px** viewports without horizontal scroll.
- Offer **camera capture** (`capture="environment"`) and **gallery/file pick** on the same control.
- Use large touch targets: minimum **44×44px** for buttons and drop zones.
- Show upload progress, file name, and size before confirm.
- Enforce client-side limits aligned with backend: **PDF, JPG, PNG only; max 10MB**.
- Degrade gracefully on slow 3G — compress preview thumbnails; do not block UI during presigned upload.
- Support offline queue indicator when sync is pending (barangay connectivity).

### Upload component pattern

```vue
<script setup lang="ts">
const ACCEPT = 'application/pdf,image/jpeg,image/png';
const MAX_BYTES = 10 * 1024 * 1024;

function onFileSelected(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  if (file.size > MAX_BYTES) { /* show error */ return; }
  // Request presigned URL from backend, then PUT to S3
}
</script>

<template>
  <div class="flex flex-col gap-3 sm:flex-row">
    <label class="flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 active:bg-slate-100">
      <input
        type="file"
        class="sr-only"
        :accept="ACCEPT"
        capture="environment"
        @change="onFileSelected"
      />
      <span class="text-sm font-medium text-slate-700">Take photo or choose file</span>
    </label>
  </div>
</template>
```

### Android browser notes

- Test on Chrome Android 90+; avoid APIs unavailable on mid-range devices.
- Prefer `<input type="file">` over custom File System Access API.
- Use `loading="lazy"` on proof thumbnails; PDF opens in new tab or Drawer preview.

Detail: [field-uploads.md](field-uploads.md)

## UI patterns

**UI Patterns:** Prefer slide-over Drawer components over deep modal windows when reviewing file proofs or detailed directives.

### Drawer over modal

| Use Drawer | Use modal (rare) |
|------------|------------------|
| Review submission proof (PDF/image) | Destructive confirm (delete, reject) |
| Read municipal directive details | Short yes/no prompts |
| Compliance item detail + audit trail | Login / session timeout |
| Multi-section form review | |

**Rules:**

- Drawer slides from **right** on desktop (`max-w-lg` or `max-w-2xl` for document preview).
- Full-width sheet from **bottom** on mobile (`fixed inset-x-0 bottom-0 rounded-t-2xl`).
- One Drawer depth only — **no modal stacked on Drawer**.
- Drawer header: title, `StatusBadge`, close button (min 44px).
- Body: scrollable; sticky footer for primary actions (Approve / Return for correction).
- Backdrop `bg-black/40`; close on backdrop tap and Escape.

### Drawer shell pattern

```vue
<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50">
      <div class="fixed inset-0 bg-black/40" @click="emit('close')" />
      <aside
        class="fixed inset-y-0 right-0 flex w-full flex-col bg-white shadow-xl sm:max-w-lg"
        role="dialog"
        aria-modal="true"
      >
        <header class="flex items-center justify-between border-b px-4 py-3">
          <slot name="header" />
          <button type="button" class="min-h-11 min-w-11" @click="emit('close')">×</button>
        </header>
        <div class="flex-1 overflow-y-auto p-4">
          <slot />
        </div>
        <footer v-if="$slots.footer" class="border-t p-4">
          <slot name="footer" />
        </footer>
      </aside>
    </div>
  </Teleport>
</template>
```

Place shared Drawer in `src/components/library/overlays/ReviewDrawer.vue`.

Detail: [drawer-patterns.md](drawer-patterns.md)

## Component layout

```
src/components/                         # or apps/frontend/src/components/
├── library/
│   ├── badges/
│   │   └── StatusBadge.vue
│   ├── overlays/
│   │   └── ReviewDrawer.vue
│   └── uploads/
│       └── FieldUploadInput.vue
└── views/
    └── submissions/
        └── SubmissionReviewView.vue
```

## Implementation checklist

```
- [ ] High-Contrast Status Indicators: emerald/amber/rose badges via StatusBadge
- [ ] Mobile-First Field Uploads: camera + file, 44px targets, PDF/JPG/PNG, 10MB
- [ ] UI Patterns: proof/directive review in Drawer, not nested modals
- [ ] <script setup lang="ts"> on all new components
- [ ] Official LGU terms (Punong Barangay, BDP, AIP) — not generic labels
- [ ] Filipino/English labels on field-facing copy where appropriate
```

## Additional resources

- Status badge variants and table patterns: [status-badges.md](status-badges.md)
- Field upload flows and presign integration: [field-uploads.md](field-uploads.md)
- Drawer layouts and review workflows: [drawer-patterns.md](drawer-patterns.md)
