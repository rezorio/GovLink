# Compliance Obligation Catalog

Municipality-to-barangay obligations to seed `ComplianceRequirement` templates. Adjust due dates per DILG annual circulars.

## Administrative governance

| Code | Obligation | Legal basis | Frequency | Evidence |
|------|------------|-------------|-----------|----------|
| ADM-001 | Conduct Barangay Assembly (1st sem) | RA 7160 Sec. 397(b); Proc. 260 | Semestral (H1) | Minutes, attendance, semestral report |
| ADM-002 | Conduct Barangay Assembly (2nd sem) | Same | Semestral (H2) | Same |
| ADM-003 | Submit semestral activity & finance report | RA 7160 Sec. 397(b) | 2× per year | Signed report, assembly minutes |
| ADM-004 | Formulate/update Barangay Development Plan | RA 7160 Sec. 106 | Per 3-year term | SB-approved BDP document |
| ADM-005 | Submit BDP to municipal LDC | RA 7160 Sec. 114 | After BDP approval | Transmittal + acceptance receipt |
| ADM-006 | Formulate Annual Investment Program | IRR Art. 410 | Annual | SB-approved AIP |
| ADM-007 | BDC regular meeting | RA 7160 Sec. 109 | Every 6 months min | Minutes, agenda |
| ADM-008 | Maintain Barangay Citizen's Charter | RA 11032 | Ongoing + update | Published charter, update log |
| ADM-009 | Update Registry of Barangay Inhabitants | DILG MC 2005-69 | Ongoing | Registry snapshot, update date |
| ADM-010 | Kasambahay registration desk operational | DILG MC 2013-61 | Ongoing | Desk officer designation, masterlist |
| ADM-011 | Monthly Kasambahay Report to PESO | DILG MC 2013-61 | Monthly | Transmittal record |
| ADM-012 | Smooth turnover of funds/properties (election) | DILG MC 2013-115 | Per transition | Inventory, turnover minutes |
| ADM-013 | Prepare SGBR | DILG BGPMS | Per DILG schedule | Completed SGBR |

## Mayor supervisory actions (municipal-initiated)

| Code | Action | Legal basis | Frequency | Tracked data |
|------|--------|-------------|-----------|--------------|
| MAY-001 | Barangay visit/inspection | RA 7160 Secs. 444/455 | Every 6 months | Visit date, findings, counsel given |
| MAY-002 | Review barangay executive orders | RA 7160 Sec. 30 | Per EO issued | EO copy, review status, SP/SB concurrence |
| MAY-003 | Act on punong barangay leave | RA 7160 Sec. 47(a)(4) | Ad hoc | Leave request, approval |
| MAY-004 | Act on barangay official resignation | RA 7160 Sec. 82(a)(4) | Ad hoc | Resignation letter, acceptance |
| MAY-005 | Ensure barangay budget review via LFC | RA 7160 Sec. 316(f) | Annual budget cycle | LFC review record |

## Social governance

| Code | Obligation | Legal basis | Frequency | Evidence |
|------|------------|-------------|-----------|----------|
| SOC-001 | VAWC info/education programs | RA 9262 | Ongoing | Activity reports |
| SOC-002 | Anti-trafficking barangay coordination | RA 9208 | Ongoing | Committee activation record |
| SOC-003 | ECCD service coordination | RA 8980 IRR | Ongoing | Service delivery reports |
| SOC-004 | Barangay Council for Protection of Children | RA 9344 / JJWC | Ongoing | Committee composition |

## Youth (SK)

| Code | Obligation | Legal basis | Frequency | Evidence |
|------|------------|-------------|-----------|----------|
| SK-001 | Appropriate 10% GF to SK | RA 10742 Sec. 20(a) | Annual budget | Budget ordinance line item |
| SK-002 | Conduct Linggo ng Kabataan | RA 10742 Sec. 30(a) | Annual (Aug 12 week) | Activity report |

## Compliance scoring (suggested)

For municipal dashboards, compute per barangay:

```
compliance_score = (on_time_submissions / total_due_in_period) × 100
```

Weight critical items (ADM-001/002, ADM-004, ADM-006) higher than ongoing items (ADM-009).

Status values: `not_started | in_progress | submitted | under_review | accepted | overdue | returned`
