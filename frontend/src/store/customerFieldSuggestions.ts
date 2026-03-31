import type { KundenDbState } from "../types/kunden";

const MAX_PER_FIELD = 120;

function uniqSorted(values: (string | undefined | null)[]): string[] {
  const s = new Set<string>();
  for (const v of values) {
    const t = v?.trim();
    if (t) s.add(t);
  }
  return [...s].sort((a, b) => a.localeCompare(b, "de")).slice(0, MAX_PER_FIELD);
}

/** Werte aus gespeicherten Kunden/Wash für <datalist>-Vorschläge (kein Browser-Autofill). */
export type CustomerFieldSuggestions = {
  kunden_nr: string[];
  firmenname: string[];
  branche: string[];
  gesellschaftsform: string[];
  ansprache: string[];
  firmenvorsatz: string[];
  strasse: string[];
  plz: string[];
  ort: string[];
  land_code: string[];
  ust_id_nr: string[];
  steuer_nr: string[];
  branchen_nr: string[];
  ansprechpartner: string[];
  telefonnummer: string[];
  faxnummer: string[];
  email: string[];
  internet_adr: string[];
  art_kunde: string[];
  buchungskonto_haupt: string[];
  unterlagen_pfad: string[];
  zustaendige_person_name: string[];
  wash_bukto: string[];
  wash_rechnung_zusatz: string[];
  wash_rechnung_plz: string[];
  wash_rechnung_ort: string[];
  wash_rechnung_strasse: string[];
  wash_bankname: string[];
  wash_bic: string[];
  wash_iban: string[];
  wash_kennzeichen: string[];
  wasch_fahrzeug_typ: string[];
  wasch_programm: string[];
  wasch_intervall: string[];
};

export function getCustomerFieldSuggestions(db: KundenDbState): CustomerFieldSuggestions {
  const k = db.kunden;
  const w = db.kundenWash;
  return {
    kunden_nr: uniqSorted(k.map((x) => x.kunden_nr)),
    firmenname: uniqSorted(k.map((x) => x.firmenname)),
    branche: uniqSorted(k.map((x) => x.branche)),
    gesellschaftsform: uniqSorted(k.map((x) => x.gesellschaftsform)),
    ansprache: uniqSorted(k.map((x) => x.ansprache)),
    firmenvorsatz: uniqSorted(k.map((x) => x.firmenvorsatz)),
    strasse: uniqSorted(k.map((x) => x.strasse)),
    plz: uniqSorted(k.map((x) => x.plz)),
    ort: uniqSorted(k.map((x) => x.ort)),
    land_code: uniqSorted(k.map((x) => x.land_code)),
    ust_id_nr: uniqSorted(k.map((x) => x.ust_id_nr)),
    steuer_nr: uniqSorted(k.map((x) => x.steuer_nr)),
    branchen_nr: uniqSorted(k.map((x) => x.branchen_nr)),
    ansprechpartner: uniqSorted(k.map((x) => x.ansprechpartner)),
    telefonnummer: uniqSorted(k.map((x) => x.telefonnummer)),
    faxnummer: uniqSorted(k.map((x) => x.faxnummer)),
    email: uniqSorted(k.map((x) => x.email)),
    internet_adr: uniqSorted(k.map((x) => x.internet_adr)),
    art_kunde: uniqSorted(k.map((x) => x.art_kunde)),
    buchungskonto_haupt: uniqSorted(k.map((x) => x.buchungskonto_haupt)),
    unterlagen_pfad: uniqSorted(k.map((x) => x.unterlagen_pfad)),
    zustaendige_person_name: uniqSorted(k.map((x) => x.zustaendige_person_name)),
    wash_bukto: uniqSorted(w.map((x) => x.bukto)),
    wash_rechnung_zusatz: uniqSorted(w.map((x) => x.rechnung_zusatz)),
    wash_rechnung_plz: uniqSorted(w.map((x) => x.rechnung_plz)),
    wash_rechnung_ort: uniqSorted(w.map((x) => x.rechnung_ort)),
    wash_rechnung_strasse: uniqSorted(w.map((x) => x.rechnung_strasse)),
    wash_bankname: uniqSorted(w.map((x) => x.bankname)),
    wash_bic: uniqSorted(w.map((x) => x.bic)),
    wash_iban: uniqSorted(w.map((x) => x.iban)),
    wash_kennzeichen: uniqSorted(w.map((x) => x.kennzeichen)),
    wasch_fahrzeug_typ: uniqSorted(w.map((x) => x.wasch_fahrzeug_typ)),
    wasch_programm: uniqSorted(w.map((x) => x.wasch_programm)),
    wasch_intervall: uniqSorted(w.map((x) => x.wasch_intervall)),
  };
}

/** Suggestions for company quick search (company names only). */
export function getQuickSearchSuggestions(db: KundenDbState): string[] {
  const s = getCustomerFieldSuggestions(db);
  return uniqSorted(s.firmenname);
}
