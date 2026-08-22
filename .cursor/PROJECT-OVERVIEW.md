# GovLink — Project Overview

> **Last updated:** 2026-08-23  
> **Phase:** Missions 1–11 complete — civic UI system locked  
> **Audience:** Developers, AI agents, and future contributors

---

## Documentation index

| Document | Purpose |
|----------|---------|
| [README.md](../README.md) | Project entry point + quick start |
| [docs/GETTING-STARTED.md](../docs/GETTING-STARTED.md) | Setup, scripts, troubleshooting |
| [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) | Stack, MVP flow, roles, tenancy |
| [docs/API.md](../docs/API.md) | MVP HTTP endpoints + demo flow |
| [context/FEATURES.md](context/FEATURES.md) | Feature build status tracker |
| [context/DESIGN-SYSTEM.md](context/DESIGN-SYSTEM.md) | **Locked civic UI system** (colors, type, ledger patterns) |
| [MISSION-BOARD.md](MISSION-BOARD.md) | **Active missions, tasks, blockers** |
| **This file** | Stable reference (stack, tenancy, pilot data) |

---

## Mission

**GovLink** is a B2G SaaS platform for Philippine municipal governance. It replaces informal channels (Viber, Messenger, paper) with a single **auditable, multi-tenant** system for communication, task tracking, and document submissions between:

- **Municipalities** (Mayor, LGOO, municipal admin)
- **Constituent barangays** (Punong Barangay, Barangay Secretary, SB where applicable)

Software supports **general supervision** under RA 7160 — oversight, review, assistance, and compliance monitoring — **not** unilateral override of barangay autonomy.

---

## Locked stack decisions

These are fixed for the MVP spine. Do not introduce TypeORM or alternate stacks without updating this file first.

| Layer | Choice | Notes |
|-------|--------|-------|
| Backend | **NestJS** (TypeScript) | Modular `src/modules/` layout |
| ORM | **Prisma** | Single ORM; ignore TypeORM examples in legacy skill snippets |
| Database | **PostgreSQL** | Row-level tenant isolation via explicit filters |
| Frontend | **Vue 3** (Composition API, `<script setup>`) | Tailwind + **civic design system** (see DESIGN-SYSTEM.md) |
| UI fonts | **Bricolage Grotesque** + **Source Sans 3** | Locked — do not substitute Inter/Roboto |
| Auth | **JWT** | Payload carries `municipality_id`, optional `barangay_id`, `roles[]` |
| File storage | **S3-compatible presigned uploads** | PDF/JPG/PNG, 10 MB max |
| Geographic IDs | **PSGC codes** | Use `psgc` npm package for seeding; never rely on name alone |
| Timezone | **Asia/Manila** | All deadlines, audit timestamps, report periods |

---

## Repository layout (target)

Start as a **single repo** with clear top-level folders. Monorepo tooling (`apps/api`, `apps/web`) is deferred until the MVP slice ships.

```
GovLink/
├── .cursor/
│   ├── PROJECT-OVERVIEW.md      ← stable reference (stack, tenancy)
│   ├── MISSION-BOARD.md         ← active missions + task checkboxes
│   ├── context/FEATURES.md      ← feature build status
│   ├── rules/                   ← Cursor rules (security, etc.)
│   ├── skills/                  ← Domain + architecture skills
│   └── agents/                  ← Specialized review subagents
├── docs/                        ← human-readable documentation
│   ├── GETTING-STARTED.md
│   ├── ARCHITECTURE.md
│   └── DATABASE.md
├── prisma/
│   ├── schema.prisma            ← source of truth for DB
│   └── migrations/
├── src/
│   ├── main.ts                  ← NestJS bootstrap (TODO)
│   ├── modules/
│   │   ├── auth/
│   │   ├── common/              ← TenantContext, guards, decorators
│   │   ├── directives/          ← templates + task assignment
│   │   ├── submissions/         ← evidence uploads
│   │   └── reviews/
│   └── database/
│       └── seeds/
│           └── lgu.seed.ts        ← PSGC-driven pilot LGU seed
├── frontend/                    ← Vue 3 app (TODO)
├── docker-compose.yml           ← local PostgreSQL
├── .env.example
├── README.md
└── package.json
```

**Skill path mapping:** Cursor skills reference `src/modules/**` and `frontend/**`. When adding code, match these paths so rules and skills attach automatically.

---

## MVP vertical slice

Build **one end-to-end flow** before expanding modules.

```
DirectiveTemplate (DILG MC)
  → SupervisoryTask (mayor assigns to barangay)
    → TaskAssignment (barangay inbox)
      → EvidenceSubmission (upload proof)
        → MunicipalReview (accept / return)
          → AuditLog entry
```

### MVP includes

- Municipality + barangay tenant model (PSGC-based)
- User login with JWT tenant scope
- List directive templates; assign task to one or more barangays
- Barangay acknowledge + submit evidence (presigned upload)
- Municipal accept or return with comment
- Append-only audit log on state changes
- One cross-tenant security test (Barangay A cannot access Barangay B)

### MVP excludes (post-spine)

- Full compliance catalog seed (all ADM/SOC/SK codes)
- Procurement / RA 9184 module
- PDF/Excel DILG exports with letterheads
- SGLG scoring dashboards
- Geotagged photo submissions
- Offline sync queue
- Bilingual UI (English first; Tagalog labels later)

---

## Role model

### Backend RBAC enum (JWT + `@Roles()`)

Four roles enforced on API mutations. Defined in `nestjs-multi-tenant` skill.

| `AppRole` | Scope |
|-----------|-------|
| `MAYOR` | All barangays under municipality |
| `DEPT_HEAD` | Municipal department operations (LGOO, admin staff) |
| `BARANGAY_CAPTAIN` | Single barangay — acknowledge, approve submissions |
| `BARANGAY_SECRETARY` | Single barangay — data entry, document uploads |

### Domain → backend mapping

UI and domain docs use official LGU titles. Map to backend roles as follows:

| Domain role (`data-model.md`) | Backend `AppRole` | Notes |
|-------------------------------|-------------------|-------|
| `mayor` | `MAYOR` | |
| `municipal_admin`, `lgo_o` | `DEPT_HEAD` | LGOO compliance monitoring |
| `municipal_super_admin` | `DEPT_HEAD` + tenant flag | Full tenant config; add `is_super_admin` on User later |
| `punong_barangay` | `BARANGAY_CAPTAIN` | UI label: *Punong Barangay* |
| `barangay_admin` | `BARANGAY_SECRETARY` | Typical secretary / admin staff |
| `sangguniang_barangay` | Scoped read + BAC context | Procurement phase 2 |
| `auditor_readonly` | Read-only guard | DILG/COA export access; no `@Roles()` on mutations |

**Rule:** Punong Barangay is never called "Barangay Captain" in user-facing UI — only in code enums.

---

## Multi-tenancy rules (non-negotiable)

1. Every tenant-scoped table has `municipality_id` and optional `barangay_id`.
2. Tenant scope comes from **JWT `TenantContext`** — never from request body or query params.
3. Municipal users: filter by `municipality_id` only.
4. Barangay users: filter by `municipality_id` **and** `barangay_id`.
5. On create/update: stamp tenant columns from context, not DTO.
6. Guard order: `JwtAuthGuard` → `RolesGuard` → entity tenant validation.

Enforced by: `.cursor/rules/lgu-multi-tenant-security.mdc` and `lgu-security-auditor` agent.

---

## Harness index

AI development assets already in place. **Do not add more skills until the MVP spine runs.**

| Asset | Path | Purpose |
|-------|------|---------|
| PH LGU domain | `.cursor/skills/ph-lgu-governance/` | RA 7160, compliance catalog, data model |
| NestJS multi-tenant | `.cursor/skills/nestjs-multi-tenant/` | Prisma tenant isolation, RBAC, uploads |
| Vue dashboard UI | `.cursor/skills/vue-tailwind-dashboard/` | Civic UI + badges, drawers, uploads |
| Civic design system | `.cursor/context/DESIGN-SYSTEM.md` | Locked fonts, tokens, ledger patterns |
| B2G procurement | `.cursor/skills/b2g-procurement-ph/` | RA 9184 / RA 12009 (phase 2) |
| Audit exports | `.cursor/skills/lgu-audit-export/` | DILG/COA PDF + Excel |
| Security rule | `.cursor/rules/lgu-multi-tenant-security.mdc` | Tenant + RBAC on `src/**/*.ts` |
| Civic UI rule | `.cursor/rules/govlink-civic-ui.mdc` | Enforces DESIGN-SYSTEM on `frontend/**` |
| Subagents | `.cursor/agents/*.md` | Security, DB, E2E, DILG, UX, sales |

**Canonical entity definitions:** `.cursor/skills/ph-lgu-governance/data-model.md`  
**Compliance seed reference:** `.cursor/skills/ph-lgu-governance/compliance-catalog.md`

---

## Session checkpoint

> **Live status:** See [MISSION-BOARD.md](MISSION-BOARD.md) for current mission, task checkboxes, and blockers.  
> **Last handoff:** 2026-08-23 (civic UI rollout complete; Missions 9–11 on `master`)

### Where we are

| Area | Status |
|------|--------|
| Missions 1–11 | Done (periods, lifecycle, audit exports, MinIO uploads) |
| Civic design system | Locked — all primary FE surfaces Done (see `DESIGN-SYSTEM.md`) |
| Postgres | Host port **5433** (`GOVLINK_PG_PORT`) |
| MinIO | Compose ports **9000** / **9001**; S3 env in `.env.example` |

### Start next chat here

1. Read this checkpoint + [MISSION-BOARD.md](MISSION-BOARD.md) “Current mission”.
2. Follow [DESIGN-SYSTEM.md](context/DESIGN-SYSTEM.md) + `govlink-civic-ui` for any UI work.
3. **Recommended next mission:** **SGLG scoring dashboards** (Mission 12 — not yet scoped on board; promote from FEATURES deferred list).

### Local demo

- API: `http://localhost:3000/api` · FE: Vite (often `5174` if `5173` busy)
- Mayor: `mayor@san-jose-batangas.gov.ph` / Punong Barangay: `captain@aguila-sj-batangas.gov.ph` · password `GovLinkDemo1!`

---

## Still open (decisions deferred)

| Topic | Default when we get there |
|-------|----------------------------|
| Monorepo vs single repo | Stay single repo until frontend + API both exist |
| Cloud host / region | Prefer PH region for RA 10173; document if abroad |
| Email / SMS notifications | In-app first; SMS for overdue escalations later |
| Income class for procurement | Config table per tenant; not needed for MVP |
| Demo municipalities | San Jose (Batangas) + Liloan (Cebu) — pilot LGUs |

---

## Mission order

Execute in order. Full task lists and exit criteria: [MISSION-BOARD.md](MISSION-BOARD.md).

1. ~~Schema + seed~~ — done
2. ~~Auth spine~~ — done
3. ~~Directive flow API~~ — done
4. ~~Tenant boundary test~~ — done
5. ~~Vue inbox + dashboard~~ — done
6. ~~CI pipeline~~ — done
7. ~~Compliance catalog seed~~ — done
8. ~~ComplianceInstance periods~~ — done
9. ~~Compliance instance lifecycle~~ — done
10. ~~Audit exports (PDF/Excel/QR)~~ — done
11. ~~Real S3/MinIO uploads~~ — done
12. **SGLG scoring dashboards** — next (scope on start)

---

## Environment variables (planned)

Document in `.env.example` when scaffold exists. Never commit `.env`.

```
DATABASE_URL=
JWT_SECRET=
JWT_EXPIRES_IN_HOURS=8
FRONTEND_URL=http://localhost:5173
S3_BUCKET=
S3_REGION=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
UPLOAD_MAX_BYTES=10485760
NODE_ENV=development
PORT=3000
```

---

## Pilot data

Seed targets two real municipalities for demos and E2E tests:

| Municipality | Province | PSGC | Barangays (seed) |
|--------------|----------|------|------------------|
| Municipality of San Jose | Batangas | `041022000` | 25 |
| Municipality of Liloan | Cebu | `072227000` | 14 |

Directive templates seeded from DILG MC references (BDRRMP, FDPP, BADAC).

---

## Phase roadmap

| Phase | Focus | Exit criteria |
|-------|-------|---------------|
| **0** | Harness + overview | Done |
| **1** | DB + seed | Done |
| **2** | Auth + API bootstrap | Done |
| **3** | Directive flow API | Done |
| **4** | Tenant boundary test | Done |
| **6** | CI pipeline | Done |
| **7** | Compliance catalog | Full ADM/SOC/SK requirements seeded |
| **8** | Audit exports | PDF scorecard + QR verification |
| **9** | Procurement | APP, contracts, SVP thresholds |

---

## References

- RA 7160 (Local Government Code) — general supervision, barangay duties
- RA 10173 (Data Privacy Act) — PII in registries
- RA 9184 / RA 12009 — procurement (phase 2)
- DILG MCs cited in seed and compliance catalog
- Internal: `.cursor/skills/ph-lgu-governance/reference.md`
