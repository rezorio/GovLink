# PDF Letterhead & Layout

## Letterhead template (PDFKit example)

```typescript
function renderLetterhead(doc: PDFKit.PDFDocument, tenant: TenantBranding) {
  const y = doc.page.margins.top;

  doc.image(tenant.seal_republic_path, 50, y, { width: 60 });
  doc.image(tenant.seal_municipality_path, doc.page.width - 110, y, { width: 60 });

  doc.font('Times-Bold').fontSize(11);
  doc.text('REPUBLIC OF THE PHILIPPINES', 0, y + 10, { align: 'center' });
  doc.font('Times-Roman').fontSize(10);
  doc.text(`Province of ${tenant.province_name}`, { align: 'center' });
  doc.text(`${tenant.lgu_class} of ${tenant.municipality_name}`, { align: 'center' });
  doc.moveDown(0.5);
  doc.font('Times-Bold').text(tenant.office_title, { align: 'center' });
  doc.moveDown(1);
  doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
  doc.moveDown(0.5);
}
```

## TenantBranding config

```typescript
interface TenantBranding {
  province_name: string;
  municipality_name: string;
  lgu_class: 'Municipality' | 'City';
  office_title: string;           // e.g. "MUNICIPAL MAYOR'S OFFICE"
  seal_republic_path: string;
  seal_province_path: string;
  seal_municipality_path: string;
}
```

## Page footer with QR

Reserve 3.5 cm bottom margin for QR band:

```
────────────────────────────────────────
{Report Title} | Period: {period} | Page {n} of {total}
Generated: {timestamp PST} via GovLink
[QR 2.5cm]  Scan to verify authenticity
            {verification_url}
```

## COA / DILG layout notes

- Title block below letterhead: report name, coverage period, preparing office.
- Signature blocks (optional): Prepared by / Certified correct — leave blank lines for wet signature when printed.
- Annex pages: shortened header (municipality name + report title only).
- Tables: bordered cells, alternating row fill `#F8FAFC` for readability.

## Library defaults

| Stack | Library |
|-------|---------|
| NestJS server PDF | **PDFKit** + `qrcode` |
| HTML template path | Puppeteer (only if complex layouts; embed fonts and seals as base64) |

Always embed fonts — do not rely on server-installed fonts.
