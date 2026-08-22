# Features — Build Status

Living tracker for GovLink features. Update this file when behavior ships or scope changes.

**Last updated:** 2026-08-23

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
| List barangays (municipal picker) | Done | `GET /api/barangays` |
| List compliance requirements | Done | `GET /api/compliance/requirements` |
| Bulk assign to all barangays | Done | `assignToAllBarangays` flag + mayor UI checkbox |
| Barangay acknowledge task | Done | `POST /api/assignments/:id/acknowledge` |
| Evidence upload (presigned S3) | Done | MinIO/S3 presign → PUT → confirm |
| Municipal accept / return | Done | `POST /api/assignments/:id/review` |
| Audit log on state changes | Done | `AuditLogService` |
| Cross-barangay 403 test | Done | `npm run test:e2e` |

---

## Frontend (Vue 3)

| Feature | Status | Notes |
|---------|--------|-------|
| Frontend (Vue 3) | Done | Civic design system locked — see DESIGN-SYSTEM.md |
| Mayor compliance dashboard | Done | `/mayor` — heatmap + assign (civic ledger) |
| Barangay task inbox | Done | `/barangay` — ledger UI |
| Barangay My compliance | Done | `/barangay/compliance` — ledger UI |
| Review slide-over drawer | Done | Accept / return with comment |
| Status badges | Done | Civic tint badges (`StatusBadge.vue`) |
| Mobile-first field uploads | Done | Presign → MinIO PUT → confirm |
| Login + JWT session | Done | Brand-forward login |
| Barangay list (mayor assign picker) | Done | `GET /barangays` |

---

## Compliance & reporting

| Feature | Status | Notes |
|---------|--------|-------|
| Compliance catalog seed (ADM/SOC/SK) | Done | 24 requirements via `GET /compliance/requirements` |
| ComplianceInstance period tracking | Done | Matrix API + mayor heatmap |
| Compliance instance lifecycle | Done | Start / submit / review + barangay page |
| Semestral barangay assembly tracking | Deferred | |
| BDP / AIP submission tracker | Deferred | |
| SGLG-aligned scoring | Deferred | |
| PDF exports with LGU letterhead | Done | `GET /exports/compliance-scorecard.pdf` |
| Excel audit reports | Done | `GET /exports/compliance-scorecard.xlsx` |
| QR document verification | Done | Public `GET /verify/documents/:token` |

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
| CI (lint, test, migrate) | Done | GitHub Actions on push/PR |
| `.env.example` | Done | |
| RA 10173 PII field masking | Deferred | |
| Offline upload queue | Deferred | |
| Tagalog UI labels | Deferred | English first |

---

## Current mission

**Missions 8–11 complete; civic UI locked.** Next chat: **SGLG scoring dashboards** (see PROJECT-OVERVIEW session checkpoint).
