# GovLink — Mission Board

> **Last updated:** 2026-08-23  
> **Current mission:** Next → Tagalog UI labels or RA 10173 PII masking (scope on start)  
> **Phase:** Post-MVP features · civic UI locked

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
| 6 | CI pipeline | ✅ Done |
| 7 | Compliance catalog seed | ✅ Done |
| 8 | ComplianceInstance periods | ✅ Done |
| 9 | Compliance instance lifecycle | ✅ Done |
| 10 | Audit exports (PDF/Excel/QR) | ✅ Done |
| 11 | Real S3/MinIO uploads | ✅ Done |
| 12 | SGLG scoring dashboards | ✅ Done |
| 13 | APP + SVP procurement spine | ✅ Done |
| 14 | RFQ / award document chain | ✅ Done |
| 15 | BAC roster / delivery-acceptance | ✅ Done |
| 16 | Evidence uploads + offline queue | ✅ Done |

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

## Mission 6 — CI pipeline ✅

**Goal:** Automated checks on every push — lint, typecheck, migrate deploy, e2e, frontend build.

**Exit criteria:** GitHub Actions workflow passes on `master`; local `npm run ci:backend` succeeds with PostgreSQL running.

**References:** `.github/workflows/ci.yml`

### Tasks

- [x] ESLint + TypeScript lint for `src/` and `test/`
- [x] npm scripts: `lint`, `typecheck`, `validate`, `ci:backend`
- [x] GitHub Actions: Postgres service + `prisma migrate deploy`
- [x] GitHub Actions: backend lint, typecheck, build, `test:e2e`
- [x] GitHub Actions: frontend `npm ci` + `npm run build`

**Completed:** 2026-08-22

---

## Mission 7 — Compliance catalog seed ✅

**Goal:** Seed full ADM/SOC/SK/MAY obligation catalog and expose via read API.

**Exit criteria:** `npm run db:seed` loads 24 requirements; `GET /api/compliance/requirements` returns catalog; CI seeds catalog before e2e.

**References:** `.cursor/skills/ph-lgu-governance/compliance-catalog.md`

### Tasks

- [x] `ComplianceRequirement` model + migration
- [x] Seed script (`compliance-catalog.seed.ts`) — 24 codes
- [x] `GET /compliance/requirements` with optional `?scope=` filter
- [x] CI seeds catalog after migrate deploy
- [x] E2e test for catalog list

**Completed:** 2026-08-22

---

## Mission 8 — ComplianceInstance period tracking ✅

**Goal:** Track per-barangay due status against the ADM/SOC/SK catalog for current reporting periods.

**Exit criteria:** Seed opens current periods; mayor can load `/compliance/matrix`; barangay list is tenant-scoped; e2e covers open + matrix RBAC.

**References:** `.cursor/skills/ph-lgu-governance/data-model.md`

### Tasks

- [x] `ComplianceInstance` model + migration + `ComplianceStatus` enum
- [x] Period helpers (Asia/Manila labels by frequency)
- [x] Seed current periods for all active barangays
- [x] `GET /compliance/instances`, `GET /compliance/matrix`, `POST /compliance/periods/open`
- [x] Mayor dashboard heatmap wired to matrix API
- [x] E2E coverage for open + tenant isolation
- [x] Docs / mission board closeout

**Completed:** 2026-08-23

---

## Mission 9 — Compliance instance lifecycle ✅

**Goal:** Barangay start/submit catalog obligations; mayor accept/return with reason.

**Exit criteria:** Start → submit → review works end-to-end; barangay My compliance page; mayor Needs attention queue; e2e lifecycle.

### Tasks

- [x] `submittedById` + `returnReason` columns
- [x] `POST .../start`, `.../submit`, `.../review` + `GET /review-queue`
- [x] Barangay `/barangay/compliance` view
- [x] Mayor review queue + ComplianceReviewDrawer
- [x] E2E lifecycle + RBAC negatives

**Completed:** 2026-08-23

---

## Mission 10 — Audit exports (PDF / Excel / QR) ✅

**Goal:** Mayor can download DILG-ready compliance scorecards with verifiable QR.

**Exit criteria:** PDF + Excel download; `ExportDocument` + public verify; e2e covers export + verify + RBAC.

### Tasks

- [x] `ExportDocument` model + migration
- [x] PDF letterhead scorecard (PDFKit) + QR footer
- [x] ExcelJS workbook (Scorecard / Audit Log / Legend)
- [x] `GET /exports/compliance-scorecard.pdf|.xlsx`
- [x] Public `GET /verify/documents/:token`
- [x] Mayor download buttons
- [x] E2E export + verify

**Completed:** 2026-08-23

---

## Mission 11 — Real S3/MinIO evidence uploads ✅

**Goal:** Barangay evidence uses presigned PUT to MinIO/S3, then confirm + submit.

**Exit criteria:** MinIO in compose; presign/confirm APIs; FE progress upload; e2e PUT+confirm; CI has MinIO.

### Tasks

- [x] MinIO service in `docker-compose.yml`
- [x] `POST /uploads/presign` + `POST /uploads/confirm`
- [x] Bucket bootstrap + CORS for Vite origins
- [x] `EvidenceUpload.vue` real presign → PUT → confirm
- [x] CI MinIO + S3 env
- [x] E2E upload flow

**Completed:** 2026-08-23

---

## Mission 12 — SGLG scoring dashboards ✅

**Goal:** Mayor sees SGLG-aligned readiness by pillar and barangay, derived from compliance instances.

**Exit criteria:** Catalog tagged with pillars; `GET /compliance/sglg-scores` returns municipal + per-barangay scores; `/mayor/sglg` ledger UI; e2e covers happy path + RBAC.

**References:** `.cursor/skills/b2g-procurement-ph/sglg-pillars.md`

### Tasks

- [x] `SglgPillar` enum + `ComplianceRequirement.sglgPillar` migration
- [x] Catalog seed pillar mapping (24 codes)
- [x] Weighted score util + `SglgScoreService`
- [x] `GET /compliance/sglg-scores` (MAYOR / DEPT_HEAD)
- [x] Mayor `/mayor/sglg` civic ledger + AppShell tab
- [x] E2E happy path + barangay 403
- [x] Docs / mission board closeout

**Completed:** 2026-08-23

---

## Mission 13 — APP + SVP procurement spine ✅

**Goal:** Barangay APP lines and SVP contracts under municipal oversight with config-driven thresholds and anti-splitting.

**Exit criteria:** Thresholds seeded; APP + contract APIs tenant-safe; split flag blocks award until municipal ack; mayor + barangay procurement ledgers; e2e.

**References:** `.cursor/skills/b2g-procurement-ph/`, `ph-lgu-governance/procurement-rules.md`

### Tasks

- [x] Schema: income class, regime, thresholds, APP lines, contracts
- [x] Seed thresholds + pilot income class + demo APP/contract
- [x] Procurement module APIs + anti-splitting + acknowledge-split
- [x] `/mayor/procurement` + `/barangay/procurement` civic ledgers
- [x] E2E tenant isolation + split award gate
- [x] Docs / mission board closeout

**Completed:** 2026-08-23

---

## Mission 14 — RFQ / award document chain ✅

**Goal:** Gate contract award on RFQ → quotations (≥3) → abstract → BAC resolution → NOA; void-not-delete for audit.

**Exit criteria:** Extended lifecycle; document APIs; award blocked until chain (+ split ack); barangay chain panel; e2e.

### Tasks

- [x] ContractStatus + ProcurementDocument (+ void fields)
- [x] Document chain util (3-quote default) + documents service
- [x] Advance gates + void endpoint (no hard delete)
- [x] Barangay `ContractChainPanel` + mayor chain hint
- [x] E2E chain + cross-barangay 403
- [x] Docs / mission board closeout

**Completed:** 2026-08-23

---

## Mission 15 — BAC roster / delivery-acceptance ✅

**Goal:** Barangay BAC designation (5–7 members + chair) gates award recommendation; post-award contract / delivery / acceptance docs gate ACTIVE → COMPLETED.

**Exit criteria:** `BacMember` APIs; roster gate on `AWARD_RECOMMENDED`; delivery doc types; barangay BAC + chain UI; e2e.

### Tasks

- [x] Schema: `BacMember` + `DELIVERY_RECEIPT` / `INSPECTION_ACCEPTANCE`
- [x] BAC list/create/deactivate + assertRosterReady
- [x] Advance gates: ACTIVE needs contract; COMPLETED needs delivery + acceptance
- [x] `BacRosterPanel` + post-award attach in `ContractChainPanel`
- [x] Seed demo roster; e2e BAC + delivery path
- [x] Docs / mission board closeout

**Completed:** 2026-08-23

---

## Mission 16 — Evidence uploads + offline queue ✅

**Goal:** Field workers submit photo/PDF evidence from their barangay; queue uploads locally when offline and sync when connectivity returns.

**Exit criteria:** Submissions stamped with JWT barangay; inbox upload + IndexedDB queue; mayor review shows submitting barangay; e2e. (Device GPS geotags were tried then removed — barangay provenance is enough.)

### Tasks

- [x] Schema: evidence rows carry `barangayId` (GPS columns dropped)
- [x] Submit DTO file metadata only
- [x] `EvidenceUpload` + offline queue (no geolocation)
- [x] `OfflineUploadBanner` + `useOfflineUploadQueue`
- [x] Review drawer shows submitting barangay
- [x] E2E photo submit asserts `barangayId`
- [x] Docs / mission board closeout

**Completed:** 2026-08-23

---

## Missing / not yet scoped

Items tracked here so they don't clutter mission task lists. Promote to a mission when actively scheduled.

| Item | Notes | Target |
|------|-------|--------|
| Barangay list API | Done | `GET /barangays` for mayor assign picker |
| CI pipeline | Done | `.github/workflows/ci.yml` |
| Bulk assign to all barangays | Done | `assignToAllBarangays: true` on POST /directives/tasks |
| Full compliance catalog seed | Done | 24 ADM/SOC/SK/MAY codes |
| SGLG scoring dashboards | Done | `GET /compliance/sglg-scores` + `/mayor/sglg` |
| APP + SVP procurement spine | Done | Mission 13 |
| RFQ / award document chain | Done | Mission 14 |
| BAC roster / delivery-acceptance | Done | Mission 15 |
| Geotagged photo submissions | Removed | Prefer barangay provenance |
| Offline upload queue | Done | Mission 16 — IndexedDB + sync banner |
| Tagalog UI labels | English first | **Next mission** |

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

- **2026-08-23** — Mission 16 revised. Dropped device GPS geotags; evidence provenance is submitting barangay + offline queue retained. Handoff: Tagalog UI or PII masking.
- **2026-08-23** — Mission 16 complete (initial). Geotagged photo evidence + IndexedDB offline upload queue. Handoff: Tagalog UI or PII masking.
- **2026-08-23** — Mission 15 complete. BAC roster (5–7 + chair gate) + delivery/acceptance → COMPLETED. Handoff: geotagged photos or offline queue.
- **2026-08-23** — Mission 14 complete. RFQ/award document chain (3 quotes, AWARD_RECOMMENDED, void-not-delete). Handoff: BAC roster or delivery/acceptance.
- **2026-08-23** — Mission 13 complete. APP + SVP procurement spine (thresholds, anti-splitting, mayor/barangay ledgers). Handoff: BAC/RFQ chain when ready.
- **2026-08-23** — Mission 12 complete. SGLG-aligned readiness API + mayor `/mayor/sglg` dashboard. Handoff: scope procurement (RA 9184) when ready.
- **2026-08-23** — Missions 9–11 + civic UI: compliance lifecycle, PDF/Excel/QR exports, MinIO uploads; municipal ledger design system on all primary views. Handoff: start Mission 12 (SGLG scoring).
- **2026-08-22** — Mission 7 complete. Compliance catalog schema, seed, and list API.
- **2026-08-22** — Mission 4 complete. Supertest tenant boundary suite (`npm run test:e2e`).
- **2026-08-22** — Mission 3 complete. Directive flow API + audit log + security hardening.
