# DEMA docs index

This directory uses a **minimal canonical set** to avoid overlap and confusion.

## Keep these as source of truth

- [`Owner-Master-Report.md`](Owner-Master-Report.md) — **single owner/stakeholder report** (vision → features → tech → delivery → deployment)
- [`Project-Report-Technical-Requirements.md`](Project-Report-Technical-Requirements.md) — master TRD/TRS (requirements, delivery, SLAs, compliance, traceability)
- [`HLD.md`](HLD.md) — high-level architecture and technology direction
- [`LLD.md`](LLD.md) — low-level implementation contracts and API conventions
- [`erd.md`](erd.md) — logical/physical data model reference
- [`adr/`](adr/) — architecture decision records (start with [`adr/000-template.md`](adr/000-template.md))

## Service-by-service specs

All service reports are under **`Detailed report/`** only:

- [`Detailed report/SettingsPage-Service-Spec.md`](Detailed%20report/SettingsPage-Service-Spec.md) — Settings and profile preferences (`SettingsPage`)
- [`Detailed report/InternalChat-Service-Spec.md`](Detailed%20report/InternalChat-Service-Spec.md) — Internal Chat enterprise technical specification (diagrams, contracts, controls)

## Roadmaps (non-technical)

- [`roadmap/InternalChat-Roadmap.md`](roadmap/InternalChat-Roadmap.md) — business-friendly version roadmap (tables per version, mermaid flows per feature, no vendor logos)
- [`roadmap/Settings-Roadmap.md`](roadmap/Settings-Roadmap.md) — business-friendly Settings roadmap (tables per version, mermaid flows per feature, no vendor logos)

## Retired documents

The following were removed to reduce duplication:

- `Architecture-Diagrams.md`
- `Blueprint-Azure-Complete.md`
- `diagram-tech-logos.md`

If needed later, reintroduce focused diagrams as appendices in `HLD.md` or linked ADRs.
