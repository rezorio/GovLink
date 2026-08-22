# GovLink

B2G SaaS for Philippine municipal governance — auditable task tracking and document submissions between **Municipalities** and their **Barangays**, replacing informal channels (Viber, Messenger, paper).

**Status:** MVP spine complete — NestJS API + Vue 3 frontend demo (auth, directive flow, tenant tests, inbox + dashboard).

---

## Documentation map

| Document | Purpose |
|----------|---------|
| [docs/GETTING-STARTED.md](docs/GETTING-STARTED.md) | Local setup, env vars, database commands |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Stack, MVP flow, roles, multi-tenancy |
| [docs/DATABASE.md](docs/DATABASE.md) | Prisma schema, migrations, seed data |
| [docs/API.md](docs/API.md) | MVP HTTP endpoints + demo flow |
| [.cursor/MISSION-BOARD.md](.cursor/MISSION-BOARD.md) | **Active missions, tasks, and blockers** |
| [.cursor/PROJECT-OVERVIEW.md](.cursor/PROJECT-OVERVIEW.md) | Stack, tenancy rules, pilot data |
| [.cursor/context/FEATURES.md](.cursor/context/FEATURES.md) | Feature build status tracker |
| [.cursor/context/DESIGN-SYSTEM.md](.cursor/context/DESIGN-SYSTEM.md) | **Locked civic UI** (type, color, ledger patterns) |

Domain reference (RA 7160, compliance catalog, DILG rules): `.cursor/skills/ph-lgu-governance/`

---

## Quick start

**Prerequisites:** Node.js 20+, Docker Desktop (for local PostgreSQL)

```powershell
git clone <repo-url>
cd GovLink
npm install
Copy-Item .env.example .env
docker compose up -d
npm run db:migrate
npm run db:seed
npm run db:studio   # optional — browse seeded data
npm run start:dev   # API at http://localhost:3000/api
```

**Frontend (separate terminal):**

```powershell
cd frontend
npm install
npm run dev         # http://localhost:5173
```

---

## Current phase

| Phase | Focus | Status |
|-------|-------|--------|
| 0 | AI harness + domain skills | Done |
| 1 | Database + seed | Done |
| 2 | Auth + API spine | Done |
| 3 | Directive flow API | Done |
| 4 | Tenant boundary tests | Done |
| 5 | Vue frontend shell | Done |
| 6 | CI pipeline | Done |

See [.cursor/MISSION-BOARD.md](.cursor/MISSION-BOARD.md) for the active mission and task checklist.

---

## Pilot municipalities

| Municipality | Province | PSGC |
|--------------|----------|------|
| Municipality of San Jose | Batangas | `041022000` |
| Municipality of Liloan | Cebu | `072227000` |

Barangays are loaded from official PSGC data via the `psgc` npm package.

---

## License

Private — portfolio / B2G SaaS project.
