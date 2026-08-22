# Status Badges & Dashboard Density

## Extended status mapping

Map backend states to the three mandatory badge colors:

| Backend state | Badge variant | Color |
|---------------|---------------|-------|
| `accepted`, `compliant`, `approved` | `approved` / `compliant` | `bg-emerald-500` |
| `submitted`, `in_review`, `pending`, `draft` | `pending` | `bg-amber-500` |
| `overdue`, `returned`, `rejected`, `escalated` | `overdue` | `bg-rose-500` |

Use `pending` for in-review (not amber vs yellow confusion). Use `overdue` for returned-for-correction — staff must act.

## High-density table row

```vue
<tr class="border-b border-slate-200 hover:bg-slate-50">
  <td class="px-3 py-2 text-sm font-medium text-slate-900">Barangay San Jose</td>
  <td class="px-3 py-2 text-sm text-slate-600">Semestral Report</td>
  <td class="px-3 py-2">
    <StatusBadge status="overdue" />
  </td>
  <td class="px-3 py-2 text-sm text-slate-500">3 days overdue</td>
  <td class="px-3 py-2">
    <button class="text-sm font-medium text-blue-600" @click="openDrawer(row)">
      Review
    </button>
  </td>
</tr>
```

## Mayor compliance heatmap

- Cell background: subtle tint (`bg-emerald-50`, `bg-amber-50`, `bg-rose-50`) plus centered `StatusBadge`.
- Row/column headers: sticky on scroll for 40+ barangay grids.
- Minimum cell size on mobile: scroll horizontally with first column pinned.

## Accessibility

- Badge always includes visible text (Compliant, Pending, Overdue).
- `aria-label` on icon-only controls elsewhere; badges are self-describing.
- Contrast: white text on `emerald-500`, `amber-500`, `rose-500` meets WCAG AA for normal text at `text-xs font-semibold`.

## Anti-patterns

- Do not use `bg-green-400`, `bg-yellow-400`, or `bg-red-400` — stick to the 500 palette.
- Do not use pulsing animations on overdue badges (causes alert fatigue).
- Do not show status as colored dot only without label.
