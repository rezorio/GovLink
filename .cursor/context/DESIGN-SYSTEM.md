# GovLink — Civic Design System

> **Status:** Canonical UI language for all frontend work  
> **Last updated:** 2026-08-23  
> **Direction:** “Municipal ledger on cool paper” — Awwwards-level craft, civic/professional authority

This is the **locked** visual system. Do not revert to generic slate/white SaaS cards, Inter/Roboto stacks, purple gradients, or cream+terracotta clichés.

Implementation source of truth: `frontend/src/style.css`, `frontend/tailwind.config.js`, `frontend/index.html`.

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

| Token | Hex | Tailwind | Use |
|-------|-----|----------|-----|
| `--paper` | `#EEF2EF` | `paper` | Page canvas |
| `--surface` | `#F7FAF8` | `surface` | Ledger panels, forms |
| `--ink` | `#0B1F1A` | `ink` | Primary text |
| `--ink-muted` | `#3D524C` | `ink-muted` | Secondary copy |
| `--rule` | `#C5D0CB` | `rule` | Hairline borders |
| `--brand` | `#0F6B5C` | `brand` | CTAs, active nav, accents |
| `--brand-soft` | `#D8EBE6` | `brand-soft` | Soft washes / hover |
| `--ok` | `#047857` | `status-ok` | Accepted / compliant |
| `--warn` | `#B45309` | `status-warn` | Pending / in progress |
| `--danger` | `#BE123C` | `status-danger` | Overdue / returned |

**Forbidden defaults:** purple/indigo theme, flat `#F8FAFC` + slate-900 admin chrome, cream `#F4F1EA` + terracotta + display serif combo, dark-mode-first shells, glow effects, `rounded-full` pill clusters.

---

## Atmosphere

Page background uses soft teal/ink radial washes plus a subtle diagonal rule pattern (`style.css` `body`). Prefer atmosphere over flat gray. Decorative gradients alone are not a substitute for clear hierarchy.

---

## Layout patterns

### App shell
- Large **GovLink** wordmark (display font)
- Small uppercase tracking label (“Municipal supervision”)
- Page title + subtitle
- Underline **tabs** for secondary nav (`.gl-tab` / `.gl-tab-active`) — not dark filled pills

### Lists (directives, compliance)
- One continuous **ledger panel** (`.gl-panel`) — not stacked rounded white cards
- Rows (`.gl-ledger-row`) separated by hairline `--rule`
- **3px left status rail** (`.gl-rail` + ok/warn/danger)
- Actions use `.gl-btn-primary` / `.gl-btn-secondary` / `.gl-btn-warn` (2px radius, not pill)

### Status badges
- Use `StatusBadge.vue` only
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
| CSS utilities | `frontend/src/style.css` (`.gl-*`) |
| Tokens | `frontend/tailwind.config.js` |

When building new views: extend this system; do not invent a parallel palette or card language.

---

## Rollout status

| Surface | Civic system |
|---------|----------------|
| Login | Done |
| AppShell | Done |
| Barangay compliance | Done |
| Barangay directive inbox | Done |
| Mayor dashboard | Done |
| Mayor SGLG readiness | Done |
| Mayor procurement | Done |
| Barangay procurement | Done |
| Drawers / uploads | Done |

---

## Agent / contributor checklist

Before shipping UI:

- [ ] Uses `--*` / Tailwind `paper|ink|brand|status-*` tokens
- [ ] Display titles use `font-display` / Bricolage
- [ ] Lists are ledger panels, not generic card stacks
- [ ] Status via `StatusBadge` + rail when in a list
- [ ] Brand “GovLink” visible at hero strength on shell/login
- [ ] No Inter/Roboto; no purple theme; no `rounded-full` filter pills
