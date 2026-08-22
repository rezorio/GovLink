---
name: lgu-audit-export
description: Generates DILG and COA-compliant PDF and Excel audit reports from database records with official LGU letterheads, QR verification footers, and auditor-ready Excel layouts. Use when building export modules, compliance report generators, PDF letterheads, document verification APIs, COA/DILG audit downloads, or GovLink report endpoints.
---

# LGU Audit Export (DILG / COA)

Rules for generating **official PDF and Excel reports** from GovLink database records for DILG field officers, COA auditors, and municipal LGOO staff.

Complements [ph-lgu-governance](../ph-lgu-governance/SKILL.md), [b2g-procurement-ph](../b2g-procurement-ph/SKILL.md) (SGLG tagging), and [nestjs-multi-tenant](../nestjs-multi-tenant/SKILL.md) (tenant-scoped queries).

## Report types

| Export | Primary audience | Format |
|--------|------------------|--------|
| Compliance scorecard | DILG / Mayor | PDF + Excel |
| Semestral barangay matrix | Municipal LGOO | Excel |
| Procurement APP variance | COA / BAC | Excel |
| BDP / AIP submission tracker | DILG | PDF + Excel |
| SGLG-aligned performance summary | DILG | PDF |

Every export must be **tenant-scoped**, **immutable once generated**, and **verifiable** (PDF via QR).

## PDF formatting

**PDF Formatting:** Standardize exports to include official LGU letterheads (Republic of the Philippines, Province, Municipality name, and Official Seals).

### Required letterhead block

Every PDF page 1 header (repeat on annex pages as shortened header):

```
[Republic seal]     REPUBLIC OF THE PHILIPPINES
                    Province of {province_name}
                    Municipality/City of {municipality_name}
                    [Municipal seal]
                    OFFICE OF THE {office_title}
```

**Rules:**

- Load `province_name`, `municipality_name`, seal images from tenant config — never hardcode.
- Seal assets: `seal_republic.png`, `seal_province.png`, `seal_municipality.png` stored per tenant in S3 or CDN; fallback placeholder only in dev.
- Font: embedded serif for header lines (Times or Liberation Serif); body 10–11pt, tables 9pt minimum for dense audit tables.
- Page size: **A4**; margins 2.5 cm top (letterhead), 2 cm sides/bottom.
- Footer band (below body, above QR): document title, report period, page `X of Y`, generation timestamp (`Asia/Manila`).
- Barangay-scoped reports include barangay name sub-line under municipality.
- Tag PDF metadata: `Creator: GovLink`, `Title: {report_type}`, `Author: {municipality_name}`.

Detail: [pdf-letterhead.md](pdf-letterhead.md)

## Digital verification

**Digital Verification:** Require a dynamic QR code rendered at the footer of generated PDFs that points to an API verification endpoint to validate document authenticity.

### Verification flow

1. On PDF generation, create `ExportDocument` record with UUID, content hash (SHA-256 of canonical JSON payload), tenant IDs, generator user, timestamp.
2. Embed QR encoding: `{PUBLIC_BASE_URL}/api/v1/verify/documents/{document_token}`
3. Render QR in PDF footer (minimum 2.5 cm × 2.5 cm), with label: *Scan to verify authenticity*.
4. Public verification endpoint returns: document status (`valid` | `revoked` | `expired`), report type, municipality, generated_at, hash match — **no PII** in public response.
5. Revocation: soft-revoke via `revoked_at`; verification returns `revoked` with reason code.

```typescript
interface ExportDocument {
  id: string;
  document_token: string;       // URL-safe, non-guessable
  content_hash: string;         // SHA-256
  report_type: string;
  municipality_id: string;
  barangay_id: string | null;
  generated_by: string;
  generated_at: Date;           // timestamptz, Asia/Manila display
  revoked_at: Date | null;
  sglg_pillar?: string;
}
```

**Rules:**

- QR URL must use HTTPS in production.
- Token entropy ≥ 128 bits; never sequential IDs in URLs.
- Re-generating the same report creates a **new** document record and QR (old remains valid unless revoked).
- Verification endpoint is read-only, rate-limited, no auth required.

Detail: [verification-endpoint.md](verification-endpoint.md)

## Excel output

**Excel Output:** Structure Excel exports with bold headers, timestamped audit logs, and clear pass/fail status columns for government auditors.

### Workbook structure (minimum)

| Sheet | Contents |
|-------|----------|
| `{ReportName}` | Main data with bold header row, frozen panes row 1 |
| `Audit Log` | Generation metadata + row-level export audit trail |
| `Legend` | Pass/fail definitions, status codes, legal basis references |

### Main sheet rules

- Row 1: **bold** headers, fill `#E2E8F0` (slate-200), auto-filter enabled.
- Include explicit **Pass/Fail** or **Compliant/Non-Compliant** column — text values, not color-only.
- Date columns: ISO in cell (`YYYY-MM-DD`) with Excel date format; display timezone `Asia/Manila` in Audit Log.
- Currency: PHP format `₱#,##0.00`; store source amounts from DB (centavos → pesos at export).
- PSGC code column for barangay rows when applicable.
- No merged cells in data region (breaks auditor sorting/filtering).

### Audit Log sheet (required)

```
| Field              | Value                          |
|--------------------|--------------------------------|
| Report Type        | Compliance Scorecard           |
| Generated At       | 2026-08-22 16:30:00 PST        |
| Generated By       | Juan Dela Cruz (DEPT_HEAD)     |
| Municipality       | Municipality of Sample         |
| Province           | Province of Sample             |
| Record Count       | 42                             |
| Export Document ID | {uuid}                         |
| Content Hash       | {sha256}                       |
| GovLink Version    | {app_version}                  |
```

Below metadata: optional row-level log (`entity_id`, `action`, `exported_at`).

Detail: [excel-format.md](excel-format.md)

## Export service layout

```
src/modules/exports/                    # or apps/backend/src/modules/exports/
├── exports.module.ts
├── exports.controller.ts
├── services/
│   ├── pdf-export.service.ts
│   ├── excel-export.service.ts
│   └── export-document.service.ts
├── templates/
│   └── letterhead/
├── verify/
│   └── verify.controller.ts            # GET /api/v1/verify/documents/:token
└── dto/
    └── export-request.dto.ts
```

## Pre-export checklist

```
- [ ] Query tenant-scoped (municipality_id / barangay_id from JWT)
- [ ] PDF Formatting: letterhead with Republic, Province, Municipality, seals
- [ ] Digital Verification: QR footer → verification API
- [ ] Excel Output: bold headers, Audit Log sheet, pass/fail columns
- [ ] Timestamps in Asia/Manila
- [ ] ExportDocument record + content hash persisted
- [ ] SGLG pillar tag on report metadata (when applicable)
- [ ] @Roles() on export endpoints (MAYOR, DEPT_HEAD minimum)
- [ ] No citizen PII beyond what the report type legally requires
```

## Additional resources

- Letterhead layout and PDF library patterns: [pdf-letterhead.md](pdf-letterhead.md)
- QR verification API contract: [verification-endpoint.md](verification-endpoint.md)
- Excel workbook templates: [excel-format.md](excel-format.md)
