# Database

PostgreSQL schema managed by Prisma. Source of truth: `prisma/schema.prisma`.

---

## Entity overview

| Model | Tenant-scoped | Purpose |
|-------|---------------|---------|
| `Municipality` | Root tenant | City/municipality LGU (PSGC code) |
| `Barangay` | Via `municipalityId` | Constituent barangay (PSGC code) |
| `User` | `municipalityId` + optional `barangayId` | Staff accounts + `AppRole[]` |
| `DirectiveTemplate` | Global | DILG MC templates (not per-tenant) |
| `ComplianceRequirement` | Global | ADM/SOC/SK/MAY obligation catalog |
| `ComplianceInstance` | Yes | Per-barangay period tracking against catalog |
| `SupervisoryTask` | `municipalityId` | Mayor-assigned directive instance |
| `TaskAssignment` | `municipalityId` + `barangayId` | Per-barangay task inbox row |
| `EvidenceSubmission` | `municipalityId` + `barangayId` | Uploaded proof metadata |
| `MunicipalReview` | `municipalityId` | Accept / return decision |
| `AuditLog` | `municipalityId` + optional `barangayId` | Append-only state change log |

---

## Enums

| Enum | Values |
|------|--------|
| `AppRole` | `MAYOR`, `DEPT_HEAD`, `BARANGAY_CAPTAIN`, `BARANGAY_SECRETARY` |
| `DirectiveCategory` | `DISASTER_PREPAREDNESS`, `FINANCIAL_ADMINISTRATION`, `PEACE_AND_ORDER`, `SOCIAL_PROTECTION`, `ADMINISTRATIVE_GOVERNANCE` |
| `TaskAssignmentStatus` | `PENDING_ACK` → `ACKNOWLEDGED` → `IN_PROGRESS` → `SUBMITTED` → `ACCEPTED` / `RETURNED` / `OVERDUE` |
| `EvidenceSubmissionStatus` | `DRAFT`, `SUBMITTED`, `UNDER_REVIEW`, `ACCEPTED`, `RETURNED` |
| `ReviewDecision` | `ACCEPTED`, `RETURNED` |
| `ComplianceFrequency` | `SEMESTRAL`, `ANNUAL`, `TERM`, `ONGOING`, `AD_HOC`, `MONTHLY` |
| `ComplianceScope` | `BARANGAY`, `MUNICIPAL` |
| `ComplianceCategory` | `ADMINISTRATIVE`, `SOCIAL`, `YOUTH`, `MUNICIPAL_SUPERVISION` |
| `ComplianceStatus` | `NOT_STARTED`, `IN_PROGRESS`, `SUBMITTED`, `UNDER_REVIEW`, `ACCEPTED`, `RETURNED`, `OVERDUE` |

---

## Key indexes

- `municipalities.psgc_code` — unique
- `barangays(municipality_id, psgc_code)` — unique composite
- `task_assignments(municipality_id, barangay_id, status)` — inbox queries
- `audit_logs(municipality_id, created_at)` — audit timeline

---

## Migrations

| Migration | Description |
|-----------|-------------|
| `20260822170000_init` | Initial MVP schema |
| `20260822190000_compliance_catalog` | Compliance requirement catalog table |
| `20260823053000_compliance_instances` | Per-barangay compliance period instances |

Apply with:

```powershell
npm run db:migrate        # development
npm run db:migrate:deploy # production/CI
```

---

## Seed data

Script: `src/database/seeds/lgu.seed.ts`

### Pilot municipalities

| Name | Province | PSGC | Barangay source |
|------|----------|------|-----------------|
| Municipality of San Jose | Batangas | `041022000` | PSGC prefix `041022` |
| Municipality of Liloan | Cebu | `072227000` | PSGC prefix `072227` |

Barangays are resolved from the `psgc` npm package by matching the first 6 digits of the municipality PSGC code. This avoids the package's `citymun` name collision bug (multiple "San Jose" municipalities).

### Directive templates

| DILG MC | Category | Title (short) |
|---------|----------|---------------|
| DILG MC No. 2024-021 | Disaster Preparedness | BDRRMP 2026-2028 |
| DILG MC No. 2022-027 | Financial Administration | FDPP quarterly posting |
| DILG MC No. 2020-085 | Peace and Order | BADAC audit update |

All seed operations use **upserts** — safe to re-run.

### Compliance catalog

24 global requirements from `.cursor/skills/ph-lgu-governance/compliance-catalog.md`:

| Prefix | Count | Scope |
|--------|-------|-------|
| ADM | 13 | Barangay obligations |
| MAY | 5 | Municipal supervisory actions |
| SOC | 4 | Social governance |
| SK | 2 | Sangguniang Kabataan |

Seed only catalog (without LGU/users):

```powershell
npm run db:seed:compliance
```

Run:

```powershell
npm run db:seed
```

---

## Conventions

- Table names: snake_case plural (`municipalities`, `task_assignments`)
- Column names: snake_case in DB, camelCase in Prisma models via `@map`
- Primary keys: UUID (`@default(uuid())`)
- Timestamps: `created_at`, `updated_at` on all core entities
- Soft delete: `deleted_at` on `User` and `SupervisoryTask` (hard delete prohibited for compliance records later)

---

## Planned (not yet in schema)

These appear in domain docs but are deferred post-MVP:

- `ProcurementPlan` / `Contract`
- `Document` (typed ordinances, BDP, AIP)
- Tenant config (seal images, income class for SVP thresholds)

See `.cursor/skills/ph-lgu-governance/data-model.md` for the full target model.
