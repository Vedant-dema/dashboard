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
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Pencil,
} from "lucide-react";
import type { KundenRisikoanalyse, KundenStamm, KundenWashStamm } from "../types/kunden";
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
  listTermineForKunde,
  addKundenTermin,
  toggleTerminErledigt,
  removeKundenTermin,
  listBeziehungenForKunde,
  addKundenBeziehung,
  removeKundenBeziehung,
  isCustomersApiMode,
  loadSharedKundenDb,
  saveSharedKundenDb,
  getRisikoanalyseForKunde,
  upsertRisikoanalyse,
  getExpiryStatus,
  daysUntilExpiry,
  hasRisikoAlert,
  type KundenListRow,
  type NewKundeInput,
  type NewKundenUnterlageInput,
  type KundenWashUpsertFields,
  type RisikoanalyseUpsertFields,
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

  const termineForCustomer = useMemo(
    () => (draftKunde ? listTermineForKunde(db, draftKunde.id) : []),
    [db, draftKunde?.id]
  );

  const beziehungenForCustomer = useMemo(
    () => (draftKunde ? listBeziehungenForKunde(db, draftKunde.id) : []),
    [db, draftKunde?.id]
  );

  const [terminFormOpen, setTerminFormOpen] = useState(false);
  const [terminDatum, setTerminDatum] = useState("");
  const [terminZeit, setTerminZeit] = useState("");
  const [terminZweck, setTerminZweck] = useState("");

  const handleAddTermin = useCallback(() => {
    if (!draftKunde || !terminDatum || !terminZweck.trim()) return;
    const next = addKundenTermin(db, draftKunde.id, {
      datum: terminDatum,
      zeit: terminZeit,
      zweck: terminZweck,
    });
    saveKundenDb(next);
    setDb(next);
    setTerminFormOpen(false);
    setTerminDatum("");
    setTerminZeit("");
    setTerminZweck("");
  }, [db, draftKunde, terminDatum, terminZeit, terminZweck]);

  const handleToggleTermin = useCallback(
    (terminId: number) => {
      const next = toggleTerminErledigt(db, terminId);
      saveKundenDb(next);
      setDb(next);
    },
    [db]
  );

  const handleRemoveTermin = useCallback(
    (terminId: number) => {
      const next = removeKundenTermin(db, terminId);
      saveKundenDb(next);
      setDb(next);
    },
    [db]
  );

  const [beziehungFormOpen, setBeziehungFormOpen] = useState(false);
  const [beziehungNr, setBeziehungNr] = useState("");
  const [beziehungArt, setBeziehungArt] = useState("");
  const [beziehungSearchOpen, setBeziehungSearchOpen] = useState(false);
  const [beziehungArtOpen, setBeziehungArtOpen] = useState(false);
  const beziehungSearchRef = useRef<HTMLDivElement>(null);
  const beziehungArtRef = useRef<HTMLDivElement>(null);

  // Filtered customer list for the beziehung search dropdown
  const beziehungSearchResults = useMemo(() => {
    const others = db.kunden.filter((k) => draftKunde && k.id !== draftKunde.id);
    const q = beziehungNr.trim().toLowerCase();
    if (!q) return others.slice(0, 10);
    return others
      .filter((k) => k.kunden_nr.toLowerCase().includes(q) || k.firmenname.toLowerCase().includes(q))
      .slice(0, 10);
  }, [beziehungNr, db.kunden, draftKunde?.id]);

  // Predefined relationship type options
  const BEZIEHUNG_ART_OPTIONS = useMemo(() => [
    t("beziehungArtParent", "Parent company"),
    t("beziehungArtSubsidiary", "Subsidiary"),
    t("beziehungArtSister", "Sister company"),
    t("beziehungArtBranch", "Branch"),
    t("beziehungArtPartner", "Partner"),
    t("beziehungArtSupplier", "Supplier"),
    t("beziehungArtCustomer", "Customer"),
    t("beziehungArtOther", "Other"),
  ], [t]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (beziehungSearchRef.current && !beziehungSearchRef.current.contains(e.target as Node)) {
        setBeziehungSearchOpen(false);
      }
      if (beziehungArtRef.current && !beziehungArtRef.current.contains(e.target as Node)) {
        setBeziehungArtOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Risikoanalyse ──────────────────────────────────────────────────────────
  const risikoForCustomer = useMemo(
    () => (draftKunde ? getRisikoanalyseForKunde(db, draftKunde.id) : null),
    [db, draftKunde?.id]
  );
  const [risikoEditOpen, setRisikoEditOpen] = useState(false);
  const [risikoDraft, setRisikoDraft] = useState<RisikoanalyseUpsertFields>({});

  const handleRisikoEdit = useCallback(() => {
    setRisikoDraft({
      allg_dok_bogen: risikoForCustomer?.allg_dok_bogen ?? false,
      reg_ausz: risikoForCustomer?.reg_ausz ?? "",
      wirt_ber_erm: risikoForCustomer?.wirt_ber_erm ?? "",
      ausw_kop_wirt_ber: risikoForCustomer?.ausw_kop_wirt_ber ?? "",
      ausw_gueltig_bis: risikoForCustomer?.ausw_gueltig_bis ?? "",
      ausw_kop_abholer: risikoForCustomer?.ausw_kop_abholer ?? "",
      verst_dok_bogen: risikoForCustomer?.verst_dok_bogen ?? false,
      bearbeiter: risikoForCustomer?.bearbeiter ?? "",
    });
    setRisikoEditOpen(true);
  }, [risikoForCustomer]);

  const handleRisikoSave = useCallback(() => {
    if (!draftKunde) return;
    const next = upsertRisikoanalyse(db, draftKunde.id, risikoDraft);
    saveKundenDb(next);
    setDb(next);
    setRisikoEditOpen(false);
  }, [db, draftKunde, risikoDraft]);

  // Pre-compute customers that have risk alerts for the list badge
  const alertKundenIds = useMemo(() => {
    const ids = new Set<number>();
    for (const r of db.risikoanalysen ?? []) {
      if (hasRisikoAlert(r)) ids.add(r.kunden_id);
    }
    return ids;
  }, [db.risikoanalysen]);

  const handleAddBeziehung = useCallback(() => {
    if (!draftKunde || !beziehungNr.trim() || !beziehungArt.trim()) return;
    const linked = db.kunden.find((k) => k.kunden_nr === beziehungNr.trim());
    if (!linked || linked.id === draftKunde.id) return;
    const next = addKundenBeziehung(db, draftKunde.id, {
      verknuepfter_kunden_id: linked.id,
      art: beziehungArt,
    });
    saveKundenDb(next);
    setDb(next);
    setBeziehungFormOpen(false);
    setBeziehungNr("");
    setBeziehungArt("");
  }, [db, draftKunde, beziehungNr, beziehungArt]);

  const handleRemoveBeziehung = useCallback(
    (beziehungId: number) => {
      const next = removeKundenBeziehung(db, beziehungId);
      saveKundenDb(next);
      setDb(next);
    },
    [db]
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
              {/* ── Kundenbeziehungen ─────────────────────────────── */}
              <section className="flex min-h-0 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                    <Link2 className="h-4 w-4 text-slate-400" />
                    {t("customersRelationsTitle", "Customer relationships")}
                  </h3>
                  <button
                    type="button"
                    onClick={() => { setBeziehungFormOpen((v) => !v); setBeziehungNr(""); setBeziehungArt(""); }}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    {t("customersRelationsNew", "New")}
                  </button>
                </div>

                {beziehungFormOpen && (
                  <div className="mb-3 flex flex-col gap-2 rounded-xl border border-blue-100 bg-blue-50/60 p-3">

                    {/* ── Customer search combobox ── */}
                    <div ref={beziehungSearchRef} className="relative">
                      <input
                        type="text"
                        value={beziehungNr}
                        onChange={(e) => { setBeziehungNr(e.target.value); setBeziehungSearchOpen(true); }}
                        onFocus={() => setBeziehungSearchOpen(true)}
                        placeholder={t("customersRelationsNrPh", "Search by customer no. or company name")}
                        className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs focus:border-blue-400 focus:outline-none"
                        autoComplete="off"
                      />
                      {/* Selected customer chip */}
                      {beziehungNr && (() => {
                        const matched = db.kunden.find((k) => k.kunden_nr === beziehungNr.trim());
                        return matched ? (
                          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                            {matched.firmenname}
                          </span>
                        ) : null;
                      })()}
                      {/* Dropdown list */}
                      {beziehungSearchOpen && beziehungSearchResults.length > 0 && (
                        <ul className="absolute left-0 right-0 top-full z-[200] mt-1 max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                          {beziehungSearchResults.map((k) => (
                            <li key={k.id}>
                              <button
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setBeziehungNr(k.kunden_nr);
                                  setBeziehungSearchOpen(false);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-blue-50"
                              >
                                <span className="w-14 shrink-0 font-mono font-semibold text-slate-500">{k.kunden_nr}</span>
                                <span className="truncate font-medium text-slate-800">{k.firmenname}</span>
                                {k.ort && <span className="ml-auto shrink-0 text-slate-400">{k.ort}</span>}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      {beziehungSearchOpen && beziehungNr.trim() && beziehungSearchResults.length === 0 && (
                        <div className="absolute left-0 right-0 top-full z-[200] mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-400 shadow-xl">
                          {t("customersEmptyList", "No customers found")}
                        </div>
                      )}
                    </div>

                    {/* ── Relationship type combobox ── */}
                    <div ref={beziehungArtRef} className="relative">
                      <input
                        type="text"
                        value={beziehungArt}
                        onChange={(e) => { setBeziehungArt(e.target.value); setBeziehungArtOpen(true); }}
                        onFocus={() => setBeziehungArtOpen(true)}
                        placeholder={t("customersRelationsArtPh", "Type (e.g. Parent company)")}
                        className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs focus:border-blue-400 focus:outline-none"
                        autoComplete="off"
                      />
                      {beziehungArtOpen && (
                        <ul className="absolute left-0 right-0 top-full z-[200] mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                          {BEZIEHUNG_ART_OPTIONS
                            .filter((opt) => !beziehungArt.trim() || opt.toLowerCase().includes(beziehungArt.toLowerCase()))
                            .map((opt) => (
                              <li key={opt}>
                                <button
                                  type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    setBeziehungArt(opt);
                                    setBeziehungArtOpen(false);
                                  }}
                                  className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-blue-50"
                                >
                                  {opt}
                                </button>
                              </li>
                            ))}
                        </ul>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleAddBeziehung}
                        disabled={!beziehungNr.trim() || !beziehungArt.trim()}
                        className="flex-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
                      >
                        {t("commonSave", "Save")}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setBeziehungFormOpen(false); setBeziehungNr(""); setBeziehungArt(""); }}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        {t("commonCancel", "Cancel")}
                      </button>
                    </div>
                  </div>
                )}

                <div className="max-h-64 overflow-auto rounded-xl border border-slate-100">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 font-semibold text-slate-600">
                      <tr>
                        <th className="px-3 py-2">{t("customersRelationsLinked", "Linked customer")}</th>
                        <th className="px-3 py-2">{t("customersRelationsArt", "Type")}</th>
                        <th className="w-8 px-3 py-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white text-slate-600">
                      {beziehungenForCustomer.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-3 py-8 text-center text-slate-400">
                            {t("customersRelationsEmpty", "No entries")}
                          </td>
                        </tr>
                      ) : (
                        beziehungenForCustomer.map((b) => {
                          const linked = db.kunden.find((k) => k.id === b.verknuepfter_kunden_id);
                          return (
                            <tr key={b.id}>
                              <td className="px-3 py-2">
                                <span className="font-medium">{linked?.firmenname ?? b.verknuepfter_kunden_id}</span>
                                <span className="ml-1 text-slate-400">#{linked?.kunden_nr ?? "?"}</span>
                              </td>
                              <td className="px-3 py-2 text-slate-500">{b.art}</td>
                              <td className="px-3 py-2">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveBeziehung(b.id)}
                                  className="rounded p-0.5 text-slate-300 hover:text-red-500"
                                  aria-label={t("commonRemove", "Remove")}
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* ── Termine ───────────────────────────────────────── */}
              <section className="flex min-h-0 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    {t("customersAppointmentsTitle", "Appointments")}
                  </h3>
                  <button
                    type="button"
                    onClick={() => { setTerminFormOpen((v) => !v); setTerminDatum(""); setTerminZeit(""); setTerminZweck(""); }}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"
                  >
                    <CalendarPlus className="h-3.5 w-3.5" />
                    {t("customersNewAppointment", "New appointment")}
                  </button>
                </div>

                {terminFormOpen && (
                  <div className="mb-3 flex flex-col gap-2 rounded-xl border border-blue-100 bg-blue-50/60 p-3">
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={terminDatum}
                        onChange={(e) => setTerminDatum(e.target.value)}
                        className="h-8 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs focus:border-blue-400 focus:outline-none"
                      />
                      <input
                        type="time"
                        value={terminZeit}
                        onChange={(e) => setTerminZeit(e.target.value)}
                        className="h-8 w-28 rounded-lg border border-slate-200 bg-white px-2.5 text-xs focus:border-blue-400 focus:outline-none"
                      />
                    </div>
                    <input
                      type="text"
                      value={terminZweck}
                      onChange={(e) => setTerminZweck(e.target.value)}
                      placeholder={t("customersTerminZweckPh", "Purpose / subject")}
                      className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs focus:border-blue-400 focus:outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleAddTermin}
                        disabled={!terminDatum || !terminZweck.trim()}
                        className="flex-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
                      >
                        {t("commonSave", "Save")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setTerminFormOpen(false)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        {t("commonCancel", "Cancel")}
                      </button>
                    </div>
                  </div>
                )}

                <div className="max-h-56 overflow-auto rounded-xl border border-slate-100">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 font-semibold text-slate-600">
                      <tr>
                        <th className="px-3 py-2">{t("customersApptDate", "Date")}</th>
                        <th className="px-3 py-2">{t("customersApptTime", "Time")}</th>
                        <th className="px-3 py-2">{t("customersApptPurpose", "Purpose")}</th>
                        <th className="px-3 py-2 text-center">{t("customersApptDone", "Done")}</th>
                        <th className="w-8 px-3 py-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white text-slate-600">
                      {termineForCustomer.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-3 py-6 text-center text-slate-400">
                            {t("customersNoAppointments", "No appointments available")}
                          </td>
                        </tr>
                      ) : (
                        termineForCustomer.map((termin) => (
                          <tr key={termin.id} className={termin.erledigt ? "opacity-50" : ""}>
                            <td className="px-3 py-2 tabular-nums">{termin.datum}</td>
                            <td className="px-3 py-2 tabular-nums">{termin.zeit || "—"}</td>
                            <td className={`px-3 py-2 ${termin.erledigt ? "line-through" : ""}`}>
                              {termin.zweck}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <input
                                type="checkbox"
                                checked={termin.erledigt}
                                onChange={() => handleToggleTermin(termin.id)}
                                className="h-3.5 w-3.5 rounded border-slate-300 accent-blue-600"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <button
                                type="button"
                                onClick={() => handleRemoveTermin(termin.id)}
                                className="rounded p-0.5 text-slate-300 hover:text-red-500"
                                aria-label={t("commonRemove", "Remove")}
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          }
          editKundeBottomContent={(() => {
            const risk = risikoForCustomer;

            type DocField = {
              key: keyof Pick<KundenRisikoanalyse, "reg_ausz" | "wirt_ber_erm" | "ausw_kop_wirt_ber" | "ausw_gueltig_bis" | "ausw_kop_abholer">;
              labelKey: string;
              fallback: string;
            };
            const DATE_FIELDS: DocField[] = [
              { key: "reg_ausz", labelKey: "riskDocRegAusz", fallback: "Registration Extract" },
              { key: "wirt_ber_erm", labelKey: "riskDocWirtBerErm", fallback: "Business Auth." },
              { key: "ausw_kop_wirt_ber", labelKey: "riskDocAuswKopWirtBer", fallback: "ID Copy + Bus. Report" },
              { key: "ausw_gueltig_bis", labelKey: "riskDocAuswGueltigBis", fallback: "ID valid until" },
              { key: "ausw_kop_abholer", labelKey: "riskDocAuswKopAbholer", fallback: "ID Copy Collector" },
            ];

            const expiredCount = DATE_FIELDS.filter((f) => getExpiryStatus(risk?.[f.key]) === "expired").length;
            const criticalCount = DATE_FIELDS.filter((f) => getExpiryStatus(risk?.[f.key]) === "critical").length;
            const warningCount = DATE_FIELDS.filter((f) => getExpiryStatus(risk?.[f.key]) === "warning").length;

            const statusBadge = (status: ReturnType<typeof getExpiryStatus>, date?: string) => {
              const base = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold";
              if (status === "expired") return (
                <span className={`${base} bg-red-100 text-red-700`}>
                  <X className="h-2.5 w-2.5" /> {t("riskStatusExpired", "Expired")}
                  {date && <span className="ml-0.5 opacity-70">({Math.abs(daysUntilExpiry(date))}d)</span>}
                </span>
              );
              if (status === "critical") return (
                <span className={`${base} bg-orange-100 text-orange-700`}>
                  <AlertTriangle className="h-2.5 w-2.5" /> {t("riskStatusCritical", "Critical")}
                  {date && <span className="ml-0.5 opacity-70">({daysUntilExpiry(date)}d)</span>}
                </span>
              );
              if (status === "warning") return (
                <span className={`${base} bg-amber-100 text-amber-700`}>
                  <AlertTriangle className="h-2.5 w-2.5" /> {t("riskStatusWarning", "Expiring soon")}
                  {date && <span className="ml-0.5 opacity-70">({daysUntilExpiry(date)}d)</span>}
                </span>
              );
              if (status === "ok") return (
                <span className={`${base} bg-emerald-100 text-emerald-700`}>
                  <CheckCircle2 className="h-2.5 w-2.5" /> {t("riskStatusOk", "Valid")}
                </span>
              );
              return (
                <span className={`${base} bg-slate-100 text-slate-500`}>
                  <CircleDashed className="h-2.5 w-2.5" /> {t("riskStatusMissing", "Not entered")}
                </span>
              );
            };

            return (
              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                {/* Header row */}
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">
                    <ShieldAlert className="h-4 w-4 text-slate-400" />
                    {t("riskTitle", "Risk Analysis")}
                  </h3>
                  <div className="flex items-center gap-2">
                    {(expiredCount > 0 || criticalCount > 0 || warningCount > 0) && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                        <ShieldAlert className="h-3 w-3" />
                        {expiredCount + criticalCount + warningCount} {t("riskAlertBannerTitle", "Document Expiry Warning")}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={risikoEditOpen ? () => setRisikoEditOpen(false) : handleRisikoEdit}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      <Pencil className="h-3 w-3" />
                      {t("riskEdit", "Edit dates")}
                    </button>
                  </div>
                </div>

                {/* Edit form — 2-column grid for full-width comfort */}
                {risikoEditOpen && (
                  <div className="mb-3 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                    <div className="mb-3 flex flex-wrap gap-6">
                      <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-700">
                        <input
                          type="checkbox"
                          checked={risikoDraft.allg_dok_bogen ?? false}
                          onChange={(e) => setRisikoDraft((d) => ({ ...d, allg_dok_bogen: e.target.checked }))}
                          className="h-3.5 w-3.5 rounded border-slate-300 accent-blue-600"
                        />
                        {t("riskDocAllgDokBogen", "General Doc Form")}
                      </label>
                      <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-700">
                        <input
                          type="checkbox"
                          checked={risikoDraft.verst_dok_bogen ?? false}
                          onChange={(e) => setRisikoDraft((d) => ({ ...d, verst_dok_bogen: e.target.checked }))}
                          className="h-3.5 w-3.5 rounded border-slate-300 accent-blue-600"
                        />
                        {t("riskDocVerstDokBogen", "Understanding Form")}
                      </label>
                      <div className="flex items-center gap-2 ml-auto">
                        <label className="text-xs text-slate-600 shrink-0">{t("riskBearbeiter", "Handler")}</label>
                        <input
                          type="text"
                          value={risikoDraft.bearbeiter ?? ""}
                          onChange={(e) => setRisikoDraft((d) => ({ ...d, bearbeiter: e.target.value }))}
                          maxLength={20}
                          className="h-7 w-32 rounded-lg border border-slate-200 bg-white px-2 text-xs focus:border-blue-400 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
                      {DATE_FIELDS.map((f) => (
                        <div key={f.key} className="flex items-center gap-2">
                          <label className="w-36 shrink-0 text-xs text-slate-600">{t(f.labelKey, f.fallback)}</label>
                          <input
                            type="date"
                            value={(risikoDraft[f.key] as string | undefined) ?? ""}
                            onChange={(e) => setRisikoDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                            className="h-7 flex-1 min-w-0 rounded-lg border border-slate-200 bg-white px-2 text-xs focus:border-blue-400 focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={handleRisikoSave}
                        className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                      >
                        {t("commonSave", "Save")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setRisikoEditOpen(false)}
                        className="rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        {t("commonCancel", "Cancel")}
                      </button>
                    </div>
                  </div>
                )}

                {/* Read-only section */}
                {!risikoEditOpen && (
                  <div className="overflow-hidden rounded-xl border border-slate-100">
                    {/* Flags + handler row */}
                    <div className="flex flex-wrap items-center gap-6 border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-xs">
                      <span className="flex items-center gap-1.5 text-slate-600">
                        {risk?.allg_dok_bogen
                          ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          : <CircleDashed className="h-3.5 w-3.5 text-slate-300" />}
                        {t("riskDocAllgDokBogen", "General Doc Form")}
                      </span>
                      <span className="flex items-center gap-1.5 text-slate-600">
                        {risk?.verst_dok_bogen
                          ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          : <CircleDashed className="h-3.5 w-3.5 text-slate-300" />}
                        {t("riskDocVerstDokBogen", "Understanding Form")}
                      </span>
                      {risk?.bearbeiter && (
                        <span className="ml-auto flex items-center gap-1 text-slate-400">
                          <span className="text-slate-500">{t("riskBearbeiter", "Handler")}:</span>
                          <span className="font-mono font-semibold text-slate-700">{risk.bearbeiter}</span>
                        </span>
                      )}
                    </div>

                    {/* Expiry date table — horizontal, all 5 docs side by side */}
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[600px] text-left text-xs">
                        <thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          <tr>
                            {DATE_FIELDS.map((f) => (
                              <th key={f.key} className="px-4 py-2">{t(f.labelKey, f.fallback)}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {/* Date row */}
                          <tr className="border-t border-slate-100 bg-white">
                            {DATE_FIELDS.map((f) => {
                              const dateVal = risk?.[f.key] as string | undefined;
                              return (
                                <td key={f.key} className="px-4 py-2 font-mono text-slate-700">
                                  {dateVal || "—"}
                                </td>
                              );
                            })}
                          </tr>
                          {/* Status row */}
                          <tr className="border-t border-slate-100">
                            {DATE_FIELDS.map((f) => {
                              const dateVal = risk?.[f.key] as string | undefined;
                              const status = getExpiryStatus(dateVal);
                              return (
                                <td
                                  key={f.key}
                                  className={`px-4 py-2 ${
                                    status === "expired" ? "bg-red-50" :
                                    status === "critical" ? "bg-orange-50" :
                                    status === "warning" ? "bg-amber-50" : "bg-white"
                                  }`}
                                >
                                  {statusBadge(status, dateVal)}
                                </td>
                              );
                            })}
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {!risk && (
                      <p className="px-4 py-5 text-center text-sm text-slate-400">
                        {t("riskNoData", "No risk analysis data on file")} —{" "}
                        <button
                          type="button"
                          onClick={handleRisikoEdit}
                          className="text-blue-600 underline hover:text-blue-700"
                        >
                          {t("riskAddData", "Add data")}
                        </button>
                      </p>
                    )}
                  </div>
                )}
              </section>
            );
          })()}
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
                  Noch keine Dateien. Nutzen Sie „Datei hinzufügen", um Uploads des Kunden zu simulieren.
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
