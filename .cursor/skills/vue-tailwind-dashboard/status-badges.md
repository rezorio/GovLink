# Status Badges & Dashboard Density

> Aligned with the locked civic design system: [DESIGN-SYSTEM.md](../../context/DESIGN-SYSTEM.md)

## Status mapping

Map backend states to `StatusBadge` variants (tint + ring + uppercase label — not solid pills):

| Backend state | Badge variant | Token |
|---------------|---------------|-------|
| `accepted`, `compliant`, `approved`, `ACCEPTED` | `approved` | `--ok` / `status-ok` |
| `submitted`, `in_review`, `pending`, `IN_PROGRESS`, `SUBMITTED`, `NOT_STARTED` | `pending` | `--warn` / `status-warn` |
| `overdue`, `returned`, `rejected`, `escalated`, `OVERDUE`, `RETURNED` | `overdue` | `--danger` / `status-danger` |

Use `pending` for in-review. Use `overdue` for returned-for-correction — staff must act.

Always show a text label. Pair list rows with `.gl-rail-ok|warn|danger`.

## Ledger / table density

Prefer `.gl-panel` + `.gl-ledger-row` for barangay lists. For dense mayor tables:

```vue
<tr class="border-b border-rule hover:bg-brand-soft/40">
  <td class="px-3 py-2 text-sm font-medium text-ink">Barangay San Jose</td>
  <td class="px-3 py-2 text-sm text-ink-muted">Semestral Report</td>
  <td class="px-3 py-2">
    <StatusBadge status="overdue" label="Returned" />
  </td>
  <td class="px-3 py-2 text-sm text-ink-muted">3 days overdue</td>
</tr>
```

## Mayor compliance heatmap

- Cell tint via status tokens (`status-ok/5`, `status-warn/5`, `status-danger/5`) plus centered `StatusBadge`.
- Sticky first column for 40+ barangay grids; horizontal scroll on mobile.

## Accessibility

- Badge always includes visible text.
- Contrast: status text on soft tint meets WCAG AA for UI labels.
- Do not use pulsing animations on overdue.

## Anti-patterns

- Do not use solid `rounded-full` emerald/amber/rose chips as the default badge style.
- Do not invent a fourth status color.
- Do not show status as a colored dot only.
