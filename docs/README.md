# DEMA docs index

This directory uses a **minimal canonical set** to avoid overlap and confusion.

## Keep these as source of truth

- `Owner-Master-Report.md` — **single owner/stakeholder report** (vision → features → tech → delivery → deployment)
- `Project-Report-Technical-Requirements.md` — master TRD/TRS (requirements, delivery, SLAs, compliance, traceability)
- `HLD.md` — high-level architecture and technology direction
- `LLD.md` — low-level implementation contracts and API conventions
- `erd.md` — logical/physical data model reference
- `adr/` — architecture decision records (start with `adr/000-template.md`)

## Service-by-service specs

- `Detailed report/README.md` — canonical folder for all service-wise detailed reports
- `Detailed report/SettingsPage-Service-Spec.md` — Settings service report starter in the canonical folder
- `Detailed report/InternalChat-Service-Spec.md` — full Internal Chat enterprise service specification with diagrams and V1→end-goal roadmap
- `services/SettingsPage-Service-Spec.md` — existing full Settings deep-dive (to be gradually migrated into `Detailed report/`)

## Retired documents

The following were removed to reduce duplication:

- `Architecture-Diagrams.md`
- `Blueprint-Azure-Complete.md`
- `diagram-tech-logos.md`

If needed later, reintroduce focused diagrams as appendices in `HLD.md` or linked ADRs.
