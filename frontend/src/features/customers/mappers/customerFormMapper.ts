import type { KundenAdresse, KundenKontakt, KundenStamm, KundenWashStamm } from "../../../types/kunden";
import type { DepartmentArea } from "../../../types/departmentArea";
import type { NewKundeInput, KundenWashUpsertFields } from "../../../store/kundenStore";
import { ADRESSE_TYPEN, COUNTRY_CODES, landCodeToArtLand } from "./customerFormConstants";

export type KontaktEntry = {
  id: string;
  name: string;
  rolle: string;
  telefonCode: string;
  telefon: string;
  handyCode: string;
  handy: string;
  email: string;
  website: string;
  bemerkung: string;
};

export type AdresseEntry = {
  id: string;
  typ: string;
  strasse: string;
  plz: string;
  ort: string;
  land_code: string;
  art_land_code: string;
  ust_id_nr: string;
  steuer_nr: string;
  branchen_nr: string;
};

export function emptyKontakt(): KontaktEntry {
  return {
    id: Math.random().toString(36).slice(2),
    name: "",
    rolle: "",
    telefonCode: "+49",
    telefon: "",
    handyCode: "+49",
    handy: "",
    email: "",
    website: "",
    bemerkung: "",
  };
}

export function splitStoredPhone(stored: string | undefined): { code: string; number: string } {
  const s = (stored ?? "").trim();
  if (!s) return { code: "+49", number: "" };
  const sorted = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);
  for (const { code } of sorted) {
    if (s.startsWith(code + " ")) {
      return { code, number: s.slice(code.length + 1).trim() };
    }
    if (s === code) {
      return { code, number: "" };
    }
  }
  return { code: "+49", number: s };
}

export function emptyAdresse(typ = "Hauptadresse"): AdresseEntry {
  return {
    id: Math.random().toString(36).slice(2),
    typ,
    strasse: "",
    plz: "",
    ort: "",
    land_code: "DE",
    art_land_code: "IL",
    ust_id_nr: "",
    steuer_nr: "",
    branchen_nr: "",
  };
}

type AcquisitionSourceForm = "" | "referral" | "website" | "email" | "call";
type CustomerTypeForm = "" | "legal_entity" | "natural_person";
type CustomerStatusForm = "" | "active" | "inactive" | "blocked";
type LifecycleStageForm = "" | "lead" | "qualified" | "active" | "inactive" | "vip" | "lost";
type ChannelTypeForm = "" | "email" | "phone" | "sms" | "whatsapp" | "mixed" | "none";
type CustomerRoleForm = "" | "supplier" | "buyer" | "workshop" | "wash";

export function initialForm() {
  return {
    aufnahme: "",
    customer_type: "" as CustomerTypeForm,
    customer_status: "active" as CustomerStatusForm,
    branche: "",
    acquisition_source: "" as AcquisitionSourceForm,
    acquisition_source_entity: "",
    fzgHandel: "" as "" | "ja" | "nein",
    juristische_person: false,
    natuerliche_person: false,
    gesellschaftsform: "",
    firmenvorsatz: "",
    firmenname: "",
    first_name: "",
    last_name: "",
    profile_notes: "",
    bemerkungen: "",
    acquisition_date: "",
    lifecycle_stage: "" as LifecycleStageForm,
    preferred_channel: "" as ChannelTypeForm,
    segment: "",
    score: "",
    consent_email: false,
    consent_sms: false,
    consent_phone: false,
    marketing_notes: "",
    customer_role: "" as CustomerRoleForm,
    role_valid_from: "",
    role_valid_to: "",
    zustaendige_person_name: "nicht zugeordnet",
    adressen: [emptyAdresse()] as AdresseEntry[],
    internet_adr: "",
    kontakte: [emptyKontakt()] as KontaktEntry[],
    art_kunde: "",
    buchungskonto_haupt: "",
    tax_country_type_code: "",
    account_number: "",
    credit_limit: "",
    billing_name: "",
    billing_street: "",
    billing_postal_code: "",
    billing_city: "",
    payment_blocked: false,
    bank_name: "",
    bic: "",
    iban: "",
    direct_debit_enabled: false,
    financial_notes: "",
    includeWashProfile: false,
    wash_bukto: "",
    wash_limit: "0",
    wash_rechnung_zusatz: "",
    wash_rechnung_plz: "",
    wash_rechnung_ort: "",
    wash_rechnung_strasse: "",
    wash_kunde_gesperrt: false,
    wash_kennzeichen_list: [] as string[],
    wash_kennzeichen_new: "",
    wasch_programm: "",
    wash_netto_preis: "",
    wash_brutto_preis: "",
    wasch_intervall: "",
    wash_bankname: "",
    wash_bic: "",
    wash_iban: "",
    wash_wichtige_infos: "",
    wash_bemerkungen: "",
    wash_lastschrift: false,
    wash_vehicle_type: "",
  };
}

export type CustomerFormDraft = ReturnType<typeof initialForm>;

export function serializeFormStateForDirtyBaseline(state: CustomerFormDraft): string {
  return JSON.stringify(state);
}

export function computeCustomerProfileCompletionPct(state: CustomerFormDraft): number {
  const a0 = state.adressen[0];
  const k0 = state.kontakte[0];
  const checks = [
    () => Boolean(state.firmenname.trim()),
    () => Boolean(state.customer_type),
    () => Boolean(a0?.strasse?.trim()),
    () => Boolean(a0?.plz?.trim()),
    () => Boolean(a0?.ort?.trim()),
    () => Boolean(a0?.land_code?.trim()),
    () => Boolean(a0?.ust_id_nr?.trim() || a0?.steuer_nr?.trim()),
    () => Boolean(k0?.email?.trim() || k0?.telefon?.trim() || state.internet_adr?.trim()),
  ];
  const n = checks.filter((fn) => fn()).length;
  return Math.round((n / checks.length) * 100);
}

function emptyToUndef(s: string): string | undefined {
  const t = s.trim();
  if (!t || t === "—") return undefined;
  return t;
}

function moneyToUndef(v: string): number | undefined {
  const normalized = v.trim().replace(",", ".");
  if (!normalized) return undefined;
  const n = Number(normalized);
  if (!Number.isFinite(n)) return undefined;
  return n;
}

export function priceToInput(v: number): string {
  return v.toFixed(2).replace(".", ",");
}

export function formFromExistingCustomer(
  kunde: KundenStamm,
  wash: KundenWashStamm | null | undefined,
  department?: DepartmentArea
): CustomerFormDraft {
  const firstAdresse = emptyAdresse("Hauptadresse");
  const kontakt = emptyKontakt();
  const washKennzeichen =
    wash?.kennzeichen
      ?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? [];
  const storedAdressen = Array.isArray(kunde.adressen) ? kunde.adressen : [];
  const mappedAdressen: AdresseEntry[] =
    storedAdressen.length > 0
      ? storedAdressen.map((a, idx) => ({
          id: a.id || `${kunde.id}-addr-${idx}`,
          typ: a.typ || ADRESSE_TYPEN[idx] || "Hauptadresse",
          strasse: a.strasse ?? "",
          plz: a.plz ?? "",
          ort: a.ort ?? "",
          land_code: a.land_code || "DE",
          art_land_code: a.art_land_code || landCodeToArtLand(a.land_code || "DE"),
          ust_id_nr: a.ust_id_nr ?? "",
          steuer_nr: a.steuer_nr ?? "",
          branchen_nr: a.branchen_nr ?? "",
        }))
      : [
          {
            ...firstAdresse,
            strasse: kunde.strasse ?? "",
            plz: kunde.plz ?? "",
            ort: kunde.ort ?? "",
            land_code: kunde.land_code ?? "DE",
            art_land_code: kunde.art_land_code ?? landCodeToArtLand(kunde.land_code ?? "DE"),
            ust_id_nr: kunde.ust_id_nr ?? "",
            steuer_nr: kunde.steuer_nr ?? "",
            branchen_nr: kunde.branchen_nr ?? "",
          },
        ];
  const storedKontakte = Array.isArray(kunde.kontakte) ? kunde.kontakte : [];
  const mappedKontakte: KontaktEntry[] =
    storedKontakte.length > 0
      ? storedKontakte.map((c, idx) => ({
          id: c.id || `${kunde.id}-kontakt-${idx}`,
          name: c.name ?? "",
          rolle: c.rolle ?? "",
          telefonCode: c.telefonCode || "+49",
          telefon: c.telefon ?? "",
          handyCode: c.handyCode || "+49",
          handy: c.handy ?? "",
          email: c.email ?? "",
          website: c.website ?? "",
          bemerkung: c.bemerkung ?? "",
        }))
      : [
          {
            ...kontakt,
            name: kunde.ansprechpartner ?? "",
            rolle: kunde.rolle_kontakt ?? "",
            ...(() => {
              const tel = splitStoredPhone(kunde.telefonnummer);
              const fax = splitStoredPhone(kunde.faxnummer);
              return {
                telefonCode: tel.code,
                telefon: tel.number,
                handyCode: fax.code,
                handy: fax.number,
              };
            })(),
            email: kunde.email ?? "",
            website: "",
            bemerkung: kunde.bemerkungen_kontakt ?? "",
          },
        ];

  const rawAcq = (kunde.acquisition_source ?? "").trim().toLowerCase();
  const acquisition_source: AcquisitionSourceForm =
    rawAcq === "referral" || rawAcq === "website" || rawAcq === "email" || rawAcq === "call"
      ? rawAcq
      : "";
  const customer_type: CustomerTypeForm =
    kunde.customer_type === "legal_entity" || kunde.customer_type === "natural_person"
      ? kunde.customer_type
      : kunde.juristische_person
        ? "legal_entity"
        : kunde.natuerliche_person
          ? "natural_person"
          : "";
  const customer_status: CustomerStatusForm =
    kunde.status === "active" || kunde.status === "inactive" || kunde.status === "blocked"
      ? kunde.status
      : "active";
  const lifecycle_stage: LifecycleStageForm =
    kunde.lifecycle_stage === "lead" ||
    kunde.lifecycle_stage === "qualified" ||
    kunde.lifecycle_stage === "active" ||
    kunde.lifecycle_stage === "inactive" ||
    kunde.lifecycle_stage === "vip" ||
    kunde.lifecycle_stage === "lost"
      ? kunde.lifecycle_stage
      : "";
  const preferred_channel: ChannelTypeForm =
    kunde.preferred_channel === "email" ||
    kunde.preferred_channel === "phone" ||
    kunde.preferred_channel === "sms" ||
    kunde.preferred_channel === "whatsapp" ||
    kunde.preferred_channel === "mixed" ||
    kunde.preferred_channel === "none"
      ? kunde.preferred_channel
      : "";
  const customer_role: CustomerRoleForm =
    kunde.customer_role === "supplier" ||
    kunde.customer_role === "buyer" ||
    kunde.customer_role === "workshop" ||
    kunde.customer_role === "wash"
      ? kunde.customer_role
      : "";

  return {
    ...initialForm(),
    aufnahme: kunde.aufnahme ?? "",
    customer_type,
    customer_status,
    branche: kunde.branche ?? "",
    acquisition_source,
    acquisition_source_entity: kunde.acquisition_source_entity ?? "",
    fzgHandel: kunde.fzg_haendler == null ? "" : kunde.fzg_haendler ? "ja" : "nein",
    juristische_person: kunde.juristische_person ?? false,
    natuerliche_person: kunde.natuerliche_person ?? false,
    gesellschaftsform: kunde.gesellschaftsform ?? "",
    firmenvorsatz: kunde.firmenvorsatz ?? "",
    firmenname: kunde.firmenname ?? "",
    first_name: kunde.first_name ?? "",
    last_name: kunde.last_name ?? "",
    profile_notes: kunde.profile_notes ?? "",
    bemerkungen: kunde.bemerkungen ?? "",
    acquisition_date: kunde.acquisition_date ?? "",
    lifecycle_stage,
    preferred_channel,
    segment: kunde.segment ?? "",
    score: kunde.score != null ? String(kunde.score) : "",
    consent_email: kunde.consent_email ?? false,
    consent_sms: kunde.consent_sms ?? false,
    consent_phone: kunde.consent_phone ?? false,
    marketing_notes: kunde.marketing_notes ?? "",
    customer_role,
    role_valid_from: kunde.role_valid_from ?? "",
    role_valid_to: kunde.role_valid_to ?? "",
    zustaendige_person_name: kunde.zustaendige_person_name ?? "nicht zugeordnet",
    adressen: mappedAdressen,
    internet_adr: kunde.internet_adr ?? "",
    kontakte: mappedKontakte,
    art_kunde: kunde.art_kunde ?? "",
    buchungskonto_haupt: kunde.buchungskonto_haupt ?? "",
    tax_country_type_code: kunde.tax_country_type_code ?? "",
    account_number: kunde.account_number ?? "",
    credit_limit: kunde.credit_limit != null ? String(kunde.credit_limit) : "",
    billing_name: kunde.billing_name ?? "",
    billing_street: kunde.billing_street ?? "",
    billing_postal_code: kunde.billing_postal_code ?? "",
    billing_city: kunde.billing_city ?? "",
    payment_blocked: kunde.payment_blocked ?? false,
    bank_name: kunde.bank_name ?? "",
    bic: kunde.bic ?? "",
    iban: kunde.iban ?? "",
    direct_debit_enabled: kunde.direct_debit_enabled ?? false,
    financial_notes: kunde.financial_notes ?? "",
    includeWashProfile: Boolean(wash) || department === "waschanlage",
    wash_bukto: wash?.bukto ?? "",
    wash_limit: String(wash?.limit_betrag ?? 0),
    wash_rechnung_zusatz: wash?.rechnung_zusatz ?? "",
    wash_rechnung_plz: wash?.rechnung_plz ?? "",
    wash_rechnung_ort: wash?.rechnung_ort ?? "",
    wash_rechnung_strasse: wash?.rechnung_strasse ?? "",
    wash_kunde_gesperrt: wash?.kunde_gesperrt ?? false,
    wash_kennzeichen_list: washKennzeichen,
    wash_kennzeichen_new: "",
    wasch_programm: wash?.wasch_programm ?? "",
    wash_netto_preis: wash?.netto_preis != null ? priceToInput(wash.netto_preis) : "",
    wash_brutto_preis: wash?.brutto_preis != null ? priceToInput(wash.brutto_preis) : "",
    wasch_intervall: wash?.wasch_intervall ?? "",
    wash_bankname: wash?.bankname ?? "",
    wash_bic: wash?.bic ?? "",
    wash_iban: wash?.iban ?? "",
    wash_wichtige_infos: wash?.wichtige_infos ?? "",
    wash_bemerkungen: wash?.bemerkungen ?? "",
    wash_lastschrift: wash?.lastschrift ?? false,
    wash_vehicle_type: wash?.wasch_fahrzeug_typ ?? "",
  };
}

function normalizeAdresseEntriesForPayload(entries: AdresseEntry[]): KundenAdresse[] {
  return entries.map((a, idx) => ({
    id: a.id || `addr-${idx}`,
    typ: (a.typ || ADRESSE_TYPEN[idx] || "Hauptadresse").trim(),
    strasse: a.strasse.trim(),
    plz: a.plz.trim(),
    ort: a.ort.trim(),
    land_code: (a.land_code || "DE").trim().toUpperCase(),
    art_land_code: (a.art_land_code || landCodeToArtLand(a.land_code || "DE")).trim(),
    ust_id_nr: a.ust_id_nr.trim(),
    steuer_nr: a.steuer_nr.trim(),
    branchen_nr: a.branchen_nr.trim(),
  }));
}

function normalizeKontaktEntriesForPayload(entries: KontaktEntry[]): KundenKontakt[] {
  return entries.map((k, idx) => ({
    id: k.id || `kontakt-${idx}`,
    name: k.name.trim(),
    rolle: k.rolle.trim(),
    telefonCode: (k.telefonCode || "+49").trim(),
    telefon: k.telefon.trim(),
    handyCode: (k.handyCode || "+49").trim(),
    handy: k.handy.trim(),
    email: k.email.trim(),
    website: emptyToUndef(k.website),
    bemerkung: k.bemerkung.trim(),
  }));
}

export function formToPayload(form: CustomerFormDraft): NewKundeInput {
  const fzg_haendler =
    form.fzgHandel === "ja" ? true : form.fzgHandel === "nein" ? false : undefined;
  const customer_type =
    form.customer_type ||
    (form.juristische_person ? "legal_entity" : form.natuerliche_person ? "natural_person" : undefined);
  const trimmedCompanyName = form.firmenname.trim();
  const first_name = emptyToUndef(form.first_name);
  const last_name = emptyToUndef(form.last_name);
  const profile_notes = emptyToUndef(form.profile_notes);
  const score = moneyToUndef(form.score);
  const z = form.zustaendige_person_name.trim();
  const zustaendige_person_name = z && z !== "nicht zugeordnet" ? z : undefined;
  const adressen = normalizeAdresseEntriesForPayload(form.adressen);
  const kontakte = normalizeKontaktEntriesForPayload(form.kontakte);
  const primaryAdresse = adressen[0];
  const primaryKontakt = kontakte[0];

  return {
    aufnahme: emptyToUndef(form.aufnahme),
    customer_type,
    status: form.customer_status || undefined,
    firmenname: trimmedCompanyName,
    branche: emptyToUndef(form.branche),
    fzg_haendler,
    juristische_person: form.juristische_person,
    natuerliche_person: form.natuerliche_person,
    gesellschaftsform: emptyToUndef(form.gesellschaftsform),
    firmenvorsatz: emptyToUndef(form.firmenvorsatz),
    first_name,
    last_name,
    profile_notes,
    acquisition_source: form.acquisition_source ? form.acquisition_source : undefined,
    acquisition_source_entity: emptyToUndef(form.acquisition_source_entity),
    acquisition_date: emptyToUndef(form.acquisition_date),
    lifecycle_stage: form.lifecycle_stage || undefined,
    preferred_channel: form.preferred_channel || undefined,
    segment: emptyToUndef(form.segment),
    score,
    consent_email: form.consent_email,
    consent_sms: form.consent_sms,
    consent_phone: form.consent_phone,
    marketing_notes: emptyToUndef(form.marketing_notes),
    customer_role: form.customer_role || undefined,
    role_valid_from: emptyToUndef(form.role_valid_from),
    role_valid_to: emptyToUndef(form.role_valid_to),
    bemerkungen: emptyToUndef(form.bemerkungen),
    zustaendige_person_name,
    strasse: emptyToUndef(primaryAdresse?.strasse ?? ""),
    plz: emptyToUndef(primaryAdresse?.plz ?? ""),
    ort: emptyToUndef(primaryAdresse?.ort ?? ""),
    land_code: primaryAdresse?.land_code ?? "DE",
    art_land_code: emptyToUndef(primaryAdresse?.art_land_code ?? ""),
    ust_id_nr: emptyToUndef(primaryAdresse?.ust_id_nr ?? ""),
    steuer_nr: emptyToUndef(primaryAdresse?.steuer_nr ?? ""),
    branchen_nr: emptyToUndef(primaryAdresse?.branchen_nr ?? ""),
    tax_country_type_code: emptyToUndef(form.tax_country_type_code),
    account_number: emptyToUndef(form.account_number),
    credit_limit: moneyToUndef(form.credit_limit),
    billing_name: emptyToUndef(form.billing_name),
    billing_street: emptyToUndef(form.billing_street),
    billing_postal_code: emptyToUndef(form.billing_postal_code),
    billing_city: emptyToUndef(form.billing_city),
    payment_blocked: form.payment_blocked,
    ansprechpartner: emptyToUndef(primaryKontakt?.name ?? ""),
    rolle_kontakt: emptyToUndef(primaryKontakt?.rolle ?? ""),
    telefonnummer: emptyToUndef(
      primaryKontakt?.telefon ? `${primaryKontakt.telefonCode} ${primaryKontakt.telefon}` : ""
    ),
    faxnummer: emptyToUndef(
      primaryKontakt?.handy ? `${primaryKontakt.handyCode} ${primaryKontakt.handy}` : ""
    ),
    email: emptyToUndef(primaryKontakt?.email ?? ""),
    internet_adr: emptyToUndef(form.internet_adr),
    bemerkungen_kontakt: emptyToUndef(primaryKontakt?.bemerkung ?? ""),
    faxen_flag: false,
    bank_name: emptyToUndef(form.bank_name),
    bic: emptyToUndef(form.bic),
    iban: emptyToUndef(form.iban),
    direct_debit_enabled: form.direct_debit_enabled,
    financial_notes: emptyToUndef(form.financial_notes),
    art_kunde: emptyToUndef(form.art_kunde),
    buchungskonto_haupt: emptyToUndef(form.buchungskonto_haupt),
    adressen,
    kontakte,
  };
}

export function washFormToPayload(form: CustomerFormDraft): KundenWashUpsertFields {
  const limit = Math.max(0, Number(form.wash_limit) || 0);
  return {
    bukto: emptyToUndef(form.wash_bukto),
    limit_betrag: limit,
    rechnung_zusatz: emptyToUndef(form.wash_rechnung_zusatz),
    rechnung_plz: emptyToUndef(form.wash_rechnung_plz ?? ""),
    rechnung_ort: emptyToUndef(form.wash_rechnung_ort ?? ""),
    rechnung_strasse: emptyToUndef(form.wash_rechnung_strasse ?? ""),
    kunde_gesperrt: form.wash_kunde_gesperrt,
    bankname: emptyToUndef(form.wash_bankname),
    bic: emptyToUndef(form.wash_bic),
    iban: emptyToUndef(form.wash_iban),
    wichtige_infos: emptyToUndef(form.wash_wichtige_infos),
    bemerkungen: emptyToUndef(form.wash_bemerkungen),
    lastschrift: form.wash_lastschrift,
    kennzeichen:
      form.wash_kennzeichen_list.length > 0 ? form.wash_kennzeichen_list.join(", ") : undefined,
    wasch_programm: emptyToUndef(form.wasch_programm),
    netto_preis: moneyToUndef(form.wash_netto_preis),
    brutto_preis: moneyToUndef(form.wash_brutto_preis),
    wasch_intervall: emptyToUndef(form.wasch_intervall),
    wasch_fahrzeug_typ: emptyToUndef(form.wash_vehicle_type),
  };
}
