# Procurement & Contract Management Rules

Technical rules for barangay-level procurement within municipal oversight SaaS.

## Applicable law (transition period)

| Period | Law | Notes |
|--------|-----|-------|
| Legacy | RA 9184 + Revised IRR | Shopping, SVP under Sec. 52.1 / 53.9 |
| Current | RA 12009 (NGPA, 2024) + IRR (2025) | SVP as distinct mode; revised thresholds |

**Implementation:** Store `procurement_regime` on organization config. Load threshold tables per regime. Never hardcode amounts — GPPB adjusts SVP limits by income class.

## Barangay BAC structure

Per RA 9184 IRR Sec. 7.3.2:

- 5–7 **regular SB members** (excluding Punong Barangay)
- Punong Barangay **designates** chair, vice-chair, members
- PB is Local Chief Executive — not a BAC voting member

Model: `BACMember` linked to `User` with `term_start`, `designation_date`, `is_active`.

## Contract lifecycle states

```
draft → planned_in_app → rfq_issued → quotations_received →
evaluation → awarded → active → completed → closed
                                    ↘ terminated
                                    ↘ suspended
```

Post-`awarded`: no delete; amendments create new `ContractAmendment` rows.

## Anti-splitting detection

Flag suspicious patterns (configurable rules engine):

- Same `supplier_id` + `category` + `fiscal_year` with multiple contracts
- Aggregate amount exceeds SVP threshold for barangay income class
- Sequential contracts just below threshold within 30 days

Store `splitting_risk_score` and require BAC chair acknowledgment before award.

## Required document chain

Every contract must link:

1. **APP line item** (Annual Procurement Plan)
2. **PPMP reference** (Project Procurement Management Plan) if applicable
3. **RFQ / bidding documents**
4. **Abstract of quotations** or bid evaluation report
5. **BAC resolution** recommending award
6. **Notice of award**
7. **Contract document**
8. **Delivery/acceptance** records
9. **Payment/disbursement** linkage (optional COA export)

Missing chain link = block status transition to `awarded`.

## Threshold configuration schema

```typescript
interface ProcurementThreshold {
  regime: 'ra9184' | 'ra12009';
  lgu_class: 'barangay' | 'municipality_5th' | 'municipality_1st' | 'city' | 'province';
  income_class?: string;       // DBM income classification
  mode: 'shopping' | 'svp' | 'competitive_bidding';
  max_amount_php: number;
  effective_from: string;      // ISO date
  gppb_reference?: string;     // e.g., "GPPB Resolution 2024-XX"
}
```

## Municipal oversight of barangay procurement

Municipality does **not** typically approve each barangay PO, but SaaS should support:

- Aggregate spend dashboard across barangays
- APP compliance rate (% contracts linked to APP)
- Splitting risk alerts to municipal LGOO
- Export for COA / DILG field audit

## Currency & formatting

- Store amounts in **centavos** (integer) to avoid float errors
- Display as PHP with 2 decimal places
- Dates in `Asia/Manila` timezone
