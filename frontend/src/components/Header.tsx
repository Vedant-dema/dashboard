import { useEffect, useMemo, useState } from "react";
import { Bell, MessageCircle, Settings, Search, LogOut } from "lucide-react";
import { loadKundenDb } from "../store/kundenStore";
import { getQuickSearchSuggestions } from "../store/customerFieldSuggestions";
import { SuggestTextInput } from "./SuggestTextInput";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";

export function Header() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const [dbTick, setDbTick] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const db = useMemo(() => loadKundenDb(), [dbTick]);
  const quickSearchSuggestions = useMemo(() => getQuickSearchSuggestions(db), [db]);

  useEffect(() => {
    const onDbChanged = () => setDbTick((t) => t + 1);
    window.addEventListener("dema-kunden-db-changed", onDbChanged);
    return () => window.removeEventListener("dema-kunden-db-changed", onDbChanged);
  }, []);

  const handleSearchSubmit = (value: string) => {
    const q = value.trim();
    if (!q) return;
    sessionStorage.setItem("dema-search-q", q);
    setSearchQuery("");
    window.location.hash = "#/sales/kunden";
  };

  return (
    <header className="sticky top-0 z-30 flex h-[72px] items-center gap-4 border-b border-slate-200/60 bg-[#F4F7FE]/80 px-6 backdrop-blur-md">
      <div className="relative mx-auto max-w-xl flex-1">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <SuggestTextInput
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSearchSubmit(searchQuery);
          }}
          placeholder={t("headerSearchPlaceholder", "Suchen… Kunden-Nr., Firmenname (Vorschläge aus Datenbank)")}
          suggestions={quickSearchSuggestions}
          title={t("headerSearchTitle", "Gespeicherte Kunden-Nr. und Firmennamen")}
          className="h-11 w-full rounded-2xl border border-slate-200/80 bg-white pl-11 pr-4 text-sm text-slate-700 shadow-sm outline-none ring-blue-500/20 placeholder:text-slate-400 focus:border-blue-300 focus:ring-2"
        />
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          className="relative rounded-xl p-2.5 text-slate-500 transition hover:bg-white hover:shadow-sm"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
            4
          </span>
        </button>
        <button
          type="button"
          className="relative rounded-xl p-2.5 text-slate-500 transition hover:bg-white hover:shadow-sm"
        >
          <MessageCircle className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-white">
            5
          </span>
        </button>
        <button
          type="button"
          className="rounded-xl p-2.5 text-slate-500 transition hover:bg-white hover:shadow-sm"
        >
          <Settings className="h-5 w-5" />
        </button>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200/60 bg-white px-3 py-2 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white ring-2 ring-white">
            {(user?.name ?? "")
              .split(/\s+/)
              .filter(Boolean)
              .map((p) => p[0])
              .join("")
              .slice(0, 2)
              .toUpperCase() || "?"}
          </div>
          <div className="hidden text-left sm:block">
            <p className="text-sm font-semibold text-slate-800">{user?.name ?? t("commonUser", "Benutzer")}</p>
            <p className="max-w-[140px] truncate text-xs text-slate-500" title={user?.email}>
              {user?.email}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={logout}
          title={t("headerLogout", "Abmelden")}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200/80 bg-white text-slate-500 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
