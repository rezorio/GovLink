# Tenant Isolation Patterns

## TypeORM: TenantAwareRepository

```typescript
@Injectable()
export class TenantScopeService {
  applyScope<T extends BaseTenantEntity>(
    qb: SelectQueryBuilder<T>,
    ctx: TenantContext,
    alias: string,
  ): SelectQueryBuilder<T> {
    qb.andWhere(`${alias}.municipality_id = :municipalityId`, {
      municipalityId: ctx.municipality_id,
    });
    if (ctx.barangay_id) {
      qb.andWhere(`${alias}.barangay_id = :barangayId`, {
        barangayId: ctx.barangay_id,
      });
    }
    return qb;
  }

  stampOnCreate<T extends Partial<BaseTenantEntity>>(
    entity: T,
    ctx: TenantContext,
  ): T {
    entity.municipality_id = ctx.municipality_id;
    entity.barangay_id = ctx.barangay_id;
    return entity;
  }
}
```

## Prisma: request-scoped extension

```typescript
export function createTenantPrisma(ctx: TenantContext) {
  return prisma.$extends({
    query: {
      $allModels: {
        async findMany({ model, args, query }) {
          args.where = {
            ...args.where,
            municipality_id: ctx.municipality_id,
            ...(ctx.barangay_id ? { barangay_id: ctx.barangay_id } : {}),
          };
          return query(args);
        },
      },
    },
  });
}
```

## TenantGuard (post-fetch validation)

Use when resolving by ID from URL params:

```typescript
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const entity = req.resolvedEntity as BaseTenantEntity | undefined;
    const ctx = req.tenantContext as TenantContext;
    if (!entity) return true;
    if (entity.municipality_id !== ctx.municipality_id) return false;
    if (ctx.barangay_id && entity.barangay_id !== ctx.barangay_id) return false;
    return true;
  }
}
```

## Indexes

```sql
CREATE INDEX idx_{table}_tenant ON {table} (municipality_id, barangay_id);
```

For municipal-only tables where `barangay_id` is always null, a partial index on `municipality_id` is acceptable.

## Cross-barangay status codes (GovLink convention)

Same municipality, different barangay → **`403 Forbidden`** (resource exists but caller may not access it).  
Wrong / unknown municipality (or id not found after municipality filter) → **`404 Not Found`**.

Do **not** filter `findOne` by `barangayId` in the Prisma `where` before the ownership check — that turns a real cross-barangay hit into a silent 404. Load by `id + municipalityId`, then throw `ForbiddenException` when `ctx.barangay_id` does not match (see registry + plans).

## Test template

```typescript
it('rejects cross-barangay read with 403', async () => {
  const barangayA = await seedBarangay(municipalityId, 'A');
  const barangayB = await seedBarangay(municipalityId, 'B');
  const record = await seedSubmission({ barangay_id: barangayB.id });

  const ctxA = mockTenantContext({ municipality_id: municipalityId, barangay_id: barangayA.id });
  await expect(service.findOne(record.id, ctxA)).rejects.toThrow(ForbiddenException);
});
```
