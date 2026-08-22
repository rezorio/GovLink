# SGLG Pillar Reference

Quick reference for tagging GovLink features to DILG Seal of Good Local Governance (SGLG) assessment areas.

## Legal basis

- **RA 11292** — Seal of Good Local Governance Act (institutionalized SGLG and SGLG Fund)
- **DILG** — assessment guidelines, indicators, and validation schedules (updated periodically)

## Ten governance areas (assessment framework)

| # | Pillar | Typical evidence LGUs produce |
|---|--------|------------------------------|
| 1 | Financial Administration | APP, PPMP, procurement compliance, unliquidated cash, revenue collection |
| 2 | Disaster Preparedness | DRRM plan, evacuation centers, early warning, drill documentation |
| 3 | Social Protection and Sensitivity | Social welfare programs, indigent lists, PWD/senior services |
| 4 | Health Compliance and Responsiveness | Health facilities, program compliance (immunization, MNCHN) |
| 5 | Sustainable Education | School facilities, ALS, education plan alignment |
| 6 | Business-Friendliness and Competitiveness | EODB, business permits, investment promotion |
| 7 | Safety, Peace and Order | Crime stats, CCTV, peace and order council actions |
| 8 | Environmental Management | Solid waste, MRF, environmental ordinances |
| 9 | Tourism, Heritage Development, Culture and the Arts | Tourism plans, heritage sites, cultural programs |
| 10 | Youth Development | SK programs, 10% SK fund utilization |

## Outcome-area mapping (recalibrated framework)

Use when DILG shifts to term-based, outcome-focused assessment:

| Outcome area | Maps from pillars |
|--------------|-------------------|
| Innovation | Business-Friendliness, Tourism/Culture, Youth Development, Sustainable Education |
| Fiscal Management | Financial Administration |
| Crisis Resilience | Disaster Preparedness, Safety/Peace/Order, Health, Social Protection, Environmental Management |

Store mapping in tenant config — do not hardcode in feature code.

## Barangay variant (SGLGB)

Barangay-level Seal uses adapted indicators. When a feature is barangay-scoped, tag with `sglg_level: 'barangay' | 'municipality' | 'city' | 'province'`.

## Tagging convention

```
Module: Procurement / APP Compliance
sglg_pillar: financial_administration
sglg_outcome: fiscal_management
sglg_level: municipality
legal_basis: RA 9184; RA 11292
```
