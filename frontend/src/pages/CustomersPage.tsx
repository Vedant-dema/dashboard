import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  Plus,
  Search,
  ChevronDown,
  ChevronUp,
  UserPlus,
  List,
  X,
  FolderOpen,
  Car,
  Info,
  Link2,
  CalendarPlus,
  Receipt,
  FileText,
  Upload,
  Trash2,
} from "lucide-react";
import type { KundenStamm, KundenWashStamm } from "../types/kunden";
import {
  loadKundenDb,
  saveKundenDb,
  listRowsFromState,
  getDetailByKundenNr,
  createKunde,
  generateNextKundenNr,
  updateKunde,
  upsertKundenWash,
  addKundenUnterlage,
  removeKundenUnterlage,
  listUnterlagenForKunde,
  isCustomersApiMode,
  loadSharedKundenDb,
  saveSharedKundenDb,
  type KundenListRow,
  type NewKundeInput,
  type NewKundenUnterlageInput,
  type KundenWashUpsertFields,
} from "../store/kundenStore";
import { NewCustomerModal } from "../components/NewCustomerModal";
import { SuggestTextInput } from "../components/SuggestTextInput";
import {
  getCustomerFieldSuggestions,
  getQuickSearchSuggestions,
} from "../store/customerFieldSuggestions";
import { useLanguage } from "../contexts/LanguageContext";
import type { DepartmentArea } from "../types/departmentArea";
import { DEPARTMENT_I18N_KEY } from "../types/departmentArea";

type CustomerSortKey = "kundenNr" | "firmenname" | "ort" | "plz" | "termin";

const CUSTOMER_SORT_KEYS: CustomerSortKey[] = ["kundenNr", "firmenname", "ort", "plz", "termin"];

const SORT_LABEL_KEY: Record<CustomerSortKey, string> = {
  kundenNr: "customersSortKundenNr",
  firmenname: "customersSortFirmenname",
  ort: "customersSortOrt",
  plz: "customersSortPLZ",
  termin: "customersSortTermin",
};

const MAX_UNTERLAGE_BYTES = 2 * 1024 * 1024;

function formatFileSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

const MOCK_ZUSTAENDIGE = [
  "—",
  "Liciu Ana-Maria",
  "Mitsos Deligiannis",
  "Anna Schmidt",
  "Team Verkauf",
];

const WASH_PROGRAM_OPTIONS = [
  "",
  "S* Sonstiges",
  "1* Kleinbus/Transporter Kasten (bis 3,5t)",
  "2* LKW mit Aufbau (Koffer/Plane/Kuehlk.) ab 3,5t bis 7t",
  "3* LKW mit Aufbau (Koffer/Plane) ab 7t",
  "3* Anhaenger (Koffer/Plane/Lafette)",
  "3* Omnibus bis 6m",
  "4* Sattelzugmaschine",
  "5* LKW ohne Aufbau (Fahrgestell oder BDF)",
  "5* Auflieger (Koffer/Plane/Kipper)",
  "6* LKW mit Aufbau (Koffer/Plane) und Anhaenger",
  "6* Sattelzug komplett",
  "6* Omnibus ueber 6m",
  "6* Muellwagen",
  "7* LKW ohne Aufbau (Fahrgestell oder BDF) mit Lafette",
  "7* LKW ohne Aufbau (Fahrgestell oder BDF) mit Anhaenger",
  "7* LKW mit Aufbau (Fahrgestell oder BDF) mit Lafette",
  "7* Tank- und Silofahrzeuge",
  "7* SZM mit Auflieger ohne Aufbau",
  "8* Tank- und Silozuege",
  "S1* Innenreinigung",
  "S2* Innen + Aussen Polizei",
];

type DetailDrawerTab = "kundendetail" | "fzg" | "info";
type CustomerEditTab = "vat" | "kunde" | "art" | "waschanlage" | "extras";

function emptyWashDraft(kundenId: number): KundenWashStamm {
  return {
    id: 0,
    kunden_id: kundenId,
    limit_betrag: 0,
    lastschrift: false,
    kunde_gesperrt: false,
  };
}

export function CustomersPage({ department }: { department?: DepartmentArea }) {
  const { t } = useLanguage();
  const [db, setDb] = useState(() => loadKundenDb());
  const fieldSuggestions = useMemo(() => getCustomerFieldSuggestions(db), [db]);
  const quickSearchSuggestions = useMemo(() => getQuickSearchSuggestions(db), [db]);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [quickSearch, setQuickSearch] = useState("");
  const [kundenNr, setKundenNr] = useState("");
  const [firmenname, setFirmenname] = useState("");
  const [ansprechpartner, setAnsprechpartner] = useState("");
  const [telefon, setTelefon] = useState("");
  const [plz, setPlz] = useState("");
  const [ort, setOrt] = useState("");
  const [land, setLand] = useState("");
  const [sortierung, setSortierung] = useState<CustomerSortKey>("kundenNr");
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [unterlagenOpen, setUnterlagenOpen] = useState(false);
  const unterlagenFileInputRef = useRef<HTMLInputElement>(null);

  const [draftKunde, setDraftKunde] = useState<KundenStamm | null>(null);
  const [draftWash, setDraftWash] = useState<KundenWashStamm | null>(null);
  const [detailDrawerTab, setDetailDrawerTab] = useState<DetailDrawerTab>("kundendetail");
  const [customerEditTab, setCustomerEditTab] = useState<CustomerEditTab>("kunde");
  const [newPlateInput, setNewPlateInput] = useState("");

  useEffect(() => {
    const q = sessionStorage.getItem("dema-search-q");
    if (q) {
      setQuickSearch(q);
      sessionStorage.removeItem("dema-search-q");
    }
  }, []);

  useEffect(() => {
    if (!isCustomersApiMode()) return;
    let cancelled = false;
    void (async () => {
      try {
        const remote = await loadSharedKundenDb();
        if (cancelled) return;
        if (remote) {
          setDb(remote);
          saveKundenDb(remote);
          return;
        }
        const seeded = loadKundenDb();
        const saved = await saveSharedKundenDb(seeded);
        if (cancelled) return;
        setDb(saved);
        saveKundenDb(saved);
      } catch {
        // Keep local mode behavior if shared demo backend is unavailable.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback((next: typeof db) => {
    saveKundenDb(next);
    setDb(next);
    if (!isCustomersApiMode()) return;
    void saveSharedKundenDb(next).then(
      (saved) => {
        saveKundenDb(saved);
        setDb(saved);
      },
      () => {
        alert(t("customersSyncFailed", "Could not sync with shared demo backend."));
      }
    );
  }, [t]);

  const unterlagenForCustomer = useMemo(
    () => (draftKunde ? listUnterlagenForKunde(db, draftKunde.id) : []),
    [db, draftKunde?.id]
  );

  const handleUnterlageFiles = useCallback(
    async (list: FileList | null) => {
      if (!list?.length || !draftKunde) return;
      const file = list[0]!;
      if (file.size > MAX_UNTERLAGE_BYTES) {
        alert(t("customersFileTooBig", "File too large (max 2 MB in this demo)."));
        return;
      }
      try {
        const dataUrl = await readFileAsDataURL(file);
        const next = addKundenUnterlage(db, draftKunde.id, {
          name: file.name,
          size: file.size,
          mime_type: file.type || "application/octet-stream",
          data_url: dataUrl,
        });
        persist(next);
      } catch {
        alert(t("customersFileReadError", "Could not read the file."));
      }
    },
    [db, draftKunde, persist, t]
  );

  const handleRemoveUnterlage = useCallback(
    (unterlageId: number) => {
      const next = removeKundenUnterlage(db, unterlageId);
      persist(next);
    },
    [db, persist]
  );

  const listSource = useMemo(() => listRowsFromState(db), [db]);

  const filtered = useMemo(() => {
    let list: KundenListRow[] = [...listSource];
    if (quickSearch.trim()) {
      const q = quickSearch.toLowerCase();
      list = list.filter(
        (r) =>
          r.firmenname.toLowerCase().includes(q) ||
          r.kuNr.includes(q)
      );
    }
    if (kundenNr.trim()) list = list.filter((r) => r.kuNr.includes(kundenNr.trim()));
    if (firmenname.trim()) {
      const f = firmenname.toLowerCase();
      list = list.filter((r) => r.firmenname.toLowerCase().includes(f));
    }
    if (plz.trim()) list = list.filter((r) => r.plz.includes(plz.trim()));
    if (ort.trim()) {
      const o = ort.toLowerCase();
      list = list.filter((r) => r.ort.toLowerCase().includes(o));
    }
    if (land.trim()) list = list.filter((r) => r.land.toLowerCase().includes(land.trim()));

    if (sortierung === "kundenNr") list.sort((a, b) => a.kuNr.localeCompare(b.kuNr));
    if (sortierung === "firmenname") list.sort((a, b) => a.firmenname.localeCompare(b.firmenname));
    if (sortierung === "ort") list.sort((a, b) => a.ort.localeCompare(b.ort));
    if (sortierung === "plz") list.sort((a, b) => a.plz.localeCompare(b.plz));
    if (sortierung === "termin") list.sort((a, b) => a.termin.localeCompare(b.termin));
    return list;
  }, [listSource, quickSearch, kundenNr, firmenname, plz, ort, land, sortierung]);

  const applyFilters = () => {};
  const showAll = () => {
    setQuickSearch("");
    setKundenNr("");
    setFirmenname("");
    setAnsprechpartner("");
    setTelefon("");
    setPlz("");
    setOrt("");
    setLand("");
  };

  /** Load drafts immediately on row click — avoids one paint with no drawer (blank flash). */
  const openCustomerRow = useCallback(
    (kuNr: string) => {
      const detail = getDetailByKundenNr(db, kuNr);
      if (!detail) return;
      setSelectedRowId(kuNr);
      setDetailDrawerTab("kundendetail");
      setCustomerEditTab("kunde");
      setDraftKunde({ ...detail.kunden });
      if (detail.kunden_wash) {
        setDraftWash({ ...detail.kunden_wash });
      } else {
        setDraftWash(emptyWashDraft(detail.kunden.id));
      }
      setNewPlateInput("");
    },
    [db]
  );

  useEffect(() => {
    if (!selectedRowId) {
      setUnterlagenOpen(false);
      setDraftKunde(null);
      setDraftWash(null);
      setDetailDrawerTab("kundendetail");
      setCustomerEditTab("kunde");
      return;
    }
    const detail = getDetailByKundenNr(db, selectedRowId);
    if (!detail) {
      setDraftKunde(null);
      setDraftWash(null);
      return;
    }
    setDraftKunde({ ...detail.kunden });
    if (detail.kunden_wash) {
      setDraftWash({ ...detail.kunden_wash });
    } else {
      setDraftWash(emptyWashDraft(detail.kunden.id));
    }
  }, [selectedRowId, db, department]);

  const hasWashProfile =
    draftKunde != null &&
    db.kundenWash.some((w) => w.kunden_id === draftKunde.id);

  const handleSaveDetail = () => {
    if (!draftKunde) return;
    let next = updateKunde(db, draftKunde);
    if (draftWash) {
      next = upsertKundenWash(next, draftKunde.id, {
        bukto: draftWash.bukto,
        limit_betrag: draftWash.limit_betrag ?? 0,
        rechnung_zusatz: draftWash.rechnung_zusatz,
        rechnung_plz: draftWash.rechnung_plz,
        rechnung_ort: draftWash.rechnung_ort,
        rechnung_strasse: draftWash.rechnung_strasse,
        kunde_gesperrt: draftWash.kunde_gesperrt,
        bankname: draftWash.bankname,
        bic: draftWash.bic,
        iban: draftWash.iban,
        wichtige_infos: draftWash.wichtige_infos,
        bemerkungen: draftWash.bemerkungen,
        lastschrift: draftWash.lastschrift ?? false,
        kennzeichen: draftWash.kennzeichen,
        wasch_programm: draftWash.wasch_programm,
        wasch_intervall: draftWash.wasch_intervall,
      });
    }
    persist(next);
    setSelectedRowId(null);
  };

  const handleEditCustomerSubmit = useCallback(
    (data: NewKundeInput, wash: KundenWashUpsertFields | null) => {
      if (!draftKunde) return;
      let next = updateKunde(db, {
        ...draftKunde,
        ...data,
        id: draftKunde.id,
        kunden_nr: draftKunde.kunden_nr,
      });
      if (wash) {
        next = upsertKundenWash(next, draftKunde.id, wash);
      }
      persist(next);
      setSelectedRowId(null);
    },
    [db, draftKunde, persist]
  );

  const handleNewCustomerSubmit = useCallback(
    (
      data: NewKundeInput,
      wash: KundenWashUpsertFields | null,
      scannedAttachment?: NewKundenUnterlageInput | null
    ) => {
      try {
        let next = createKunde(db, data);
        const created = next.kunden[next.kunden.length - 1];
        if (wash) {
          next = upsertKundenWash(next, created.id, wash);
        }
        if (scannedAttachment) {
          next = addKundenUnterlage(next, created.id, scannedAttachment);
        }
        persist(next);
        setShowAddCustomer(false);
        setSelectedRowId(created.kunden_nr);
      } catch (e) {
        alert(e instanceof Error ? e.message : t("customersSaveFailed", "Save failed"));
      }
    },
    [db, persist, t]
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col p-6 pb-8">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">{t("customersTitle", "Customers")}</h1>
          {department ? (
            <p className="mt-0.5 text-sm text-slate-500">
              {t("customersArea", "Area")}:{" "}
              <span className="font-medium text-slate-600">
                {t(DEPARTMENT_I18N_KEY[department], department)}
              </span>
              {" · "}
              <span className="text-slate-400">
                {t(
                  "customersDeptHint",
                  "One screen for all areas: kunden; optional kunden_wash in the Car wash tab when editing."
                )}
              </span>
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setShowAddCustomer(true)}
          className="flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700"
        >
          <UserPlus className="h-4 w-4" />
          {t("customersNewCustomer", "Add customer")}
        </button>
      </div>

      <div className="glass-card mb-4 space-y-4 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-slate-600">{t("customersQuickCompanySearch", "Company quick search:")}</span>
          <SuggestTextInput
            type="text"
            value={quickSearch}
            onChange={(e) => setQuickSearch(e.target.value)}
            placeholder={t("customersSearchPlaceholder", "Search…")}
            suggestions={quickSearchSuggestions}
            title={t("customersSuggestionsDb", "Suggestions from database")}
            className="h-10 w-64 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <button
            type="button"
            onClick={applyFilters}
            className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-200"
          >
            <Search className="h-4 w-4" />
            {t("customersShow", "Show")}
          </button>
          <button
            type="button"
            onClick={showAll}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            {t("customersAll", "all")}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">{t("customersLabelCustomerNr", "Customer no.")}</label>
            <SuggestTextInput
              type="text"
              value={kundenNr}
              onChange={(e) => setKundenNr(e.target.value)}
              suggestions={fieldSuggestions.kunden_nr}
              title={t("customersSuggestionsSaved", "Suggestions from saved customers")}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">{t("customersLabelCompany", "Company name")}</label>
            <SuggestTextInput
              type="text"
              value={firmenname}
              onChange={(e) => setFirmenname(e.target.value)}
              suggestions={fieldSuggestions.firmenname}
              title={t("customersSuggestionsSaved", "Suggestions from saved customers")}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">{t("customersLabelContact", "Contact person")}</label>
            <SuggestTextInput
              type="text"
              value={ansprechpartner}
              onChange={(e) => setAnsprechpartner(e.target.value)}
              suggestions={fieldSuggestions.ansprechpartner}
              title={t("customersSuggestionsSaved", "Suggestions from saved customers")}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">{t("customersLabelPhone", "Phone")}</label>
            <SuggestTextInput
              type="text"
              value={telefon}
              onChange={(e) => setTelefon(e.target.value)}
              suggestions={fieldSuggestions.telefonnummer}
              title={t("customersSuggestionsSaved", "Suggestions from saved customers")}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">{t("customersLabelZip", "ZIP")}</label>
            <SuggestTextInput
              type="text"
              value={plz}
              onChange={(e) => setPlz(e.target.value)}
              suggestions={fieldSuggestions.plz}
              title={t("customersSuggestionsSaved", "Suggestions from saved customers")}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">{t("customersLabelCity", "City")}</label>
            <SuggestTextInput
              type="text"
              value={ort}
              onChange={(e) => setOrt(e.target.value)}
              suggestions={fieldSuggestions.ort}
              title={t("customersSuggestionsSaved", "Suggestions from saved customers")}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">{t("customersLabelCountry", "Country")}</label>
            <SuggestTextInput
              type="text"
              value={land}
              onChange={(e) => setLand(e.target.value)}
              placeholder="z. B. DE"
              suggestions={fieldSuggestions.land_code}
              title={t("customersSuggestionsSaved", "Suggestions from saved customers")}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">{t("customersLabelSort", "Sort by")}</label>
            <select
              value={sortierung}
              onChange={(e) => setSortierung(e.target.value as CustomerSortKey)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
            >
              {CUSTOMER_SORT_KEYS.map((key) => (
                <option key={key} value={key}>
                  {t(SORT_LABEL_KEY[key], key)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setShowMoreFilters(!showMoreFilters)}
            className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600"
          >
            {showMoreFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {t("customersMoreFilters", "More filters")}
          </button>
          {showMoreFilters && (
            <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 sm:grid-cols-3 md:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Faxnummer</label>
                <SuggestTextInput
                  type="text"
                  suggestions={fieldSuggestions.faxnummer}
                  title="Vorschläge aus gespeicherten Kunden"
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Branche</label>
                <SuggestTextInput
                  type="text"
                  suggestions={fieldSuggestions.branche}
                  title="Vorschläge aus gespeicherten Kunden"
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Branchen-Nr.</label>
                <SuggestTextInput
                  type="text"
                  suggestions={fieldSuggestions.branchen_nr}
                  title="Vorschläge aus gespeicherten Kunden"
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Umsatzsteuer-ID</label>
                <SuggestTextInput
                  type="text"
                  suggestions={fieldSuggestions.ust_id_nr}
                  title="Vorschläge aus gespeicherten Kunden"
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Art</label>
                <select className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm">
                  <option value="">—</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Aufnahme von</label>
                <input type="date" className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Aufnahme bis</label>
                <input type="date" className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Bemerkungen</label>
                <input type="text" className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm" />
              </div>
              <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input type="checkbox" className="rounded border-slate-300" />
                  nicht KIL/KEG/KSL
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input type="checkbox" className="rounded border-slate-300" />
                  Kunde mit Verkn.
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input type="checkbox" className="rounded border-slate-300" />
                  Zum Löschen mark.
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="glass-card min-h-0 flex-1 overflow-hidden">
        <div className="overflow-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 font-semibold text-slate-600">
              <tr>
                <th className="whitespace-nowrap px-4 py-3">{t("customersThKuNr", "KU-NR")}</th>
                <th className="whitespace-nowrap px-4 py-3">{t("customersThCompany", "Company")}</th>
                <th className="whitespace-nowrap px-4 py-3">{t("customersThAppointment", "Appointment")}</th>
                <th className="whitespace-nowrap px-4 py-3">{t("customersThIndustry", "Industry")}</th>
                <th className="whitespace-nowrap px-4 py-3">{t("customersThStreet", "Street")}</th>
                <th className="whitespace-nowrap px-4 py-3">{t("customersThZip", "ZIP")}</th>
                <th className="whitespace-nowrap px-4 py-3">{t("customersThCity", "City")}</th>
                <th className="whitespace-nowrap px-4 py-3">{t("customersThCountry", "Country")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-500">
                    {t("customersEmptyList", "")}
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr
                    key={row.kuNr}
                    onClick={() => openCustomerRow(row.kuNr)}
                    className={`cursor-pointer transition ${
                      selectedRowId === row.kuNr
                        ? "bg-slate-800 text-white"
                        : "hover:bg-slate-50 text-slate-800"
                    }`}
                  >
                    <td className="px-4 py-2.5 font-medium tabular-nums">{row.kuNr}</td>
                    <td className="px-4 py-2.5">{row.firmenname}</td>
                    <td className="px-4 py-2.5 tabular-nums">{row.termin}</td>
                    <td className="px-4 py-2.5">{row.branche}</td>
                    <td className="px-4 py-2.5">{row.strasse}</td>
                    <td className="px-4 py-2.5 tabular-nums">{row.plz}</td>
                    <td className="px-4 py-2.5">{row.ort}</td>
                    <td className="px-4 py-2.5">{row.land}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {false && selectedRowId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-[2px] sm:p-6"
          onClick={() => setSelectedRowId(null)}
          role="presentation"
        >
          <div
            className="flex w-full max-w-7xl max-h-[88vh] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="customer-drawer-title"
          >
            <div className="shrink-0">
              <div className="relative flex shrink-0 flex-wrap items-start justify-between gap-4 bg-gradient-to-r from-slate-800 to-slate-900 px-5 py-4 pr-14 text-white sm:flex-nowrap sm:px-6 sm:pr-6">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-3">
                    <h2 id="customer-drawer-title" className="truncate text-lg font-bold tracking-tight sm:text-xl">
                      {draftKunde?.firmenname || t("customersLoading", "Loading…")}
                    </h2>
                    <span className="rounded-md bg-white/15 px-2 py-0.5 text-xs font-semibold text-blue-100">
                      (Bearbeiten)
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-300">
                    {t("customersDrawerNrLabel", "Customer no.")}{" "}
                    <span className="font-mono font-semibold text-white">{draftKunde?.kunden_nr ?? selectedRowId}</span>
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end sm:text-right">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Aufnahme</p>
                  <p className="text-sm font-semibold tabular-nums text-white">
                    {draftKunde?.aufnahme || "—"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRowId(null)}
                  className="absolute right-2 top-2 rounded-xl p-2 text-slate-300 hover:bg-white/10 hover:text-white"
                  aria-label="Schließen"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex shrink-0 flex-wrap gap-0 border-b border-slate-200 bg-slate-50/90 px-4 pt-2 sm:px-5">
                {(
                  [
                    { id: "kundendetail" as const, label: "Kundendetail", icon: FileText },
                    { id: "fzg" as const, label: "Beziehungen zu FZGe", icon: Car },
                    { id: "info" as const, label: "INFO", icon: Info },
                  ] as const
                ).map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setDetailDrawerTab(id)}
                    disabled={!draftKunde && id === "kundendetail"}
                    className={`relative -mb-px flex items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-semibold transition sm:px-4 ${
                      detailDrawerTab === id
                        ? "border-blue-600 text-blue-700"
                        : "border-transparent text-slate-500 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0 opacity-70" />
                    <span className="whitespace-nowrap">{label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/40 px-4 py-3 sm:px-5">
            <div className="space-y-6">
              {detailDrawerTab === "fzg" && (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                  <div className="mx-auto max-w-md text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                      <Car className="h-7 w-7" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800">Fahrzeugbeziehungen</h3>
                    <p className="mt-2 text-sm text-slate-500">
                      Hier werden später alle Fahrzeuge und Verknüpfungen zu diesem Kunden angezeigt
                      (wie im Legacy-Tab „Beziehungen zu FZG&apos;e“).
                    </p>
                  </div>
                </div>
              )}

              {detailDrawerTab === "info" && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">
                    Interne Informationen
                  </h3>
                  <label className="mb-1 block text-xs font-medium text-slate-500">Freitext / interne Hinweise</label>
                  <textarea
                    rows={8}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Kurzinfos, Historie, Besonderheiten … (Anbindung an API folgt)"
                  />
                  <p className="mt-3 text-xs text-slate-400">
                    Dieser Bereich entspricht dem Legacy-Tab „INFO“. Inhalt wird noch nicht gespeichert.
                  </p>
                </div>
              )}

              {detailDrawerTab === "kundendetail" && !draftKunde && (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-16 shadow-sm">
                  <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
                  <p className="mt-4 text-sm font-medium text-slate-600">Kundendaten werden geladen…</p>
                </div>
              )}

              {detailDrawerTab === "kundendetail" && draftKunde && (
                <div className="space-y-6">
              <div className="flex shrink-0 flex-wrap gap-0 border-b border-slate-200 bg-slate-50/90 px-1 pt-2">
                {(
                  [
                    { id: "vat" as const, label: "USt-IdNr. prüfen" },
                    { id: "kunde" as const, label: "Kunde & Adresse" },
                    { id: "art" as const, label: "Art / Buchungskonto" },
                    { id: "waschanlage" as const, label: "Waschanlage" },
                    { id: "extras" as const, label: "Mehr Optionen" },
                  ] as const
                ).map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setCustomerEditTab(id)}
                    className={`relative -mb-px flex items-center border-b-2 px-3 py-3 text-sm font-semibold transition sm:px-4 ${
                      customerEditTab === id
                        ? id === "waschanlage"
                          ? "border-cyan-600 text-cyan-800"
                          : "border-blue-600 text-blue-700"
                        : "border-transparent text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {customerEditTab === "vat" && (
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">
                    USt / Steuer
                  </h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-500">UST-ID-NR</label>
                      <SuggestTextInput
                        type="text"
                        value={draftKunde.ust_id_nr ?? ""}
                        onChange={(e) => setDraftKunde({ ...draftKunde, ust_id_nr: e.target.value })}
                        suggestions={fieldSuggestions.ust_id_nr}
                        title="Vorschläge aus gespeicherten Kunden"
                        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-500">Steuernummer</label>
                      <SuggestTextInput
                        type="text"
                        value={draftKunde.steuer_nr ?? ""}
                        onChange={(e) => setDraftKunde({ ...draftKunde, steuer_nr: e.target.value })}
                        suggestions={fieldSuggestions.steuer_nr}
                        title="Vorschläge aus gespeicherten Kunden"
                        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-500">Branchen-Nr.</label>
                      <SuggestTextInput
                        type="text"
                        value={draftKunde.branchen_nr ?? ""}
                        onChange={(e) => setDraftKunde({ ...draftKunde, branchen_nr: e.target.value })}
                        suggestions={fieldSuggestions.branchen_nr}
                        title="Vorschläge aus gespeicherten Kunden"
                        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-500">Land</label>
                      <SuggestTextInput
                        type="text"
                        value={draftKunde.land_code ?? ""}
                        onChange={(e) => setDraftKunde({ ...draftKunde, land_code: e.target.value })}
                        suggestions={fieldSuggestions.land_code}
                        title="Vorschläge aus gespeicherten Kunden"
                        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                </section>
              )}

              {customerEditTab === "art" && (
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">
                    Art / Buchungskonto
                  </h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-500">Art (Kunde)</label>
                      <SuggestTextInput
                        type="text"
                        value={draftKunde.art_kunde ?? ""}
                        onChange={(e) => setDraftKunde({ ...draftKunde, art_kunde: e.target.value })}
                        suggestions={fieldSuggestions.art_kunde}
                        title="Vorschläge aus gespeicherten Kunden"
                        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-500">Buchungskonto (Haupt)</label>
                      <SuggestTextInput
                        type="text"
                        value={draftKunde.buchungskonto_haupt ?? ""}
                        onChange={(e) =>
                          setDraftKunde({ ...draftKunde, buchungskonto_haupt: e.target.value })
                        }
                        suggestions={fieldSuggestions.buchungskonto_haupt}
                        title="Vorschläge aus gespeicherten Kunden"
                        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                </section>
              )}

              {customerEditTab === "kunde" && (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">
                  Stammdaten (kunden)
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">Buchungskonto (Haupt)</label>
                    <SuggestTextInput
                      type="text"
                      value={draftKunde.buchungskonto_haupt ?? ""}
                      onChange={(e) =>
                        setDraftKunde({ ...draftKunde, buchungskonto_haupt: e.target.value })
                      }
                      suggestions={fieldSuggestions.buchungskonto_haupt}
                      title="Vorschläge aus gespeicherten Kunden"
                      className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">KundenNr.</label>
                    <input
                      type="text"
                      value={draftKunde.kunden_nr}
                      readOnly
                      className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">Branche</label>
                    <SuggestTextInput
                      type="text"
                      value={draftKunde.branche ?? ""}
                      onChange={(e) => setDraftKunde({ ...draftKunde, branche: e.target.value })}
                      suggestions={fieldSuggestions.branche}
                      title="Vorschläge aus gespeicherten Kunden"
                      className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">Ansprache</label>
                    <SuggestTextInput
                      type="text"
                      value={draftKunde.ansprache ?? ""}
                      onChange={(e) => setDraftKunde({ ...draftKunde, ansprache: e.target.value })}
                      placeholder="z. B. Fa."
                      suggestions={fieldSuggestions.ansprache}
                      title="Vorschläge aus gespeicherten Kunden"
                      className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">Firmenvorsatz</label>
                    <SuggestTextInput
                      type="text"
                      value={draftKunde.firmenvorsatz ?? ""}
                      onChange={(e) => setDraftKunde({ ...draftKunde, firmenvorsatz: e.target.value })}
                      suggestions={fieldSuggestions.firmenvorsatz}
                      title="Vorschläge aus gespeicherten Kunden"
                      className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-slate-500">Firmenname</label>
                    <SuggestTextInput
                      type="text"
                      value={draftKunde.firmenname}
                      onChange={(e) => setDraftKunde({ ...draftKunde, firmenname: e.target.value })}
                      suggestions={fieldSuggestions.firmenname}
                      title="Vorschläge aus gespeicherten Kunden"
                      className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <span className="mb-2 block text-xs font-medium text-slate-500">Fahrzeughändler</span>
                    <div className="flex gap-3">
                      <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 has-[:checked]:border-blue-400 has-[:checked]:bg-blue-50">
                        <input
                          type="radio"
                          name="fzg_haendler"
                          checked={draftKunde.fzg_haendler === true}
                          onChange={() => setDraftKunde({ ...draftKunde, fzg_haendler: true })}
                          className="border-slate-300 text-blue-600"
                        />
                        Ja
                      </label>
                      <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 has-[:checked]:border-blue-400 has-[:checked]:bg-blue-50">
                        <input
                          type="radio"
                          name="fzg_haendler"
                          checked={draftKunde.fzg_haendler !== true}
                          onChange={() => setDraftKunde({ ...draftKunde, fzg_haendler: false })}
                          className="border-slate-300 text-blue-600"
                        />
                        Nein
                      </label>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
                    <label className="flex items-center gap-2 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        checked={draftKunde.juristische_person ?? false}
                        onChange={(e) =>
                          setDraftKunde({ ...draftKunde, juristische_person: e.target.checked })
                        }
                        className="rounded border-slate-300"
                      />
                      Juristische Person / Personengesellschaft
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        checked={draftKunde.natuerliche_person ?? false}
                        onChange={(e) =>
                          setDraftKunde({ ...draftKunde, natuerliche_person: e.target.checked })
                        }
                        className="rounded border-slate-300"
                      />
                      Natürliche Person
                    </label>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">Gesellschaftsform</label>
                    <SuggestTextInput
                      type="text"
                      value={draftKunde.gesellschaftsform ?? ""}
                      onChange={(e) =>
                        setDraftKunde({ ...draftKunde, gesellschaftsform: e.target.value })
                      }
                      placeholder="z. B. GmbH, d.o.o."
                      suggestions={fieldSuggestions.gesellschaftsform}
                      title="Vorschläge aus gespeicherten Kunden"
                      className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-slate-500">Unterlagen (Pfad / Link)</label>
                    <div className="flex flex-wrap gap-2">
                      <SuggestTextInput
                        type="text"
                        value={draftKunde.unterlagen_pfad ?? ""}
                        onChange={(e) =>
                          setDraftKunde({ ...draftKunde, unterlagen_pfad: e.target.value })
                        }
                        placeholder="\\Server\\Kunden\\86550 oder https://…"
                        suggestions={fieldSuggestions.unterlagen_pfad}
                        title="Vorschläge aus gespeicherten Pfaden/Links"
                        className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                      />
                      <button
                        type="button"
                        title="Ordner öffnen — hochgeladene Kundenunterlagen"
                        onClick={() => setUnterlagenOpen(true)}
                        className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 text-sm font-medium text-blue-700 hover:bg-blue-100"
                      >
                        <FolderOpen className="h-4 w-4" />
                        Ordner
                        {unterlagenForCustomer.length > 0 ? (
                          <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                            {unterlagenForCustomer.length}
                          </span>
                        ) : null}
                      </button>
                      <button
                        type="button"
                        title="Link öffnen oder UNC-Pfad kopieren"
                        onClick={() => {
                          const p = draftKunde.unterlagen_pfad?.trim();
                          if (!p) return;
                          if (/^https?:\/\//i.test(p)) {
                            window.open(p, "_blank", "noopener,noreferrer");
                            return;
                          }
                          void navigator.clipboard.writeText(p).then(
                            () => {
                              alert(
                                "Pfad in die Zwischenablage kopiert. Im Explorer: Adressleiste einfügen."
                              );
                            },
                            () => {
                              alert(p);
                            }
                          );
                        }}
                        className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-slate-600 hover:bg-slate-50"
                      >
                        <Link2 className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="mt-1 text-[10px] text-slate-400">
                      <span className="font-medium text-slate-500">Ordner:</span> Dateien, die der Kunde hochgeladen hat
                      (lokal in der Demo gespeichert).{" "}
                      <span className="font-medium text-slate-500">Link:</span> SharePoint/UNC wie gewohnt.
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-slate-500">Bemerkungen (Kunde)</label>
                    <textarea
                      value={draftKunde.bemerkungen ?? ""}
                      onChange={(e) => setDraftKunde({ ...draftKunde, bemerkungen: e.target.value })}
                      rows={3}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">PLZ</label>
                    <SuggestTextInput
                      type="text"
                      value={draftKunde.plz ?? ""}
                      onChange={(e) => setDraftKunde({ ...draftKunde, plz: e.target.value })}
                      suggestions={fieldSuggestions.plz}
                      title="Vorschläge aus gespeicherten Kunden"
                      className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">Ort</label>
                    <SuggestTextInput
                      type="text"
                      value={draftKunde.ort ?? ""}
                      onChange={(e) => setDraftKunde({ ...draftKunde, ort: e.target.value })}
                      suggestions={fieldSuggestions.ort}
                      title="Vorschläge aus gespeicherten Kunden"
                      className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-slate-500">Strasse</label>
                    <SuggestTextInput
                      type="text"
                      value={draftKunde.strasse ?? ""}
                      onChange={(e) => setDraftKunde({ ...draftKunde, strasse: e.target.value })}
                      suggestions={fieldSuggestions.strasse}
                      title="Vorschläge aus gespeicherten Kunden"
                      className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">Land</label>
                    <SuggestTextInput
                      type="text"
                      value={draftKunde.land_code ?? ""}
                      onChange={(e) => setDraftKunde({ ...draftKunde, land_code: e.target.value })}
                      suggestions={fieldSuggestions.land_code}
                      title="Vorschläge aus gespeicherten Kunden"
                      className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">UST-ID-NR</label>
                    <SuggestTextInput
                      type="text"
                      value={draftKunde.ust_id_nr ?? ""}
                      onChange={(e) => setDraftKunde({ ...draftKunde, ust_id_nr: e.target.value })}
                      suggestions={fieldSuggestions.ust_id_nr}
                      title="Vorschläge aus gespeicherten Kunden"
                      className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">Steuernummer</label>
                    <SuggestTextInput
                      type="text"
                      value={draftKunde.steuer_nr ?? ""}
                      onChange={(e) => setDraftKunde({ ...draftKunde, steuer_nr: e.target.value })}
                      suggestions={fieldSuggestions.steuer_nr}
                      title="Vorschläge aus gespeicherten Kunden"
                      className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">Telefonnummer</label>
                    <SuggestTextInput
                      type="text"
                      value={draftKunde.telefonnummer ?? ""}
                      onChange={(e) => setDraftKunde({ ...draftKunde, telefonnummer: e.target.value })}
                      suggestions={fieldSuggestions.telefonnummer}
                      title="Vorschläge aus gespeicherten Kunden"
                      className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">Faxnummer</label>
                    <SuggestTextInput
                      type="text"
                      value={draftKunde.faxnummer ?? ""}
                      onChange={(e) => setDraftKunde({ ...draftKunde, faxnummer: e.target.value })}
                      suggestions={fieldSuggestions.faxnummer}
                      title="Vorschläge aus gespeicherten Kunden"
                      className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">E-Mail</label>
                    <SuggestTextInput
                      type="email"
                      value={draftKunde.email ?? ""}
                      onChange={(e) => setDraftKunde({ ...draftKunde, email: e.target.value })}
                      suggestions={fieldSuggestions.email}
                      title="Vorschläge aus gespeicherten Kunden"
                      className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">Ansprechpartner</label>
                    <SuggestTextInput
                      type="text"
                      value={draftKunde.ansprechpartner ?? ""}
                      onChange={(e) => setDraftKunde({ ...draftKunde, ansprechpartner: e.target.value })}
                      suggestions={fieldSuggestions.ansprechpartner}
                      title="Vorschläge aus gespeicherten Kunden"
                      className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">Aufnahme</label>
                    <input
                      type="text"
                      value={draftKunde.aufnahme ?? ""}
                      readOnly
                      className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-slate-500">
                      Zuständige Person für Kunden
                    </label>
                    <select
                      value={draftKunde.zustaendige_person_name ?? ""}
                      onChange={(e) =>
                        setDraftKunde({
                          ...draftKunde,
                          zustaendige_person_name: e.target.value || undefined,
                        })
                      }
                      className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                    >
                      {MOCK_ZUSTAENDIGE.map((name) => (
                        <option key={name} value={name === "—" ? "" : name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>
              )}

              {customerEditTab === "extras" && (
              <div className="grid gap-6 lg:grid-cols-12">
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-5">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">
                      <Link2 className="h-4 w-4 text-slate-400" />
                      Kundenbeziehungen
                    </h3>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        Neu
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        Bearbeiten
                      </button>
                    </div>
                  </div>
                  <div className="overflow-hidden rounded-xl border border-slate-100">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 font-semibold text-slate-600">
                        <tr>
                          <th className="px-3 py-2">Verknüpfter Kunde</th>
                          <th className="px-3 py-2">Art</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white text-slate-600">
                        <tr>
                          <td colSpan={2} className="px-3 py-8 text-center text-slate-400">
                            Keine Einträge — Datenanbindung folgt
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-4">
                  <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
                    Termine &amp; Rechnungen
                  </h3>
                  <div className="mb-4 flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                      <Receipt className="h-4 w-4 text-slate-500" />
                      Rechnungen anzeigen
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                    >
                      <CalendarPlus className="h-4 w-4" />
                      Neuen Termin
                    </button>
                  </div>
                  <p className="mb-2 text-xs font-medium text-slate-500">Weitere Termine</p>
                  <div className="overflow-hidden rounded-xl border border-slate-100">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 font-semibold text-slate-600">
                        <tr>
                          <th className="px-3 py-2">Datum</th>
                          <th className="px-3 py-2">Zeit</th>
                          <th className="px-3 py-2">Zweck</th>
                          <th className="px-3 py-2">Erledigt</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white text-slate-600">
                        <tr>
                          <td colSpan={4} className="px-3 py-6 text-center text-slate-400">
                            Keine Termine hinterlegt
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-5 lg:col-span-3">
                  <h3 className="mb-2 text-sm font-semibold text-slate-700">Schnellaktionen</h3>
                  <p className="mb-3 text-xs text-slate-500">
                    Dokumente und Vorlagen (Anbindung Druck/PDF später).
                  </p>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      className="rounded-lg border border-white bg-white px-3 py-2 text-left text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                      Kunden anschreiben
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-white bg-white px-3 py-2 text-left text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                      Proforma / Angebot
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-white bg-white px-3 py-2 text-left text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                      Vollmacht Überführung
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-white bg-white px-3 py-2 text-left text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                      Kaufvertrag
                    </button>
                  </div>
                </section>
              </div>
              )}

              {customerEditTab === "kunde" && (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
                  Kontakte &amp; Anschriften
                </h3>
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <table className="min-w-[640px] w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
                      <tr>
                        <th className="px-3 py-2">Ansprechpartner</th>
                        <th className="px-3 py-2">Strasse</th>
                        <th className="px-3 py-2">PLZ</th>
                        <th className="px-3 py-2">Ort</th>
                        <th className="px-3 py-2">Land</th>
                        <th className="px-3 py-2">Telefon</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr className="text-slate-700">
                        <td className="px-3 py-2">{draftKunde.ansprechpartner || "—"}</td>
                        <td className="px-3 py-2">{draftKunde.strasse || "—"}</td>
                        <td className="px-3 py-2">{draftKunde.plz || "—"}</td>
                        <td className="px-3 py-2">{draftKunde.ort || "—"}</td>
                        <td className="px-3 py-2">{draftKunde.land_code || "—"}</td>
                        <td className="px-3 py-2">{draftKunde.telefonnummer || "—"}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <button
                  type="button"
                  className="mt-3 text-xs font-medium text-blue-600 hover:text-blue-800"
                >
                  + Weitere Anschrift (demnächst)
                </button>
              </section>
              )}

              {/* Waschanlage-Daten – immer sichtbar für alle Bereiche */}
              {customerEditTab === "waschanlage" && draftWash && (
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">
                    Waschanlage (kunden_wash)
                  </h3>
                  <p className="mb-4 text-xs text-slate-500">
                    Zusatzdaten zur gleichen Kunden-ID; für alle Bereiche sichtbar und bearbeitbar.
                  </p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-500">BUKto</label>
                      <SuggestTextInput
                        type="text"
                        value={draftWash.bukto ?? ""}
                        onChange={(e) => setDraftWash({ ...draftWash, bukto: e.target.value })}
                        suggestions={fieldSuggestions.wash_bukto}
                        title="Vorschläge aus gespeicherten Wasch-Datensätzen"
                        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-500">Limit (€)</label>
                      <input
                        type="number"
                        value={draftWash.limit_betrag ?? 0}
                        onChange={(e) =>
                          setDraftWash({
                            ...draftWash,
                            limit_betrag: Number(e.target.value) || 0,
                          })
                        }
                        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                      />
                      <p className="mt-1 text-[10px] text-slate-400">Aktiv nur wenn Betrag &gt; 0.</p>
                    </div>
                    <div className="flex items-center gap-2 sm:col-span-2">
                      <input
                        type="checkbox"
                        checked={draftWash.kunde_gesperrt ?? false}
                        onChange={(e) =>
                          setDraftWash({ ...draftWash, kunde_gesperrt: e.target.checked })
                        }
                        id="wash_gesperrt"
                        className="rounded border-slate-300"
                      />
                      <label htmlFor="wash_gesperrt" className="text-sm text-slate-600">
                        Kunde gesperrt (Waschanlage)
                      </label>
                    </div>
                    {/* ── Fuhrpark / Kennzeichen ────────────────── */}
                    <div className="sm:col-span-2 space-y-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                      <div className="flex items-center gap-2">
                        <Car className="h-4 w-4 text-cyan-600" />
                        <p className="text-xs font-bold uppercase tracking-wide text-cyan-800">
                          Fuhrpark / Kennzeichen
                        </p>
                      </div>
                      {(() => {
                        const plates = (draftWash.kennzeichen ?? "")
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean);

                        const addPlate = () => {
                          const v = newPlateInput.trim().toUpperCase();
                          if (!v || plates.includes(v)) return;
                          const next = [...plates, v].join(", ");
                          setDraftWash({ ...draftWash, kennzeichen: next });
                          setNewPlateInput("");
                        };

                        const removePlate = (idx: number) => {
                          const next = plates.filter((_, i) => i !== idx).join(", ");
                          setDraftWash({ ...draftWash, kennzeichen: next || undefined });
                        };

                        return (
                          <>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={newPlateInput}
                                onChange={(e) => setNewPlateInput(e.target.value.toUpperCase())}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") { e.preventDefault(); addPlate(); }
                                }}
                                placeholder="NEU: z. B. LU-XX-123"
                                className="h-9 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm shadow-sm outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                              />
                              <button
                                type="button"
                                onClick={addPlate}
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-white shadow-sm hover:bg-slate-700"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>
                            {plates.length > 0 && (
                              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100">
                                {plates.map((plate, idx) => (
                                  <li key={plate} className="flex items-center justify-between px-3 py-2.5 text-sm text-slate-800">
                                    <span className="font-medium tracking-wide">{plate}</span>
                                    <button
                                      type="button"
                                      onClick={() => removePlate(idx)}
                                      className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600"
                                      title="Entfernen"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}
                            {plates.length === 0 && (
                              <p className="py-2 text-center text-xs text-slate-400">
                                Noch keine Kennzeichen hinzugefuegt.
                              </p>
                            )}
                          </>
                        );
                      })()}
                    </div>

                    <div className="sm:col-span-2 text-xs font-bold uppercase tracking-wide text-cyan-800">
                      Waschanlage — Programm
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-500">Waschprogramm</label>
                      <select
                        value={draftWash.wasch_programm ?? ""}
                        onChange={(e) =>
                          setDraftWash({ ...draftWash, wasch_programm: e.target.value })
                        }
                        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                      >
                        {WASH_PROGRAM_OPTIONS.map((v) => (
                          <option key={v || "—"} value={v}>
                            {v || "—"}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-500">Intervall</label>
                      <SuggestTextInput
                        type="text"
                        value={draftWash.wasch_intervall ?? ""}
                        onChange={(e) =>
                          setDraftWash({ ...draftWash, wasch_intervall: e.target.value })
                        }
                        suggestions={fieldSuggestions.wasch_intervall}
                        title="Vorschläge aus gespeicherten Wasch-Datensätzen"
                        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="sm:col-span-2 text-xs font-medium text-slate-500">Rechnungsadresse</div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-500">Rechnung-Zusatz</label>
                      <SuggestTextInput
                        type="text"
                        value={draftWash.rechnung_zusatz ?? ""}
                        onChange={(e) =>
                          setDraftWash({ ...draftWash, rechnung_zusatz: e.target.value })
                        }
                        suggestions={fieldSuggestions.wash_rechnung_zusatz}
                        title="Vorschläge aus gespeicherten Wasch-Datensätzen"
                        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-500">Rechnung-PLZ</label>
                      <SuggestTextInput
                        type="text"
                        value={draftWash.rechnung_plz ?? ""}
                        onChange={(e) =>
                          setDraftWash({ ...draftWash, rechnung_plz: e.target.value })
                        }
                        suggestions={fieldSuggestions.wash_rechnung_plz}
                        title="Vorschläge aus gespeicherten Wasch-Datensätzen"
                        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-500">Rechnung-Ort</label>
                      <SuggestTextInput
                        type="text"
                        value={draftWash.rechnung_ort ?? ""}
                        onChange={(e) =>
                          setDraftWash({ ...draftWash, rechnung_ort: e.target.value })
                        }
                        suggestions={fieldSuggestions.wash_rechnung_ort}
                        title="Vorschläge aus gespeicherten Wasch-Datensätzen"
                        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-500">Rechnung-Strasse</label>
                      <SuggestTextInput
                        type="text"
                        value={draftWash.rechnung_strasse ?? ""}
                        onChange={(e) =>
                          setDraftWash({ ...draftWash, rechnung_strasse: e.target.value })
                        }
                        suggestions={fieldSuggestions.wash_rechnung_strasse}
                        title="Vorschläge aus gespeicherten Wasch-Datensätzen"
                        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-500">Bankname</label>
                      <SuggestTextInput
                        type="text"
                        value={draftWash.bankname ?? ""}
                        onChange={(e) => setDraftWash({ ...draftWash, bankname: e.target.value })}
                        suggestions={fieldSuggestions.wash_bankname}
                        title="Vorschläge aus gespeicherten Wasch-Datensätzen"
                        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-500">BIC</label>
                      <SuggestTextInput
                        type="text"
                        value={draftWash.bic ?? ""}
                        onChange={(e) => setDraftWash({ ...draftWash, bic: e.target.value })}
                        suggestions={fieldSuggestions.wash_bic}
                        title="Vorschläge aus gespeicherten Wasch-Datensätzen"
                        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs font-medium text-slate-500">IBAN</label>
                      <SuggestTextInput
                        type="text"
                        value={draftWash.iban ?? ""}
                        onChange={(e) => setDraftWash({ ...draftWash, iban: e.target.value })}
                        suggestions={fieldSuggestions.wash_iban}
                        title="Vorschläge aus gespeicherten Wasch-Datensätzen"
                        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-500">Wichtige Infos</label>
                      <textarea
                        value={draftWash.wichtige_infos ?? ""}
                        onChange={(e) =>
                          setDraftWash({ ...draftWash, wichtige_infos: e.target.value })
                        }
                        rows={2}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-500">Bemerkungen</label>
                      <textarea
                        value={draftWash.bemerkungen ?? ""}
                        onChange={(e) =>
                          setDraftWash({ ...draftWash, bemerkungen: e.target.value })
                        }
                        rows={2}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-2 sm:col-span-2">
                      <input
                        type="checkbox"
                        checked={draftWash.lastschrift ?? false}
                        onChange={(e) =>
                          setDraftWash({ ...draftWash, lastschrift: e.target.checked })
                        }
                        id="lastschrift"
                        className="rounded border-slate-300"
                      />
                      <label htmlFor="lastschrift" className="text-sm text-slate-600">
                        Lastschrift
                      </label>
                    </div>
                  </div>
                </section>
              )}

              {/* Zusätzliche Angaben – nur Frontend-UI, gleiches Layout; Speichern später an API anbindbar */}
              {customerEditTab === "extras" && (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">
                  Zusätzliche Angaben
                </h3>
                <p className="mb-4 text-xs text-slate-500">
                  Weitere Kundendaten (Sales / Purchase / Werkstatt). Nur Frontend – Speichern später an API anbindbar.
                </p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">Kundenart / Zahlungsbedingung</label>
                    <input
                      type="text"
                      className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
                      placeholder="z. B. Bar, 14 Tage netto"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">Lieferbedingung</label>
                    <input
                      type="text"
                      className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">Rabatt (%)</label>
                    <input
                      type="number"
                      className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">Kreditlimit (€)</label>
                    <input
                      type="number"
                      className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
                      placeholder="0"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-slate-500">Interne Notiz (Werkstatt / Verkauf)</label>
                    <textarea
                      rows={3}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
                      placeholder="Freitext…"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
                    <label className="flex items-center gap-2 text-sm text-slate-600">
                      <input type="checkbox" className="rounded border-slate-300" />
                      Risikokunde (Kredit)
                    </label>
                  </div>
                </div>
              </section>
              )}

              {customerEditTab === "extras" &&
                department !== "waschanlage" &&
                draftKunde &&
                !hasWashProfile &&
                !draftWash && (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-4">
                    <p className="text-sm text-slate-600">
                      Für diesen Kunden gibt es noch keinen Wasch-Datensatz. Unter{" "}
                      <strong>Waschanlage → Kunden</strong> können Sie dieselbe KundenNr. öffnen und
                      Waschdaten speichern – oder hier ein Profil anlegen.
                    </p>
                    <button
                      type="button"
                      className="mt-3 rounded-lg bg-white px-3 py-2 text-sm font-medium text-blue-700 ring-1 ring-slate-200 hover:bg-blue-50"
                      onClick={() => {
                        setDraftWash(emptyWashDraft(draftKunde.id));
                      }}
                    >
                      Waschprofil anlegen / bearbeiten
                    </button>
                  </div>
                )}
                </div>
              )}
            </div>
            </div>
            <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedRowId(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  {t("customersClose", "Close")}
                </button>
                <button
                  type="button"
                  onClick={handleSaveDetail}
                  disabled={!draftKunde}
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t("customersSave", "Save")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedRowId && draftKunde && (
        <NewCustomerModal
          open={Boolean(selectedRowId)}
          onClose={() => setSelectedRowId(null)}
          department={department}
          mode="edit"
          editInitial={{ kunde: draftKunde, wash: draftWash }}
          editKundeTopContent={
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    {t("customersDocsSectionTitle", "Customer documents")}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {t(
                      "customersDocsHint",
                      "View, upload, open, and remove files linked to this customer."
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setUnterlagenOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
                >
                  <FolderOpen className="h-4 w-4" />
                  {t("customersDocsOpen", "Open documents")}
                  {unterlagenForCustomer.length > 0 ? (
                    <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {unterlagenForCustomer.length}
                    </span>
                  ) : null}
                </button>
              </div>
            </section>
          }
          editAdresseExtraContent={
            <>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("customersInvoicesTitle", "Invoices")}
              </p>
              <button
                type="button"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              >
                <Receipt className="h-4 w-4 text-slate-500" />
                {t("customersShowInvoices", "Show invoices")}
              </button>
            </>
          }
          editKundeSideContent={
            <>
              <section className="flex min-h-0 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                    <Link2 className="h-4 w-4 text-slate-400" />
                    Kundenbeziehungen
                  </h3>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      Neu
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      Bearbeiten
                    </button>
                  </div>
                </div>
                <div className="max-h-64 overflow-auto rounded-xl border border-slate-100">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 font-semibold text-slate-600">
                      <tr>
                        <th className="px-3 py-2">Verknüpfter Kunde</th>
                        <th className="px-3 py-2">Art</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white text-slate-600">
                      <tr>
                        <td colSpan={2} className="px-3 py-8 text-center text-slate-400">
                          Keine Einträge — Datenanbindung folgt
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="flex min-h-0 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    {t("customersAppointmentsTitle", "Appointments")}
                  </h3>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"
                  >
                    <CalendarPlus className="h-3.5 w-3.5" />
                    {t("customersNewAppointment", "New appointment")}
                  </button>
                </div>
                <p className="mb-2 text-xs font-medium text-slate-500">
                  {t("customersMoreAppointments", "More appointments")}
                </p>
                <div className="max-h-56 overflow-auto rounded-xl border border-slate-100">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 font-semibold text-slate-600">
                      <tr>
                        <th className="px-3 py-2">{t("customersApptDate", "Date")}</th>
                        <th className="px-3 py-2">{t("customersApptTime", "Time")}</th>
                        <th className="px-3 py-2">{t("customersApptPurpose", "Purpose")}</th>
                        <th className="px-3 py-2">{t("customersApptDone", "Done")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white text-slate-600">
                      <tr>
                        <td colSpan={4} className="px-3 py-6 text-center text-slate-400">
                          {t("customersNoAppointments", "No appointments available")}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

              </section>
            </>
          }
          additionalTabLabel="Additional"
          additionalTabContent={
            <div className="space-y-6">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
                  Interne Informationen
                </h3>
                <textarea
                  rows={6}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Kurzinfos, Historie, Besonderheiten …"
                />
              </section>

              <div className="grid gap-6">
                <section className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-5">
                  <h3 className="mb-2 text-sm font-semibold text-slate-700">Schnellaktionen</h3>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      className="rounded-lg border border-white bg-white px-3 py-2 text-left text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                      Kunden anschreiben
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-white bg-white px-3 py-2 text-left text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                      Kaufvertrag
                    </button>
                  </div>
                </section>
              </div>
            </div>
          }
          nextKundenNrPreview={draftKunde.kunden_nr}
          fieldSuggestions={fieldSuggestions}
          onSubmit={handleEditCustomerSubmit}
        />
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowAddCustomer(true)}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            {t("customersNewCustomer", "Add customer")}
          </button>
          <button
            type="button"
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <List className="h-4 w-4" />
            {t("customersLists", "Lists")}
          </button>
        </div>
        <p className="text-sm text-slate-500">
          {t("customersSelectionCount", "Selection count:")}{" "}
          <span className="font-semibold text-slate-700">{filtered.length}</span>
        </p>
      </div>

      <NewCustomerModal
        open={showAddCustomer}
        onClose={() => setShowAddCustomer(false)}
        department={department}
        nextKundenNrPreview={generateNextKundenNr(db)}
        onSubmit={handleNewCustomerSubmit}
        fieldSuggestions={fieldSuggestions}
      />

      {unterlagenOpen && draftKunde ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]"
          onClick={() => setUnterlagenOpen(false)}
          role="presentation"
        >
          <div
            className="flex max-h-[min(85vh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="unterlagen-dialog-title"
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div className="min-w-0">
                <h2
                  id="unterlagen-dialog-title"
                  className="flex items-center gap-2 text-lg font-bold text-slate-800"
                >
                  <FolderOpen className="h-5 w-5 shrink-0 text-blue-600" />
                  <span className="truncate">Kundenunterlagen</span>
                </h2>
                <p className="mt-0.5 truncate text-sm text-slate-500">{draftKunde.firmenname}</p>
                <p className="mt-1 text-xs text-slate-400">
                  KU-Nr. <span className="font-mono text-slate-600">{draftKunde.kunden_nr}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setUnterlagenOpen(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Schließen"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {unterlagenForCustomer.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center text-sm text-slate-500">
                  Noch keine Dateien. Nutzen Sie „Datei hinzufügen“, um Uploads des Kunden zu simulieren.
                </p>
              ) : (
                <ul className="space-y-2">
                  {unterlagenForCustomer.map((u) => (
                    <li
                      key={u.id}
                      className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5"
                    >
                      <FileText className="h-8 w-8 shrink-0 text-slate-400" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-800">{u.name}</p>
                        <p className="text-xs text-slate-500">
                          {formatFileSize(u.size)} ·{" "}
                          {new Date(u.uploaded_at).toLocaleString("de-DE", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          title="Datei anzeigen / herunterladen"
                          onClick={() => window.open(u.data_url, "_blank", "noopener,noreferrer")}
                          className="rounded-lg px-2 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50"
                        >
                          Öffnen
                        </button>
                        <button
                          type="button"
                          title="Entfernen"
                          onClick={() => handleRemoveUnterlage(u.id)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          aria-label={`${u.name} entfernen`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-t border-slate-100 px-5 py-4">
              <input
                ref={unterlagenFileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  void handleUnterlageFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => unterlagenFileInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white py-3 text-sm font-medium text-slate-600 transition hover:border-blue-300 hover:bg-blue-50/50 hover:text-blue-700"
              >
                <Upload className="h-4 w-4" />
                Datei hinzufügen (Kunden-Upload simulieren)
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
