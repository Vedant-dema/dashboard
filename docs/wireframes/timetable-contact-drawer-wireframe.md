# Wireframe — Timetable customer contact (one-page)

**Purpose:** Low-fidelity layout spec for merging the four contact-drawer tabs into one scrollable form.

**Code target:** [`frontend/src/pages/timetable/TimetableContactDrawer.tsx`](../../frontend/src/pages/timetable/TimetableContactDrawer.tsx)

**Note:** A longer plan (implementation steps, risks) may live under Cursor’s plan store. **This file is inside the repo** so you can open it from the Explorer: `docs/wireframes/timetable-contact-drawer-wireframe.md`.

---

## Viewport

- Modal max width ~**100rem** (implementation), height cap ~**92dvh**; on **`lg+`** the scroll body uses **full width** inside horizontal padding (no `max-w-*` cap) so the **two-pane** split can approach a **~52% / ~48%** feel like legacy desktop.
- **Mobile / `<lg`:** order **A → B → C → D → E → F** in **one column** (single vertical scroll).
- **Desktop / `lg+`:** **two-pane** — **A–E** left; **F** in a **sticky right column** (~44–48% width), glass-style chrome; **scrollbars are visually hidden** on the main scroll and correspondence pane (`scrollbar-width: none` / webkit zero) while **wheel / trackpad / touch** still scroll.

## Legend

- `[ ]` — text input  
- `[====]` — textarea  
- `( )` — select  
- `[btn]` — button  
- `···` — more items / variable content  

---

## Vertical stack + “parallel” modern system (recommended)

**Idea:** Every section (**A–F**) is a **full-width card** in a **single vertical column** — one scroll, calm reading order. **“Parallel”** here means **visual parallelism**, not side-by-side sections:

1. **Rail + content (parallel columns *inside* the scroll strip)**  
   Narrow **left rail** (~48–56px): step **01–06**, soft gradient tick, or icon stack — **visually parallel** to the main card column (same vertical rhythm, `items-start`). Optional on `<sm>`: hide rail, keep numbers in card eyebrow only.

2. **Aligned geometry**  
   All cards share **same max width**, **same horizontal padding**, **same vertical gap** (`space-y-6` / `8`) so edges line up like **parallel tracks** — reads “designed”, not stacked accidents.

3. **Bento *inside* a section only**  
   e.g. **A** keeps an internal **2-col grid** (identity | slot/outcome); **E** keeps offer grid — **parallel fields within** the card, not parallel *sections* across the page.

4. **Gen Z + still professional** (tone for implementation)  
   - **Soft glass / blur** on cards (`backdrop-blur`, light border, no harsh boxes).  
   - **Pill** section labels + **mono** step index in rail (`01` … `06`).  
   - **One accent** (e.g. indigo → violet gradient) for focus rings and primary actions — avoid rainbow clutter.  
   - **Generous radius** (`rounded-3xl`), **micro motion** on hover/focus only (`motion-reduce` safe).  
   - **Sticky mini-nav** under toolbar: horizontal **scroll-linked pills** that mirror the rail (A–F) — fast jump without tab hiding.

**ASCII (scroll body — vertical + rail):**

```
┌─ SCROLL (overflow-y-auto) ────────────────────────────────────────────────────────────────────┐
│  flex gap-6 pl-0 sm:pl-2                                                                     │
│  │ RAIL │  MAIN COLUMN (max-w-5xl mx-auto w-full)                                            │
│  │      │                                                                                     │
│  │ 01 ─│── ┌─ A Kontakt & Termin ─────────────────────────────────────────────────────────┐ │
│  │  ·  │   │ [ inner 2-col grid for fields ]                                               │ │
│  │ 02 ─│── └──────────────────────────────────────────────────────────────────────────────┘ │
│  │  ·  │         ↕ consistent gap                                                          │
│  │ 03 ─│── ┌─ B Standort … ─────────────────────────────────────────────────────────────────┐ │
│  │  ·  │   └──────────────────────────────────────────────────────────────────────────────┘ │
│  │ …  │   … C, D, E, F same pattern …                                                        │
│  │ 06 ─│── ┌─ F Korrespondenz ─────────────────────────────────────────────────────────────┐ │
│  │     │   │ [ tall textarea ]                                                            │ │
│  │     │   └──────────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Alternative (optional, power users)

**Two-column body** (previous spec: A,D,F | B,C,E) remains a valid **density toggle** or `xl` breakpoint option — **not** the default if the product owner wants strict vertical + rail.

---

## Frame 0 — Shell (fixed chrome)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ HEADER (gradient): eyebrow · company H1 · outcome pill · Ka/Arte · CRM · time │
├──────────────────────────────────────────────────────────────────────────────┤
│ TOOLBAR: [ Log call ] [ Add offer ]                    [ Smart summary ▾ ]     │
├──────────────────────────────────────────────────────────────────────────────┤
│ SECTION NAV (sticky, optional): [A] [B] [C] [D] [E] [F]  ← pills scroll-to-id  │
├──────────────────────────────────────────────────────────────────────────────┤
│ SCROLL BODY (flex-1 overflow-y-auto)                                          │
│  … frames 1–6 below …                                                         │
├──────────────────────────────────────────────────────────────────────────────┤
│ FOOTER: ● status text                    [ Discard ]  [ Save contact ]         │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Frame 1 — Section A `#timetable-contact-section-contact` (Kontakt & Termin)

```
┌─ ContactCard ────────────────────────────────────────────────────────────────┐
│ Title + one-line subtitle (i18n)                                              │
│ ┌─────────────────────────────┬─────────────────────────────────────────────┐ │
│ │ COL LEFT (stack)            │ COL RIGHT (stack)                           │ │
│ │ Firmenname                  │ Termin (datetime-local)                     │ │
│ │ Ansprechpartner             │ Wiedervorlage (datetime-local)              │ │
│ │ Tel                         │ Ergebnis (select)                           │ │
│ │ Zweck                       │ ☐ Erledigt  ☐ Geparkt  ☐ Einkauf bestätigt │ │
│ │ Einkäufer                   │                                             │ │
│ └─────────────────────────────┴─────────────────────────────────────────────┘ │
│ lg:grid-cols-2 gap-6 · single column < lg                                     │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Frame 2 — Section B `#timetable-contact-section-location` (Standort & Kurznotizen)

```
┌─ ContactCard ────────────────────────────────────────────────────────────────┐
│ ADDRESS        [ textarea 5 rows, full width ]                                │
│ FLEET          [ textarea 5 rows ]                                           │
│ CALL/LIST      [ textarea 5 rows + placeholder ]                            │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Frame 3 — Section C `#timetable-contact-section-people` (Personen & Bearbeitung)

```
┌─ ContactCard ────────────────────────────────────────────────────────────────┐
│ ┌─ Weitere Ansprechpartner ─────────────── [ + Hinzufügen ] ────────────────┐ │
│ │ 0..n mini-cards: Contact / Tel / Fax / [ Entfernen ]                      │ │
│ └───────────────────────────────────────────────────────────────────────────┘ │
│ ┌─ Bearbeitung ──────────────────────────── [ + Hinzufügen ] ────────────────┐ │
│ │ 0..n rows: Bearbeiter / Seit / [ Entfernen ]                              │ │
│ └───────────────────────────────────────────────────────────────────────────┘ │
│ xl: two columns side-by-side for the two sub-blocks                            │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Frame 4 — Section D `#timetable-contact-section-history` (Terminhistorie)

```
┌─ ContactCard ────────────────────────────────────────────────────────────────┐
│ H2 row + [ Termin hinzufügen ]                                               │
│ Optional: <details> with summary "Terminhistorie (n)" · default open if n>0 │
│ List: Card per appointment — date | time | purpose | remark | done | Von   │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Frame 5 — Section E `#timetable-contact-section-vehicle` (Fahrzeug)

```
┌─ ContactCard (Truck) ────────────────────────────────────────────────────────┐
│ Subtitle (vehicle inline hint i18n)                                          │
│ Grid sm:2 xl:3 — type, brand, model, location, year, mileage, qty, price     │
│ Offer notes textarea                                                         │
└──────────────────────────────────────────────────────────────────────────────┘
┌─ ContactCard (Package) ──────────────────────────────────────────────────────┐
│ Subtitle (vehicle extra hint i18n)                                           │
│ Grid — body, registration, replacement km, customer price, processors…       │
│ ☐ Sold  ☐ Deregistered                                                       │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Frame 6 — Section F `#timetable-contact-section-activity` (Korrespondenz)

```
┌─ ContactCard (FileText) ─────────────────────────────────────────────────────┐
│ Full-width textarea · min-h ~16rem · resize-y · placeholder i18n             │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Spacing tokens (implementation)

- Between sections: `space-y-8` (32px rhythm).
- Card inner padding: match existing `ContactCard` / `md:p-7`.
- Section nav height target: **40–44px**; `scroll-mt` on each section **≥ nav + toolbar** so headings are not hidden under sticky bars.

---

## Full-page wireframe (single scroll — desktop, stacked)

> Default layout: **vertical stack + optional rail** — see [Vertical stack + “parallel” modern system](#vertical-stack--parallel-modern-system-recommended). Header / toolbar / nav / footer stay **full width**; body is one column of cards (± rail).

```
┌──────────────────────────────── modal (max ~96rem, rounded) ────────────────────────────────┐
│ ╔══════════════════════════════ HEADER (dark gradient) ═════════════════════════════════════╗ │
│ ║ [X]  KUNDENKONTAKT                                                                        ║ │
│ ║       COMPANY NAME H1                                                                     ║ │
│ ║  (Offen)  Ka/Arte  ·  KundenNr / Branche  ·  DD.MM.YYYY · HH:MM  · badges…                 ║ │
│ ╚══════════════════════════════════════════════════════════════════════════════════════════╝ │
│ ┌──────────────────────────── TOOLBAR (light) ─────────────────────────────────────────────┐ │
│ │ [ Log call ]  [ Add offer ]                         [ ✦ Smart summary ▾ ]                 │ │
│ └────────────────────────────────────────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────── SECTION NAV (sticky, optional) ──────────────────────────────┐ │
│ │ [ Kontakt ] [ Ort ] [ Personen ] [ Historie ] [ Fahrzeug ] [ Korrespondenz ]             │ │
│ └────────────────────────────────────────────────────────────────────────────────────────────┘ │
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ SCROLL (overflow-y-auto) ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐  │
│  │                                                                                          │  │
│  │  ┌── A #timetable-contact-section-contact ───────────────────────────────────────────┐  │  │
│  │  │ ◆ Kontakt & Termin    Kurzuntertitel (i18n)                                        │  │  │
│  │  │ ┌────────────────────────────┬─────────────────────────────────────────────────┐  │  │
│  │  │ │ [ Firmenname      ]        │ Termin         [ datetime-local            ]    │  │  │
│  │  │ │ [ Ansprechpartner ]        │ Wiedervorlage  [ datetime-local            ]    │  │  │
│  │  │ │ [ Tel             ]        │ Ergebnis       ( select · Offen ▾          )    │  │  │
│  │  │ │ [ Zweck           ]        │ ☐ Erledigt ☐ Geparkt ☐ Einkauf bestätigt        │  │  │
│  │  │ │ [ Einkäufer       ]        │                                                  │  │  │
│  │  │ └────────────────────────────┴─────────────────────────────────────────────────┘  │  │
│  │  └────────────────────────────────────────────────────────────────────────────────────┘  │  │
│  │                                         ↕ space-y-8                                       │  │
│  │  ┌── B #timetable-contact-section-location ──────────────────────────────────────────┐  │  │
│  │  │ ◆ Standort & Kurznotizen                                                            │  │  │
│  │  │ Adresse      [===================================textarea=========================] │  │  │
│  │  │ Fuhrpark     [===================================textarea=========================] │  │  │
│  │  │ Anruf-Notiz  [===================================textarea=========================] │  │  │
│  │  └────────────────────────────────────────────────────────────────────────────────────┘  │  │
│  │                                         ↕                                                 │  │
│  │  ┌── C #timetable-contact-section-people ──────────────────────────────────────────────┐  │  │
│  │  │ ◆ Personen & Bearbeitung                                                            │  │  │
│  │  │ ┌─ Weitere Ansprechpartner ─────────────────────────────── [ + Hinzufügen ] ────┐ │  │  │
│  │  │ │ (leer: Hinweistext)  oder  Karte: Name / Tel / Fax / [ Entfernen ]           │ │  │  │
│  │  │ └──────────────────────────────────────────────────────────────────────────────┘ │  │  │
│  │  │ ┌─ Bearbeitung ─────────────────────────────────────────── [ + Hinzufügen ] ────┐ │  │  │
│  │  │ │ (leer)  oder  Zeile: Bearbeiter / Seit / [ Entfernen ]                        │ │  │  │
│  │  │ └──────────────────────────────────────────────────────────────────────────────┘ │  │  │
│  │  └────────────────────────────────────────────────────────────────────────────────────┘  │  │
│  │                                         ↕                                                 │  │
│  │  ┌── D #timetable-contact-section-history ───────────────────────────────────────────┐  │  │
│  │  │ ◆ Terminhistorie                          [ Termin hinzufügen ]                    │  │  │
│  │  │ ┌─ Termin 1 ─────────────────────────────────────────────────── [ Entfernen ] ──┐  │  │  │
│  │  │ │ [ Datum ] [ Zeit ] [ Zweck ] [ Bemerkung multiline ] ☐ Erledigt  [ Von ]    │  │  │  │
│  │  │ └────────────────────────────────────────────────────────────────────────────────┘  │  │
│  │  │ ┌─ Termin 2 ···                                                                   ┐  │  │  │
│  │  │ └────────────────────────────────────────────────────────────────────────────────┘  │  │
│  │  └────────────────────────────────────────────────────────────────────────────────────┘  │  │
│  │                                         ↕                                                 │  │
│  │  ┌── E #timetable-contact-section-vehicle ───────────────────────────────────────────┐  │  │
│  │  │ ◆ Fahrzeugangebot    Untertitel (i18n)                                               │  │  │
│  │  │ [Typ][Marke][Modell][Ort][Jahr][km][Menge][Preis EUR]                                │  │  │
│  │  │ [======================== Angebotsnotizen ========================]                  │  │  │
│  │  │ ─────────────────────────────────────────────────────────────────────────────────  │  │  │
│  │  │ ◆ Zulassung & Status   Untertitel (i18n)                                             │  │  │
│  │  │ [Aufbau][Zulassung MM/JJJJ][Ersatzmotor km][Kundenpreis] … Prozessoren …           │  │  │
│  │  │ ☐ Verkauft  ☐ Abgemeldet                                                             │  │  │
│  │  └────────────────────────────────────────────────────────────────────────────────────┘  │  │
│  │                                         ↕                                                 │  │
│  │  ┌── F #timetable-contact-section-activity ──────────────────────────────────────────┐  │  │
│  │  │ ◆ Korrespondenz & Notizen                                                            │  │  │
│  │  │ [===============================================================================] │  │  │
│  │  │ [==================== große textarea, min-h, resize-y ==========================] │  │  │
│  │  └────────────────────────────────────────────────────────────────────────────────────┘  │  │
│  │                                                                                          │  │
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘  │
│ ┌──────────────────────────── FOOTER (fixed) ────────────────────────────────────────────┐ │
│ │ ● Status (gespeichert / ungespeichert)              [ Verwerfen ]  [ Kontakt speichern ] │ │
│ └────────────────────────────────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Mobile wireframe (`< lg`)

- Same **vertical order A → B → C → D → E → F**; **rail** optional hide or collapse to dots.
- **Section nav:** horizontal scroll chips **or** hamburger “Jump to…” sheet (plan: chips first).
- **A:** one column: identity fields first, then slot/outcome block below.
- **C:** sub-blocks stack (contacts full width, then assignments).
- **E:** offer card then registration card; grids **1 col**.
- **Smart summary:** popover anchored to toolbar button.

---

## Component map (wireframe → code)

| Wireframe block | Prefer reuse |
|-----------------|--------------|
| A–F outer shell | `ContactCard` (icon + title + subtitle + children) |
| A inner fields | `labelClass` / `inputClass` / checkbox patterns from Vehicle tab |
| Smart summary popover | `ContactSmartSummaryCard` + ref |
