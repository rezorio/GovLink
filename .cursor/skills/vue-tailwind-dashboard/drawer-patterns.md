# Drawer Patterns

## When to use ReviewDrawer

**UI Patterns:** Prefer slide-over Drawer components over deep modal windows when reviewing file proofs or detailed directives.

### Review submission proof

```vue
<ReviewDrawer :open="drawerOpen" @close="drawerOpen = false">
  <template #header>
    <div class="flex items-center gap-2">
      <h2 class="text-base font-semibold">Semestral Report — Brgy. San Jose</h2>
      <StatusBadge status="pending" />
    </div>
  </template>

  <div class="space-y-4">
    <iframe
      v-if="proofIsPdf"
      :src="proofUrl"
      class="h-[60vh] w-full rounded border"
      title="Submission proof"
    />
    <img
      v-else
      :src="proofUrl"
      alt="Submission proof"
      class="max-h-[60vh] w-full rounded object-contain"
      loading="lazy"
    />
    <dl class="grid grid-cols-2 gap-2 text-sm">
      <dt class="text-slate-500">Submitted</dt>
      <dd>{{ submittedAt }}</dd>
      <dt class="text-slate-500">Submitted by</dt>
      <dd>{{ submitterName }}</dd>
    </dl>
  </div>

  <template #footer>
    <div class="flex gap-2">
      <button class="min-h-11 flex-1 rounded-lg border" @click="returnForCorrection">
        Return for correction
      </button>
      <button class="min-h-11 flex-1 rounded-lg bg-emerald-600 text-white" @click="approve">
        Approve
      </button>
    </div>
  </template>
</ReviewDrawer>
```

### Municipal directive detail

- Drawer body: directive text, legal basis (RA section / DILG MC), assigned barangays list.
- Footer: Acknowledge (barangay) or Assign follow-up (municipal).

## Mobile bottom sheet variant

On `sm` breakpoint and below, use bottom sheet animation:

```vue
<aside
  class="fixed inset-x-0 bottom-0 max-h-[90vh] rounded-t-2xl bg-white sm:inset-y-0 sm:right-0 sm:max-h-none sm:max-w-lg sm:rounded-none"
>
```

## Forbidden patterns

- Modal opening another modal for "View proof"
- Full-page navigation for read-only review that loses table context
- Drawer width `max-w-4xl` on mobile (use full width)
- Nested Drawers (close first before opening second)

## Focus management

- Trap focus inside Drawer while open
- Return focus to triggering "Review" button on close
- `aria-modal="true"` and labelled heading

## Transition

Use Vue `<Transition name="drawer">` with `transform translate-x-full → translate-x-0` (desktop) or `translate-y-full → translate-y-0` (mobile).
