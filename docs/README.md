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

All service reports are under **`Detailed report/`** only:

- `Detailed report/README.md` — index of service specifications in this folder
- `Detailed report/SettingsPage-Service-Spec.md` — Settings and profile preferences (`SettingsPage`)
- `Detailed report/InternalChat-Service-Spec.md` — Internal Chat enterprise specification (diagrams and V1→end-goal roadmap)

## Retired documents

The following were removed to reduce duplication:

- `Architecture-Diagrams.md`
- `Blueprint-Azure-Complete.md`
- `diagram-tech-logos.md`

If needed later, reintroduce focused diagrams as appendices in `HLD.md` or linked ADRs.
