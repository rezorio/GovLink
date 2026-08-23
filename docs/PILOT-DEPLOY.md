# Pilot deploy checklist

Hardening steps for putting GovLink in front of a municipal pilot (not a full DICT/SOC2 program).

## Before first production boot

1. Set `NODE_ENV=production`.
2. Generate a strong JWT secret (≥32 chars):

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

3. Set real `DATABASE_URL`, S3 credentials (not local MinIO demo keys), and `FRONTEND_URL` / `ALLOWED_ORIGINS` to the live SPA origin(s).
4. Set `PUBLIC_BASE_URL` to the public HTTPS API (or gateway) used in QR links. LAN-only HTTP pilots need `ALLOW_INSECURE_PUBLIC_URL=true`.
5. Run migrations: `npm run db:migrate:deploy`.
6. Do **not** run `npm run db:seed` in production unless you intentionally set `ALLOW_SEED_IN_PRODUCTION=true` for a controlled reset.
7. Build API: `npm run build` then `npm run start:prod`.
8. Build FE: `cd frontend && npm run build` and serve `frontend/dist` behind HTTPS (or your host’s static site).

## What production mode enforces

| Check | Behavior |
|-------|----------|
| Weak / missing `JWT_SECRET` | Process refuses to start |
| Demo MinIO keys | Process refuses to start |
| Missing `FRONTEND_URL` / `PUBLIC_BASE_URL` | Process refuses to start |
| Non-HTTPS `PUBLIC_BASE_URL` | Blocked unless `ALLOW_INSECURE_PUBLIC_URL=true` |
| HTTP errors | Stack traces not returned to clients |
| CORS | Only listed origins |
| Login | Max 20 requests / IP / minute |
| Document verify | Max 60 requests / IP / minute |
| Global API | Max 200 requests / IP / minute (health skipped) |
| Seed script | Blocked unless `ALLOW_SEED_IN_PRODUCTION=true` |

## Smoke after deploy

- `GET /api/health` → `{ status: "ok", env: "production" }`
- Browser login from the allowed origin only
- Open a bad SPA path → **404 Page not found**
- Force a chunk/load failure → **error** fallback (or navigate to `/error`)

## Frontend fallbacks

| Route | Purpose |
|-------|---------|
| `/:pathMatch(.*)*` | **404** — unknown URL |
| `/error` | Generic error page (router/`onErrorCaptured` also redirect here) |

## Security headers

API responses include `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, and HSTS when `NODE_ENV=production`.
