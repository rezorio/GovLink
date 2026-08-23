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
| `GET` | `/compliance/sglg-scores` | `MAYOR`, `DEPT_HEAD` | SGLG-aligned readiness by pillar + barangay |
| `GET` | `/compliance/review-queue` | `MAYOR`, `DEPT_HEAD` | Submitted / under review / returned queue |
| `POST` | `/compliance/periods/open` | `MAYOR`, `DEPT_HEAD` | Create current-period instances for all barangays |
| `POST` | `/compliance/instances/:id/start` | `BARANGAY_CAPTAIN`, `BARANGAY_SECRETARY` | NOT_STARTED/RETURNED → IN_PROGRESS |
| `POST` | `/compliance/instances/:id/submit` | `BARANGAY_CAPTAIN`, `BARANGAY_SECRETARY` | IN_PROGRESS/RETURNED → SUBMITTED |
| `POST` | `/compliance/instances/:id/review` | `MAYOR`, `DEPT_HEAD` | SUBMITTED → ACCEPTED or RETURNED |

Review body:

```json
{ "decision": "RETURNED", "returnReason": "Missing assembly minutes" }
```

### SGLG scores

`GET /compliance/sglg-scores` aggregates BARANGAY-scoped instances into the ten RA 11292 pillars (weighted readiness). Scores are **internal readiness indicators**, not official DILG Seal results.

Optional query: `?periodLabel=2026-H2`

Credit weights: `ACCEPTED` 100%, `SUBMITTED`/`UNDER_REVIEW` 50%, `IN_PROGRESS` 25%, else 0%.
Optional query on list/matrix: `?periodLabel=2026-H2`

Optional body on open:

```json
{ "periodLabel": "2026-H2" }
```

Omit `periodLabel` to open every current period derived from requirement frequency (Asia/Manila).

---

## Procurement (APP + SVP + document chain)

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| `GET` | `/procurement/thresholds` | Any authenticated | Config-driven SVP/shopping ceilings |
| `GET` | `/procurement/app-lines` | Any authenticated | Tenant-scoped APP lines (`?fiscalYear=`) |
| `POST` | `/procurement/app-lines` | `BARANGAY_CAPTAIN`, `BARANGAY_SECRETARY` | Create APP line as **DRAFT** (centavos) |
| `PATCH` | `/procurement/app-lines/:id` | Barangay roles | Update DRAFT APP line fields only |
| `POST` | `/procurement/app-lines/:id/approve` | `MAYOR`, `DEPT_HEAD` | Municipal approve DRAFT → APPROVED |
| `GET` | `/procurement/contracts` | Any authenticated | Tenant-scoped contracts |
| `GET` | `/procurement/contracts/:id` | Any authenticated | Contract detail (403 cross-barangay) |
| `POST` | `/procurement/contracts` | Barangay roles | Create draft linked to APPROVED APP line |
| `POST` | `/procurement/contracts/:id/advance` | Barangay roles | Lifecycle advance (document + BAC gated) |
| `GET` | `/procurement/contracts/:id/documents` | Any authenticated | List docs (tenant-scoped) |
| `GET` | `/procurement/contracts/:id/chain` | Any authenticated | Checklist + next-step readiness |
| `POST` | `/procurement/contracts/:id/documents` | Barangay roles | Attach RFQ/quote/abstract/BAC/NOA; post-award: contract/delivery/acceptance |
| `POST` | `/procurement/contracts/:id/documents/:docId/void` | Barangay roles | Soft-void (no hard delete) |
| `POST` | `/procurement/contracts/:id/acknowledge-split` | `MAYOR`, `DEPT_HEAD` | Allow award when split-flagged |
| `GET` | `/procurement/oversight` | `MAYOR`, `DEPT_HEAD` | Municipal totals + flagged contracts |
| `GET` | `/procurement/bac-members` | Any authenticated | BAC roster (`?barangayId=` for mayor) |
| `POST` | `/procurement/bac-members` | Barangay roles | Designate BAC member (max 7 active) |
| `POST` | `/procurement/bac-members/:id/deactivate` | Barangay roles | Deactivate BAC member |

### Registry (RA 10173)

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| `GET` | `/registry/residents` | All authenticated | List residents; barangay scope implicit; mayor requires `?barangayId=` |
| `GET` | `/registry/residents/:id` | All authenticated | Single record (403 cross-barangay) |
| `POST` | `/registry/residents` | Barangay roles | Create household / kasambahay record |
| `PATCH` | `/registry/residents/:id` | Barangay roles | Update record in own barangay |

Municipal viewers receive **masked** `addressLine` and `phone` with `piiMasked: true`. Barangay staff see full fields for their barangay only.

### Notifications (in-app)

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| `GET` | `/notifications` | All authenticated | Inbox for current user (`?unread=true` optional) |
| `GET` | `/notifications/unread-count` | All authenticated | `{ count }` for bell badge |
| `POST` | `/notifications/:id/read` | All authenticated | Mark one notification read |
| `POST` | `/notifications/read-all` | All authenticated | Mark all unread as read |

Emitted on: task assign → barangay; evidence/compliance submit → municipal; review accept/return → barangay. Email/SMS deferred.

Amounts are **integer centavos**. SVP ceilings come from `ProcurementThreshold` (never hardcoded). Same supplier + category + fiscal year over SVP max sets `splittingFlagged`; award is blocked until municipal acknowledge.

**Lifecycle:** `DRAFT → PLANNED → RFQ_ISSUED → QUOTATIONS_RECEIVED → EVALUATION → AWARD_RECOMMENDED → AWARDED → ACTIVE → COMPLETED`

**Document gates (SVP/shopping):** RFQ before `RFQ_ISSUED`; ≥3 quotations before `QUOTATIONS_RECEIVED`; abstract before `EVALUATION`; BAC resolution before `AWARD_RECOMMENDED`; Notice of Award before `AWARDED` (+ split ack when flagged). Documents are voided (not deleted) for audit integrity.

Create APP body:

```json
{
  "fiscalYear": 2026,
  "code": "APP-2026-IT-001",
  "description": "Office IT equipment",
  "category": "IT Equipment",
  "approvedAmountCentavos": 50000000,
  "status": "APPROVED"
}
```

Create contract body:

```json
{
  "appLineItemId": "uuid",
  "title": "Laptop units",
  "supplierName": "Demo Supply Co.",
  "amountCentavos": 15000000,
  "mode": "SVP"
}
```

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

Flow: presign → `PUT` file to `uploadUrl` → confirm → use returned `fileKey` on assignment submissions or procurement documents. Presign `entityType`: `submissions` or `procurement`.

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

Provenance is the uploading barangay from the JWT tenant scope (`barangay_id` stamped on the submission). GPS geotags are not collected.

Allowed MIME types: `application/pdf`, `image/jpeg`, `image/png` (max 10 MB).

Field uploads: barangay inbox queues failed/offline uploads in IndexedDB and syncs via **Sync now**. Mayor review shows which barangay submitted.
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
