---
name: ph-lgu-governance
description: Provides Philippine LGU domain knowledge and technical rules for B2G SaaS covering Municipality-to-Barangay general supervision, compliance tracking, task delegation, and contract/procurement management under RA 7160 and DILG guidelines. Use when building GovLink, LGU governance software, barangay compliance dashboards, municipal supervision workflows, BDP/SGBR tracking, or government procurement modules for cities, municipalities, and barangays.
---

# PH LGU Governance (B2G SaaS)

Domain and engineering rules for top-down **City/Municipality → Barangay** compliance SaaS in the Philippines.

## Core legal hierarchy

Model the tenant tree to mirror RA 7160 supervision chains:

```
National (DILG oversight) — reference only, not a tenant
  └── Province (supervises component cities/municipalities)
        └── City / Municipality (supervises component barangays)
              └── Barangay (lowest LGU; primary service-delivery unit)
```

**General supervision (Sec. 32, RA 7160):** The city/municipal mayor supervises barangays to ensure acts stay within prescribed powers. This is **not operational control** — barangays remain autonomous. Software must support **oversight, review, assistance, and compliance monitoring**, not unilateral override of barangay decisions.

**Supervisory actors to model:**

| Actor | Scope | Typical SaaS actions |
|-------|-------|----------------------|
| City/Municipal Mayor | All component barangays | Assign compliance tasks, review submissions, schedule inspections, escalate non-compliance |
| Municipal/City Admin / LGOO | Same | Prepare dashboards, route documents, track deadlines |
| Punong Barangay | Single barangay | Submit reports, acknowledge directives, manage barangay contracts |
| Sangguniang Barangay (SB) | Legislative barangay body | Approve plans/ordinances; BAC members for procurement |
| Barangay Development Council (BDC) | Planning body | Formulate BDP; submit to municipal LDC |
| DILG Field Officer | External auditor | Read-only or export access to compliance evidence |

## Product modules (map features to legal duties)

### 1. Compliance & supervision

Track **mandatory barangay obligations** the municipality must ensure. Each obligation becomes a **ComplianceRequirement** with:

- Legal basis (RA section, DILG MC, proclamation)
- Frequency (semestral, annual, per term, ad hoc)
- Evidence type (document upload, attestation, meeting minutes, registry extract)
- Review workflow (barangay submit → municipal review → accepted / returned / escalated)
- Due dates aligned to DILG synchronized calendars when applicable

**High-priority compliance items:**

| Item | Basis | Cadence |
|------|-------|---------|
| Barangay Assembly + semestral report | RA 7160 Sec. 397(b); Proclamation No. 260 | 2× per year |
| Barangay Development Plan (BDP) | RA 7160 Sec. 106; DILG MC 2021-087 | 3-year term; update as needed |
| Annual Investment Program (AIP) | IRR Art. 410 | Annual slice of BDP |
| BDP submission to municipal LDC | RA 7160 Sec. 114 | After SB approval |
| State of Barangay Governance Report (SGBR) | DILG BGPMS | Per DILG schedule |
| Barangay Citizen's Charter | RA 11032 | Maintain + update |
| Registry of Barangay Inhabitants update | DILG MC 2005-69 | Ongoing |
| BDC regular meetings | RA 7160 Sec. 109 | At least every 6 months |
| Mayor barangay visit/inspection | RA 7160 Secs. 444/455 | At least every 6 months |
| SK 10% appropriation | RA 10742 Sec. 20(a) | Per budget cycle |
| Kasambahay registration desk | DILG MC 2013-61 | Ongoing |

Full catalog: [compliance-catalog.md](compliance-catalog.md)

### 2. Task delegation (top-down)

Municipality assigns **SupervisoryTask** records to one or more barangays:

```
Directive (municipal policy / DILG circular)
  └── SupervisoryTask (per barangay or batch)
        └── TaskAssignment (punong barangay + optional delegate)
              └── EvidenceSubmission → MunicipalReview → Closed
```

**Rules:**

- Every task must cite a **legal or policy basis** (RA section, DILG MC number, municipal ordinance).
- Barangay cannot delete municipal-assigned tasks; only update status and attach evidence.
- Support **bulk assign** to all barangays under a municipality (common for DILG circulars).
- Track **acknowledgment** (received date) separately from **completion**.
- Escalation path: overdue → municipal admin alert → mayor dashboard flag → optional DILG export.
- Preserve **full audit trail** — who assigned, who acknowledged, who approved evidence.

### 3. Document review workflows

Implement review types matching mayor supervisory powers:

| Document type | Reviewer | Outcome options |
|---------------|----------|-----------------|
| Barangay Executive Order | Mayor (+ SP/SB concurrence flag) | Pending review / Concurred / Returned |
| Barangay ordinance | Forward to SP/SB for consistency review (Sec. 57) | Submitted / Under review / Returned |
| BDP / AIP | Municipal LDC reference | Submitted / For CDP alignment / Accepted |
| Semestral barangay report | Municipal oversight | Received / Needs correction / Accepted |
| Resignation of elective official | Mayor acceptance (Sec. 82) | Pending / Accepted / Rejected |

**Review SLA:** Default 10 calendar days for ordinance review (Sec. 57) unless a specific MC states otherwise. Make SLA configurable per document type.

### 4. Contract & procurement management

Barangay procurement follows **RA 9184** (legacy) and **RA 12009** (New Government Procurement Act, 2024+). Build for both during transition:

**Non-negotiable procurement rules in software:**

- Every contract links to an approved **Annual Procurement Plan (APP)** line item.
- **Splitting contracts** to evade thresholds is prohibited — flag when multiple POs share supplier + category + fiscal period and aggregate above SVP threshold.
- Barangay **BAC** = 5–7 regular SB members (excluding Punong Barangay); PB designates chair.
- Thresholds are **income-class dependent** — store municipality/barangay income class and load GPPB-adjusted SVP limits from config, not hardcoded amounts.
- Contract lifecycle: `Planned (APP) → RFQ/Issued → Evaluated → Awarded → Active → Completed → Closed / Terminated`
- Immutable post-award amendments with reason codes and approver chain.

Procurement detail: [procurement-rules.md](procurement-rules.md)

## Technical architecture rules

### Multi-tenancy & isolation

```
Organization (City/Municipality tenant)
  ├── Barangay[] (child org units)
  ├── Users[] (scoped by org + role)
  └── SharedTemplates (compliance reqs, DILG circulars)
```

- **Row-level security:** barangay users see only their barangay; municipal users see all component barangays.
- **Cross-barangay data** (municipal aggregates, rankings) computed at municipal scope only.
- Use **PSGC codes** (Philippine Standard Geographic Code) as stable barangay identifiers; never rely on barangay name alone.

### Roles & permissions (minimum set)

| Role | Level | Permissions |
|------|-------|-------------|
| `municipal_super_admin` | City/Municipality | Full tenant config, user management |
| `mayor` | City/Municipality | View all, assign tasks, approve reviews, dashboards |
| `municipal_admin` | City/Municipality | CRUD tasks, review submissions, reports |
| `lgo_o` | City/Municipality | Compliance monitoring, DILG reporting |
| `punong_barangay` | Barangay | Acknowledge tasks, submit evidence, manage barangay contracts |
| `barangay_admin` | Barangay | Data entry, document uploads |
| `sangguniang_barangay` | Barangay | Read + approve (BAC/BDC contexts) |
| `auditor_readonly` | Either | Export + read audit logs only |

Use **least privilege**. BAC members get procurement permissions only during active BAC sessions or per contract assignment.

### Audit & records management

Government SaaS requires defensible records:

- Append-only **audit log**: actor, action, entity, before/after snapshot, IP, timestamp (PH timezone `Asia/Manila`).
- Document versions are immutable once **accepted** by municipal reviewer.
- Soft-delete only; hard-delete prohibited for compliance and procurement records.
- Retention: minimum **7 years** for financial/procurement records (align COA practice); configurable per record class.

### Data privacy (RA 10173)

Barangay registries and kasambahay lists contain personal data:

- Collect only fields with a **defined legal purpose**.
- Role-based field masking (e.g., full address visible to barangay staff only).
- Consent/notice flows for non-statutory data.
- Support **data subject access** and correction requests.
- Host in Philippines or document cross-border transfer basis if cloud region is abroad.

### Offline & accessibility

Many barangays have intermittent connectivity:

- Optimistic UI with sync queue for evidence uploads.
- Low-bandwidth document compression; PDF-first for official submissions.
- Filipino/English bilingual labels for field-facing UI (Tagalog labels for barangay users).

### Reporting & DILG alignment

Export formats municipalities actually need:

- Per-barangay compliance scorecard (% on-time, overdue items)
- Semestral Barangay Assembly compliance matrix
- BDP submission tracker (submitted / pending / not started)
- SGBR/BGPMS-aligned performance summary
- Procurement APP vs actual spend variance

## Data model sketch

See [data-model.md](data-model.md) for entity definitions. Minimum entities:

- `Organization`, `Barangay`, `User`, `Role`
- `ComplianceRequirement`, `ComplianceInstance`, `Evidence`
- `SupervisoryTask`, `TaskAssignment`, `ReviewDecision`
- `Document` (typed: ordinance, EO, BDP, AIP, semestral report)
- `ProcurementPlan`, `Contract`, `ContractAmendment`, `BACSession`
- `AuditLog`, `Notification`

## Implementation checklist

When building or reviewing LGU features:

```
- [ ] Feature maps to a specific RA 7160 section or DILG issuance
- [ ] Municipality can assign to one or all barangays
- [ ] Barangay can submit evidence but not alter municipal directives
- [ ] Review workflow with SLA and return-for-correction loop
- [ ] Audit log on all state transitions
- [ ] PSGC-based barangay identity
- [ ] Income-class-aware procurement thresholds (config-driven)
- [ ] No hardcoded peso thresholds that may be outdated
- [ ] PH timezone for all deadlines and reports
- [ ] Personal data fields justified and access-controlled
```

## UX conventions

- **Dashboards:** Mayor sees heatmap of barangay compliance (green/amber/red); barangay sees task inbox + overdue count.
- **Terminology:** Use official terms — *Punong Barangay*, *Sangguniang Barangay*, *Barangay Assembly*, *BDP*, *AIP* — not generic "admin" or "manager."
- **Deadlines:** Show both calendar date and **days remaining**; semestral items label "1st Semester" / "2nd Semester" explicitly.

## Additional resources

- Legal references and RA sections: [reference.md](reference.md)
- Compliance obligation catalog: [compliance-catalog.md](compliance-catalog.md)
- Procurement module rules: [procurement-rules.md](procurement-rules.md)
- Entity definitions: [data-model.md](data-model.md)
