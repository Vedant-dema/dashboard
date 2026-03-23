# DEMA database schema

- **`schema.sql`** – PostgreSQL DDL for the full model discussed with the business:
  - **`kunden`** – single master client for Sales, Purchase, Werkstatt (Kundendaten).
  - **`kunden_wash`** – optional 1:1 extension for Waschanlage (limit, billing address, bank, Lastschrift, etc.).
  - **`kunden_rollen`** – `LIEFERANT` | `KAUFER` | `WERKSTATT`.
  - **`anfrage`**, **`bestand`**, **`anfrage_bestand`**, **`angebot`**, **`termin`**, **`abholauftrag`**.
  - **`sammelueberweisung`** (+ Teilzahlungen, Positionen).
  - **`rechnung`** (+ Positionen).
  - **`laender`**, **`mitarbeiter`**.

## Apply

```bash
psql -U your_user -d dema -f schema.sql
```

Adjust `REFERENCES laender(code)` if you insert countries later; you can temporarily remove the FK or seed `laender` first.

The **frontend** currently persists customers in **localStorage** (`dema-kunden-db`) for demos; point the app at your API once the backend uses this schema.
