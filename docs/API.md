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

---

## Barangays

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| `GET` | `/barangays` | `MAYOR`, `DEPT_HEAD` | List active barangays in municipality |

---

## Assignments

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
