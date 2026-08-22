---
name: nestjs-multi-tenant
description: Enforces secure multi-tenant NestJS backend architecture with TypeORM/Prisma, JWT RBAC, BaseTenantEntity isolation (municipality_id/barangay_id), and presigned S3 upload rules. Use when building or modifying NestJS modules, guards, entities, repositories, or API endpoints under src/modules or apps/backend.
paths:
  - "src/modules/**"
  - "apps/backend/**"
---

# NestJS Multi-Tenant Backend

Architectural rules for GovLink backend modules: **NestJS + TypeScript**, **TypeORM or Prisma**, **JWT RBAC**, strict tenant isolation, and S3 presigned uploads.

Complements [ph-lgu-governance](../ph-lgu-governance/SKILL.md) for LGU role semantics and tenant hierarchy.

## Multi-tenancy isolation

**Multi-Tenancy Isolation:** Every database entity must inherit from a BaseTenantEntity containing municipality_id and optional barangay_id. Every query must enforce tenant filtering to prevent cross-barangay data leaks.

### BaseTenantEntity (required)

All tenant-scoped tables extend `BaseTenantEntity`. Never store tenant-scoped data in entities that skip this base.

```typescript
// src/modules/common/entities/base-tenant.entity.ts
import {
  Column,
  CreateDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export abstract class BaseTenantEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  municipality_id: string;

  @Column({ type: 'uuid', nullable: true })
  barangay_id: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
```

**Prisma equivalent:** use a shared fragment or abstract model pattern; every model includes `municipality_id` and optional `barangay_id` with composite indexes.

### Tenant context (JWT → request scope)

Extract tenant scope from the authenticated JWT and attach to the request. Never trust client-supplied `municipality_id` / `barangay_id` in body or query params.

```typescript
export interface TenantContext {
  municipality_id: string;
  barangay_id: string | null; // null = municipal-level user
  user_id: string;
  roles: AppRole[];
}
```

### Query enforcement (non-negotiable)

Every read, update, delete, and aggregate **must** filter by tenant:

| User scope | Required filter |
|------------|-----------------|
| Municipal (barangay_id = null) | `municipality_id = ctx.municipality_id` |
| Barangay | `municipality_id = ctx.municipality_id AND barangay_id = ctx.barangay_id` |

**Rules:**

- Use a shared `TenantScopeService` or repository mixin — do not hand-roll filters per endpoint.
- TypeORM: apply a global subscriber or `TenantAwareRepository` wrapper; reject queries missing tenant predicates in code review.
- Prisma: use a request-scoped extended client that injects `where` clauses; forbid raw `$queryRaw` without tenant bind params.
- **Create:** set `municipality_id` / `barangay_id` from `TenantContext`, not from DTO.
- **Joins:** joined tables must also satisfy tenant filters — a leak via unscoped relation is a defect.
- **IDs in URLs:** validate that the resolved entity's tenant columns match `TenantContext` before returning or mutating.

### Isolation checklist

```
- [ ] Entity extends BaseTenantEntity (or Prisma model includes tenant columns)
- [ ] Composite index on (municipality_id, barangay_id) where queried together
- [ ] Service/repository applies tenant filter on findOne, findMany, update, delete
- [ ] Create path stamps tenant from JWT, not client input
- [ ] Integration test proves barangay A cannot read barangay B records
```

Detail: [tenant-isolation.md](tenant-isolation.md)

## RBAC roles

**RBAC Roles:** Implement explicit NestJS @Roles() decorators for MAYOR, DEPT_HEAD, BARANGAY_CAPTAIN, and BARANGAY_SECRETARY.

### Role enum

```typescript
// src/modules/auth/enums/app-role.enum.ts
export enum AppRole {
  MAYOR = 'MAYOR',
  DEPT_HEAD = 'DEPT_HEAD',
  BARANGAY_CAPTAIN = 'BARANGAY_CAPTAIN',
  BARANGAY_SECRETARY = 'BARANGAY_SECRETARY',
}
```

### Decorators and guards

Use `@Roles()` on every protected controller method. Pair with `JwtAuthGuard` + `RolesGuard`.

```typescript
// src/modules/auth/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { AppRole } from '../enums/app-role.enum';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);
```

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AppRole.MAYOR, AppRole.DEPT_HEAD)
@Get('barangays/compliance')
getCompliance(@TenantCtx() ctx: TenantContext) { ... }

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AppRole.BARANGAY_CAPTAIN, AppRole.BARANGAY_SECRETARY)
@Post('submissions')
createSubmission(@TenantCtx() ctx: TenantContext, @Body() dto: CreateSubmissionDto) { ... }
```

### Role scope matrix

| Role | Tenant level | Typical access |
|------|--------------|----------------|
| `MAYOR` | Municipality | All barangays under municipality; assign tasks, approve reviews |
| `DEPT_HEAD` | Municipality | Department modules; CRUD within municipal scope |
| `BARANGAY_CAPTAIN` | Barangay | Single barangay; acknowledge tasks, submit evidence |
| `BARANGAY_SECRETARY` | Barangay | Data entry, document uploads for assigned barangay |

**Rules:**

- JWT payload carries `roles: AppRole[]` — validate on every request.
- Missing `@Roles()` on a mutating endpoint is a **blocker** in review.
- Role alone does not grant cross-tenant access; tenant guard runs **after** role guard.
- Map GovLink UI roles to these four backend roles consistently.

Detail: [rbac.md](rbac.md)

## Upload rules

**Upload Rules:** Generate presigned S3 URLs for submission proof files, enforce mime-type validation (PDF, JPG, PNG only), and cap upload size to 10MB.

### Flow

1. Client requests presigned URL via authenticated endpoint (`POST /uploads/presign`).
2. Server validates role, tenant, mime type, and size **before** signing.
3. Client uploads directly to S3 with the presigned URL.
4. Client confirms upload; server stores metadata linked to submission (tenant-stamped).

### Allowed types and limits

| Constraint | Value |
|------------|-------|
| MIME types | `application/pdf`, `image/jpeg`, `image/png` |
| Extensions | `.pdf`, `.jpg`, `.jpeg`, `.png` |
| Max size | **10 MB** (10_485_760 bytes) |

```typescript
export const UPLOAD_ALLOWED_MIMES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
] as const;

export const UPLOAD_MAX_BYTES = 10 * 1024 * 1024; // 10MB
```

### Presign endpoint rules

- Require `@Roles()` and valid `TenantContext`.
- Validate `contentType` against allowlist and `contentLength` ≤ `UPLOAD_MAX_BYTES`.
- S3 key pattern: `{municipality_id}/{barangay_id|municipal}/{entity_type}/{uuid}/{filename}` — never user-controlled path segments.
- Presigned URL TTL: ≤ 15 minutes.
- Set `Content-Type` and `Content-Length` conditions on the presigned PUT.
- After upload, verify object exists (HeadObject) and re-check `Content-Type` / size before marking submission accepted.
- Reject double extensions and executable content regardless of declared MIME.

### Upload checklist

```
- [ ] Presigned URL issued only after mime + size validation
- [ ] S3 key includes tenant segments; no path traversal
- [ ] 10MB cap enforced at presign and verified post-upload
- [ ] Only PDF, JPG, PNG accepted
- [ ] File metadata entity extends BaseTenantEntity
- [ ] Download URLs are presigned GET with short TTL; no public buckets
```

Detail: [uploads.md](uploads.md)

## Module layout

```
src/modules/                          # or apps/backend/src/modules/
├── common/
│   ├── entities/base-tenant.entity.ts
│   ├── decorators/tenant-context.decorator.ts
│   ├── guards/roles.guard.ts
│   └── services/tenant-scope.service.ts
├── auth/
│   ├── decorators/roles.decorator.ts
│   ├── enums/app-role.enum.ts
│   └── guards/jwt-auth.guard.ts
└── uploads/
    ├── uploads.controller.ts
    ├── uploads.service.ts
    └── dto/presign-upload.dto.ts
```

## Implementation checklist

When adding or reviewing backend code under scoped paths:

```
- [ ] Multi-Tenancy Isolation: entity extends BaseTenantEntity; every query tenant-filtered
- [ ] RBAC Roles: @Roles() on all protected routes (MAYOR, DEPT_HEAD, BARANGAY_CAPTAIN, BARANGAY_SECRETARY)
- [ ] Upload Rules: presigned S3, PDF/JPG/PNG only, 10MB max
- [ ] JWT carries roles + tenant scope; guards applied in order: JwtAuth → Roles → Tenant
- [ ] DTOs never accept municipality_id/barangay_id from client on create
- [ ] Audit log on upload confirm and submission state changes
```

## Additional resources

- Tenant isolation patterns: [tenant-isolation.md](tenant-isolation.md)
- RBAC guard implementation: [rbac.md](rbac.md)
- S3 presign service: [uploads.md](uploads.md)
- LGU role semantics: [ph-lgu-governance/SKILL.md](../ph-lgu-governance/SKILL.md)
