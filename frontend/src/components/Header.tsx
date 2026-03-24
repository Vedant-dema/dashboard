import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, MessageCircle, Settings, Search, LogOut, User, ChevronDown } from "lucide-react";
import { loadKundenDb } from "../store/kundenStore";
import { getQuickSearchSuggestions } from "../store/customerFieldSuggestions";
import { SuggestTextInput } from "./SuggestTextInput";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { useProfileAvatarDataUrl } from "../hooks/useProfileAvatar";
import { resolveDisplayName, useProfileExtraSettings } from "../hooks/useProfileExtraSettings";
import { useChatSync } from "../hooks/useChatSync";
import { getUnreadTotalForUser } from "../store/chatStore";

export function Header() {
  const { user, logout } = useAuth();
  useChatSync();
  const chatUnread = user ? getUnreadTotalForUser(user.email) : 0;
  const avatarDataUrl = useProfileAvatarDataUrl();
  const profileExtra = useProfileExtraSettings();
  const { t } = useLanguage();
  const displayName =
    resolveDisplayName(user?.email, user?.name, profileExtra) || t("commonUser", "Benutzer");
  const [dbTick, setDbTick] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const db = useMemo(() => loadKundenDb(), [dbTick]);
  const quickSearchSuggestions = useMemo(() => getQuickSearchSuggestions(db), [db]);

  useEffect(() => {
    const onDbChanged = () => setDbTick((tick) => tick + 1);
    window.addEventListener("dema-kunden-db-changed", onDbChanged);
    return () => window.removeEventListener("dema-kunden-db-changed", onDbChanged);
  }, []);

  useEffect(() => {
    if (!profileMenuOpen) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const el = profileMenuRef.current;
      if (el && !el.contains(e.target as Node)) setProfileMenuOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setProfileMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [profileMenuOpen]);

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
        <a
          href="#/chat"
          title={t("headerChat", "Chat")}
          className="relative rounded-xl p-2.5 text-slate-500 transition hover:bg-white hover:shadow-sm"
        >
          <MessageCircle className="h-5 w-5" />
          {chatUnread > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-white">
              {chatUnread > 99 ? "99+" : chatUnread}
            </span>
          )}
        </a>
        <a
          href="#/settings"
          title={t("navSettings", "Einstellungen")}
          className="rounded-xl p-2.5 text-slate-500 transition hover:bg-white hover:shadow-sm"
        >
          <Settings className="h-5 w-5" />
        </a>
      </div>

      <div className="relative shrink-0" ref={profileMenuRef}>
        <button
          type="button"
          onClick={() => setProfileMenuOpen((v) => !v)}
          aria-expanded={profileMenuOpen}
          aria-haspopup="menu"
          className="flex items-center gap-3 rounded-2xl border border-slate-200/60 bg-white px-3 py-2 text-left shadow-sm transition hover:border-slate-300 hover:bg-slate-50/80"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white ring-2 ring-white">
            {avatarDataUrl ? (
              <img src={avatarDataUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              displayName
                .split(/\s+/)
                .filter(Boolean)
                .map((p) => p[0])
                .join("")
                .slice(0, 2)
                .toUpperCase() || "?"
            )}
          </div>
          <div className="hidden min-w-0 text-left sm:block">
            <p className="text-sm font-semibold text-slate-800">{displayName}</p>
            <p className="max-w-[160px] truncate text-xs text-slate-500" title={user?.email}>
              {user?.email}
            </p>
          </div>
          <ChevronDown
            className={`hidden h-4 w-4 shrink-0 text-slate-400 transition sm:block ${profileMenuOpen ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>

        {profileMenuOpen && (
          <div
            role="menu"
            className="absolute right-0 top-[calc(100%+8px)] z-50 min-w-[220px] rounded-2xl border border-slate-200/80 bg-white py-1.5 shadow-xl shadow-slate-900/10"
          >
            <a
              href="#/settings"
              role="menuitem"
              className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              onClick={() => setProfileMenuOpen(false)}
            >
              <User className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
              {t("headerAccountInfo", "Account info")}
            </a>
            <div className="my-1 border-t border-slate-100" role="separator" />
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
              onClick={() => {
                setProfileMenuOpen(false);
                logout();
              }}
            >
              <LogOut className="h-4 w-4 shrink-0" aria-hidden />
              {t("headerLogout", "Abmelden")}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
