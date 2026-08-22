# Getting Started

Local development setup for GovLink.

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 20+ | Runtime and npm |
| Docker Desktop | Latest | Local PostgreSQL |
| Git | Any | Version control |

---

## First-time setup

### 1. Install dependencies

```powershell
npm install
```

### 2. Configure environment

```powershell
Copy-Item .env.example .env
```

Edit `.env` if your PostgreSQL connection differs from the Docker defaults.

Default `DATABASE_URL`:

```
postgresql://govlink:govlink@localhost:5432/govlink?schema=public
```

**Never commit `.env`.** Only `.env.example` belongs in git.

### 3. Start PostgreSQL

```powershell
docker compose up -d
```

Wait until the container is healthy:

```powershell
docker compose ps
```

### 4. Run migrations

```powershell
npm run db:migrate
```

On first run, Prisma applies `prisma/migrations/20260822170000_init`.

### 5. Seed pilot data

```powershell
npm run db:seed
```

Expected output:

- Municipality of San Jose (Batangas) + barangays from PSGC
- Municipality of Liloan (Cebu) + 14 barangays
- 3 DILG directive templates (BDRRMP, FDPP, BADAC)

Re-running the seed is safe — all inserts use upserts.

### 6. Browse data (optional)

```powershell
npm run db:studio
```

Opens Prisma Studio at `http://localhost:5555`.

### 7. Start the API

Ensure `.env` includes a `JWT_SECRET` (copy from `.env.example`).

```powershell
npm run start:dev
```

API base URL: `http://localhost:3000/api`

**Health check:** `GET /api/health`  
**Login:** `POST /api/auth/login`  
**Profile:** `GET /api/auth/me` (Bearer token)

---

## Frontend dev server

Requires the API running on port 3000 (see step 7 above).

```powershell
cd frontend
npm install
npm run dev
```

App URL: `http://localhost:5173`

Vite proxies `/api` to `http://localhost:3000` during development.

| Route | Role | Purpose |
|-------|------|---------|
| `/login` | Public | JWT login |
| `/mayor` | MAYOR / DEPT_HEAD | Compliance heatmap, assign tasks, review drawer |
| `/barangay` | BARANGAY_* | Task inbox, acknowledge, evidence upload |

After login, users are routed by role. Demo passwords: `GovLinkDemo1!`

**Mayor assign:** Barangay dropdown loads from `GET /api/barangays` (municipal roles only).

---

## Demo accounts

Password for all demo users: `GovLinkDemo1!`

| Email | Role | LGU |
|-------|------|-----|
| `mayor@san-jose-batangas.gov.ph` | MAYOR | San Jose, Batangas |
| `captain@aguila-sj-batangas.gov.ph` | BARANGAY_CAPTAIN | Barangay Aguila |
| `mayor@liloan-cebu.gov.ph` | MAYOR | Liloan, Cebu |
| `captain@catarman-liloan-cebu.gov.ph` | BARANGAY_CAPTAIN | Barangay Catarman |

Example login:

```powershell
curl -X POST http://localhost:3000/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"mayor@san-jose-batangas.gov.ph","password":"GovLinkDemo1!"}'
```

---

## E2E tests

Requires PostgreSQL running (`docker compose up -d`) and migrations applied.

```powershell
npm run test:e2e
```

Tests verify cross-barangay isolation (403 when Barangay A accesses Barangay B assignments).

---

## CI (GitHub Actions)

On every push to `master` / `main` and on pull requests, [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) runs:

| Job | Steps |
|-----|-------|
| **backend** | Postgres service → `prisma validate` → `migrate deploy` → lint → typecheck → build → `test:e2e` |
| **frontend** | `npm ci` + `npm run build` in `frontend/` |

Run backend checks locally (requires PostgreSQL):

```powershell
npm run ci:backend
npm run test:e2e
```

---

## npm scripts

| Script | Command | Description |
|--------|---------|-------------|
| `start:dev` | `nest start --watch` | Run API with hot reload |
| `build` | `nest build` | Compile TypeScript to `dist/` |
| `test:e2e` | `jest --config ./test/jest-e2e.json` | Tenant boundary Supertest suite |
| `lint` | `eslint` | Lint backend `src/` and `test/` |
| `typecheck` | `tsc --noEmit` | Typecheck backend without emit |
| `validate` | `prisma validate` | Validate Prisma schema |
| `ci:backend` | validate + lint + typecheck + build | Local pre-push backend checks |
| `db:generate` | `prisma generate` | Regenerate Prisma Client after schema changes |
| `db:migrate` | `prisma migrate dev` | Create/apply migrations in development |
| `db:migrate:deploy` | `prisma migrate deploy` | Apply migrations in production/CI |
| `db:seed` | `prisma db seed` | Seed pilot LGUs, templates, compliance catalog, demo users |
| `db:seed:compliance` | `tsx compliance-catalog.seed.ts` | Seed ADM/SOC/SK/MAY catalog only |
| `db:reset` | `prisma migrate reset` | Drop DB, re-migrate, re-seed |
| `db:studio` | `prisma studio` | Visual database browser |

---

## Troubleshooting

### Docker not running

```
failed to connect to the docker API
```

Start **Docker Desktop**, then run `docker compose up -d` again.

### Authentication failed for `govlink`

PostgreSQL is not running or credentials in `.env` do not match `docker-compose.yml`.

### `Environment variable not found: DATABASE_URL`

Ensure `.env` exists in the project root. Use `npm run db:seed` (via Prisma) rather than running the seed file directly with `tsx`.

### Seed fails on duplicate barangays

This should not happen with the current upsert-based seed. Run `npm run db:reset` for a clean slate.

---

## Next steps after setup

1. Start API (`npm run start:dev`) and frontend (`cd frontend && npm run dev`)
2. Log in as mayor or Punong Barangay and walk the assign → acknowledge → submit → review flow
3. Run `npm run test:e2e` to verify tenant isolation
