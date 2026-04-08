import {
  LayoutDashboard,
  Users,
  MessageSquare,
  FileText,
  Calendar,
  PackageCheck,
  CalendarClock,
  Wallet,
  Droplets,
  ClipboardList,
  Settings,
  ChevronDown,
  Search,
  Receipt,
  BarChart3,
  Store,
  BookOpen,
  Wrench,
  Building2,
  Inbox,
  Landmark,
  Truck,
  Copy,
  Navigation,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useLanguage } from "../contexts/LanguageContext";

type NavItem = { label: string; icon?: ReactNode; path?: string };

function getRouteFromHash(): string {
  const hash = window.location.hash.slice(1);
  const pathOnly = hash.split("?")[0] ?? "";
  if (pathOnly.startsWith("/")) return pathOnly.slice(1);
  return pathOnly || "/";
}

function NavGroup({
  title,
  items,
  activeRoute,
  defaultOpen = true,
}: {
  title: string;
  items: NavItem[];
  activeRoute: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-400 hover:bg-slate-50"
      >
        {title}
        <ChevronDown
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <ul className="mt-0.5 space-y-0.5 pl-1">
          {items.map((item) => (
            <li key={item.path ?? item.label}>
              {(() => {
                const active = Boolean(item.path && item.path === activeRoute);
                return (
              <a
                href={item.path ? `#/${item.path}` : "#"}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-blue-50 text-blue-700 ring-1 ring-blue-100"
                    : "text-slate-600 hover:bg-blue-50 hover:text-blue-700"
                }`}
              >
                <span className={active ? "text-blue-600" : "text-slate-400"}>{item.icon}</span>
                {item.label}
              </a>
                );
              })()}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Sidebar({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const activeRoute = getRouteFromHash();
  const { t } = useLanguage();

  const handleNavClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("a")) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 z-30 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 md:hidden ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      <aside
        className={`fixed left-0 top-0 z-40 flex h-screen w-[260px] flex-col border-r border-slate-200/80 bg-white/90 px-4 py-6 shadow-sm backdrop-blur-md transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
      <div className="mb-8 flex w-full min-w-0 justify-start">
        <a
          href="#/"
          className="block min-w-0 max-w-full outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-blue-500"
          onClick={onClose}
        >
          <img
            src="/dema-logo.png"
            alt="DEMA"
            className="dema-sidebar-logo max-h-[56px] w-auto max-w-full object-contain object-left"
          />
        </a>
      </div>

      <nav className="flex-1 overflow-y-auto pr-1" onClick={handleNavClick}>
        <a
          href="#/"
          className={`mb-3 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold shadow-sm ring-1 ${
            activeRoute === "/"
              ? "bg-blue-50 text-blue-600 ring-blue-100"
              : "bg-white text-slate-700 ring-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:ring-blue-100"
          }`}
        >
          <LayoutDashboard className="h-5 w-5" />
          {t("navDashboard", "Dashboard")}
        </a>

        <a
          href="#/b2b-portal"
          className={`mb-3 flex items-center gap-3 rounded-xl border px-3 py-3 text-sm font-semibold shadow-sm transition ${
            activeRoute === "b2b-portal"
              ? "border-violet-200 bg-violet-50/90 text-violet-800"
              : "border-slate-200/90 bg-white text-slate-800 hover:border-violet-200 hover:bg-violet-50/80 hover:text-violet-800"
          }`}
        >
          <Store className="h-5 w-5 text-violet-600" />
          {t("navB2bPortal", "B2B Portal")}
        </a>

        <NavGroup
          title={t("sidebarSales", "Sales")}
          activeRoute={activeRoute}
          items={[
            { label: t("commonCustomers", "Kunden"), path: "sales/kunden", icon: <Users className="h-4 w-4" /> },
            {
              label: t("navDuplicateCustomers", "Doppelte Kunden"),
              path: "sales/doppelte-kunden",
              icon: <Copy className="h-4 w-4" />,
            },
            { label: t("commonInventory", "Bestand"), path: "sales/bestand", icon: <PackageCheck className="h-4 w-4" /> },
            { label: t("commonOffers", "Angebote"), path: "sales/angebote", icon: <FileText className="h-4 w-4" /> },
            { label: t("commonInquiries", "Anfragen"), path: "sales/anfragen", icon: <MessageSquare className="h-4 w-4" /> },
            { label: t("sidebarSoldInventory", "Verkaufter Bestand"), path: "sales/verkaufter-bestand", icon: <PackageCheck className="h-4 w-4" /> },
            { label: t("sidebarPickupOrders", "Abholaufträge"), path: "sales/abholauftraege", icon: <ClipboardList className="h-4 w-4" /> },
            { label: t("sidebarPlateSearch", "Kennzeichen Suchen"), path: "sales/kennzeichen-suchen", icon: <Search className="h-4 w-4" /> },
            { label: t("commonInvoices", "Rechnungen"), path: "sales/rechnungen", icon: <Receipt className="h-4 w-4" /> },
            { label: t("commonReports", "Auswertungen"), path: "sales/auswertungen", icon: <BarChart3 className="h-4 w-4" /> },
            { label: t("sidebarCreditNotes", "Gutschriften"), path: "sales/gutschriften", icon: <Receipt className="h-4 w-4" /> },
          ]}
        />

        <NavGroup
          title={t("sidebarPurchase", "Purchase")}
          activeRoute={activeRoute}
          items={[
            { label: t("commonCustomers", "Kunden"), path: "purchase/kunden", icon: <Users className="h-4 w-4" /> },
            {
              label: t("navDuplicateCustomers", "Doppelte Kunden"),
              path: "purchase/doppelte-kunden",
              icon: <Copy className="h-4 w-4" />,
            },
            { label: t("commonInventory", "Bestand"), path: "purchase/bestand", icon: <PackageCheck className="h-4 w-4" /> },
            { label: t("commonOffers", "Angebote"), path: "purchase/angebote", icon: <FileText className="h-4 w-4" /> },
            { label: t("commonCalendar", "Kalender"), path: "purchase/kalender", icon: <Calendar className="h-4 w-4" /> },
            { label: t("commonInquiries", "Anfragen"), path: "purchase/anfragen", icon: <MessageSquare className="h-4 w-4" /> },
            { label: t("sidebarSoldInventory", "Verkaufter Bestand"), path: "purchase/verkaufter-bestand", icon: <PackageCheck className="h-4 w-4" /> },
            { label: t("sidebarPickupOrders", "Abholaufträge"), path: "purchase/abholauftraege", icon: <ClipboardList className="h-4 w-4" /> },
            { label: t("sidebarPlateSearch", "Kennzeichen Suchen"), path: "purchase/kennzeichen-suchen", icon: <Search className="h-4 w-4" /> },
            { label: t("commonInvoices", "Rechnungen"), path: "purchase/rechnungen", icon: <Receipt className="h-4 w-4" /> },
            { label: t("sidebarPickupDeliveryCalendar", "Kalender: Abholung & Lieferung"), path: "purchase/abholung-lieferung", icon: <CalendarClock className="h-4 w-4" /> },
            { label: t("commonReports", "Auswertungen"), path: "purchase/auswertungen", icon: <BarChart3 className="h-4 w-4" /> },
          ]}
        />

        <NavGroup
          title={t("sidebarWorkshop", "Werkstatt")}
          activeRoute={activeRoute}
          items={[
            { label: t("sidebarOrders", "Orders"), path: "werkstatt/auftraege", icon: <ClipboardList className="h-4 w-4" /> },
            { label: t("commonCustomers", "Kunden"), path: "werkstatt/kunden", icon: <Users className="h-4 w-4" /> },
            {
              label: t("navDuplicateCustomers", "Doppelte Kunden"),
              path: "werkstatt/doppelte-kunden",
              icon: <Copy className="h-4 w-4" />,
            },
            { label: t("commonInquiries", "Anfragen"), path: "werkstatt/anfragen", icon: <MessageSquare className="h-4 w-4" /> },
            { label: t("sidebarArticleIntake", "Goods receipt"), path: "werkstatt/artikeleingang", icon: <Inbox className="h-4 w-4" /> },
            { label: t("commonInventory", "Bestand"), path: "werkstatt/bestand", icon: <PackageCheck className="h-4 w-4" /> },
            { label: t("sidebarArticleCatalog", "Parts catalog"), path: "werkstatt/artikelkatalog", icon: <BookOpen className="h-4 w-4" /> },
            { label: t("sidebarServiceCatalog", "Service catalog"), path: "werkstatt/leistungskatalog", icon: <Wrench className="h-4 w-4" /> },
            { label: t("sidebarThirdPartyCatalog", "Subcontractor services"), path: "werkstatt/fremdleistungskatalog", icon: <Building2 className="h-4 w-4" /> },
            { label: t("commonInvoices", "Rechnungen"), path: "werkstatt/rechnungen", icon: <Receipt className="h-4 w-4" /> },
            { label: t("sidebarInvoicesOpen", "Open invoices"), path: "werkstatt/rechnungen-offen", icon: <Receipt className="h-4 w-4" /> },
            { label: t("sidebarInvoicesPaid", "Paid invoices"), path: "werkstatt/rechnungen-bezahlt", icon: <Receipt className="h-4 w-4" /> },
            { label: t("sidebarCashDesk", "Kasse"), path: "werkstatt/kasse", icon: <Wallet className="h-4 w-4" /> },
            { label: t("sidebarAccounting", "Accounting"), path: "werkstatt/buchhaltung", icon: <Landmark className="h-4 w-4" /> },
            { label: t("sidebarPickupDeliveryCalendar", "Kalender: Abholung & Lieferung"), path: "werkstatt/kalender", icon: <CalendarClock className="h-4 w-4" /> },
            { label: t("sidebarPickupOrders", "Abholaufträge"), path: "werkstatt/abholauftraege", icon: <ClipboardList className="h-4 w-4" /> },
            { label: t("commonOffers", "Angebote"), path: "werkstatt/angebote", icon: <FileText className="h-4 w-4" /> },
            { label: t("sidebarSoldInventory", "Verkaufter Bestand"), path: "werkstatt/verkaufter-bestand", icon: <PackageCheck className="h-4 w-4" /> },
            { label: t("commonReports", "Auswertungen"), path: "werkstatt/auswertungen", icon: <BarChart3 className="h-4 w-4" /> },
            { label: t("sidebarSuppliers", "Suppliers"), path: "werkstatt/lieferanten", icon: <Truck className="h-4 w-4" /> },
          ]}
        />

        <NavGroup
          title={t("sidebarCarWash", "Waschanlage")}
          activeRoute={activeRoute}
          items={[
            { label: t("sidebarWash", "Waschen"), path: "waschanlage/waschen", icon: <Droplets className="h-4 w-4" /> },
            { label: t("commonCustomers", "Kunden"), path: "waschanlage/kunden", icon: <Users className="h-4 w-4" /> },
            {
              label: t("navDuplicateCustomers", "Doppelte Kunden"),
              path: "waschanlage/doppelte-kunden",
              icon: <Copy className="h-4 w-4" />,
            },
            { label: t("sidebarOrders", "Aufträge"), path: "waschanlage/auftraege", icon: <ClipboardList className="h-4 w-4" /> },
            { label: t("commonInvoices", "Rechnungen"), path: "waschanlage/rechnungen", icon: <Receipt className="h-4 w-4" /> },
            { label: t("sidebarCashDesk", "Kasse"), path: "waschanlage/kasse", icon: <Wallet className="h-4 w-4" /> },
          ]}
        />

        <NavGroup
          title={t("sidebarHRM", "HRM")}
          activeRoute={activeRoute}
          items={[
            { label: t("sidebarEmployees", "Mitarbeiter"), path: "hrm/mitarbeiter", icon: <Users className="h-4 w-4" /> },
            { label: t("sidebarAttendance", "Anwesenheit"), path: "hrm/anwesenheit", icon: <Calendar className="h-4 w-4" /> },
            { label: t("sidebarSalary", "Gehalt"), path: "hrm/gehalt", icon: <Wallet className="h-4 w-4" /> },
            { label: t("sidebarRolesPermissions", "Rollen & Rechte"), path: "hrm/rollen-rechte", icon: <Settings className="h-4 w-4" /> },
          ]}
        />

        <NavGroup
          title={t("sidebarOnGroundTeam", "On Ground Team")}
          activeRoute={activeRoute}
          items={[
            { label: t("ogtSectionTeam", "Team"),     path: "on-ground-team/team",     icon: <Users className="h-4 w-4" />         },
            { label: t("ogtSectionFahrer", "Drivers"),  path: "on-ground-team/fahrer",   icon: <Truck className="h-4 w-4" />         },
            { label: t("ogtSectionTasks", "Tasks"),     path: "on-ground-team/tasks",    icon: <ClipboardList className="h-4 w-4" /> },
            { label: t("ogtSectionSchedule", "Schedule"), path: "on-ground-team/schedule", icon: <Navigation className="h-4 w-4" />  },
            { label: t("ogtSectionReports", "Reports"),  path: "on-ground-team/reports",  icon: <BarChart3 className="h-4 w-4" />   },
          ]}
        />
      </nav>

      <div className="mt-auto space-y-1 border-t border-slate-100 pt-4">
        <a
          href="#/settings"
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
            activeRoute === "settings" || activeRoute === "profile"
              ? "bg-blue-50 text-blue-700 ring-1 ring-blue-100"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Settings
            className={`h-5 w-5 ${
              activeRoute === "settings" || activeRoute === "profile"
                ? "text-blue-600"
                : "text-slate-400"
            }`}
          />
          {t("navSettings", "Einstellungen")}
        </a>
      </div>
    </aside>
    </>
  );
}
