import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Bell,
  CheckCheck,
  ClipboardList,
  MessageCircle,
  Menu,
  Settings,
  Search,
  LogOut,
  User,
  ChevronDown,
  X,
  Truck,
  FileText,
  Users,
  Receipt,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { useProfileAvatarDataUrl } from "../hooks/useProfileAvatar";
import { resolveDisplayName, useProfileExtraSettings } from "../hooks/useProfileExtraSettings";
import { useChatSync } from "../hooks/useChatSync";
import { getUnreadTotalForUser } from "../store/chatStore";
import {
  getNotificationsForUser,
  getUnreadCountForUser,
  markAllReadForUser,
  markNotificationRead,
  TASK_NOTIF_EVENT,
  type TaskNotification,
} from "../store/taskNotifications";
import { useGlobalSearch, type GlobalSearchResult, type SearchCategory } from "../hooks/useGlobalSearch";

const CATEGORY_META: Record<SearchCategory, { labelKey: string; labelFallback: string; icon: React.ReactNode; color: string }> = {
  kunden:    { labelKey: "searchCatKunden",    labelFallback: "Customers",  icon: <Users className="h-3.5 w-3.5" />,       color: "text-blue-600 bg-blue-50" },
  bestand:   { labelKey: "searchCatBestand",   labelFallback: "Inventory",  icon: <Truck className="h-3.5 w-3.5" />,       color: "text-violet-600 bg-violet-50" },
  angebote:  { labelKey: "searchCatAngebote",  labelFallback: "Offers",     icon: <FileText className="h-3.5 w-3.5" />,    color: "text-emerald-600 bg-emerald-50" },
  anfragen:  { labelKey: "searchCatAnfragen",  labelFallback: "Inquiries",  icon: <ClipboardList className="h-3.5 w-3.5" />, color: "text-amber-600 bg-amber-50" },
  rechnungen:{ labelKey: "searchCatRechnungen",labelFallback: "Invoices",   icon: <Receipt className="h-3.5 w-3.5" />,     color: "text-rose-600 bg-rose-50" },
}

const CATEGORY_ORDER: SearchCategory[] = ["kunden", "bestand", "angebote", "anfragen", "rechnungen"]

function highlight(text: string, query: string): React.ReactNode {
  if (!query) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-100 text-yellow-900 rounded-sm not-italic font-semibold">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  )
}

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);
  const [notifTick, setNotifTick] = useState(0);

  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const searchResults = useGlobalSearch(searchQuery, dbTick);

  const flatResults = useMemo<GlobalSearchResult[]>(() => {
    return CATEGORY_ORDER.flatMap((cat) => searchResults[cat])
  }, [searchResults])

  const notifications: TaskNotification[] = useMemo(
    () => (user ? getNotificationsForUser(user.email) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, notifTick]
  );
  const unreadCount = useMemo(
    () => (user ? getUnreadCountForUser(user.email) : 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, notifTick]
  );

  useEffect(() => {
    const onDbChanged = () => setDbTick((tick) => tick + 1);
    const events = [
      "dema-kunden-db-changed",
      "dema-bestand-db-changed",
      "dema-angebote-db-changed",
      "dema-anfragen-db-changed",
      "dema-rechnungen-db-changed",
    ]
    events.forEach((ev) => window.addEventListener(ev, onDbChanged))
    return () => events.forEach((ev) => window.removeEventListener(ev, onDbChanged))
  }, []);

  useEffect(() => {
    const refresh = () => setNotifTick((v) => v + 1);
    window.addEventListener(TASK_NOTIF_EVENT, refresh);
    return () => window.removeEventListener(TASK_NOTIF_EVENT, refresh);
  }, []);

  useEffect(() => {
    if (!searchOpen) return
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false)
        setActiveIndex(-1)
      }
    }
    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("touchstart", onPointerDown)
    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("touchstart", onPointerDown)
    }
  }, [searchOpen])

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

  useEffect(() => {
    if (!notifPanelOpen) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const el = notifRef.current;
      if (el && !el.contains(e.target as Node)) setNotifPanelOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNotifPanelOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [notifPanelOpen]);

  const navigateToResult = useCallback((result: GlobalSearchResult) => {
    sessionStorage.setItem(result.storageKey, result.storageValue)
    setSearchQuery("")
    setSearchOpen(false)
    setActiveIndex(-1)
    window.location.hash = result.navigateTo
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!searchOpen || flatResults.length === 0) {
      if (e.key === "Enter" && searchQuery.trim().length >= 2) {
        sessionStorage.setItem("dema-search-q", searchQuery.trim())
        setSearchQuery("")
        setSearchOpen(false)
        window.location.hash = "#/sales/kunden"
      }
      return
    }
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, flatResults.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, -1))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (activeIndex >= 0 && flatResults[activeIndex]) {
        navigateToResult(flatResults[activeIndex])
      } else if (searchQuery.trim().length >= 2) {
        sessionStorage.setItem("dema-search-q", searchQuery.trim())
        setSearchQuery("")
        setSearchOpen(false)
        window.location.hash = "#/sales/kunden"
      }
    } else if (e.key === "Escape") {
      setSearchOpen(false)
      setActiveIndex(-1)
      inputRef.current?.blur()
    }
  }

  const showDropdown = searchOpen && searchQuery.trim().length >= 2;

  const openNotifPanel = () => {
    setNotifPanelOpen((v) => !v);
    setProfileMenuOpen(false);
  };

  const handleMarkAllRead = () => {
    if (user) {
      markAllReadForUser(user.email);
      setNotifTick((v) => v + 1);
    }
  };

  const handleMarkRead = (id: string) => {
    markNotificationRead(id);
    setNotifTick((v) => v + 1);
  };

  function formatRelativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t("relTimeJustNow", "Just now");
    if (mins < 60) return t("relTimeMins", "{n} min ago").replace("{n}", String(mins));
    const hours = Math.floor(mins / 60);
    if (hours < 24) return t("relTimeHours", "{n} hr ago").replace("{n}", String(hours));
    const days = Math.floor(hours / 24);
    return (days === 1 ? t("relTimeDay", "{n} day ago") : t("relTimeDays", "{n} days ago")).replace("{n}", String(days));
  }

  return (
    <header className="sticky top-0 z-30 flex h-[72px] items-center gap-2 border-b border-slate-200/60 bg-[#F4F7FE]/80 px-4 backdrop-blur-md sm:gap-4 sm:px-6">
      {/* Hamburger – mobile only */}
      <button
        type="button"
        onClick={onMenuClick}
        aria-label={t("headerOpenMenu", "Open menu")}
        className="shrink-0 rounded-xl p-2 text-slate-500 transition hover:bg-white hover:shadow-sm md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="relative mx-auto max-w-xl flex-1" ref={searchRef}>
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 z-10" />
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            setActiveIndex(-1)
            setSearchOpen(true)
          }}
          onFocus={() => setSearchOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={t("headerSearchPlaceholder", "Search customers, inventory, offers…")}
          autoComplete="off"
          className="h-11 w-full rounded-2xl border border-slate-200/80 bg-white pl-11 pr-4 text-sm text-slate-700 shadow-sm outline-none ring-blue-500/20 placeholder:text-slate-400 focus:border-blue-300 focus:ring-2"
        />

        {showDropdown && (
          <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xl shadow-slate-900/10">
            {searchResults.total === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <Search className="h-7 w-7 text-slate-300" />
                <p className="text-sm font-medium text-slate-500">{t("searchNoResults", "No results found")}</p>
                <p className="text-xs text-slate-400">
                  {t("searchNoResultsHint", "Try a different name, number, or keyword.")}
                </p>
              </div>
            ) : (
              <div className="max-h-[420px] overflow-y-auto py-1.5">
                {CATEGORY_ORDER.map((cat) => {
                  const items = searchResults[cat]
                  if (items.length === 0) return null
                  const meta = CATEGORY_META[cat]
                  return (
                    <div key={cat}>
                      <div className="flex items-center gap-2 px-4 py-2">
                        <span className={`flex h-5 w-5 items-center justify-center rounded-md ${meta.color}`}>
                          {meta.icon}
                        </span>
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          {t(meta.labelKey, meta.labelFallback)}
                        </span>
                      </div>
                      {items.map((result) => {
                        const globalIdx = flatResults.indexOf(result)
                        const isActive = globalIdx === activeIndex
                        return (
                          <button
                            key={result.id}
                            type="button"
                            onMouseEnter={() => setActiveIndex(globalIdx)}
                            onClick={() => navigateToResult(result)}
                            className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                              isActive ? "bg-blue-50" : "hover:bg-slate-50"
                            }`}
                          >
                            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs ${meta.color}`}>
                              {meta.icon}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium text-slate-800">
                                {highlight(result.primary, searchQuery)}
                              </span>
                              {result.secondary && (
                                <span className="block truncate text-xs text-slate-400">
                                  {highlight(result.secondary, searchQuery)}
                                </span>
                              )}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            )}
            <div className="border-t border-slate-100 px-4 py-2">
              <p className="text-[11px] text-slate-400">
                {t("searchFooterHint", "↑↓ navigate · Enter to select · Esc to close")}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {/* Notification bell */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={openNotifPanel}
            aria-label={t("notifAriaLabel", "Notifications")}
            className="relative rounded-xl p-2.5 text-slate-500 transition hover:bg-white hover:shadow-sm"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {notifPanelOpen && (
            <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[360px] overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xl shadow-slate-900/10">
              {/* Panel header */}
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-semibold text-slate-800">
                    {t("notifTitle", "Task Notifications")}
                  </span>
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-700">
                      {unreadCount} {t("notifNew", "new")}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                      title={t("notifMarkAllReadTitle", "Mark all as read")}
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                      {t("notifMarkAllRead", "Mark all read")}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setNotifPanelOpen(false)}
                    className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Notification list */}
              <div className="max-h-[380px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-10 text-center">
                    <Bell className="h-8 w-8 text-slate-300" />
                    <p className="text-sm font-medium text-slate-500">{t("notifEmpty", "No notifications")}</p>
                    <p className="text-xs text-slate-400">
                      {t("notifEmptyHint", "When someone assigns you a task, it will appear here.")}
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {notifications.map((n) => (
                      <li
                        key={n.id}
                        className={`flex items-start gap-3 px-4 py-3 transition-colors ${
                          n.read ? "bg-white" : "bg-blue-50/40"
                        }`}
                      >
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                          <ClipboardList className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium leading-snug text-slate-800">
                            <span className="text-blue-700">{n.assignedByName}</span>{" "}
                            {t("notifAssigned", "assigned you a task")}
                          </p>
                          <p className="mt-0.5 truncate text-xs font-semibold text-slate-600">
                            „{n.taskTitle}"
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-400">
                            {formatRelativeTime(n.timestamp)}
                          </p>
                        </div>
                        {!n.read && (
                          <button
                            type="button"
                            onClick={() => handleMarkRead(n.id)}
                            className="mt-0.5 shrink-0 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                            title={t("notifMarkRead", "Mark as read")}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {notifications.length > 0 && (
                <div className="border-t border-slate-100 px-4 py-2.5 text-center">
                  <p className="text-[11px] text-slate-400">
                    {t("notifFooter", "All notifications refer to tasks assigned in the dashboard.")}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

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
          onClick={() => {
            setProfileMenuOpen((v) => !v);
            setNotifPanelOpen(false);
          }}
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
