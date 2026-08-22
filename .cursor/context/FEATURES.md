# Features — Build Status

Living tracker for GovLink features. Update this file when behavior ships or scope changes.

**Last updated:** 2026-08-22

---

## Legend

| Status | Meaning |
|--------|---------|
| Done | Shipped and verifiable locally |
| In progress | Actively being built |
| Planned | Scoped for MVP or a named phase |
| Deferred | Post-MVP; documented in domain skills only |

---

## Foundation

| Feature | Status | Notes |
|---------|--------|-------|
| AI domain harness (skills, agents, rules) | Done | `.cursor/skills/`, `.cursor/agents/` |
| Project documentation | Done | `README.md`, `docs/`, this file |
| PostgreSQL + Docker Compose | Done | `docker-compose.yml` |
| Prisma schema (MVP tables) | Done | `prisma/schema.prisma` |
| Initial migration | Done | `20260822170000_init` |
| PSGC-driven LGU seed | Done | San Jose + Liloan + DILG templates |
| Demo user seed | Done | 4 accounts — mayor + Punong Barangay per pilot LGU |
| NestJS bootstrap | Done | `src/main.ts`, global `/api` prefix |
| User login (JWT) | Done | `POST /api/auth/login` |
| TenantContext + guards | Done | `@TenantCtx()`, global `JwtAuthGuard`, `@Public()` |
| RBAC (`@Roles()` + `RolesGuard`) | Done | Ready for Mission 3 endpoints |
| Profile endpoint | Done | `GET /api/auth/me` |

---

## MVP vertical slice

Target flow: **Directive → Assign → Acknowledge → Submit → Review → Audit**

| Feature | Status | Notes |
|---------|--------|-------|
| User login (JWT) | Done | Mission 2 |
| TenantContext + guards | Done | Mission 2 |
| RBAC (`@Roles()`) | Done | Mission 2 — apply on mutating routes in Mission 3 |
| List directive templates | Done | `GET /api/directives/templates` |
| Mayor assigns task to barangay(s) | Done | `POST /api/directives/tasks` |
| Bulk assign to all barangays | Deferred | After single-assign works |
| Barangay acknowledge task | Done | `POST /api/assignments/:id/acknowledge` |
| Evidence upload (presigned S3) | Done | Metadata stub; fileKey tenant-prefix validated |
| Municipal accept / return | Done | `POST /api/assignments/:id/review` |
| Audit log on state changes | Done | `AuditLogService` |
| Cross-barangay 403 test | Done | `npm run test:e2e` |

---

## Frontend (Vue 3)

| Feature | Status | Notes |
|---------|--------|-------|
| Mayor compliance dashboard | Planned | Mission 5 — heatmap table |
| Barangay task inbox | Planned | Mission 5 |
| Review slide-over drawer | Planned | Mission 5 |
| Status badges (emerald/amber/rose) | Planned | Per `vue-tailwind-dashboard` skill |
| Mobile-first field uploads | Planned | Mission 5 |

---

## Compliance & reporting

| Feature | Status | Notes |
|---------|--------|-------|
| Compliance catalog seed (ADM/SOC/SK) | Deferred | Phase 4 — catalog in skills |
| Semestral barangay assembly tracking | Deferred | |
| BDP / AIP submission tracker | Deferred | |
| SGLG-aligned scoring | Deferred | |
| PDF exports with LGU letterhead | Deferred | Phase 5 |
| Excel audit reports | Deferred | Phase 5 |
| QR document verification | Deferred | Phase 5 |

---

## Procurement (RA 9184 / RA 12009)

| Feature | Status | Notes |
|---------|--------|-------|
| APP line items | Deferred | Phase 6 |
| Contract lifecycle | Deferred | |
| SVP threshold config | Deferred | Income-class driven |
| Splitting detection | Deferred | |

---

## Non-functional

| Feature | Status | Notes |
|---------|--------|-------|
| CI (lint, test, migrate) | Planned | `test:e2e` ready; CI pipeline pending |
| `.env.example` | Done | |
| RA 10173 PII field masking | Deferred | |
| Offline upload queue | Deferred | |
| Tagalog UI labels | Deferred | English first |

---

## Current mission

**Mission 5 — Vue inbox + dashboard**

- [ ] Vue 3 app scaffold (`frontend/`)
- [ ] Login page + JWT API client
- [ ] Mayor dashboard + barangay inbox + review drawer

Exit criteria: browser demo with mayor and Punong Barangay roles.
