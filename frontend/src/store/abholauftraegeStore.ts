import type { AbholauftraegeDbState, AbholauftragRow } from "../types/abholauftraege";

const STORAGE_KEY = "dema-abholauftraege-db";

function seed(): AbholauftraegeDbState {
  const rows: AbholauftragRow[] = [
    {
      id: 1,
      erledigt: false,
      erstellt_datum: "2026-03-19",
      abholbereit_datum: "2026-03-23",
      kunde_anzeige:
        "62360 Hesdin L'Abbe, 920 Rue de Landacres (S.B.T.S soc Boulonnaise Transports Service)",
      fahrzeugart: "LKW",
      fabrikat: "SCANIA",
      typ: "R 450",
      aufbauart: "SZM",
      fahrgestellnummer: "YS2R4X20005375581",
      fahrgestellnummer_2: "",
    },
    {
      id: 2,
      erledigt: false,
      erstellt_datum: "2026-03-18",
      abholbereit_datum: "2026-03-22",
      kunde_anzeige: "80331 München, Landsberger Str. 480 (Muster Spedition GmbH)",
      fahrzeugart: "LKW",
      fabrikat: "DAF",
      typ: "XF 480 FT",
      aufbauart: "Kipper",
      fahrgestellnummer: "XLRTE47MS0G123456",
    },
    {
      id: 3,
      erledigt: false,
      erstellt_datum: "2026-03-15",
      abholbereit_datum: "2026-03-25",
      kunde_anzeige: "20095 Hamburg, Hafenstr. 12 (Nordlogistik HH)",
      fahrzeugart: "Anhänger",
      fabrikat: "SCHMITZ",
      typ: "SCB*S3B",
      aufbauart: "Pritsche Plane",
      fahrgestellnummer: "WSM1234567890ABCD",
      fahrgestellnummer_2: "INT-77812",
    },
    {
      id: 4,
      erledigt: false,
      erstellt_datum: "2026-03-10",
      abholbereit_datum: "2026-03-20",
      kunde_anzeige: "50667 Köln, Industrieweg 3 (Rhein-Tank-Logistik)",
      fahrzeugart: "LKW",
      fabrikat: "MAN",
      typ: "TGX 18.510",
      aufbauart: "Tankaufbau",
      fahrgestellnummer: "WMA06SZZZ8Y234567",
    },
    {
      id: 5,
      erledigt: true,
      erstellt_datum: "2026-03-06",
      abholbereit_datum: "2026-03-12",
      kunde_anzeige: "04109 Leipzig, Dessauer Str. 100 (Getreide AG Schkortleben)",
      fahrzeugart: "Auflieger",
      fabrikat: "KRONE",
      typ: "Profi Liner",
      aufbauart: "Getreidekipper",
      fahrgestellnummer: "WKR9876543210EFGH",
    },
    {
      id: 6,
      erledigt: false,
      erstellt_datum: "2026-03-05",
      abholbereit_datum: "2026-03-18",
      kunde_anzeige: "10115 Berlin, Chausseestr. 50 (Kühltransport Berlin)",
      fahrzeugart: "LKW",
      fabrikat: "MB",
      typ: "Actros 1830",
      aufbauart: "Kühlkoffer",
      fahrgestellnummer: "WDB90612345678901",
    },
    {
      id: 7,
      erledigt: false,
      erstellt_datum: "2026-03-01",
      abholbereit_datum: "2026-03-15",
      kunde_anzeige: "90402 Nürnberg, Frankenstr. 9 (Holzhandel Mittelfranken)",
      fahrzeugart: "Sonstige",
      fabrikat: "IVECO",
      typ: "Eurocargo",
      aufbauart: "Holztransporte",
      fahrgestellnummer: "ZCFCE45A000123456",
    },
    {
      id: 8,
      erledigt: false,
      erstellt_datum: "2026-02-28",
      abholbereit_datum: "2026-03-10",
      kunde_anzeige: "28195 Bremen, Hafenlogistik 1 (PAKET-Hub Bremen)",
      fahrzeugart: "PAKET",
      fabrikat: "VOLVO",
      typ: "FL 240",
      aufbauart: "Koffer",
      fahrgestellnummer: "YV2E4E12345678901",
    },
  ];
  return { version: 1, rows };
}

function isState(x: unknown): x is AbholauftraegeDbState {
  if (x == null || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return o.version === 1 && Array.isArray(o.rows);
}

export function loadAbholauftraegeDb(): AbholauftraegeDbState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (isState(parsed)) return parsed;
    }
  } catch {
    /* ignore */
  }
  return seed();
}
