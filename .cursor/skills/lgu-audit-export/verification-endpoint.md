# Document Verification API

## Endpoints

```
GET /api/v1/verify/documents/:token
```

Public, read-only, rate-limited (e.g. 60 req/min/IP).

### Response 200 (valid)

```json
{
  "status": "valid",
  "report_type": "compliance_scorecard",
  "municipality": "Municipality of Sample",
  "province": "Province of Sample",
  "generated_at": "2026-08-22T08:30:00.000Z",
  "content_hash": "a1b2c3...",
  "document_id": "uuid"
}
```

### Response 200 (revoked)

```json
{
  "status": "revoked",
  "revoked_at": "2026-08-25T00:00:00.000Z",
  "reason": "superseded_by_correction"
}
```

### Response 404

Token not found — generic message, no enumeration hints.

## Token generation

```typescript
import { randomBytes } from 'crypto';

const document_token = randomBytes(32).toString('base64url');
```

## Content hash

Hash canonical payload **before** PDF render:

```typescript
const canonical = JSON.stringify({
  report_type,
  municipality_id,
  period_start,
  period_end,
  rows: sortedRows, // stable sort by id
});
const content_hash = createHash('sha256').update(canonical).digest('hex');
```

## QR generation

```typescript
import QRCode from 'qrcode';

const url = `${process.env.PUBLIC_BASE_URL}/api/v1/verify/documents/${document_token}`;
const qrDataUrl = await QRCode.toDataURL(url, { width: 200, margin: 1 });
// Embed in PDFKit: doc.image(Buffer.from(qrDataUrl.split(',')[1], 'base64'), x, y, { width: 72 })
```

## Security

- No JWT required on verify endpoint.
- Do not expose row-level PII or full report body on verify.
- Log verify lookups in audit trail (IP, token, timestamp).
- Support admin revoke: `POST /api/v1/exports/documents/:id/revoke` with `@Roles(MAYOR, DEPT_HEAD)`.

## Web verification page (optional)

Frontend route `/verify/:token` calls API and shows human-readable validity card — mobile-friendly for DILG field officers scanning QR on site.
