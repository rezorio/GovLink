---
name: vue-tailwind-dashboard
description: Sets Vue 3 Composition API and Tailwind CSS standards for GovLink LGU dashboards using the locked civic design system (ledger panels, seal teal, Bricolage + Source Sans 3), plus status badges, field uploads, and drawers. Use when building or modifying Vue components under frontend/ or src/components.
paths:
  - "frontend/**"
  - "src/components/**"
  - "apps/frontend/**"
---

# Vue + Tailwind Dashboard (LGU)

Frontend standards for GovLink: **Vue 3** (`<script setup lang="ts">`), **Tailwind CSS**, and the **locked civic design system**.

**Canonical design doc:** [../../context/DESIGN-SYSTEM.md](../../context/DESIGN-SYSTEM.md)  
**Cursor rule:** `.cursor/rules/govlink-civic-ui.mdc` (globs `frontend/**`)

Complements [ph-lgu-governance](../ph-lgu-governance/SKILL.md) for LGU terminology and [nestjs-multi-tenant](../nestjs-multi-tenant/SKILL.md) for upload constraints (PDF/JPG/PNG, 10MB).

## Stack defaults

- Vue 3 Composition API with `<script setup lang="ts">`
- Tokens + utilities: `frontend/src/style.css`, `frontend/tailwind.config.js`
- Icons: **Lucide Vue Next** (preferred) or Heroicons
- Reusable UI: `frontend/src/components/library/[category]/`
- Fonts: **Bricolage Grotesque** (display) + **Source Sans 3** (UI) — never Inter/Roboto/Arial as primary

## Civic design system (mandatory)

Direction: *municipal ledger on cool paper* — cool mint-stone canvas, forest ink, seal teal. Not generic SaaS admin chrome.

| Do | Don't |
|----|--------|
| `.gl-panel` ledger lists + status rails | Stacked white `rounded-xl shadow-sm` card grids |
| `.gl-tab` underline filters | Dark filled / `rounded-full` pill filters |
| `paper` / `ink` / `brand` / `status-*` tokens | Ad-hoc slate-50 / purple / cream+terracotta |
| Hero-level **GovLink** wordmark in shell/login | Brand only as tiny nav text |
| Soft page atmosphere from `style.css` body | Flat single-color gray-only backgrounds |

Reuse: `AppShell.vue`, `StatusBadge.vue`, `.gl-btn-primary|secondary|warn`, `.gl-ledger-row`, `.gl-rail`.

Full token table, motion, and rollout: [DESIGN-SYSTEM.md](../../context/DESIGN-SYSTEM.md).

## High-contrast status indicators

Use `StatusBadge.vue` only. Soft tint + inset ring + uppercase label. Pair with list **status rails** (`gl-rail-ok|warn|danger`).

| Variant | Token | Use for |
|---------|-------|---------|
| `approved` | `--ok` / `status-ok` | Accepted, compliant |
| `pending` | `--warn` / `status-warn` | In progress, submitted, awaiting review |
| `overdue` | `--danger` / `status-danger` | Overdue, returned, action needed |

Never invent ad-hoc badge colors per view. Never rely on color alone — always show a text label.

### Dashboard density

- Heatmaps/tables: badge + short label; detail in Drawer.
- Prefer ledger density over card chrome.
- Focus rings for a11y only — not a fourth status color.

Detail: [status-badges.md](status-badges.md)

## Mobile-first field uploads

**Mobile-First Field Uploads:** Camera/file flows for mid-range Android browsers used by field workers.

Every evidence-upload view must:

- Work on **320px–428px** without horizontal scroll
- `capture="environment"` + gallery on the same control
- Touch targets ≥ **44×44px**
- Progress, file name, size before confirm
- **PDF, JPG, PNG only; max 10MB** (client + server)
- Presign → PUT → confirm (see nestjs-multi-tenant uploads)

Use `frontend/src/components/library/uploads/EvidenceUpload.vue` and restyle with civic tokens when touching it.

Detail: [field-uploads.md](field-uploads.md)

## UI patterns — Drawer over modal

| Use Drawer | Use modal (rare) |
|------------|------------------|
| Review proof / compliance detail | Destructive confirm |
| Directive details | Short yes/no |
| Accept / return actions | Login / session timeout |

Rules: slide from right (desktop); one depth only; sticky footer for primary actions; backdrop close + Escape.

Detail: [drawer-patterns.md](drawer-patterns.md)

## Component layout

```
frontend/src/components/library/
├── badges/StatusBadge.vue
├── drawer/ReviewDrawer.vue
├── drawer/ComplianceReviewDrawer.vue
├── layout/AppShell.vue
└── uploads/EvidenceUpload.vue
```

## Implementation checklist

```
- [ ] Civic tokens + DESIGN-SYSTEM.md followed
- [ ] StatusBadge + rails (not ad-hoc chips)
- [ ] Ledger panels for lists (not generic card stacks)
- [ ] Mobile uploads: camera + file, 44px, PDF/JPG/PNG, 10MB
- [ ] Review in Drawer, not nested modals
- [ ] <script setup lang="ts">
- [ ] Official LGU terms (Punong Barangay, BDP, AIP)
```

## Additional resources

- Design system (locked): [../../context/DESIGN-SYSTEM.md](../../context/DESIGN-SYSTEM.md)
- Status badges: [status-badges.md](status-badges.md)
- Field uploads: [field-uploads.md](field-uploads.md)
- Drawers: [drawer-patterns.md](drawer-patterns.md)
