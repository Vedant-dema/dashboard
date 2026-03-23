# DEMA – Datenmodell (Übersicht)

Siehe `database/schema.sql` für die vollständige PostgreSQL-DDL.

## Mermaid (Beziehungen)

```mermaid
erDiagram
    laender ||--o{ kunden : land_code
    mitarbeiter ||--o{ kunden : zustaendige_person
    kunden ||--o| kunden_wash : "1:1 optional"
    kunden ||--o{ kunden_rollen : ""
    kunden ||--o{ anfrage : debitor
    kunden ||--o{ bestand : kreditor
    kunden ||--o{ angebot : kunde
    kunden ||--o{ sammelueberweisung : kunde
    kunden ||--o{ rechnung : kunde
    kunden ||--o{ termin : ""

    mitarbeiter ||--o{ anfrage : bearbeiter
    mitarbeiter ||--o{ bestand : einkaeufer
    mitarbeiter ||--o{ anfrage_bestand : erstellt_von
    mitarbeiter ||--o{ angebot : verhandelt

    anfrage ||--o{ anfrage_bestand : ""
    bestand ||--o{ anfrage_bestand : ""
    anfrage ||--o{ angebot : ""
    bestand ||--o{ angebot : ""
    bestand ||--o{ sammelueberweisung_position : ""
    bestand ||--o{ abholauftrag : ""
    angebot ||--o{ termin : ""
    angebot ||--o{ abholauftrag : ""

    sammelueberweisung ||--o{ sammelueberweisung_teilzahlung : ""
    sammelueberweisung ||--o{ sammelueberweisung_position : ""
    rechnung ||--o{ rechnung_position : ""
```

## Kundenlösung

- **`kunden`**: ein Stammsatz für Verkauf, Einkauf, Werkstatt.
- **`kunden_wash`**: optionale 1:1-Erweiterung für die Waschanlage (gleiche `kunden_id`).
- Frontend-Demo: Persistenz in `localStorage` unter `dema-kunden-db`.
