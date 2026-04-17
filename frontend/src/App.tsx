import { lazy, Suspense, useState, useEffect, useLayoutEffect } from "react";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { AppRouteFallback } from "./components/AppRouteFallback";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { PresenceReporter } from "./components/PresenceReporter";
import { TimetableFollowUpDueWatcher } from "./components/TimetableFollowUpDueWatcher";

const DynamicDashboard = lazy(() =>
  import("./pages/DynamicDashboard").then((m) => ({ default: m.DynamicDashboard })),
);
const CustomersPage = lazy(() =>
  import("./pages/CustomersPage").then((m) => ({ default: m.CustomersPage })),
);
const AngebotePage = lazy(() =>
  import("./pages/AngebotePage").then((m) => ({ default: m.AngebotePage })),
);
const AnfragenPage = lazy(() =>
  import("./pages/AnfragenPage").then((m) => ({ default: m.AnfragenPage })),
);
const VerkaufterBestandPage = lazy(() =>
  import("./pages/VerkaufterBestandPage").then((m) => ({ default: m.VerkaufterBestandPage })),
);
const BestandPage = lazy(() =>
  import("./pages/BestandPage").then((m) => ({ default: m.BestandPage })),
);
const AbholauftraegePage = lazy(() =>
  import("./pages/AbholauftraegePage").then((m) => ({ default: m.AbholauftraegePage })),
);
const KennzeichenSuchePage = lazy(() =>
  import("./pages/KennzeichenSuchePage").then((m) => ({ default: m.KennzeichenSuchePage })),
);
const DoppelteKundenPage = lazy(() =>
  import("./pages/DoppelteKundenPage").then((m) => ({ default: m.DoppelteKundenPage })),
);
const RechnungenPage = lazy(() =>
  import("./pages/RechnungenPage").then((m) => ({ default: m.RechnungenPage })),
);
const B2BPortalPage = lazy(() =>
  import("./pages/B2BPortalPage").then((m) => ({ default: m.B2BPortalPage })),
);
const HrmPage = lazy(() => import("./pages/HrmPage").then((m) => ({ default: m.HrmPage })));
const OnGroundTeamPage = lazy(() =>
  import("./pages/OnGroundTeamPage").then((m) => ({ default: m.OnGroundTeamPage })),
);
const SettingsPage = lazy(() =>
  import("./pages/SettingsPage").then((m) => ({ default: m.SettingsPage })),
);
const ChatPage = lazy(() => import("./pages/ChatPage").then((m) => ({ default: m.ChatPage })));
const TimetablePage = lazy(() =>
  import("./pages/timetable").then((m) => ({ default: m.TimetablePage })),
);
import { hydrateAppFontFamilyFromStorage } from "./common/utils/appFontFamily";
import { hydrateAppFontScaleFromStorage } from "./common/utils/appFontScale";
import { useAuth, setReturnHash } from "./contexts/AuthContext";
import { useLanguage } from "./contexts/LanguageContext";
import type { DepartmentArea } from "./types/departmentArea";

function getRouteFromHash(): string {
  const hash = window.location.hash.slice(1);
  const pathOnly = hash.split("?")[0] ?? "";
  if (pathOnly.startsWith("/")) return pathOnly.slice(1);
  return pathOnly || "/";
}

/** Same Kunden page for Sales, Purchase, Werkstatt, Waschanlage */
const CUSTOMER_PAGE_ROUTES = new Set([
  "sales/kunden",
  "purchase/kunden",
  "werkstatt/kunden",
  "waschanlage/kunden",
  "waschanlage/kundenverwaltung",
]);
const ANGEBOTE_PAGE_ROUTES = new Set([
  "sales/angebote",
  "purchase/angebote",
  "werkstatt/angebote",
]);
const ANFRAGEN_PAGE_ROUTES = new Set([
  "sales/anfragen",
  "purchase/anfragen",
  "werkstatt/anfragen",
]);
const BESTAND_ROUTES = new Set([
  "sales/bestand",
  "purchase/bestand",
  "werkstatt/bestand",
]);
const VERKAUFTER_BESTAND_ROUTES = new Set([
  "sales/verkaufter-bestand",
  "purchase/verkaufter-bestand",
  "werkstatt/verkaufter-bestand",
]);
const ABHOLAUFTRAEGE_ROUTES = new Set([
  "sales/abholauftraege",
  "purchase/abholauftraege",
  "werkstatt/abholauftraege",
]);
const KENNZEICHEN_SUCHEN_ROUTES = new Set([
  "sales/kennzeichen-suchen",
  "purchase/kennzeichen-suchen",
]);
const DOPPELTE_KUNDEN_ROUTES = new Set([
  "sales/doppelte-kunden",
  "purchase/doppelte-kunden",
  "werkstatt/doppelte-kunden",
  "waschanlage/doppelte-kunden",
]);
const RECHNUNGEN_ROUTES = new Set([
  "sales/rechnungen",
  "purchase/rechnungen",
  "werkstatt/rechnungen",
  "waschanlage/rechnungen",
]);
const HRM_PAGE_ROUTES = new Set([
  "hrm/mitarbeiter",
  "hrm/anwesenheit",
  "hrm/gehalt",
  "hrm/rollen-rechte",
]);
const TIMETABLE_ROUTES = new Set(["purchase/kalender", "purchase/timetable"]);

const ON_GROUND_TEAM_ROUTES = new Set([
  "on-ground-team/team",
  "on-ground-team/fahrer",
  "on-ground-team/tasks",
  "on-ground-team/checklists",
  "on-ground-team/schedule",
  "on-ground-team/reports",
]);

const PUBLIC_ROUTES = new Set(["login", "signup", "b2b-portal"]);

const SHARED_SALES_PURCHASE_TAILS = new Set([
  "kunden",
  "doppelte-kunden",
  "bestand",
  "angebote",
  "anfragen",
  "verkaufter-bestand",
  "abholauftraege",
  "kennzeichen-suchen",
  "rechnungen",
  "auswertungen",
]);

function canonicalPageRoute(route: string): string {
  if (!route.startsWith("purchase/")) return route;
  const tail = route.slice("purchase/".length);
  if (SHARED_SALES_PURCHASE_TAILS.has(tail)) return `sales/${tail}`;
  return route;
}

function customerDepartmentFromRoute(route: string): DepartmentArea | undefined {
  if (route.startsWith("sales/")) return "sales";
  if (route.startsWith("purchase/")) return "purchase";
  if (route.startsWith("werkstatt/")) return "werkstatt";
  if (route.startsWith("waschanlage/")) return "waschanlage";
  return undefined;
}

function hrmSectionFromRoute(route: string): "mitarbeiter" | "anwesenheit" | "gehalt" | "rollen" {
  if (route === "hrm/anwesenheit") return "anwesenheit";
  if (route === "hrm/gehalt") return "gehalt";
  if (route === "hrm/rollen-rechte") return "rollen";
  return "mitarbeiter";
}

function ogtSectionFromRoute(route: string): "team" | "fahrer" | "tasks" | "checklists" | "schedule" | "reports" {
  if (route === "on-ground-team/fahrer") return "fahrer";
  if (route === "on-ground-team/tasks") return "tasks";
  if (route === "on-ground-team/checklists") return "checklists";
  if (route === "on-ground-team/schedule") return "schedule";
  if (route === "on-ground-team/reports") return "reports";
  return "team";
}

export default function App() {
  const { isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const [route, setRoute] = useState(getRouteFromHash);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useLayoutEffect(() => {
    hydrateAppFontScaleFromStorage();
    hydrateAppFontFamilyFromStorage();
  }, []);

  useEffect(() => {
    const onHashChange = () => {
      setRoute(getRouteFromHash());
      setSidebarOpen(false);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const isPublic = PUBLIC_ROUTES.has(route);

  useLayoutEffect(() => {
    if (isAuthenticated && (route === "login" || route === "signup")) {
      window.location.replace("#/");
    }
  }, [isAuthenticated, route]);

  useLayoutEffect(() => {
    if (!isAuthenticated && !isPublic) {
      setReturnHash(window.location.hash || "#/");
      window.location.replace("#/login");
    }
  }, [isAuthenticated, isPublic, route]);

  if (route === "login") {
    return <LoginPage />;
  }
  if (route === "signup") {
    return <SignupPage />;
  }
  if (route === "b2b-portal") {
    return (
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-slate-50">
            <AppRouteFallback />
          </div>
        }
      >
        <B2BPortalPage />
      </Suspense>
    );
  }
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm text-slate-500">
        {t("appRedirecting", "Weiterleitung…")}
      </div>
    );
  }

  const pageRoute = canonicalPageRoute(route);
  const isCustomers = CUSTOMER_PAGE_ROUTES.has(pageRoute) || CUSTOMER_PAGE_ROUTES.has(route);
  const isAngebote = ANGEBOTE_PAGE_ROUTES.has(pageRoute) || ANGEBOTE_PAGE_ROUTES.has(route);
  const isAnfragen = ANFRAGEN_PAGE_ROUTES.has(pageRoute) || ANFRAGEN_PAGE_ROUTES.has(route);
  const isBestand = BESTAND_ROUTES.has(pageRoute) || BESTAND_ROUTES.has(route);
  const isVerkaufterBestand = VERKAUFTER_BESTAND_ROUTES.has(pageRoute) || VERKAUFTER_BESTAND_ROUTES.has(route);
  const isAbholauftraege = ABHOLAUFTRAEGE_ROUTES.has(pageRoute) || ABHOLAUFTRAEGE_ROUTES.has(route);
  const isKennzeichenSuche = KENNZEICHEN_SUCHEN_ROUTES.has(pageRoute) || KENNZEICHEN_SUCHEN_ROUTES.has(route);
  const isDoppelteKunden = DOPPELTE_KUNDEN_ROUTES.has(pageRoute) || DOPPELTE_KUNDEN_ROUTES.has(route);
  const isRechnungen = RECHNUNGEN_ROUTES.has(pageRoute) || RECHNUNGEN_ROUTES.has(route);
  const isHrm = HRM_PAGE_ROUTES.has(pageRoute) || HRM_PAGE_ROUTES.has(route);
  const isOnGroundTeam = ON_GROUND_TEAM_ROUTES.has(route);
  const isTimetable = TIMETABLE_ROUTES.has(route);

  return (
    <div className="min-h-screen font-sans">
      <PresenceReporter />
      <TimetableFollowUpDueWatcher />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-h-screen min-w-0 flex-col md:pl-[260px]">
        <Header
          onMenuClick={() => setSidebarOpen((v) => !v)}
          customersVibe={isCustomers}
        />
        <main className="flex min-h-0 flex-1 flex-col">
          <Suspense fallback={<AppRouteFallback />}>
            {isBestand ? (
              <BestandPage department={customerDepartmentFromRoute(route)} />
            ) : isCustomers ? (
              <CustomersPage department={customerDepartmentFromRoute(route)} />
            ) : isAngebote ? (
              <AngebotePage department={customerDepartmentFromRoute(route)} />
            ) : isAnfragen ? (
              <AnfragenPage department={customerDepartmentFromRoute(route)} />
            ) : isVerkaufterBestand ? (
              <VerkaufterBestandPage department={customerDepartmentFromRoute(route)} />
            ) : isAbholauftraege ? (
              <AbholauftraegePage department={customerDepartmentFromRoute(route)} />
            ) : isKennzeichenSuche ? (
              <KennzeichenSuchePage department={customerDepartmentFromRoute(route)} />
            ) : isDoppelteKunden ? (
              <DoppelteKundenPage department={customerDepartmentFromRoute(route)} />
            ) : isRechnungen ? (
              <RechnungenPage department={customerDepartmentFromRoute(route)} />
            ) : isTimetable ? (
              <TimetablePage department={customerDepartmentFromRoute(route)} />
            ) : isHrm ? (
              <HrmPage section={hrmSectionFromRoute(route)} />
            ) : isOnGroundTeam ? (
              <OnGroundTeamPage section={ogtSectionFromRoute(route)} />
            ) : route === "settings" || route === "profile" ? (
              <SettingsPage />
            ) : route === "chat" ? (
              <ChatPage />
            ) : (
              <DynamicDashboard />
            )}
          </Suspense>
        </main>
      </div>
    </div>
  );
}
