-- DEMA Dashboard – PostgreSQL schema
-- One client (kunden) for Sales / Purchase / Werkstatt; wash extension (kunden_wash) 1:1.

-- -----------------------------------------------------------------------------
-- Lookups & staff
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS laender (
  code CHAR(2) PRIMARY KEY,
  name VARCHAR(80) NOT NULL
);

CREATE TABLE IF NOT EXISTS mitarbeiter (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  kuerzel VARCHAR(20)
);

-- -----------------------------------------------------------------------------
-- Core client (Kundendaten – Sales / Purchase / Mechanic)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS kunden (
  id BIGSERIAL PRIMARY KEY,
  kunden_nr VARCHAR(32) NOT NULL UNIQUE,

  branche VARCHAR(120),
  fzg_haendler BOOLEAN NOT NULL DEFAULT FALSE,
  juristische_person BOOLEAN NOT NULL DEFAULT FALSE,
  natuerliche_person BOOLEAN NOT NULL DEFAULT FALSE,
  gesellschaftsform VARCHAR(80),
  ansprache VARCHAR(40),
  firmenvorsatz VARCHAR(120),
  firmenname VARCHAR(255) NOT NULL,
  bemerkungen TEXT,
  zustaendige_person_id BIGINT REFERENCES mitarbeiter(id),
  aufnahme TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  strasse VARCHAR(255),
  plz VARCHAR(20),
  ort VARCHAR(120),
  land_code VARCHAR(2) REFERENCES laender(code),
  art_land_code VARCHAR(10),
  ust_id_nr VARCHAR(40),
  steuer_nr VARCHAR(40),
  branchen_nr VARCHAR(40),
  ansprechpartner VARCHAR(120),
  telefonnummer VARCHAR(40),
  faxnummer VARCHAR(40),
  email VARCHAR(255),
  internet_adr VARCHAR(255),
  bemerkungen_kontakt TEXT,
  faxen_flag BOOLEAN NOT NULL DEFAULT FALSE,

  art_kunde VARCHAR(80),
  buchungskonto_haupt VARCHAR(40),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kunden_firmenname ON kunden (firmenname);
CREATE INDEX IF NOT EXISTS idx_kunden_plz_ort ON kunden (plz, ort);

-- -----------------------------------------------------------------------------
-- Wash extension (same kunden_id; Waschanlage-specific fields)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS kunden_wash (
  id BIGSERIAL PRIMARY KEY,
  kunden_id BIGINT NOT NULL UNIQUE REFERENCES kunden(id) ON DELETE CASCADE,

  bukto VARCHAR(40),
  limit_betrag NUMERIC(12,2) NOT NULL DEFAULT 0,

  rechnung_zusatz VARCHAR(255),
  rechnung_plz VARCHAR(20),
  rechnung_ort VARCHAR(120),
  rechnung_strasse VARCHAR(255),

  kunde_gesperrt BOOLEAN NOT NULL DEFAULT FALSE,
  bankname VARCHAR(120),
  bic VARCHAR(20),
  iban VARCHAR(34),
  wichtige_infos TEXT,
  bemerkungen TEXT,
  lastschrift BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- Roles: supplier / buyer / workshop
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS kunden_rollen (
  id BIGSERIAL PRIMARY KEY,
  kunden_id BIGINT NOT NULL REFERENCES kunden(id) ON DELETE CASCADE,
  rolle VARCHAR(20) NOT NULL CHECK (rolle IN ('LIEFERANT', 'KAUFER', 'WERKSTATT')),
  gueltig_ab DATE,
  gueltig_bis DATE,
  UNIQUE (kunden_id, rolle)
);

CREATE INDEX IF NOT EXISTS idx_kunden_rollen_kunde ON kunden_rollen (kunden_id);

-- -----------------------------------------------------------------------------
-- Sales: Anfrage, Bestand, Angebot
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS anfrage (
  id BIGSERIAL PRIMARY KEY,
  anfrage_nr VARCHAR(32) NOT NULL UNIQUE,
  anfragedatum DATE NOT NULL DEFAULT CURRENT_DATE,
  fahrzeugart VARCHAR(40),
  aufbauart VARCHAR(80),
  fabrikat VARCHAR(80),
  modell_typ VARCHAR(120),
  zul_gg_von INT,
  zul_gg_bis INT,
  ez_von INT,
  ez_bis INT,
  max_alter INT,
  ps_von INT,
  ps_bis INT,
  max_kilometer INT,
  preis_von NUMERIC(12,2),
  preis_bis NUMERIC(12,2),
  extras_suche TEXT,
  debitor_id BIGINT NOT NULL REFERENCES kunden(id),
  bearbeiter_id BIGINT REFERENCES mitarbeiter(id),
  bemerkungen TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anfrage_debitor ON anfrage (debitor_id);

CREATE TABLE IF NOT EXISTS bestand (
  id BIGSERIAL PRIMARY KEY,
  positions_nr VARCHAR(32) NOT NULL UNIQUE,
  kreditor_id BIGINT REFERENCES kunden(id),
  kaufdatum DATE,
  fahrzeugart VARCHAR(40),
  aufbau_art VARCHAR(80),
  fabrikat VARCHAR(80),
  modellreihe VARCHAR(120),
  typ VARCHAR(120),
  fahrgestellnummer VARCHAR(40) UNIQUE,
  kw INT,
  ps INT,
  km_stand_gesamt INT,
  km_stand_atm INT,
  bereifung_pct INT,
  allgemeiner_zustand VARCHAR(80),
  leergewicht INT,
  zul_gesamtgewicht INT,
  erstzulassung DATE,
  letzte_kz VARCHAR(20),
  einkaeufer_id BIGINT REFERENCES mitarbeiter(id),
  eingabe_durch_id BIGINT REFERENCES mitarbeiter(id),
  reserviert BOOLEAN NOT NULL DEFAULT FALSE,
  reserviert_name VARCHAR(255),
  reserviert_bis DATE,
  reserviert_preis NUMERIC(12,2),
  bemerkung_verkauf TEXT,
  bemerkung_einkauf TEXT,
  bemerkung_buchhaltung TEXT,
  bemerkung_werkstatt TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS anfrage_bestand (
  id BIGSERIAL PRIMARY KEY,
  anfrage_id BIGINT NOT NULL REFERENCES anfrage(id) ON DELETE CASCADE,
  bestand_id BIGINT NOT NULL REFERENCES bestand(id) ON DELETE CASCADE,
  datum DATE NOT NULL DEFAULT CURRENT_DATE,
  name VARCHAR(255),
  reserviert_bis DATE,
  erreichbarkeit VARCHAR(120),
  preis_dema NUMERIC(12,2),
  preis_kunde NUMERIC(12,2),
  anzahlung NUMERIC(12,2),
  anfrage_erstellt_von_id BIGINT REFERENCES mitarbeiter(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (anfrage_id, bestand_id)
);

CREATE TABLE IF NOT EXISTS angebot (
  id BIGSERIAL PRIMARY KEY,
  angebot_nr VARCHAR(32) NOT NULL UNIQUE,
  angebotdatum DATE NOT NULL DEFAULT CURRENT_DATE,
  anbieter VARCHAR(255),
  kunden_id BIGINT NOT NULL REFERENCES kunden(id),
  bestand_id BIGINT REFERENCES bestand(id),
  anfrage_id BIGINT REFERENCES anfrage(id),
  fahrzeugart VARCHAR(40),
  aufbau_art VARCHAR(80),
  fabrikat VARCHAR(80),
  modellreihe VARCHAR(120),
  typ VARCHAR(120),
  fahrgestellnummer VARCHAR(40),
  erstzulassung DATE,
  fahrzeug_anbieten BOOLEAN NOT NULL DEFAULT TRUE,
  verkauft BOOLEAN NOT NULL DEFAULT FALSE,
  abgemeldet BOOLEAN NOT NULL DEFAULT FALSE,
  kw INT,
  ps INT,
  km_stand_gesamt INT,
  km_stand_atm INT,
  bereifung_pct INT,
  allgemeiner_zustand VARCHAR(80),
  zul_gesamtgewicht INT,
  leergewicht INT,
  abgabetermin DATE,
  preisvorstellung_kunde NUMERIC(12,2),
  preisvorstellung_dema NUMERIC(12,2),
  angebot_eingeholt VARCHAR(80),
  verhandelt_von_id BIGINT REFERENCES mitarbeiter(id),
  angebot_eingetragen_id BIGINT REFERENCES mitarbeiter(id),
  preis_datum_1 DATE,
  preis_dema_1 NUMERIC(12,2),
  preis_kunde_1 NUMERIC(12,2),
  preis_datum_2 DATE,
  preis_dema_2 NUMERIC(12,2),
  preis_kunde_2 NUMERIC(12,2),
  preis_datum_3 DATE,
  preis_dema_3 NUMERIC(12,2),
  preis_kunde_3 NUMERIC(12,2),
  extras TEXT,
  bemerkungen TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS termin (
  id BIGSERIAL PRIMARY KEY,
  kunden_id BIGINT REFERENCES kunden(id),
  angebot_id BIGINT REFERENCES angebot(id),
  termin_datum DATE,
  thema VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS abholauftrag (
  id BIGSERIAL PRIMARY KEY,
  angebot_id BIGINT REFERENCES angebot(id),
  bestand_id BIGINT REFERENCES bestand(id),
  abhol_datum DATE,
  status VARCHAR(40)
);

-- -----------------------------------------------------------------------------
-- Finance: Sammelüberweisung
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sammelueberweisung (
  id BIGSERIAL PRIMARY KEY,
  ueberweisung_nr VARCHAR(32) NOT NULL UNIQUE,
  text TEXT,
  gesamtpreis_netto NUMERIC(14,2),
  mwst_pct NUMERIC(5,2) DEFAULT 19.00,
  mwst_betrag NUMERIC(14,2),
  gesamtpreis_brutto NUMERIC(14,2),
  zahlungsart VARCHAR(40),
  bezahlt_am DATE,
  kunden_id BIGINT NOT NULL REFERENCES kunden(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sammelueberweisung_teilzahlung (
  id BIGSERIAL PRIMARY KEY,
  sammelueberweisung_id BIGINT NOT NULL REFERENCES sammelueberweisung(id) ON DELETE CASCADE,
  zahlungsart VARCHAR(40),
  vermerk VARCHAR(120),
  notiz TEXT,
  bezahlt_am DATE,
  betrag NUMERIC(12,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS sammelueberweisung_position (
  id BIGSERIAL PRIMARY KEY,
  sammelueberweisung_id BIGINT NOT NULL REFERENCES sammelueberweisung(id) ON DELETE CASCADE,
  bestand_id BIGINT REFERENCES bestand(id),
  kaufdatum DATE,
  nettokauf NUMERIC(12,2),
  mwst_kauf NUMERIC(12,2),
  bruttokauf NUMERIC(12,2),
  bezahlt_am DATE,
  zahlungsart VARCHAR(40)
);

-- -----------------------------------------------------------------------------
-- Invoicing (e.g. Waschanlage Rechnungen tab)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS rechnung (
  id BIGSERIAL PRIMARY KEY,
  rechnung_nr VARCHAR(32) NOT NULL UNIQUE,
  kunden_id BIGINT NOT NULL REFERENCES kunden(id),
  rechnungsdatum DATE NOT NULL DEFAULT CURRENT_DATE,
  gesamt_netto NUMERIC(14,2),
  mwst_betrag NUMERIC(14,2),
  gesamt_brutto NUMERIC(14,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rechnung_position (
  id BIGSERIAL PRIMARY KEY,
  rechnung_id BIGINT NOT NULL REFERENCES rechnung(id) ON DELETE CASCADE,
  bezeichnung VARCHAR(255),
  menge NUMERIC(12,3),
  einzelpreis NUMERIC(12,2),
  gesamt NUMERIC(12,2)
);
