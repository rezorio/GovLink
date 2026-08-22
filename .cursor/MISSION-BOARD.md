# GovLink — Mission Board

> **Last updated:** 2026-08-22  
> **Current mission:** MVP spine complete — pick next from "Missing / not yet scoped"  
> **Phase:** Post-MVP planning

**Source of truth for active work.** Update this file at end-of-session or when a mission completes.  
For stable reference (stack, tenancy, pilot data): [PROJECT-OVERVIEW.md](PROJECT-OVERVIEW.md).  
For long-term feature catalog: [context/FEATURES.md](context/FEATURES.md).

---

## At a glance

| Mission | Name | Status |
|---------|------|--------|
| 1 | Schema + seed | ✅ Done |
| 2 | Auth spine | ✅ Done |
| 3 | Directive flow API | ✅ Done |
| 4 | Tenant boundary test | ✅ Done |
| 5 | Vue inbox + dashboard | ✅ Done |

**MVP flow we're building toward:**

```
DirectiveTemplate → SupervisoryTask → TaskAssignment → EvidenceSubmission → MunicipalReview → AuditLog
```

---

## Mission 1 — Schema + seed ✅

**Goal:** Runnable database with pilot LGUs and DILG directive templates.

**Exit criteria:** `docker compose up -d` + `npm run db:migrate` + `npm run db:seed` succeeds; Prisma Studio shows San Jose + Liloan data.

### Tasks

- [x] Prisma schema (MVP tables)
- [x] Initial migration (`20260822170000_init`)
- [x] PSGC-driven LGU seed (`src/database/seeds/lgu.seed.ts`)
- [x] npm scripts: `db:migrate`, `db:seed`, `db:reset`, `db:studio`
- [x] `docker-compose.yml` + `.env.example`

**Completed:** 2026-08-22

---

## Mission 2 — Auth spine ✅

**Goal:** NestJS boots; users log in with JWT scoped to municipality and optional barangay.

**Exit criteria:** Two demo users (mayor + Punong Barangay) can log in; JWT payload carries correct `municipality_id`, optional `barangay_id`, and `roles[]`.

**References:** `.cursor/skills/nestjs-multi-tenant/` (RBAC, tenant isolation)

### Tasks

- [x] NestJS bootstrap (`src/main.ts`, app module)
- [x] Auth module: login endpoint, password verify, JWT sign/verify
- [x] JWT payload: `municipality_id`, optional `barangay_id`, `roles[]`
- [x] `TenantContext` decorator + global `JwtAuthGuard`
- [x] `RolesGuard` + `@Roles()` decorator (global guard registered)
- [x] Seed demo users — mayor + Punong Barangay per pilot LGU (San Jose, Liloan)
- [x] Protected `/api/auth/me` endpoint to verify tenant scope
- [x] Security review via `lgu-security-auditor` subagent

**Completed:** 2026-08-22

---

## Mission 3 — Directive flow API ✅

**Goal:** Full MVP vertical slice over HTTP — assign, acknowledge, submit, review, audit.

**Exit criteria:** Postman or Supertest can run the full flow for one barangay; audit log entries append on each state change.

**References:** `prisma/schema.prisma`, `docs/API.md`, `.cursor/skills/ph-lgu-governance/data-model.md`

### Tasks

- [x] Directives module: list directive templates
- [x] Mayor assigns supervisory task to one or more barangays
- [x] Barangay acknowledges task assignment
- [x] Evidence submission (metadata stub; fileKey tenant-prefix validated)
- [x] Municipal accept or return with comment
- [x] Append-only audit log on state changes
- [x] Tenant columns stamped from JWT context, never from request body
- [x] `@Roles()` on all mutating endpoints
- [x] Security review via `lgu-security-auditor` subagent

**Completed:** 2026-08-22

---

## Mission 4 — Tenant boundary test ✅

**Goal:** Prove cross-barangay isolation with an automated test.

**Exit criteria:** Supertest returns **403** when Barangay A tries to read or mutate Barangay B's task or submission.

**References:** `.cursor/agents/lgu-e2e-tester.md`, `test/e2e/tenant-boundary.e2e-spec.ts`

### Tasks

- [x] Supertest harness + test DB setup (`test/e2e/helpers/`)
- [x] Seed two barangay users in same municipality (isolated E2E fixture)
- [x] Test: Barangay A cannot GET Barangay B assignment (403)
- [x] Test: Barangay A cannot POST acknowledge/submit for Barangay B (403)
- [x] Test: Municipal user can see all barangays under municipality
- [x] `findOne` returns 403 (not 404) on cross-barangay access

**Completed:** 2026-08-22

---

## Mission 5 — Vue inbox + dashboard ✅

**Goal:** Browser demo with two roles — mayor dashboard and barangay task inbox.

**Exit criteria:** Mayor sees compliance heatmap table; barangay user sees inbox, can acknowledge and upload; municipal user can review in slide-over drawer.

**References:** `.cursor/skills/vue-tailwind-dashboard/`

### Tasks

- [x] Vue 3 app scaffold (`frontend/`)
- [x] Auth: login page, JWT storage, API client with Bearer token
- [x] Mayor compliance dashboard (heatmap table + assign form)
- [x] Barangay task inbox (acknowledge + evidence upload)
- [x] Review slide-over drawer (accept / return)
- [x] Status badges (emerald / amber / rose)
- [x] Mobile-first field upload UI
- [x] CORS enabled on API for `http://localhost:5173`
- [x] Production build verified (`npm run build` in `frontend/`)

**Completed:** 2026-08-22

**Known gap:** None for MVP assign flow — barangay picker uses `GET /barangays`.

---

## Missing / not yet scoped

Items tracked here so they don't clutter mission task lists. Promote to a mission when actively scheduled.

| Item | Notes | Target |
|------|-------|--------|
| Barangay list API | Done | `GET /barangays` for mayor assign picker |
| CI pipeline | lint, test, migrate check | Post-MVP |
| Bulk assign to all barangays | Convenience after single-assign | Post–Mission 3 |
| Full compliance catalog seed | ADM / SOC / SK codes | Phase 4 |
| DILG PDF / Excel exports | Letterhead + QR verification | Phase 5 |
| Procurement module | RA 9184 / RA 12009 | Phase 6 |
| Geotagged photo submissions | Field worker metadata | Post-MVP |
| Offline upload queue | Field connectivity | Post-MVP |
| Tagalog UI labels | English first | Post-MVP |

---

## Open decisions (deferred)

| Topic | Default when we get there |
|-------|----------------------------|
| Monorepo vs single repo | Stay single repo until frontend + API both exist |
| Cloud host / region | Prefer PH region for RA 10173 |
| Email / SMS notifications | In-app first; SMS for overdue later |
| Income class for procurement | Config table per tenant; not needed for MVP |

---

## Ritual

1. **Start session:** Read "At a glance" + current mission tasks.
2. **During work:** Check off tasks as they ship.
3. **End session:** Update status emoji, blockers, and "Last updated" date.
4. **Mission complete:** Mark ✅, move detailed tasks to archive section below, advance "Current mission".

---

## Archive

_Completed mission details stay in sections above with ✅. Add dated notes here for major milestones._

- **2026-08-22** — Mission 5 complete. Vue 3 frontend shell (login, mayor dashboard, barangay inbox, review drawer).
- **2026-08-22** — Mission 4 complete. Supertest tenant boundary suite (`npm run test:e2e`).
- **2026-08-22** — Mission 3 complete. Directive flow API + audit log + security hardening.
