import type { BestandDbState, BestandRow } from "../types/bestand";

const STORAGE_KEY = "dema-bestand-db";

function seed(): BestandDbState {
  const rows: BestandRow[] = [
    {
      id: 1, positions_nr: "19252", kaufdatum: "2026-03-20", fahrzeugart: "LKW",
      aufbau_art: "Sonstige", fabrikat: "Krone", typ: "Profi Liner", ez: "10-2011",
      fahrgestellnummer: "WKE5D00000S19423", ps: 460, km_stand: 712340,
      kreditor_nr: "72375", firmenname: "Barth Spedition GmbH", plz: "72375", ort: "Hechingen",
      land: "DE", standtage: 5, hauptschluessel: true, ersatzschluessel: true,
      in_mobile: true, reserviert: false,
    },
    {
      id: 2, positions_nr: "19251", kaufdatum: "2026-03-20", fahrzeugart: "LKW",
      aufbau_art: "SZM", fabrikat: "MAN", typ: "TGX 18.470", ez: "07-2019",
      fahrgestellnummer: "WMA06XZZ9NHM73232", ps: 470, km_stand: 489200,
      kreditor_nr: "63512", firmenname: "Autoklein Nutzfahrzeuge GmbH", plz: "63512", ort: "Hainburg",
      land: "DE", standtage: 5, hauptschluessel: true, ersatzschluessel: false,
      in_mobile: true, reserviert: false, angefragt: true,
    },
    {
      id: 3, positions_nr: "19250", kaufdatum: "2026-03-20", fahrzeugart: "LKW",
      aufbau_art: "SZM", fabrikat: "MAN", typ: "TGS 26.480", ez: "06-2019",
      fahrgestellnummer: "WMJ35CZZNM516177", ps: 480, km_stand: 558000,
      kreditor_nr: "49624", firmenname: "MUB Logistik und Handel", plz: "49624", ort: "Löningen",
      land: "DE", standtage: 5, hauptschluessel: true, ersatzschluessel: true,
      in_mobile: true, reserviert: false,
    },
    {
      id: 4, positions_nr: "19249", kaufdatum: "2026-03-20", fahrzeugart: "LKW",
      aufbau_art: "SZM", fabrikat: "MB", typ: "Actros 1845", ez: "03-2008",
      fahrgestellnummer: "WDB967077L223603", ps: 449, km_stand: 1243800,
      kreditor_nr: "74599", firmenname: "Elko Oberfläche", plz: "74599", ort: "Wallhausen",
      land: "DE", standtage: 5, hauptschluessel: false, ersatzschluessel: false,
      fehlende_kosten: true,
    },
    {
      id: 5, positions_nr: "19248", kaufdatum: "2026-03-21", fahrzeugart: "LKW",
      aufbau_art: "SZM", fabrikat: "MB", typ: "Actros 1851", ez: "05-2011",
      fahrgestellnummer: "WMAN15CZZ8Y259908", ps: 510, km_stand: 1089400,
      kreditor_nr: "50827", firmenname: "Alfolie F. J. Schultz GmbH", plz: "50827", ort: "Köln",
      land: "DE", standtage: 4, hauptschluessel: true, ersatzschluessel: true,
      in_mobile: true, reserviert: false, angezahlt: true,
    },
    {
      id: 6, positions_nr: "19247", kaufdatum: "2026-03-21", fahrzeugart: "LKW",
      aufbau_art: "SZM", fabrikat: "DAF", typ: "XF 530", ez: "07-2018",
      fahrgestellnummer: "XLRTEM4306C21230", ps: 530, km_stand: 624000,
      kreditor_nr: "94130", firmenname: "Reichenbacher Transport GmbH", plz: "94130", ort: "Aitrach",
      land: "DE", standtage: 4, hauptschluessel: true, ersatzschluessel: true,
      in_mobile: true, reserviert: true, reserviert_name: "Müller Transport", reserviert_bis: "2026-04-10", reserviert_preis: 62500,
    },
    {
      id: 7, positions_nr: "19246", kaufdatum: "2026-03-21", fahrzeugart: "LKW",
      aufbau_art: "SZM", fabrikat: "SCANIA", typ: "R 500", ez: "09-2013",
      fahrgestellnummer: "YS2R4X20001123456", ps: 500, km_stand: 1340200,
      kreditor_nr: "50827", firmenname: "Kölner Speditionsgruppe GmbH", plz: "50827", ort: "Köln",
      land: "DE", standtage: 4, hauptschluessel: true, ersatzschluessel: false,
      kein_abholer: true,
    },
    {
      id: 8, positions_nr: "19245", kaufdatum: "2026-03-21", fahrzeugart: "LKW",
      aufbau_art: "Sonstige", fabrikat: "Schmitz", typ: "S.CS 24/L", ez: "07-2019",
      fahrgestellnummer: "WSM00000054789012", ps: 0, km_stand: 0,
      kreditor_nr: "85003", firmenname: "EDEKA Südbayen Handels Stiftung", plz: "85003", ort: "Ingolstadt",
      land: "DE", standtage: 4, hauptschluessel: true, ersatzschluessel: true,
      in_mobile: true, in_aufbereitung: true,
    },
    {
      id: 9, positions_nr: "19244", kaufdatum: "2026-03-19", fahrzeugart: "LKW",
      aufbau_art: "SZM", fabrikat: "IVECO", typ: "Stralis 460", ez: "12-2015",
      fahrgestellnummer: "XLRAE127DCZ441332", ps: 460, km_stand: 892100,
      kreditor_nr: "81281", firmenname: "Kellner Rohr und Tiefbau GmbH", plz: "91281", ort: "Kirchenthumbach",
      land: "DE", standtage: 6, hauptschluessel: true, ersatzschluessel: true,
      reinigung_offen: true, im_vorfeld: true,
    },
    {
      id: 10, positions_nr: "19243", kaufdatum: "2026-03-19", fahrzeugart: "LKW",
      aufbau_art: "Kühlkoffer", fabrikat: "Schmitz", typ: "SKO 24/L", ez: "03-2019",
      fahrgestellnummer: "WSM0SKO2419S305385", ps: 0, km_stand: 0,
      kreditor_nr: "85003", firmenname: "EDEKA Handels Stiftung & Co.", plz: "85003", ort: "Ingolstadt",
      land: "DE", standtage: 6, hauptschluessel: false, ersatzschluessel: true,
      in_mobile: true, keine_erstkontrolle: true,
    },
    {
      id: 11, positions_nr: "19242", kaufdatum: "2026-03-19", fahrzeugart: "LKW",
      aufbau_art: "Absetzkipper", fabrikat: "DAF", typ: "CF 480", ez: "05-2018",
      fahrgestellnummer: "WD9351000G1R12092", ps: 480, km_stand: 543200,
      kreditor_nr: "78052", firmenname: "Riesler Uwe", plz: "78052", ort: "VS-Villingen",
      land: "DE", standtage: 6, hauptschluessel: true, ersatzschluessel: true,
      in_mobile: true, reserviert: false,
    },
    {
      id: 12, positions_nr: "19241", kaufdatum: "2026-03-18", fahrzeugart: "Anhänger",
      aufbau_art: "Sonstige", fabrikat: "ROHR", typ: "RAK/18 IV", ez: "09-2016",
      fahrgestellnummer: "WD9351000G1R12085", ps: 0, km_stand: 0,
      kreditor_nr: "78052", firmenname: "Riesler Uwe", plz: "78052", ort: "VS-Villingen",
      land: "DE", standtage: 7, hauptschluessel: true, ersatzschluessel: false,
      in_mobile: false, im_vorfeld: true,
    },
    {
      id: 13, positions_nr: "19240", kaufdatum: "2026-03-18", fahrzeugart: "Anhänger",
      aufbau_art: "Sonstige", fabrikat: "ROHR", typ: "RAK/18 IV", ez: "09-2016",
      fahrgestellnummer: "WD9351000G1R11990", ps: 0, km_stand: 0,
      kreditor_nr: "78052", firmenname: "Riesler Uwe", plz: "78052", ort: "VS-Villingen",
      land: "DE", standtage: 7, hauptschluessel: false, ersatzschluessel: false,
      kein_eingang: true,
    },
    {
      id: 14, positions_nr: "19239", kaufdatum: "2026-03-18", fahrzeugart: "Anhänger",
      aufbau_art: "Getränkeaufbau", fabrikat: "WEB Trailer", typ: "Pra PZ 18", ez: "12-2015",
      fahrgestellnummer: "WD9PRA218FTW86201", ps: 0, km_stand: 0,
      kreditor_nr: "78052", firmenname: "Riesler Uwe", plz: "78052", ort: "VS-Villingen",
      land: "DE", standtage: 7, hauptschluessel: true, ersatzschluessel: true,
      in_mobile: true, in_aufbereitung: true,
    },
    {
      id: 15, positions_nr: "19238", kaufdatum: "2026-03-18", fahrzeugart: "LKW",
      aufbau_art: "Getränkeaufbau", fabrikat: "DAIMLERCHR.", typ: "Aritos 2543", ez: "01-2016",
      fahrgestellnummer: "WDB96032010006791", ps: 428, km_stand: 764300,
      kreditor_nr: "78052", firmenname: "Riesler Uwe", plz: "78052", ort: "VS-Villingen",
      land: "DE", standtage: 7, hauptschluessel: true, ersatzschluessel: true,
      in_mobile: true, reserviert: true, reserviert_name: "Brauerei Süd", reserviert_bis: "2026-03-28", reserviert_preis: 44000,
    },
    {
      id: 16, positions_nr: "19237", kaufdatum: "2026-03-17", fahrzeugart: "LKW",
      aufbau_art: "Getränkeaufbau", fabrikat: "DAIMLERCHR.", typ: "Aritos 2543", ez: "01-2016",
      fahrgestellnummer: "WDB96032010006793", ps: 428, km_stand: 791000,
      kreditor_nr: "78052", firmenname: "Riesler Uwe", plz: "78052", ort: "VS-Villingen",
      land: "DE", standtage: 8, hauptschluessel: true, ersatzschluessel: false,
      in_mobile: true, offene_auftraege: true,
    },
    {
      id: 17, positions_nr: "19236", kaufdatum: "2026-03-17", fahrzeugart: "LKW",
      aufbau_art: "Kühlkoffer", fabrikat: "MB", typ: "Actros 2543", ez: "11-2018",
      fahrgestellnummer: "WDB96302010007945", ps: 428, km_stand: 612400,
      kreditor_nr: "78052", firmenname: "Riesler Uwe", plz: "78052", ort: "VS-Villingen",
      land: "DE", standtage: 8, hauptschluessel: true, ersatzschluessel: true,
      in_mobile: true, reserviert: false,
    },
    {
      id: 18, positions_nr: "19235", kaufdatum: "2026-03-17", fahrzeugart: "LKW",
      aufbau_art: "Kühlkoffer", fabrikat: "MB", typ: "Actros 2543", ez: "10-2018",
      fahrgestellnummer: "WDB96302010077838", ps: 428, km_stand: 588700,
      kreditor_nr: "71522", firmenname: "A.P.M Transport GmbH", plz: "71522", ort: "Backnang",
      land: "DE", standtage: 8, hauptschluessel: true, ersatzschluessel: true,
      in_mobile: true, in_aufbereitung: true,
    },
    {
      id: 19, positions_nr: "19234", kaufdatum: "2026-03-17", fahrzeugart: "LKW",
      aufbau_art: "Kühlkoffer", fabrikat: "MB", typ: "Actros 2543", ez: "10-2018",
      fahrgestellnummer: "WDB96302010078941", ps: 428, km_stand: 601200,
      kreditor_nr: "71522", firmenname: "A.P.M Transport GmbH", plz: "71522", ort: "Backnang",
      land: "DE", standtage: 8, hauptschluessel: false, ersatzschluessel: true,
      in_mobile: false, fehlende_kosten: true,
    },
    {
      id: 20, positions_nr: "19231", kaufdatum: "2026-03-17", fahrzeugart: "Auflieger",
      aufbau_art: "Sonstige", fabrikat: "Schmitz", typ: "Ategs 818", ez: "08-2019",
      fahrgestellnummer: "WSM0SCS2469S46540", ps: 0, km_stand: 0,
      kreditor_nr: "67089", firmenname: "Pfahrer Markthalle", plz: "67089", ort: "Grünstadt",
      land: "DE", standtage: 8, hauptschluessel: true, ersatzschluessel: false,
      in_mobile: true, im_vorfeld: true,
    },
    {
      id: 21, positions_nr: "19229", kaufdatum: "2026-03-16", fahrzeugart: "LKW",
      aufbau_art: "Kühlkoffer", fabrikat: "MB", typ: "Actros 1848 x4", ez: "05-2013",
      fahrgestellnummer: "WDB9630221L094736", ps: 476, km_stand: 1023400,
      kreditor_nr: "63150", firmenname: "REWE Transport GmbH", plz: "63150", ort: "Heusenstamm",
      land: "DE", standtage: 9, hauptschluessel: true, ersatzschluessel: true,
      in_mobile: true, reserviert: true, reserviert_name: "Kühlexpress Nord", reserviert_bis: "2026-03-22", reserviert_preis: 58000,
    },
    {
      id: 22, positions_nr: "19228", kaufdatum: "2026-03-16", fahrzeugart: "LKW",
      aufbau_art: "Pritsche/Plane", fabrikat: "MB", typ: "Antos 1830", ez: "09-2017",
      fahrgestellnummer: "WDB9634021L037108", ps: 299, km_stand: 489300,
      kreditor_nr: "68169", firmenname: "Zentraleinkauf Holz + Kunststoff", plz: "68169", ort: "Mannheim",
      land: "DE", standtage: 9, hauptschluessel: true, ersatzschluessel: true,
      in_mobile: true, bh_check: true,
    },
    {
      id: 23, positions_nr: "19224", kaufdatum: "2026-03-15", fahrzeugart: "Auflieger",
      aufbau_art: "Kühlkoffer", fabrikat: "Schmitz", typ: "SKO 24/L", ez: "09-2015",
      fahrgestellnummer: "WSM00SKO2419963409", ps: 0, km_stand: 0,
      kreditor_nr: "53101", firmenname: "Müller — Die lila Logistik Route", plz: "53101", ort: "Bergheim-S.",
      land: "DE", standtage: 10, hauptschluessel: true, ersatzschluessel: true,
      in_mobile: true,
    },
    {
      id: 24, positions_nr: "19222", kaufdatum: "2026-03-15", fahrzeugart: "LKW",
      aufbau_art: "SZM", fabrikat: "MB", typ: "Actros 1842", ez: "11-2012",
      fahrgestellnummer: "WDB9360311L010238", ps: 422, km_stand: 1456700,
      kreditor_nr: "63302", firmenname: "KM Trans GmbH", plz: "63302", ort: "Dreieich",
      land: "DE", standtage: 10, hauptschluessel: true, ersatzschluessel: false,
      in_mobile: true, in_aufbereitung: true, auftrag_erledigt: true,
    },
    {
      id: 25, positions_nr: "19219", kaufdatum: "2026-03-12", fahrzeugart: "LKW",
      aufbau_art: "Sonstige", fabrikat: "SCANIA", typ: "R 450 LA", ez: "03-2020",
      fahrgestellnummer: "YS2R4X20001987654", ps: 450, km_stand: 389000,
      kreditor_nr: "76437", firmenname: "Großh. Rohrl...", plz: "76437", ort: "Rastatt",
      land: "DE", standtage: 13, hauptschluessel: true, ersatzschluessel: true,
      in_mobile: true, im_vorfeld: true,
    },
  ];
  return { version: 1, rows };
}

function isState(x: unknown): x is BestandDbState {
  if (x == null || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return o.version === 1 && Array.isArray(o.rows);
}

export function loadBestandDb(): BestandDbState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (isState(parsed)) return parsed;
    }
  } catch { /* ignore */ }
  return seed();
}

export function saveBestandDb(state: BestandDbState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}
