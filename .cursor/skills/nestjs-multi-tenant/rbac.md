# RBAC Implementation

## RolesGuard

```typescript
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<AppRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return false;

    const { user } = context.switchToHttp().getRequest();
    return required.some((role) => user.roles?.includes(role));
  }
}
```

## JwtAuthGuard payload shape

```typescript
export interface JwtPayload {
  sub: string;
  municipality_id: string;
  barangay_id: string | null;
  roles: AppRole[];
}
```

## TenantContext decorator

```typescript
export const TenantCtx = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TenantContext => {
    const req = ctx.switchToHttp().getRequest();
    return {
      user_id: req.user.sub,
      municipality_id: req.user.municipality_id,
      barangay_id: req.user.barangay_id,
      roles: req.user.roles,
    };
  },
);
```

## Guard order

Apply guards left-to-right:

```typescript
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
```

1. **JwtAuthGuard** — valid token, populate `req.user`
2. **RolesGuard** — role in `@Roles()` list
3. **TenantGuard** — resolved entity matches tenant (when applicable)

## Endpoint role guidance

| Operation | Typical roles |
|-----------|---------------|
| Municipal dashboard / assign tasks | `MAYOR`, `DEPT_HEAD` |
| Review barangay submissions | `MAYOR`, `DEPT_HEAD` |
| Submit evidence / compliance docs | `BARANGAY_CAPTAIN`, `BARANGAY_SECRETARY` |
| Barangay contract data entry | `BARANGAY_CAPTAIN`, `BARANGAY_SECRETARY` |

No `@Roles()` on a controller method that mutates data = **reject in review**.
