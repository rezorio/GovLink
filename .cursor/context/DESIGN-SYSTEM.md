# GovLink — Civic Design System

> **Status:** Canonical UI language for all frontend work  
> **Last updated:** 2026-08-24  
> **Direction:** “Municipal ledger on cool paper” — Awwwards-level craft, civic/professional authority

This is the **locked** visual system. Do not revert to generic slate/white SaaS cards, Inter/Roboto stacks, purple gradients, or cream+terracotta clichés.

Implementation source of truth: `frontend/src/style.css`, `frontend/tailwind.config.js`, `frontend/index.html`.

---

## Density preview (temporary)

A floating **Temp design** toggle switches:

| Mode | Attribute | Feel |
|------|-----------|------|
| **Alive** (default) | `html[data-civic-density="alive"]` | Deeper paper, seal gold, tinted ledger rows, inked header/summary |
| **Classic** | `html[data-civic-density="classic"]` | Previous flatter paper panels |

Preference is stored in `localStorage` key `govlink-civic-density`. Remove `CivicDensityToggle.vue` when the choice is locked.

### Dashboard layout preview (temporary)

On `/mayor` only, a second floating **Temp layout** toggle switches:

| Mode | Key | Feel |
|------|-----|------|
| **Focused** (default) | `govlink-dashboard-layout=focused` | Progressive workspace tabs + **hybrid heat matrix** (legend, category tabs, expand row) |
| **Stacked** | `govlink-dashboard-layout=stacked` | Classic all-sections layout + **badge matrix table** |

Remove `DashboardLayoutToggle.vue` when the choice is locked.

---

## Brand test

On branded screens (login, shell), **GovLink** must read as a hero-level signal. If removing the nav would make the first viewport feel like any other admin template, branding is too weak.

---

## Typography

| Role | Family | Usage |
|------|--------|--------|
| Display | **Bricolage Grotesque** | Brand wordmark, page titles, obligation/task titles (`.font-display`) |
| UI | **Source Sans 3** | Body, labels, filters, buttons, badges |

Loaded via Google Fonts in `frontend/index.html`. Do not introduce Inter, Roboto, Arial, or system-ui as the primary stack.

---

## Color tokens (`:root` / Tailwind)

| Token | Classic hex | Alive hex | Tailwind | Use |
|-------|-------------|-----------|----------|-----|
| `--paper` | `#EEF2EF` | `#DFEAE4` | `paper` | Page canvas |
| `--surface` | `#F7FAF8` | `#F3F9F6` | `surface` | Ledger panels, forms |
| `--ink` | `#0B1F1A` | `#071612` | `ink` | Primary text |
| `--ink-muted` | `#3D524C` | `#345048` | `ink-muted` | Secondary copy |
| `--rule` | `#C5D0CB` | `#AEBFC0` | `rule` | Hairline borders |
| `--brand` | `#0F6B5C` | `#0C5F52` | `brand` | CTAs, active nav, accents |
| `--brand-soft` | `#D8EBE6` | `#C5E4DC` | `brand-soft` | Soft washes / hover |
| `--seal` | `#C4A035` | `#D4A017` | `seal` | Official seal gold (rules, ticks — never status) |
| `--seal-soft` | `#F3E6C0` | `#F5E4B0` | `seal-soft` | Soft seal wash |
| `--ok` | `#047857` | `#046C4E` | `status-ok` | Accepted / compliant |
| `--warn` | `#B45309` | `#A34A08` | `status-warn` | Pending / in progress |
| `--danger` | `#BE123C` | `#B01036` | `status-danger` | Overdue / returned |

**Forbidden defaults:** purple/indigo theme, flat `#F8FAFC` + slate-900 admin chrome, cream `#F4F1EA` + terracotta + display serif combo, dark-mode-first shells, glow effects, `rounded-full` pill clusters.

---

## Atmosphere

Page background uses soft teal/ink radial washes plus a subtle diagonal rule pattern (`style.css` `body`). Prefer atmosphere over flat gray. Decorative gradients alone are not a substitute for clear hierarchy.

Alive mode strengthens washes, panel edges, shell header brand rule + seal gold accent bar.

---

## Layout patterns

### App shell
- Large **GovLink** wordmark (display font)
- Small uppercase tracking label (“Municipal supervision”)
- Page title + subtitle
- Underline **tabs** for secondary nav (`.gl-tab` / `.gl-tab-active`) — not dark filled pills
- Header uses `.gl-shell-header`

### Lists (directives, compliance)
- One continuous **ledger panel** (`.gl-panel`) — not stacked rounded white cards
- Rows (`.gl-ledger-row`) separated by hairline `--rule`
- **3–4px left status rail** (`.gl-rail` + ok/warn/danger) — always a **child** `<span class="gl-rail">` inside `.gl-ledger-row`
- Alive: soft row tint via `:has(.gl-rail-*)`
- Actions use `.gl-btn-primary` / `.gl-btn-secondary` / `.gl-btn-warn` (2px radius, not pill)

### Summary strips
- Use `.gl-summary-strip` for oversight totals (not orphan muted paragraphs)
- Section titles use `.gl-section-label` (alive adds seal tick)

### Empty / notice
- Use `LedgerNotice.vue` (`.gl-ledger-notice`) inside ledger panels

### Status badges
- Use `StatusBadge.vue` only (`.gl-status-badge`)
- Soft tint + inset ring + uppercase label (not solid `rounded-full` chips)
- Always pair color with visible text

### Cards
Default: **no cards**. Use ledger/panel. Cards only when they wrap a discrete interactive control that needs a container.

---

## Motion (required presence)

1. Row enter: fade + 6px translateY, staggered ≤40ms (cap ~8) — `.gl-ledger-row`
2. Status rail: `scaleY` paint-in — `.gl-rail`
3. Active tab underline: ink slide — `.gl-tab-active::after`

Keep motion purposeful; no pulse on overdue, no decorative parallax.

---

## Components to reuse

| Piece | Path |
|-------|------|
| Shell | `frontend/src/components/library/layout/AppShell.vue` |
| Badge | `frontend/src/components/library/badges/StatusBadge.vue` |
| Empty notice | `frontend/src/components/library/feedback/LedgerNotice.vue` |
| Density toggle (temp) | `frontend/src/components/library/feedback/CivicDensityToggle.vue` |
| Density composable | `frontend/src/composables/useCivicDensity.ts` |
| CSS utilities | `frontend/src/style.css` (`.gl-*`) |
| Tokens | `frontend/tailwind.config.js` |

When building new views: extend this system; do not invent a parallel palette or card language.

---

## Rollout status

| Surface | Civic system |
|---------|----------------|
| Login | Done (+ density) |
| AppShell | Done (+ density) |
| Barangay compliance | Done |
| Barangay directive inbox | Done |
| Mayor dashboard | Done |
| Mayor SGLG readiness | Done |
| Mayor procurement | Done (+ summary strip / notice) |
| Barangay procurement | Done |
| Drawers / uploads | Done |
| Density toggle | Temporary |

---

## Agent / contributor checklist

Before shipping UI:

- [ ] Uses `--*` / Tailwind `paper|ink|brand|seal|status-*` tokens
- [ ] Display titles use `font-display` / Bricolage
- [ ] Lists are ledger panels, not generic card stacks
- [ ] Status via `StatusBadge` + rail when in a list
- [ ] Empties use `LedgerNotice` where practical
- [ ] Brand “GovLink” visible at hero strength on shell/login
- [ ] No Inter/Roboto; no purple theme; no `rounded-full` filter pills
