---
name: b2g-procurement-ph
description: Guides B2G software design for Philippine government procurement (RA 9184), LGU budget cycles (AIP), Small Value Procurement pilot rollouts, NPC/RA 10173 data privacy, and SGLG governance pillar tagging. Use when building procurement modules, budgeting features, LGU SaaS rollouts, compliance dashboards, citizen PII handling, or GovLink features tied to DILG SGLG assessment.
---

# B2G Procurement — Philippines

Engineering and product rules for B2G software compliant with **RA 9184** (Government Procurement Reform Act), **LGU budget cycles**, and **Seal of Good Local Governance (SGLG)** alignment.

Complements [ph-lgu-governance](../ph-lgu-governance/SKILL.md) for tenant hierarchy, barangay supervision, and contract lifecycle detail.

## Budgeting cycles

**Budgeting Cycles:** Highlight that LGUs finalize annual budgets in Q3/Q4 via the Annual Investment Program (AIP).

### Product implications

- Model the fiscal calendar explicitly: `planning → AIP drafting → SB approval → municipal LDC submission → APP derivation → obligation`.
- Surface **AIP milestones** in dashboards (draft, for SB action, approved, submitted to LDC).
- Tie procurement features to **APP line items** — no contract or SaaS subscription charge without an approved budget reference.
- Barangay AIP is the annual slice of the 3-year BDP; municipal AIP feeds the City/Municipal Development Plan (CDP/MDP).
- Default deadline reminders to **Q3 (Jul–Sep)** for AIP preparation and **Q4 (Oct–Dec)** for finalization and next-year APP publishing.
- When scoping GovLink modules, phase deliverables to align with **budget authorization windows** — features planned in Q1–Q2 should map to prior-year AIP lines or contingency.

## Small Value Procurement (SVP)

**Small Value Procurement (SVP):** Ensure feature design supports pilot rollouts under local SVP thresholds (under ₱1M) to bypass 9-month public bidding cycles.

### Product implications

- Design **modular, tiered rollouts** so an LGU can procure a pilot (single barangay, single module, limited seats) under SVP without triggering full competitive bidding.
- Never hardcode `₱1,000,000` — SVP ceilings vary by **income class**, **LGU level**, and **procurement regime** (RA 9184 vs RA 12009). Load thresholds from config; see [procurement-rules.md](../ph-lgu-governance/procurement-rules.md).
- Document in proposals: pilot scope, seat count, barangay count, contract duration, and upgrade path to full deployment via subsequent APP amendment or new procurement mode.
- Flag **contract-splitting risk** when multiple pilot POs aggregate above SVP — reuse anti-splitting rules from ph-lgu-governance.
- Competitive bidding (~9 months) is the fallback; SVP pilot path should be the **default GTM architecture** for municipal/baranagay SaaS entry.
- Store procurement mode on each subscription/contract: `svp_pilot | svp_full | competitive_bidding | legacy_shopping`.

## Data privacy & residency

**Data Privacy & Residency:** Enforce strict compliance with the National Privacy Commission (NPC) and Data Privacy Act (RA 10173) for stored government and citizen PII.

### Non-negotiable rules

- Register as **Personal Information Controller (PIC)** or document **Processor** relationship with the LGU tenant; maintain Records of Processing Activities (ROPA).
- Collect only PII fields with a **defined legal purpose** (registry, compliance, procurement, service delivery). Reject "nice to have" demographic fields.
- Implement **Privacy by Design**: encryption at rest and in transit, role-based access, field-level masking, audit logs on PII access.
- Support **data subject rights**: access, correction, objection, and erasure where legally permitted (government records may restrict erasure — document retention basis).
- **Data residency:** Prefer hosting in the Philippines. If using foreign cloud regions, document lawful basis for cross-border transfer (NPC Circular 16-2020) and disclose in privacy notice.
- Separate **government employee PII** from **citizen/resident PII** in data models; different retention and access policies apply.
- Breach notification workflow aligned with NPC requirements (72-hour awareness trigger to DPO chain).
- DPO contact and privacy notice must be configurable per LGU tenant.

### PII handling checklist

```
- [ ] Field has documented legal purpose and retention period
- [ ] Access scoped by role + org unit (barangay isolation)
- [ ] PII access logged in append-only audit trail
- [ ] Export/download requires elevated permission + reason code
- [ ] Test/staging uses anonymized or synthetic data only
- [ ] Privacy notice and consent flows where non-statutory data is collected
```

## Feature mapping (SGLG pillars)

**Feature Mapping:** Direct the AI to tag system actions with SGLG governance pillars (e.g., Financial Administration, Disaster Preparedness).

Every user-facing action, report export, dashboard widget, and API endpoint that produces governance evidence should carry an **`sglg_pillar`** tag (and optional sub-indicator).

### SGLG governance areas (RA 11292 — current assessment framework)

Tag features against one or more of these pillars:

| Pillar | Example GovLink features |
|--------|--------------------------|
| Financial Administration | APP tracking, procurement compliance, budget vs actual, COA-ready exports |
| Disaster Preparedness | Evacuation registry sync, DRRM plan evidence, early-warning task delegation |
| Social Protection and Sensitivity | 4Ps/indigent tracking, PWD/senior service queues, social aid distribution logs |
| Health Compliance and Responsiveness | Health facility reporting, vaccination/Program compliance submissions |
| Sustainable Education | Education facility data, ALS/sk enrollment support modules |
| Business-Friendliness and Competitiveness | Business permit workflow integration, EODB metrics |
| Safety, Peace and Order | Incident reporting, CCTV/asset registry, peace-and-order dashboards |
| Environmental Management | Solid waste/MRF tracking, environmental clearance document chain |
| Tourism, Heritage Development, Culture and the Arts | Tourism asset registry, heritage site compliance |
| Youth Development | SK fund tracking (10% appropriation), youth program reporting |

### SGLG recalibration note

DILG is consolidating toward **three outcome areas** (Innovation, Fiscal Management, Crisis Resilience) with term-based assessment. Maintain tags for both:

- `sglg_pillar` — legacy 10-area tag (required for current exports)
- `sglg_outcome` — optional mapped outcome (`innovation | fiscal_management | crisis_resilience`)

Map legacy pillars to outcomes in config so reports survive guideline changes without code rewrites.

### Implementation pattern

```typescript
interface SglgTaggedAction {
  sglg_pillar: SglgPillar;
  sglg_outcome?: 'innovation' | 'fiscal_management' | 'crisis_resilience';
  sglg_indicator?: string;   // DILG indicator code when known
  legal_basis?: string;      // RA section, DILG MC, ordinance
}

// Example: procurement APP compliance report
{ action: 'export_app_compliance', sglg_pillar: 'financial_administration', sglg_outcome: 'fiscal_management' }
```

When adding a feature, state its SGLG tag in PR descriptions and module README headers.

## Feature design checklist

```
- [ ] Budget feature aligns with AIP/Q3–Q4 cycle and APP linkage
- [ ] Rollout path supports SVP pilot under configurable threshold (not hardcoded ₱1M)
- [ ] PII fields justified, access-controlled, and residency documented
- [ ] Action/report tagged with sglg_pillar (+ sglg_outcome when applicable)
- [ ] Procurement mode stored on contract/subscription record
- [ ] Anti-splitting rules applied for multi-phase pilots
- [ ] Audit trail on all procurement and PII state transitions
```

## Additional resources

- LGU hierarchy, BAC, contract lifecycle: [ph-lgu-governance/SKILL.md](../ph-lgu-governance/SKILL.md)
- Threshold config and anti-splitting: [procurement-rules.md](../ph-lgu-governance/procurement-rules.md)
- SGLG pillar → outcome mapping detail: [sglg-pillars.md](sglg-pillars.md)
