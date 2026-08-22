# Data Model Reference

Core entities for GovLink. Use consistent naming across API, DB, and UI.

## Organization hierarchy

```typescript
interface Organization {
  id: string;
  type: 'city' | 'municipality';
  name: string;
  psgc_code: string;           // 10-digit PSGC
  province_psgc: string;
  income_class: string;        // DBM classification
  procurement_regime: 'ra9184' | 'ra12009';
}

interface Barangay {
  id: string;
  organization_id: string;     // parent city/municipality
  name: string;
  psgc_code: string;
  punong_barangay_user_id?: string;
  is_active: boolean;
}
```

## Users & roles

```typescript
interface User {
  id: string;
  email: string;
  full_name: string;
  organization_id: string;
  barangay_id?: string;        // null for municipal users
  roles: Role[];
  is_active: boolean;
}

type Role =
  | 'municipal_super_admin'
  | 'mayor'
  | 'municipal_admin'
  | 'lgo_o'
  | 'punong_barangay'
  | 'barangay_admin'
  | 'sangguniang_barangay'
  | 'auditor_readonly';
```

## Compliance

```typescript
interface ComplianceRequirement {
  id: string;
  code: string;                // e.g., ADM-001
  title: string;
  legal_basis: string;
  frequency: 'semestral' | 'annual' | 'term' | 'ongoing' | 'ad_hoc';
  evidence_types: string[];
  weight: number;              // for scoring
}

interface ComplianceInstance {
  id: string;
  requirement_id: string;
  barangay_id: string;
  period_label: string;        // e.g., "2026-H1", "Term 2025-2028"
  due_date: string;
  status: ComplianceStatus;
  submitted_at?: string;
  reviewed_at?: string;
  reviewed_by?: string;
}

type ComplianceStatus =
  | 'not_started' | 'in_progress' | 'submitted'
  | 'under_review' | 'accepted' | 'returned' | 'overdue';
```

## Task delegation

```typescript
interface SupervisoryTask {
  id: string;
  organization_id: string;
  title: string;
  description: string;
  legal_basis: string;
  assigned_by: string;         // user_id (mayor/admin)
  due_date: string;
  target: 'all_barangays' | 'selected';
  barangay_ids?: string[];
  created_at: string;
}

interface TaskAssignment {
  id: string;
  task_id: string;
  barangay_id: string;
  status: 'pending_ack' | 'acknowledged' | 'in_progress'
        | 'submitted' | 'accepted' | 'returned' | 'overdue';
  acknowledged_at?: string;
  acknowledged_by?: string;
}
```

## Documents

```typescript
interface Document {
  id: string;
  barangay_id: string;
  type: 'executive_order' | 'ordinance' | 'bdp' | 'aip'
      | 'semestral_report' | 'sgbr' | 'other';
  title: string;
  version: number;
  status: 'draft' | 'submitted' | 'under_review'
        | 'accepted' | 'returned';
  file_url: string;
  submitted_at?: string;
  review_deadline?: string;    // auto-calc from type (e.g., 10 days for ordinances)
}
```

## Procurement

```typescript
interface ProcurementPlan {
  id: string;
  barangay_id: string;
  fiscal_year: number;
  status: 'draft' | 'approved';
  approved_at?: string;
}

interface Contract {
  id: string;
  barangay_id: string;
  app_line_item_id: string;
  title: string;
  supplier_name: string;
  amount_centavos: number;
  procurement_mode: 'shopping' | 'svp' | 'competitive_bidding' | 'direct';
  status: ContractStatus;
  awarded_at?: string;
  splitting_risk_score?: number;
}

type ContractStatus =
  | 'draft' | 'planned_in_app' | 'rfq_issued'
  | 'quotations_received' | 'evaluation' | 'awarded'
  | 'active' | 'completed' | 'closed' | 'terminated' | 'suspended';
```

## Audit

```typescript
interface AuditLog {
  id: string;
  actor_user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ip_address?: string;
  created_at: string;          // Asia/Manila
}
```

## Indexing recommendations

- `(barangay_id, status, due_date)` on ComplianceInstance, TaskAssignment
- `(organization_id, period_label)` on compliance aggregates
- `(barangay_id, fiscal_year)` on ProcurementPlan, Contract
- Append-only partition on AuditLog by month
