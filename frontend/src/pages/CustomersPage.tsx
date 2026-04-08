import {
  useState,
  useMemo,
  useEffect,
  useLayoutEffect,
  useCallback,
  useRef,
  type DragEvent,
} from "react";
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
  CalendarPlus,
  FileText,
  Upload,
  Trash2,
  RotateCcw,
  Archive,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Pencil,
} from "lucide-react";
import type { KundenHistoryEntry, KundenRisikoanalyse, KundenStamm, KundenWashStamm } from "../types/kunden";
import type { RechnungListRow } from "../types/rechnungen";
import { loadRechnungenDb, formatRechnungsbetrag } from "../store/rechnungenStore";
import { buildSimpleTextPdf } from "../common/utils/buildSimpleTextPdf";
import { useApplyGlobalSearchFocus } from "../hooks/useApplyGlobalSearchFocus";
import {
  customerRepository,
  type KundenListRow,
  type NewKundeInput,
  type NewKundenUnterlageInput,
  type KundenWashUpsertFields,
  type RisikoanalyseUpsertFields,
  type AuditEditor,
} from "../features/customers/repository/customerRepository";
import { NewCustomerModal } from "../components/NewCustomerModal";
import { DatePickerInput } from "../components/DatePickerInput";
import { SuggestTextInput } from "../components/SuggestTextInput";
import {
  getCustomerFieldSuggestions,
  getQuickSearchSuggestions,
} from "../store/customerFieldSuggestions";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";
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

/** `?customer=KUNDENNR` on the hash (e.g. `#/sales/kunden?customer=KU12`). */
function readCustomerParamFromHash(): string | null {
  const h = window.location.hash;
  if (!h.includes("?")) return null;
  const qs = h.split("?")[1] ?? "";
  const v = new URLSearchParams(qs).get("customer")?.trim();
  return v && v.length > 0 ? v : null;
}

function writeCustomerHashPreservePath(kuNr: string | null) {
  const raw = window.location.hash.slice(1);
  const pathPart = (raw.split("?")[0] || "/").trim() || "/";
  const path = pathPart.startsWith("/") ? pathPart : `/${pathPart}`;
  const next = kuNr ? `#${path}?customer=${encodeURIComponent(kuNr)}` : `#${path}`;
  if (window.location.hash !== next) {
    window.location.hash = next;
  }
}

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

function transferHasFiles(dataTransfer: DataTransfer | null): boolean {
  if (!dataTransfer) return false;
  if (dataTransfer.files && dataTransfer.files.length > 0) return true;
  const types = dataTransfer.types;
  if (!types) return false;
  if (typeof (types as unknown as { contains?: (value: string) => boolean }).contains === "function") {
    return (types as unknown as { contains: (value: string) => boolean }).contains("Files");
  }
  return Array.from(types).includes("Files");
}

function formatInvoiceListDateForPdf(raw: string, localeTag: string): string {
  if (!raw) return "—";
  const iso = raw.includes("T") ? raw : `${raw}T12:00:00`;
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return raw;
  return new Date(ms).toLocaleDateString(localeTag, { day: "2-digit", month: "short", year: "numeric" });
}

function formatSyncTimestamp(raw: string | null | undefined, localeTag: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const parsedMs = Date.parse(trimmed);
  if (Number.isNaN(parsedMs)) return trimmed;
  return new Date(parsedMs).toLocaleString(localeTag, { dateStyle: "short", timeStyle: "short" });
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
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const editor: AuditEditor | undefined = user ? { name: user.name, email: user.email } : undefined;
  const localeTag = language === "de" ? "de-DE"
    : language === "fr" ? "fr-FR"
    : language === "es" ? "es-ES"
    : language === "it" ? "it-IT"
    : language === "pt" ? "pt-PT"
    : language === "tr" ? "tr-TR"
    : language === "ru" ? "ru-RU"
    : language === "ar" ? "ar-SA"
    : language === "zh" ? "zh-CN"
    : language === "ja" ? "ja-JP"
    : language === "hi" ? "hi-IN"
    : "en-GB";
  const isApiMode = customerRepository.isApiMode();
  const [db, setDb] = useState(() => customerRepository.loadLocalDb());
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [historyNotice, setHistoryNotice] = useState<string | null>(null);
  const [officialHistoryEntries, setOfficialHistoryEntries] = useState<KundenHistoryEntry[] | null>(null);
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
  const [vatId, setVatId] = useState("");
  const [sortierung, setSortierung] = useState<CustomerSortKey>("kundenNr");
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const selectedRowIdRef = useRef<string | null>(null);
  selectedRowIdRef.current = selectedRowId;
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [unterlagenOpen, setUnterlagenOpen] = useState(false);
  const [customerInvoicesOpen, setCustomerInvoicesOpen] = useState(false);
  const unterlagenFileInputRef = useRef<HTMLInputElement>(null);
  const [unterlagenDragActive, setUnterlagenDragActive] = useState(false);
  const unterlagenDragDepthRef = useRef(0);

  const [draftKunde, setDraftKunde] = useState<KundenStamm | null>(null);
  const [draftWash, setDraftWash] = useState<KundenWashStamm | null>(null);
  const [detailDrawerTab, setDetailDrawerTab] = useState<DetailDrawerTab>("kundendetail");
  const [customerEditTab, setCustomerEditTab] = useState<CustomerEditTab>("kunde");
  const [newPlateInput, setNewPlateInput] = useState("");
  const [rechnungenListTick, setRechnungenListTick] = useState(0);

  useEffect(() => {
    const onRechnungenDb = () => setRechnungenListTick((n) => n + 1);
    window.addEventListener("dema-rechnungen-db-changed", onRechnungenDb);
    return () => window.removeEventListener("dema-rechnungen-db-changed", onRechnungenDb);
  }, []);

  useEffect(() => {
    const q = sessionStorage.getItem("dema-search-q");
    if (q) {
      setQuickSearch(q);
      sessionStorage.removeItem("dema-search-q");
    }
  }, []);

  useEffect(() => {
    if (!unterlagenOpen) {
      unterlagenDragDepthRef.current = 0;
      setUnterlagenDragActive(false);
      return;
    }
    // Prevent browser navigation/file-open when files are dropped outside the dedicated dropzone.
    const preventWindowFileDrop = (event: globalThis.DragEvent) => {
      if (!transferHasFiles(event.dataTransfer)) return;
      event.preventDefault();
    };
    window.addEventListener("dragover", preventWindowFileDrop);
    window.addEventListener("drop", preventWindowFileDrop);
    return () => {
      window.removeEventListener("dragover", preventWindowFileDrop);
      window.removeEventListener("drop", preventWindowFileDrop);
    };
  }, [unterlagenOpen]);

  useEffect(() => {
    if (!isApiMode) return;
    let cancelled = false;
    void (async () => {
      try {
        const remote = await customerRepository.loadSharedDb();
        if (cancelled) return;
        if (remote) {
          setDb(remote);
          customerRepository.saveLocalDb(remote);
          return;
        }
        const seeded = customerRepository.loadLocalDb();
        const saved = await customerRepository.saveSharedDb(seeded);
        if (cancelled) return;
        setDb(saved);
        customerRepository.saveLocalDb(saved);
      } catch {
        // Keep local mode behavior if shared demo backend is unavailable.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isApiMode]);

  const persist = useCallback(async (next: typeof db): Promise<boolean> => {
    setSyncNotice(null);
    customerRepository.saveLocalDb(next);
    setDb(next);
    if (!isApiMode) return true;
    try {
      const saved = await customerRepository.saveSharedDb(next);
      customerRepository.saveLocalDb(saved);
      setDb(saved);
      return true;
    } catch (error) {
      if (customerRepository.isCustomersDbConflictError(error)) {
        const expectedAt = formatSyncTimestamp(error.expectedUpdatedAt, localeTag);
        const actualAt = formatSyncTimestamp(error.actualUpdatedAt, localeTag);
        try {
          const remote = await customerRepository.loadSharedDb();
          if (remote) {
            customerRepository.saveLocalDb(remote);
            setDb(remote);
          }
        } catch {
          // Keep current in-memory state if conflict refresh fails.
        }
        const baselineText = expectedAt
          ? `${t("customersConflictExpected", "Your version started from")} ${expectedAt}. `
          : "";
        const latestText = actualAt
          ? `${t("customersConflictReloadedAt", "Latest shared version reloaded")} (${actualAt}). `
          : `${t("customersConflictReloaded", "Latest shared version reloaded")}. `;
        setSyncNotice(
          `${t(
            "customersConflictHeadline",
            "Save conflict detected: another user/session changed shared customer data."
          )} ${baselineText}${latestText}${t(
            "customersConflictResolution",
            "Please reopen the customer, review the latest values, and save your changes again."
          )}`
        );
        return false;
      }
      const generic = t("customersSyncFailed", "Could not sync with shared demo backend.");
      setSyncNotice(generic);
      alert(generic);
      return false;
    }
  }, [isApiMode, localeTag, t]);

  const unterlagenForCustomer = useMemo(
    () => (draftKunde ? customerRepository.listUnterlagenForKunde(db, draftKunde.id) : []),
    [db, draftKunde?.id]
  );

  const termineForCustomer = useMemo(
    () => (draftKunde ? customerRepository.listTermineForKunde(db, draftKunde.id) : []),
    [db, draftKunde?.id]
  );

  const beziehungenForCustomer = useMemo(
    () => (draftKunde ? customerRepository.listBeziehungenForKunde(db, draftKunde.id) : []),
    [db, draftKunde?.id]
  );

  useEffect(() => {
    if (!isApiMode || !draftKunde?.id) {
      setOfficialHistoryEntries(null);
      setHistoryNotice(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const official = await customerRepository.loadOfficialCustomerHistory(draftKunde.id);
        if (cancelled) return;
        setOfficialHistoryEntries(official);
        setHistoryNotice(null);
      } catch {
        if (cancelled) return;
        setOfficialHistoryEntries(null);
        setHistoryNotice(
          t(
            "customersHistoryFallback",
            "Official history endpoint is unavailable right now. Showing local history snapshot."
          )
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isApiMode, draftKunde?.id, t]);

  const historyForCustomer = useMemo(() => {
    if (!draftKunde) return [];
    if (isApiMode && officialHistoryEntries) return officialHistoryEntries;
    return customerRepository.listHistoryForKunde(db, draftKunde.id);
  }, [db, draftKunde?.id, isApiMode, officialHistoryEntries]);

  const rechnungenRowsForCustomer = useMemo(() => {
    if (!draftKunde?.kunden_nr?.trim()) return [];
    const rdb = loadRechnungenDb();
    const ku = draftKunde.kunden_nr.trim();
    return rdb.rows.filter((r) => r.kunden_nr.trim() === ku);
  }, [draftKunde?.id, draftKunde?.kunden_nr, rechnungenListTick]);

  const openRechnungenForCustomer = useCallback(() => {
    if (!draftKunde?.kunden_nr?.trim()) return;
    const ku = draftKunde.kunden_nr.trim();
    sessionStorage.setItem("dema-rechnungen-filter-kunden-nr", ku);
    const matches = loadRechnungenDb().rows.filter((r) => r.kunden_nr.trim() === ku);
    if (matches.length > 0) {
      matches.sort((a, b) => {
        const byDate = b.r_datum.localeCompare(a.r_datum);
        if (byDate !== 0) return byDate;
        return b.id - a.id;
      });
      sessionStorage.setItem("dema-rechnungen-select-id", String(matches[0]!.id));
    }
    const dept = department ?? "sales";
    window.location.hash = `#/${dept}/rechnungen`;
    setSelectedRowId(null);
  }, [draftKunde?.kunden_nr, department]);

  const closeCustomerInvoicesModal = useCallback(() => {
    setCustomerInvoicesOpen(false);
  }, []);

  const openInvoicePdfInBrowser = useCallback(
    (r: RechnungListRow) => {
      const d = formatInvoiceListDateForPdf(r.r_datum, localeTag);
      const amt = formatRechnungsbetrag(r.betrag_cent);
      const lines = [
        t("customersInvoicesPdfDocHeading", "INVOICE (demo)"),
        t("customersInvoicesPdfRule", "----------------------------------------"),
        `${t("rechnungenLabelNr", "Invoice no.:")} ${r.rechn_nr}`,
        `${t("rechnungenThRDatum", "Inv. date")}: ${d}`,
        `${t("rechnungenThKundenNr", "Cust. no.")}: ${r.kunden_nr}`,
        `${t("customersInvoicesPdfCompany", "Company")}: ${r.firmenname}`,
        `${t("rechnungenThBetrag", "Amount")}: ${amt}`,
      ];
      if (r.vermerk.trim()) {
        lines.push(`${t("rechnungenLabelVermerk", "Note")}: ${r.vermerk}`);
      }
      lines.push(
        t("customersInvoicesPdfRule", "----------------------------------------"),
        t(
          "customersInvoicesPdfFooter",
          "Invoices are created on the Invoices page. This PDF is a preview only."
        )
      );
      const blob = buildSimpleTextPdf(lines);
      const url = URL.createObjectURL(blob);
      const win = window.open(url, "_blank", "noopener,noreferrer");
      if (!win) {
        URL.revokeObjectURL(url);
        alert(t("customersInvoicesPdfPopupBlocked", "Allow pop-ups to open the PDF in your browser."));
        return;
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    },
    [localeTag, t]
  );

  const [terminFormOpen, setTerminFormOpen] = useState(false);
  const [terminDatum, setTerminDatum] = useState("");
  const [terminZeit, setTerminZeit] = useState("");
  const [terminZweck, setTerminZweck] = useState("");

  const handleAddTermin = useCallback(() => {
    if (!draftKunde || !terminDatum || !terminZweck.trim()) return;
    const next = customerRepository.addKundenTermin(db, draftKunde.id, {
      datum: terminDatum,
      zeit: terminZeit,
      zweck: terminZweck,
    });
    void persist(next);
    setTerminFormOpen(false);
    setTerminDatum("");
    setTerminZeit("");
    setTerminZweck("");
  }, [db, draftKunde, terminDatum, terminZeit, terminZweck, persist]);

  const handleToggleTermin = useCallback(
    (terminId: number) => {
      const next = customerRepository.toggleTerminErledigt(db, terminId);
      void persist(next);
    },
    [db, persist]
  );

  const handleRemoveTermin = useCallback(
    (terminId: number) => {
      const next = customerRepository.removeKundenTermin(db, terminId);
      void persist(next);
    },
    [db, persist]
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
    () => (draftKunde ? customerRepository.getRisikoanalyseForKunde(db, draftKunde.id) : null),
    [db, draftKunde?.id]
  );
  const [risikoEditOpen, setRisikoEditOpen] = useState(false);
  const [risikoDraft, setRisikoDraft] = useState<RisikoanalyseUpsertFields>({});
  const risikoSectionRef = useRef<HTMLElement | null>(null);

  /** Normalize stored dates for `<input type="date">` (expects YYYY-MM-DD). */
  const toDateInputValue = useCallback((raw: string | undefined): string => {
    const s = raw?.trim() ?? "";
    if (!s) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const m = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
    if (m) {
      const d = m[1]!.padStart(2, "0");
      const mo = m[2]!.padStart(2, "0");
      return `${m[3]}-${mo}-${d}`;
    }
    return "";
  }, []);

  const handleRisikoEdit = useCallback(() => {
    setRisikoDraft({
      allg_dok_bogen: risikoForCustomer?.allg_dok_bogen ?? false,
      reg_ausz: toDateInputValue(risikoForCustomer?.reg_ausz),
      wirt_ber_erm: toDateInputValue(risikoForCustomer?.wirt_ber_erm),
      ausw_kop_wirt_ber: toDateInputValue(risikoForCustomer?.ausw_kop_wirt_ber),
      ausw_gueltig_bis: toDateInputValue(risikoForCustomer?.ausw_gueltig_bis),
      ausw_gueltig_bis_owner_name: risikoForCustomer?.ausw_gueltig_bis_owner_name ?? "",
      ausw_kop_abholer: toDateInputValue(risikoForCustomer?.ausw_kop_abholer),
      verst_dok_bogen: risikoForCustomer?.verst_dok_bogen ?? false,
      bearbeiter: risikoForCustomer?.bearbeiter ?? "",
    });
    setRisikoEditOpen(true);
  }, [risikoForCustomer, toDateInputValue]);

  useLayoutEffect(() => {
    if (!risikoEditOpen) return;
    risikoSectionRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [risikoEditOpen]);

  const handleRisikoSave = useCallback(() => {
    if (!draftKunde) return;
    const next = customerRepository.upsertRisikoanalyse(db, draftKunde.id, risikoDraft);
    void persist(next);
    setRisikoEditOpen(false);
  }, [db, draftKunde, risikoDraft, persist]);

  // Pre-compute customers that have risk alerts for the list badge
  const alertKundenIds = useMemo(() => {
    const ids = new Set<number>();
    for (const r of db.risikoanalysen ?? []) {
      if (customerRepository.hasRisikoAlert(r)) ids.add(r.kunden_id);
    }
    return ids;
  }, [db.risikoanalysen]);

  const handleAddBeziehung = useCallback(() => {
    if (!draftKunde || !beziehungNr.trim() || !beziehungArt.trim()) return;
    const linked = db.kunden.find((k) => k.kunden_nr === beziehungNr.trim());
    if (!linked || linked.id === draftKunde.id) return;
    const next = customerRepository.addKundenBeziehung(db, draftKunde.id, {
      verknuepfter_kunden_id: linked.id,
      art: beziehungArt,
    });
    void persist(next);
    setBeziehungFormOpen(false);
    setBeziehungNr("");
    setBeziehungArt("");
  }, [db, draftKunde, beziehungNr, beziehungArt, persist]);

  const handleRemoveBeziehung = useCallback(
    (beziehungId: number) => {
      const next = customerRepository.removeKundenBeziehung(db, beziehungId);
      void persist(next);
    },
    [db, persist]
  );

  const handleUnterlageFiles = useCallback(
    async (list: FileList | null) => {
      if (!list?.length || !draftKunde) return;
      const files = Array.from(list);
      let next = db;
      let addedCount = 0;
      let hasTooLargeFile = false;
      let hasReadError = false;
      for (const file of files) {
        if (file.size > MAX_UNTERLAGE_BYTES) {
          hasTooLargeFile = true;
          continue;
        }
        try {
          const dataUrl = await readFileAsDataURL(file);
          next = customerRepository.addKundenUnterlage(next, draftKunde.id, {
            name: file.name,
            size: file.size,
            mime_type: file.type || "application/octet-stream",
            data_url: dataUrl,
          });
          addedCount += 1;
        } catch {
          hasReadError = true;
        }
      }
      if (addedCount > 0) {
        void persist(next);
      }
      if (hasTooLargeFile) {
        alert(
          t(
            "customersFileTooBig",
            "One or more files were too large (max 2 MB per file in this demo)."
          )
        );
      }
      if (hasReadError) {
        alert(t("customersFileReadError", "One or more files could not be read."));
      }
    },
    [db, draftKunde, persist, t]
  );

  const onUnterlagenDragOver = useCallback((e: DragEvent) => {
    if (!transferHasFiles(e.dataTransfer)) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
    setUnterlagenDragActive(true);
  }, []);

  const onUnterlagenDragEnter = useCallback((e: DragEvent) => {
    if (!transferHasFiles(e.dataTransfer)) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
    unterlagenDragDepthRef.current += 1;
    setUnterlagenDragActive(true);
  }, []);

  const onUnterlagenDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    unterlagenDragDepthRef.current = Math.max(0, unterlagenDragDepthRef.current - 1);
    if (unterlagenDragDepthRef.current === 0) {
      setUnterlagenDragActive(false);
    }
  }, []);

  const onUnterlagenDrop = useCallback(
    (e: DragEvent) => {
      if (!transferHasFiles(e.dataTransfer)) return;
      e.preventDefault();
      e.stopPropagation();
      unterlagenDragDepthRef.current = 0;
      setUnterlagenDragActive(false);
      const files = e.dataTransfer.files;
      void handleUnterlageFiles(files?.length ? files : null);
    },
    [handleUnterlageFiles]
  );

  const handleRemoveUnterlage = useCallback(
    (unterlageId: number) => {
      const next = customerRepository.removeKundenUnterlage(db, unterlageId);
      void persist(next);
    },
    [db, persist]
  );

  const [showDeleted, setShowDeleted] = useState(false);
  const listSource = useMemo(() => customerRepository.listRows(db), [db]);
  const deletedSource = useMemo(() => customerRepository.listDeletedRows(db), [db]);

  const filtered = useMemo(() => {
    let list: KundenListRow[] = [...listSource];
    if (quickSearch.trim()) {
      const q = quickSearch.trim().toLowerCase();
      list = list.filter((r) => r.firmenname.toLowerCase().includes(q));
    }
    if (kundenNr.trim()) list = list.filter((r) => r.kuNr.includes(kundenNr.trim()));
    if (firmenname.trim()) {
      const f = firmenname.toLowerCase();
      list = list.filter((r) => r.firmenname.toLowerCase().includes(f));
    }
    if (ansprechpartner.trim()) {
      const q = ansprechpartner.trim().toLowerCase();
      list = list.filter((r) => {
        const kunde = db.kunden.find((k) => k.kunden_nr === r.kuNr);
        return kunde?.ansprechpartner?.toLowerCase().includes(q) ?? false;
      });
    }
    if (telefon.trim()) {
      const q = telefon.trim().toLowerCase();
      list = list.filter((r) => {
        const kunde = db.kunden.find((k) => k.kunden_nr === r.kuNr);
        return kunde?.telefonnummer?.toLowerCase().includes(q) ?? false;
      });
    }
    if (plz.trim()) list = list.filter((r) => r.plz.includes(plz.trim()));
    if (ort.trim()) {
      const o = ort.toLowerCase();
      list = list.filter((r) => r.ort.toLowerCase().includes(o));
    }
    if (land.trim()) {
      const l = land.trim().toLowerCase();
      list = list.filter((r) => r.land.toLowerCase().includes(l));
    }
    if (vatId.trim()) {
      const v = vatId.trim().toLowerCase();
      list = list.filter((r) => {
        const kunde = db.kunden.find((k) => k.kunden_nr === r.kuNr);
        return kunde?.ust_id_nr?.toLowerCase().includes(v) ?? false;
      });
    }

    if (sortierung === "kundenNr") list.sort((a, b) => a.kuNr.localeCompare(b.kuNr));
    if (sortierung === "firmenname") list.sort((a, b) => a.firmenname.localeCompare(b.firmenname));
    if (sortierung === "ort") list.sort((a, b) => a.ort.localeCompare(b.ort));
    if (sortierung === "plz") list.sort((a, b) => a.plz.localeCompare(b.plz));
    if (sortierung === "termin") list.sort((a, b) => a.termin.localeCompare(b.termin));
    return list;
  }, [listSource, quickSearch, kundenNr, firmenname, ansprechpartner, telefon, plz, ort, land, vatId, sortierung, db.kunden]);

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
    setVatId("");
  };

  /** Load drafts immediately on row click — avoids one paint with no drawer (blank flash). */
  const openCustomerRow = useCallback(
    (kuNr: string) => {
      const detail = customerRepository.getDetailByKundenNr(db, kuNr);
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
      // Reset inline forms so they don't carry over when switching customers
      setBeziehungFormOpen(false);
      setBeziehungNr("");
      setBeziehungArt("");
      setRisikoEditOpen(false);
      setTerminFormOpen(false);
      writeCustomerHashPreservePath(kuNr);
    },
    [db]
  );

  const focusCustomerFromSearch = useCallback(
    (id: number) => {
      const k = db.kunden.find((x) => x.id === id && !x.deleted);
      if (!k) return;
      showAll();
      openCustomerRow(k.kunden_nr);
    },
    [db, openCustomerRow]
  );

  useApplyGlobalSearchFocus("kunden", focusCustomerFromSearch);

  useEffect(() => {
    const run = () => {
      const ku = readCustomerParamFromHash();
      if (!ku) {
        if (selectedRowIdRef.current) setSelectedRowId(null);
        return;
      }
      const detail = customerRepository.getDetailByKundenNr(db, ku);
      if (!detail) {
        writeCustomerHashPreservePath(null);
        return;
      }
      if (selectedRowIdRef.current === ku) return;
      openCustomerRow(ku);
    };
    run();
    window.addEventListener("hashchange", run);
    return () => window.removeEventListener("hashchange", run);
  }, [db, openCustomerRow]);

  useEffect(() => {
    if (!selectedRowId) {
      setUnterlagenOpen(false);
      setDraftKunde(null);
      setDraftWash(null);
      setDetailDrawerTab("kundendetail");
      setCustomerEditTab("kunde");
      return;
    }
    const detail = customerRepository.getDetailByKundenNr(db, selectedRowId);
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
    if (!draftWash) {
      void (async () => {
        const synced = await persist(customerRepository.updateKunde(db, draftKunde, editor));
        if (!synced) return;
        setSelectedRowId(null);
        writeCustomerHashPreservePath(null);
      })();
      return;
    }
    const oldWash = db.kundenWash.find((w) => w.kunden_id === draftKunde.id) ?? null;
    const washPayload: KundenWashUpsertFields = {
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
      wasch_fahrzeug_typ: draftWash.wasch_fahrzeug_typ,
      wasch_programm: draftWash.wasch_programm,
      netto_preis: draftWash.netto_preis,
      brutto_preis: draftWash.brutto_preis,
      wasch_intervall: draftWash.wasch_intervall,
    };
    const washBaseline = oldWash ?? customerRepository.mergeWashStateForDiff(null, draftKunde.id, {});
    const mergedWash = customerRepository.mergeWashStateForDiff(oldWash, draftKunde.id, washPayload);
    const washChanges = customerRepository.computeKundenWashFieldDiff(washBaseline, mergedWash);
    let next = customerRepository.updateKunde(db, draftKunde, editor, { extraChanges: washChanges });
    next = customerRepository.upsertKundenWash(next, draftKunde.id, washPayload);
    void (async () => {
      const synced = await persist(next);
      if (!synced) return;
      setSelectedRowId(null);
      writeCustomerHashPreservePath(null);
    })();
  };

  const handleEditCustomerSubmit = useCallback(
    (data: NewKundeInput, wash: KundenWashUpsertFields | null) => {
      if (!draftKunde) return;
      const oldWash = db.kundenWash.find((w) => w.kunden_id === draftKunde.id) ?? null;
      const washBaseline = oldWash ?? customerRepository.mergeWashStateForDiff(null, draftKunde.id, {});
      const mergedWash = wash ? customerRepository.mergeWashStateForDiff(oldWash, draftKunde.id, wash) : null;
      const washChanges = mergedWash ? customerRepository.computeKundenWashFieldDiff(washBaseline, mergedWash) : [];
      let next = customerRepository.updateKunde(
        db,
        {
          ...draftKunde,
          ...data,
          id: draftKunde.id,
          kunden_nr: draftKunde.kunden_nr,
        },
        editor,
        { extraChanges: washChanges }
      );
      if (wash) {
        next = customerRepository.upsertKundenWash(next, draftKunde.id, wash);
      }
      void (async () => {
        const synced = await persist(next);
        if (!synced) return;
        setSelectedRowId(null);
        writeCustomerHashPreservePath(null);
      })();
    },
    [db, draftKunde, persist, editor]
  );

  const handleNewCustomerSubmit = useCallback(
    (
      data: NewKundeInput,
      wash: KundenWashUpsertFields | null,
      scannedAttachment?: NewKundenUnterlageInput | null
    ) => {
      try {
        const washBaseline = customerRepository.mergeWashStateForDiff(null, 0, {});
        const mergedWash = wash ? customerRepository.mergeWashStateForDiff(null, 0, wash) : null;
        const washExtra = mergedWash ? customerRepository.computeKundenWashFieldDiff(washBaseline, mergedWash) : [];
        let next = customerRepository.createKunde(db, data, editor, { washExtraChanges: washExtra });
        const created = next.kunden[next.kunden.length - 1];
        if (wash) {
          next = customerRepository.upsertKundenWash(next, created.id, wash);
        }
        if (scannedAttachment) {
          next = customerRepository.addKundenUnterlage(next, created.id, scannedAttachment);
        }
        void (async () => {
          const synced = await persist(next);
          if (!synced) return;
          setShowAddCustomer(false);
          setSelectedRowId(created.kunden_nr);
          writeCustomerHashPreservePath(created.kunden_nr);
        })();
      } catch (e) {
        alert(e instanceof Error ? e.message : t("customersSaveFailed", "Save failed"));
      }
    },
    [db, persist, t]
  );

  const handleDeleteKunde = useCallback(
    (kundenId: number) => {
      if (!window.confirm(t("customersDeleteConfirm", "Mark this customer for deletion? They will be moved to the recycle bin and can be restored."))) return;
      const next = customerRepository.deleteKunde(db, kundenId, editor);
      void persist(next);
      setSelectedRowId(null);
      writeCustomerHashPreservePath(null);
    },
    [db, editor, persist, t]
  );

  const handleRestoreKunde = useCallback(
    (kundenId: number) => {
      if (!window.confirm(t("customersRestoreConfirm", "Restore this customer?"))) return;
      const next = customerRepository.restoreKunde(db, kundenId, editor);
      void persist(next);
    },
    [db, editor, persist, t]
  );

  const handlePurgeKunde = useCallback(
    (kundenId: number) => {
      if (!window.confirm(t("customersPurgeConfirm", "Permanently delete this customer? This cannot be undone."))) return;
      const next = customerRepository.purgeKunde(db, kundenId);
      void persist(next);
    },
    [db, persist, t]
  );

  // editor is derived from user — include in callbacks that use it
  // (listed explicitly above to satisfy exhaustive-deps)

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
        <div className="flex items-center gap-2">
          {!showDeleted && (
            <button
              type="button"
              onClick={() => setShowAddCustomer(true)}
              className="flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700"
            >
              <UserPlus className="h-4 w-4" />
              {t("customersNewCustomer", "Add customer")}
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowDeleted((v) => !v)}
            className={`flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition ${
              showDeleted
                ? "border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Archive className="h-4 w-4" />
            {showDeleted
              ? t("customersHideDeleted", "Back to customer list")
              : t("customersShowDeleted", "Show deleted customers")}
            {!showDeleted && deletedSource.length > 0 && (
              <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {deletedSource.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {syncNotice ? (
        <div className="mb-4 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {syncNotice}
        </div>
      ) : null}

      {historyNotice ? (
        <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
          {historyNotice}
        </div>
      ) : null}

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
              placeholder={t("customersLandPlaceholder", "e.g. DE")}
              suggestions={fieldSuggestions.land_code}
              title={t("customersSuggestionsSaved", "Suggestions from saved customers")}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">{t("customersFilterUstId", "VAT ID")}</label>
            <SuggestTextInput
              type="text"
              value={vatId}
              onChange={(e) => setVatId(e.target.value)}
              suggestions={fieldSuggestions.ust_id_nr}
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
                <label className="mb-1 block text-xs font-medium text-slate-500">{t("customersFilterAufnahmeVon", "Entry from")}</label>
                <input type="date" className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">{t("customersFilterAufnahmeBis", "Entry to")}</label>
                <input type="date" className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm" />
              </div>
            </div>
          )}
        </div>
      </div>

      {showDeleted ? (
        <div className="glass-card min-h-0 flex-1 overflow-hidden">
          <div className="border-b border-red-100 bg-red-50 px-4 py-3">
            <h2 className="flex items-center gap-2 text-sm font-bold text-red-700">
              <Archive className="h-4 w-4" />
              {t("customersDeletedTitle", "Recycle Bin — Deleted Customers")}
            </h2>
          </div>
          <div className="overflow-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 font-semibold text-slate-600">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3">{t("customersThKuNr", "KU-NR")}</th>
                  <th className="whitespace-nowrap px-4 py-3">{t("customersThCompany", "Company")}</th>
                  <th className="whitespace-nowrap px-4 py-3">{t("customersDeletedAt", "Deleted on")}</th>
                  <th className="whitespace-nowrap px-4 py-3">{t("customersThIndustry", "Industry")}</th>
                  <th className="whitespace-nowrap px-4 py-3">{t("customersThStreet", "Street")}</th>
                  <th className="whitespace-nowrap px-4 py-3">{t("customersThZip", "ZIP")}</th>
                  <th className="whitespace-nowrap px-4 py-3">{t("customersThCity", "City")}</th>
                  <th className="whitespace-nowrap px-4 py-3">{t("customersThCountry", "Country")}</th>
                  <th className="w-32 px-2 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {deletedSource.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-sm text-slate-400">
                      {t("customersDeletedEmpty", "No deleted customers.")}
                    </td>
                  </tr>
                ) : (
                  deletedSource.map((row) => {
                    const kunde = db.kunden.find((k) => k.kunden_nr === row.kuNr);
                    return (
                      <tr key={row.kuNr} className="text-slate-400">
                        <td className="px-4 py-2.5 font-medium tabular-nums line-through">{row.kuNr}</td>
                        <td className="px-4 py-2.5 line-through">{row.firmenname}</td>
                        <td className="px-4 py-2.5 tabular-nums text-red-400">{row.termin}</td>
                        <td className="px-4 py-2.5">{row.branche}</td>
                        <td className="px-4 py-2.5">{row.strasse}</td>
                        <td className="px-4 py-2.5 tabular-nums">{row.plz}</td>
                        <td className="px-4 py-2.5">{row.ort}</td>
                        <td className="px-4 py-2.5">{row.land}</td>
                        <td className="px-2 py-2.5">
                          {kunde && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleRestoreKunde(kunde.id)}
                                className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-50"
                                title={t("customersRestore", "Restore")}
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                                {t("customersRestore", "Restore")}
                              </button>
                              <button
                                type="button"
                                onClick={() => handlePurgeKunde(kunde.id)}
                                className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500"
                                title={t("customersPurge", "Delete permanently")}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
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
                <th className="w-10 px-2 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-sm text-slate-500">
                    {t("customersEmptyList", "")}
                  </td>
                </tr>
              ) : (
                filtered.map((row) => {
                  const kunde = db.kunden.find((k) => k.kunden_nr === row.kuNr);
                  return (
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
                      <td className="px-2 py-2.5" onClick={(e) => e.stopPropagation()}>
                        {kunde && (
                          <button
                            type="button"
                            onClick={() => handleDeleteKunde(kunde.id)}
                            className={`rounded-lg p-1.5 transition ${
                              selectedRowId === row.kuNr
                                ? "text-red-300 hover:bg-white/10 hover:text-red-200"
                                : "text-slate-300 hover:bg-red-50 hover:text-red-500"
                            }`}
                            aria-label={t("customersDeleteCustomer", "Delete customer")}
                            title={t("customersDeleteCustomer", "Delete customer")}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}


      {selectedRowId && draftKunde && (
        <NewCustomerModal
          key={selectedRowId}
          open={Boolean(selectedRowId)}
          onClose={() => {
            setSelectedRowId(null);
            writeCustomerHashPreservePath(null);
          }}
          department={department}
          mode="edit"
          editInitial={{ kunde: draftKunde, wash: draftWash }}
          editRisikoProfile={risikoForCustomer}
          onScrollToDocumentExpiry={() => {
            risikoSectionRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
          }}
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
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={openRechnungenForCustomer}
                  disabled={!draftKunde?.kunden_nr?.trim()}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-800 shadow-sm hover:bg-blue-100 disabled:pointer-events-none disabled:opacity-50"
                >
                  <Pencil className="h-4 w-4 shrink-0" aria-hidden />
                  {t("customersInvoicesEditBtn", "Edit invoices")}
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerInvoicesOpen(true)}
                  disabled={!draftKunde?.kunden_nr?.trim()}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-50"
                >
                  <FolderOpen className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                  {t("customersInvoicesFolderBtn", "Invoice files")}
                  {rechnungenRowsForCustomer.length > 0 ? (
                    <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {rechnungenRowsForCustomer.length}
                    </span>
                  ) : null}
                </button>
              </div>
            </>
          }
          editKundeSideContent={
            <>
              {/* ── Kundenbeziehungen ─────────────────────────────── */}
              <section className="flex min-h-0 flex-col rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    {t("customersRelationsTitle", "Customer relationships")}
                  </p>
                  <button
                    type="button"
                    onClick={() => { setBeziehungFormOpen((v) => !v); setBeziehungNr(""); setBeziehungArt(""); }}
                    className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-blue-600/20 transition-all hover:from-blue-700 hover:to-indigo-700"
                  >
                    <Plus className="h-3.5 w-3.5" />
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
                            <tr key={b.id} className="group">
                              <td className="px-3 py-2">
                                {linked ? (
                                  <button
                                    type="button"
                                    onClick={() => openCustomerRow(linked.kunden_nr)}
                                    className="flex items-center gap-1.5 rounded-lg px-1 py-0.5 text-left transition hover:bg-blue-50"
                                    title={t("customersRelationsOpenHint", "Open this customer")}
                                  >
                                    <span className="font-medium text-blue-700 group-hover:underline">
                                      {linked.firmenname}
                                    </span>
                                    <span className="font-mono text-[10px] text-slate-400">
                                      #{linked.kunden_nr}
                                    </span>
                                    {linked.ort && (
                                      <span className="text-[10px] text-slate-400">· {linked.ort}</span>
                                    )}
                                  </button>
                                ) : (
                                  <span className="text-slate-400">#{b.verknuepfter_kunden_id}</span>
                                )}
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
              <section className="flex min-h-0 flex-col rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    {t("customersAppointmentsTitle", "Appointments")}
                  </p>
                  <button
                    type="button"
                    onClick={() => { setTerminFormOpen((v) => !v); setTerminDatum(""); setTerminZeit(""); setTerminZweck(""); }}
                    className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-blue-600/20 transition-all hover:from-blue-700 hover:to-indigo-700"
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

              {(() => {
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

            const auswExpiry = customerRepository.getExpiryStatus(risk?.ausw_gueltig_bis);
            const expiredCount = auswExpiry === "expired" ? 1 : 0;
            const criticalCount = auswExpiry === "critical" ? 1 : 0;
            const warningCount = auswExpiry === "warning" ? 1 : 0;

            const statusBadge = (
              status: ReturnType<typeof customerRepository.getRiskDocRowDisplayStatus>,
              date?: string
            ) => {
              const base = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold";
              if (status === "recorded") {
                return (
                  <span className={`${base} bg-emerald-100 text-emerald-700`}>
                    <CheckCircle2 className="h-2.5 w-2.5" /> {t("riskStatusRecorded", "Recorded")}
                  </span>
                );
              }
              if (status === "expired") return (
                <span className={`${base} bg-red-100 text-red-700`}>
                  <X className="h-2.5 w-2.5" /> {t("riskStatusExpired", "Expired")}
                  {date && <span className="ml-0.5 opacity-70">({Math.abs(customerRepository.daysUntilExpiry(date))}d)</span>}
                </span>
              );
              if (status === "critical") return (
                <span className={`${base} bg-orange-100 text-orange-700`}>
                  <AlertTriangle className="h-2.5 w-2.5" /> {t("riskStatusCritical", "Critical")}
                  {date && <span className="ml-0.5 opacity-70">({customerRepository.daysUntilExpiry(date)}d)</span>}
                </span>
              );
              if (status === "warning") return (
                <span className={`${base} bg-amber-100 text-amber-700`}>
                  <AlertTriangle className="h-2.5 w-2.5" /> {t("riskStatusWarning", "Expiring soon")}
                  {date && <span className="ml-0.5 opacity-70">({customerRepository.daysUntilExpiry(date)}d)</span>}
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
              <section
                id="customer-edit-risiko-doc-expiry"
                ref={risikoSectionRef}
                className="min-w-0 scroll-mt-4 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm"
              >
                {/* Header row — matches Contacts / Firmendaten section title scale */}
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    {t("riskTitle", "Risk Analysis")}
                  </p>
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    {(expiredCount > 0 || criticalCount > 0 || warningCount > 0) && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-semibold text-red-700">
                        <ShieldAlert className="h-3 w-3 shrink-0" />
                        {expiredCount + criticalCount + warningCount} {t("riskAlertBannerTitle", "Document Expiry Warning")}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={risikoEditOpen ? () => setRisikoEditOpen(false) : handleRisikoEdit}
                      className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-blue-600/20 transition-all hover:from-blue-700 hover:to-indigo-700"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      {t("riskEdit", "Edit dates")}
                    </button>
                  </div>
                </div>

                {/* Edit form — single column so it works in the narrow sidebar grid column */}
                {risikoEditOpen && (
                  <div className="mb-3 min-w-0 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                    <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
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
                      <div className="flex min-w-0 flex-col gap-1 sm:ml-auto sm:flex-row sm:items-center sm:gap-2">
                        <label className="text-xs text-slate-600 shrink-0">{t("riskBearbeiter", "Handler")}</label>
                        <input
                          type="text"
                          value={risikoDraft.bearbeiter ?? ""}
                          onChange={(e) => setRisikoDraft((d) => ({ ...d, bearbeiter: e.target.value }))}
                          maxLength={20}
                          className="h-9 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2 text-xs focus:border-blue-400 focus:outline-none sm:h-7 sm:w-40"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-4">
                      {DATE_FIELDS.map((f) => (
                        <div
                          key={f.key}
                          className="flex min-w-0 flex-col gap-2 border-b border-slate-200/70 pb-4 last:border-b-0 last:pb-0"
                        >
                          <span className="block text-xs font-medium leading-snug text-slate-600">
                            {t(f.labelKey, f.fallback)}
                          </span>
                          <DatePickerInput
                            value={(risikoDraft[f.key] as string | undefined) ?? ""}
                            onChange={(iso) => setRisikoDraft((d) => ({ ...d, [f.key]: iso }))}
                            placeholder={t("datePickerPlaceholder", "Select date…")}
                            triggerClassName="min-h-11 justify-start py-2.5 text-xs shadow-none sm:min-h-10"
                          />
                          {f.key === "ausw_gueltig_bis" ? (
                            <div className="flex min-w-0 flex-col gap-1">
                              <label className="text-[11px] font-medium text-slate-500">
                                {t("riskAusweisOwnerName", "ID holder name")}
                              </label>
                              <input
                                type="text"
                                value={risikoDraft.ausw_gueltig_bis_owner_name ?? ""}
                                onChange={(e) =>
                                  setRisikoDraft((d) => ({
                                    ...d,
                                    ausw_gueltig_bis_owner_name: e.target.value,
                                  }))
                                }
                                maxLength={120}
                                className="h-9 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-800 focus:border-blue-400 focus:outline-none"
                                placeholder={t("riskAusweisOwnerNamePh", "Owner name on ID")}
                              />
                            </div>
                          ) : null}
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

                    {/* Expiry date table — vertical, one row per document */}
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        <tr>
                          <th className="px-4 py-2 w-1/3">{t("riskDocName", "Document")}</th>
                          <th className="px-4 py-2 w-1/3">{t("riskDocDate", "Date (valid until)")}</th>
                          <th className="px-4 py-2 w-1/3">{t("riskDocStatus", "Status")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {DATE_FIELDS.map((f) => {
                          const dateVal = risk?.[f.key] as string | undefined;
                          const status = customerRepository.getRiskDocRowDisplayStatus(f.key, dateVal);
                          const tint =
                            f.key === "ausw_gueltig_bis" && status === "expired"
                              ? "bg-red-50"
                              : f.key === "ausw_gueltig_bis" && status === "critical"
                                ? "bg-orange-50"
                                : f.key === "ausw_gueltig_bis" && status === "warning"
                                  ? "bg-amber-50"
                                  : "bg-white";
                          const ownerName =
                            f.key === "ausw_gueltig_bis"
                              ? (risk?.ausw_gueltig_bis_owner_name ?? "").trim()
                              : "";
                          return (
                            <tr key={f.key} className={`border-t border-slate-100 ${tint}`}>
                              <td className="px-4 py-2 font-medium text-slate-600">{t(f.labelKey, f.fallback)}</td>
                              <td className="px-4 py-2 text-slate-700">
                                <div className="font-mono">{dateVal || "—"}</div>
                                {ownerName ? (
                                  <div className="mt-0.5 max-w-[12rem] break-words text-[11px] text-slate-500">
                                    {ownerName}
                                  </div>
                                ) : null}
                              </td>
                              <td className="px-4 py-2">{statusBadge(status, dateVal)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            );
              })()}

            </>
          }
          nextKundenNrPreview={draftKunde.kunden_nr}
          fieldSuggestions={fieldSuggestions}
          onSubmit={handleEditCustomerSubmit}
          historyEntries={historyForCustomer}
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
        nextKundenNrPreview={customerRepository.generateNextKundenNr(db)}
        onSubmit={handleNewCustomerSubmit}
        fieldSuggestions={fieldSuggestions}
        duplicateCheck={(name, street, plz, city) => {
          const canonicalCompanyName = (value: string): string => {
            const tokens = value
              .toLowerCase()
              .normalize("NFD")
              .replace(/\p{M}/gu, "")
              .replace(/[^\p{L}\p{N}\s]/gu, " ")
              .split(/\s+/)
              .map((t) => t.trim())
              .filter(Boolean)
              .sort();
            return tokens.join(" ");
          };
          const qName = name.trim().toLowerCase();
          const qStreet = street.trim().toLowerCase();
          const qPlz = plz.trim().toLowerCase();
          const qCity = city.trim().toLowerCase();
          const qNameCanonical = canonicalCompanyName(name);
          if (!qName && !qStreet && !qPlz && !qCity) return [];
          return db.kunden
            .filter((k) => {
              const storedName = k.firmenname.trim().toLowerCase();
              const sameName = qName ? storedName === qName : false;
              const sameNameReordered =
                qNameCanonical && canonicalCompanyName(k.firmenname) === qNameCanonical;
              const sameStreet = qStreet ? (k.strasse ?? "").trim().toLowerCase() === qStreet : false;
              const samePlz = qPlz ? (k.plz ?? "").trim().toLowerCase() === qPlz : false;
              const sameCity = qCity ? (k.ort ?? "").trim().toLowerCase() === qCity : false;
              const sameNamePlzCity = (sameName || sameNameReordered) && samePlz && sameCity;
              return sameName || sameNameReordered || sameStreet || sameNamePlzCity;
            })
            .map((k) => ({
              kuNr: k.kunden_nr,
              firmenname: k.firmenname,
              strasse: k.strasse,
              plz: k.plz,
              ort: k.ort,
            }));
        }}
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
            onDragEnter={onUnterlagenDragEnter}
            onDragOver={onUnterlagenDragOver}
            onDragLeave={onUnterlagenDragLeave}
            onDrop={onUnterlagenDrop}
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
                  <span className="truncate">{t("customersUnterlageTitle", "Customer documents")}</span>
                </h2>
                <p className="mt-0.5 truncate text-sm text-slate-500">{draftKunde.firmenname}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {t("customersUnterlageKuNrLabel", "Cust. no.")} <span className="font-mono text-slate-600">{draftKunde.kunden_nr}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setUnterlagenOpen(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label={t("customersClose", "Close")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {unterlagenForCustomer.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center text-sm text-slate-500">
                  {t("customersUnterlageEmpty", 'No files yet. Use "Add file" to simulate customer uploads.')}
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
                          {new Date(u.uploaded_at).toLocaleString(localeTag, {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          title={t("customersUnterlageOpenTitle", "View / download file")}
                          onClick={() => window.open(u.data_url, "_blank", "noopener,noreferrer")}
                          className="rounded-lg px-2 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50"
                        >
                          {t("customersUnterlageOpenBtn", "Open")}
                        </button>
                        <button
                          type="button"
                          title={t("customersUnterlageRemoveTitle", "Remove")}
                          onClick={() => handleRemoveUnterlage(u.id)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          aria-label={`${u.name} ${t("customersUnterlageRemoveTitle", "Remove")}`}
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
                multiple
                className="hidden"
                onChange={(e) => {
                  void handleUnterlageFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <div
                className={`rounded-xl border border-dashed transition ${
                  unterlagenDragActive
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-300 bg-white hover:border-blue-300 hover:bg-blue-50/50"
                }`}
              >
                <button
                  type="button"
                  draggable={false}
                  onClick={() => unterlagenFileInputRef.current?.click()}
                  className="flex w-full min-h-11 flex-col items-center justify-center gap-1 px-3 py-3 text-sm font-medium text-slate-600 transition hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                >
                  <span className="flex items-center justify-center gap-2">
                    <Upload className="h-4 w-4 shrink-0" />
                    {t("customersUnterlageAdd", "Add file (simulate customer upload)")}
                  </span>
                  <span className="text-center text-xs font-normal text-slate-500">
                    {t("customersUnterlageDropHint", "Or drop a file here")}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {customerInvoicesOpen && draftKunde ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]"
          onClick={closeCustomerInvoicesModal}
          role="presentation"
        >
          <div
            className="flex max-h-[min(85vh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="customer-invoices-dialog-title"
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div className="min-w-0">
                <h2
                  id="customer-invoices-dialog-title"
                  className="flex items-center gap-2 text-lg font-bold text-slate-800"
                >
                  <FolderOpen className="h-5 w-5 shrink-0 text-blue-600" />
                  <span className="truncate">{t("customersInvoicesFolderTitle", "Invoice files")}</span>
                </h2>
                <p className="mt-0.5 truncate text-sm text-slate-500">{draftKunde.firmenname}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {t("customersUnterlageKuNrLabel", "Cust. no.")}{" "}
                  <span className="font-mono text-slate-600">{draftKunde.kunden_nr}</span>
                </p>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  {t(
                    "customersInvoicesFolderHint",
                    "Create and edit invoices on the Invoices page. Open PDF opens a new browser tab."
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={closeCustomerInvoicesModal}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label={t("customersClose", "Close")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {rechnungenRowsForCustomer.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center text-sm text-slate-500">
                  {t(
                    "customersInvoicesFolderEmpty",
                    "No invoices for this customer number. Add them on the Invoices page."
                  )}
                </p>
              ) : (
                <ul className="space-y-2">
                  {rechnungenRowsForCustomer.map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5"
                    >
                      <FileText className="h-8 w-8 shrink-0 text-amber-600/90" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-800">
                          {t("customersInvoicesFilePdf", "Invoice_{nr}.pdf").replace("{nr}", r.rechn_nr)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatInvoiceListDateForPdf(r.r_datum, localeTag)} ·{" "}
                          {formatRechnungsbetrag(r.betrag_cent)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => openInvoicePdfInBrowser(r)}
                        className="shrink-0 rounded-lg px-2 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50"
                      >
                        {t("customersInvoicesViewPdf", "Open PDF")}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
