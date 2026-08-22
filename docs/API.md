# API Reference (MVP)

Base URL: `http://localhost:3000/api`

All protected routes require `Authorization: Bearer <access_token>`.

---

## Auth

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| `POST` | `/auth/login` | Public | Login, returns JWT |
| `GET` | `/auth/me` | Any authenticated | Current user + tenant |

---

## Directives

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| `GET` | `/directives/templates` | Any authenticated | List DILG directive templates |
| `POST` | `/directives/tasks` | `MAYOR`, `DEPT_HEAD` | Assign task to barangay(s) |

### Create task body

```json
{
  "directiveTemplateId": "uuid-optional",
  "title": "Submit BDRRMP 2026-2028",
  "description": "Upload approved plan per DILG MC 2024-021",
  "legalBasis": "DILG MC No. 2024-021",
  "dueDate": "2026-12-31",
  "barangayIds": ["barangay-uuid"]
}
```

Or assign to **all active barangays** in the municipality:

```json
{
  "title": "Submit semestral report",
  "description": "All barangays must upload H1 2026 report",
  "legalBasis": "RA 7160 Sec. 397(b)",
  "dueDate": "2026-12-31",
  "assignToAllBarangays": true
}
```

---

## Barangays

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| `GET` | `/barangays` | `MAYOR`, `DEPT_HEAD` | List active barangays in municipality |

---

## Compliance catalog

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| `GET` | `/compliance/requirements` | Any authenticated | List ADM/SOC/SK/MAY requirement templates |

Optional query on requirements: `?scope=BARANGAY` or `?scope=MUNICIPAL`

| `GET` | `/compliance/instances` | Any authenticated | List period instances (tenant-scoped) |
| `GET` | `/compliance/matrix` | `MAYOR`, `DEPT_HEAD` | Heatmap cells + status counts for municipality |
| `GET` | `/compliance/review-queue` | `MAYOR`, `DEPT_HEAD` | Submitted / under review / returned queue |
| `POST` | `/compliance/periods/open` | `MAYOR`, `DEPT_HEAD` | Create current-period instances for all barangays |
| `POST` | `/compliance/instances/:id/start` | `BARANGAY_CAPTAIN`, `BARANGAY_SECRETARY` | NOT_STARTED/RETURNED → IN_PROGRESS |
| `POST` | `/compliance/instances/:id/submit` | `BARANGAY_CAPTAIN`, `BARANGAY_SECRETARY` | IN_PROGRESS/RETURNED → SUBMITTED |
| `POST` | `/compliance/instances/:id/review` | `MAYOR`, `DEPT_HEAD` | SUBMITTED → ACCEPTED or RETURNED |

Review body:

```json
{ "decision": "RETURNED", "returnReason": "Missing assembly minutes" }
```

Optional query on list/matrix: `?periodLabel=2026-H2`

Optional body on open:

```json
{ "periodLabel": "2026-H2" }
```

Omit `periodLabel` to open every current period derived from requirement frequency (Asia/Manila).

---

## Uploads

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| `POST` | `/uploads/presign` | `BARANGAY_CAPTAIN`, `BARANGAY_SECRETARY` | Presigned PUT URL (PDF/JPG/PNG, ≤10MB) |
| `POST` | `/uploads/confirm` | `BARANGAY_CAPTAIN`, `BARANGAY_SECRETARY` | HeadObject verify after client PUT |

Presign body:

```json
{
  "filename": "bdrrm-plan.pdf",
  "contentType": "application/pdf",
  "contentLength": 204800,
  "entityType": "submissions"
}
```

Flow: presign → `PUT` file to `uploadUrl` → confirm → `POST /assignments/:id/submissions` with returned `fileKey`.

Local MinIO: `docker compose up -d minio` (API `localhost:9000`, console `localhost:9001`).

---

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| `GET` | `/exports/compliance-scorecard.pdf` | `MAYOR`, `DEPT_HEAD` | PDF scorecard + QR footer |
| `GET` | `/exports/compliance-scorecard.xlsx` | `MAYOR`, `DEPT_HEAD` | Excel scorecard (Scorecard / Audit Log / Legend) |
| `GET` | `/verify/documents/:token` | Public | Validate export authenticity (no PII) |

Optional query on exports: `?periodLabel=2026-H2`

Response headers include `X-Export-Document-Id` and `X-Content-Hash`.

---

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| `GET` | `/assignments` | Any authenticated | List inbox (tenant-scoped) |
| `GET` | `/assignments/:id` | Any authenticated | Assignment detail |
| `POST` | `/assignments/:id/acknowledge` | `BARANGAY_CAPTAIN`, `BARANGAY_SECRETARY` | Acknowledge task |
| `POST` | `/assignments/:id/submissions` | `BARANGAY_CAPTAIN`, `BARANGAY_SECRETARY` | Submit evidence |
| `POST` | `/assignments/:id/review` | `MAYOR`, `DEPT_HEAD` | Accept or return |

### Submit evidence body

```json
{
  "fileKey": "<municipalityId>/<barangayId>/submissions/<uuid>/bdrrm-plan.pdf",
  "fileName": "bdrrm-plan.pdf",
  "mimeType": "application/pdf",
  "fileSizeBytes": 204800
}
```

Allowed MIME types: `application/pdf`, `image/jpeg`, `image/png` (max 10 MB).

### Review body

```json
{
  "submissionId": "uuid",
  "decision": "ACCEPTED",
  "comment": "Complete and aligned with SGLG indicators."
}
```

`decision`: `ACCEPTED` or `RETURNED`

---

## End-to-end demo flow

```powershell
# 1. Login as mayor
$mayor = Invoke-RestMethod -Method POST -Uri http://localhost:3000/api/auth/login `
  -ContentType "application/json" `
  -Body '{"email":"mayor@san-jose-batangas.gov.ph","password":"GovLinkDemo1!"}'

# 2. List templates
Invoke-RestMethod -Uri http://localhost:3000/api/directives/templates `
  -Headers @{ Authorization = "Bearer $($mayor.access_token)" }

# 3. Get barangay ID (Prisma Studio or /assignments after seed task)
# 4. Create task (replace barangayIds)
Invoke-RestMethod -Method POST -Uri http://localhost:3000/api/directives/tasks `
  -Headers @{ Authorization = "Bearer $($mayor.access_token)" } `
  -ContentType "application/json" `
  -Body '{"title":"BDRRMP Submission","description":"Upload plan","legalBasis":"DILG MC 2024-021","dueDate":"2026-12-31","barangayIds":["<barangay-uuid>"]}'

# 5. Login as Punong Barangay
$captain = Invoke-RestMethod -Method POST -Uri http://localhost:3000/api/auth/login `
  -ContentType "application/json" `
  -Body '{"email":"captain@aguila-sj-batangas.gov.ph","password":"GovLinkDemo1!"}'

# 6. Acknowledge → Submit → Mayor reviews
```

---

## Status flow

```
PENDING_ACK → ACKNOWLEDGED → SUBMITTED → ACCEPTED
                                      └→ RETURNED → (re-submit) → SUBMITTED
```

Audit log entries are written on: task assign, acknowledge, submit, accept, return.
