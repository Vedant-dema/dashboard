import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  CheckCheck,
  ImagePlus,
  MessageCircle,
  Paperclip,
  Plus,
  Search,
  Send,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { listRegisteredUserProfiles } from "../auth/authStorage";
import { useChatSync } from "../hooks/useChatSync";
import {
  createGroupConversation,
  fileToChatAttachment,
  getOrCreateDirectConversation,
  getOutgoingMessageTick,
  loadChatState,
  markConversationRead,
  sendChatMessage,
  unreadForConversation,
  type ChatConversation,
  type ChatMessage,
} from "../store/chatStore";
import { getPresenceStatus } from "../store/chatPresence";
import { PresenceIndicator, PresenceIndicatorHeader } from "../components/PresenceIndicator";

function normEmail(e: string): string {
  return e.trim().toLowerCase();
}

function convDisplayTitle(conv: ChatConversation, me: string): string {
  if (conv.kind === "group") return conv.title;
  const n = normEmail(me);
  const other = conv.memberEmails.find((em) => normEmail(em) !== n);
  if (!other) return conv.title;
  return conv.memberNames[normEmail(other)] || other;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";
}

function formatTime(iso: string, locale: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const sameDay =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();
    if (sameDay) return d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString(locale, { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

export function ChatPage() {
  const { user } = useAuth();
  const { t, localeTag } = useLanguage();
  const chatState = useChatSync();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [mobileShowList, setMobileShowList] = useState(true);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [groupTitle, setGroupTitle] = useState("");
  const [groupPick, setGroupPick] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [notifBanner, setNotifBanner] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const listEndRef = useRef<HTMLDivElement>(null);
  const prevMsgIdsRef = useRef<Set<string> | null>(null);
  const me = user?.email || "";

  const contacts = useMemo(() => listRegisteredUserProfiles(me), [me]);
  /** Everyone registered (including current user) for the Kontakte list. */
  const allRegisteredUsers = useMemo(() => listRegisteredUserProfiles(), []);

  const [presenceClock, bumpPresenceClock] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    const id = window.setInterval(() => bumpPresenceClock(), 15_000);
    return () => window.clearInterval(id);
  }, []);
  void presenceClock;

  const presenceLabels = useMemo(
    () => ({
      online: t("chatStatusOnline", "Online"),
      away: t("chatStatusAway", "Abwesend"),
      offline: t("chatStatusOffline", "Offline"),
    }),
    [t]
  );

  const filteredConversations = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = [...chatState.conversations].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    if (q) {
      list = list.filter((c) => {
        const title = convDisplayTitle(c, me).toLowerCase();
        const last = c.messages[c.messages.length - 1];
        const blob = `${title} ${last?.text || ""}`.toLowerCase();
        return blob.includes(q);
      });
    }
    return list;
  }, [chatState.conversations, query, me]);

  const selected = filteredConversations.find((c) => c.id === selectedId) ?? null;

  useEffect(() => {
    if (selectedId) setMobileShowList(false);
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId || !me) return;
    markConversationRead(me, selectedId);
  }, [selectedId, me, selected?.messages.length]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selected?.messages.length, selectedId]);

  const sig = chatState.conversations.map((c) => `${c.id}:${c.messages.length}`).join("|");

  useEffect(() => {
    if (!me || !("Notification" in window)) return;
    const state = loadChatState();
    const allIds = new Set(state.conversations.flatMap((c) => c.messages.map((m) => m.id)));
    if (prevMsgIdsRef.current === null) {
      prevMsgIdsRef.current = allIds;
      return;
    }
    for (const c of state.conversations) {
      for (const m of c.messages) {
        if (prevMsgIdsRef.current.has(m.id)) continue;
        if (normEmail(m.senderEmail) === normEmail(me)) continue;
        if (selectedId === c.id && document.visibilityState === "visible") continue;
        if (Notification.permission === "granted") {
          const title = convDisplayTitle(c, me);
          const body =
            m.text ||
            (m.attachment?.kind === "image"
              ? t("chatNotifImage", "📷 Foto")
              : m.attachment
                ? t("chatNotifFile", "📎 Datei")
                : "");
          try {
            new Notification(title, {
              body: body.slice(0, 140),
              tag: c.id,
            });
          } catch {
            // ignore
          }
        }
      }
    }
    prevMsgIdsRef.current = allIds;
  }, [sig, me, selectedId, t]);

  const requestNotifications = useCallback(async () => {
    if (!("Notification" in window)) {
      setToast(t("chatNotifUnsupported", "Benachrichtigungen werden von diesem Browser nicht unterstützt."));
      return;
    }
    const p = await Notification.requestPermission();
    if (p !== "granted") {
      setToast(t("chatNotifDenied", "Benachrichtigungen wurden abgelehnt."));
    }
    setNotifBanner(false);
  }, [t]);

  useEffect(() => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "default") setNotifBanner(true);
  }, []);

  const openDirect = (email: string, name: string) => {
    if (!user) return;
    const conv = getOrCreateDirectConversation(user.email, user.name, email, name);
    setSelectedId(conv.id);
    setShowNewChat(false);
    setMobileShowList(false);
  };

  const submitGroup = () => {
    if (!user) return;
    const picked = contacts.filter((c) => groupPick[normEmail(c.email)]);
    if (picked.length < 1) {
      setToast(t("chatGroupNeedMember", "Bitte mindestens einen Kontakt auswählen."));
      return;
    }
    const conv = createGroupConversation(user.email, user.name, groupTitle, picked);
    setGroupTitle("");
    setGroupPick({});
    setShowNewGroup(false);
    setSelectedId(conv.id);
    setMobileShowList(false);
  };

  const onSend = async () => {
    if (!user || !selectedId) return;
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    const r = sendChatMessage(selectedId, user.email, user.name, text);
    if (!r.ok) setToast(t("chatSendFailed", "Nachricht konnte nicht gesendet werden."));
  };

  const onPickFile = async (files: FileList | null) => {
    if (!files?.length || !user || !selectedId) return;
    const file = files[0];
    const att = await fileToChatAttachment(file);
    if (!att.ok) {
      setToast(
        att.error === "too_large"
          ? t("chatFileTooBig", "Datei zu groß (max. 2 MB in dieser Demo).")
          : t("chatFileReadError", "Datei konnte nicht gelesen werden.")
      );
      return;
    }
    const r = sendChatMessage(selectedId, user.email, user.name, "", att.attachment);
    if (!r.ok) setToast(t("chatSendFailed", "Nachricht konnte nicht gesendet werden."));
    if (fileRef.current) fileRef.current.value = "";
    if (imgRef.current) imgRef.current.value = "";
  };

  if (!user) return null;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-[#0b141a]">
      {toast && (
        <div className="absolute bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
          <button type="button" className="ml-3 text-slate-300 underline" onClick={() => setToast(null)}>
            OK
          </button>
        </div>
      )}

      {notifBanner && (
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-emerald-900/40 bg-emerald-950/90 px-4 py-2 text-sm text-emerald-50">
          <span>{t("chatNotifBanner", "Desktop-Benachrichtigungen für neue Nachrichten aktivieren?")}</span>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-lg bg-emerald-600 px-3 py-1 font-medium text-white hover:bg-emerald-500"
              onClick={requestNotifications}
            >
              {t("chatNotifEnable", "Aktivieren")}
            </button>
            <button
              type="button"
              className="rounded-lg px-2 py-1 text-emerald-200 hover:bg-emerald-900/50"
              onClick={() => setNotifBanner(false)}
            >
              {t("chatNotifLater", "Später")}
            </button>
          </div>
        </div>
      )}

      <div className="flex min-h-0 min-h-[calc(100vh-72px-1px)] flex-1">
        {/* Conversation list */}
        <aside
          className={`flex w-full max-w-full shrink-0 flex-col border-r border-slate-800 bg-[#111b21] sm:w-[360px] ${
            !mobileShowList && selectedId ? "hidden sm:flex" : "flex"
          }`}
        >
          <div className="flex h-14 items-center gap-2 border-b border-slate-800 px-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("chatSearchPlaceholder", "Suchen oder neuer Chat")}
                className="h-10 w-full rounded-xl border-0 bg-[#202c33] pl-10 pr-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-600/40"
              />
            </div>
            <button
              type="button"
              title={t("chatNewGroup", "Neue Gruppe")}
              onClick={() => setShowNewGroup(true)}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#202c33] text-slate-300 transition hover:bg-[#2a3942]"
            >
              <Users className="h-5 w-5" />
            </button>
            <button
              type="button"
              title={t("chatNewChat", "Neuer Chat")}
              onClick={() => setShowNewChat(true)}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-700 text-white transition hover:bg-emerald-600"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="sticky top-0 z-10 border-b border-slate-800 bg-[#111b21] px-3 py-2">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {t("chatSectionContacts", "Kontakte")}
              </h2>
            </div>
            {allRegisteredUsers.map((c) => {
              const isSelf = normEmail(c.email) === normEmail(me);
              const st = getPresenceStatus(c.email);
              return (
                <button
                  key={`contact-${c.email}`}
                  type="button"
                  onClick={() => {
                    if (!user) return;
                    const conv = getOrCreateDirectConversation(user.email, user.name, c.email, c.name);
                    setSelectedId(conv.id);
                    setMobileShowList(false);
                  }}
                  className="flex w-full items-center gap-3 border-b border-slate-800/80 px-3 py-2.5 text-left transition hover:bg-[#202c33]"
                >
                  <div className="relative shrink-0">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-slate-600 to-slate-800 text-xs font-semibold text-white">
                      {initials(c.name)}
                    </div>
                    <PresenceIndicator
                      status={st}
                      labelOnline={presenceLabels.online}
                      labelAway={presenceLabels.away}
                      labelOffline={presenceLabels.offline}
                      dotBorderClass="border-[#111b21]"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium text-slate-100">{c.name}</span>
                      {isSelf && (
                        <span className="shrink-0 rounded-md bg-slate-700/80 px-1.5 py-0.5 text-[10px] font-medium text-slate-300">
                          {t("chatYouBadge", "Sie")}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-slate-500">{c.email}</p>
                  </div>
                  <span className="shrink-0 text-[10px] text-slate-500">
                    {st === "online"
                      ? presenceLabels.online
                      : st === "away"
                        ? presenceLabels.away
                        : presenceLabels.offline}
                  </span>
                </button>
              );
            })}

            <div className="sticky top-0 z-10 border-b border-slate-800 bg-[#111b21] px-3 py-2">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {t("chatSectionChats", "Chats")}
              </h2>
            </div>
            {filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 px-6 py-10 text-center text-slate-500">
                <MessageCircle className="h-10 w-10 opacity-40" />
                <p className="text-sm">{t("chatEmptyList", "Noch keine Chats. Starten Sie einen neuen.")}</p>
              </div>
            ) : (
              filteredConversations.map((c) => {
                const title = convDisplayTitle(c, me);
                const last = c.messages[c.messages.length - 1];
                const unread = unreadForConversation(me, c.id);
                const peer =
                  c.kind === "direct"
                    ? c.memberEmails.find((em) => normEmail(em) !== normEmail(me))
                    : null;
                const peerStatus = peer ? getPresenceStatus(peer) : null;
                const dotBorder = selectedId === c.id ? "border-[#2a3942]" : "border-[#111b21]";
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(c.id);
                      setMobileShowList(false);
                    }}
                    className={`flex w-full items-start gap-3 border-b border-slate-800/80 px-3 py-3 text-left transition hover:bg-[#202c33] ${
                      selectedId === c.id ? "bg-[#2a3942]" : ""
                    }`}
                  >
                    <div className="relative shrink-0">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 text-sm font-semibold text-white">
                        {initials(title)}
                      </div>
                      {c.kind === "direct" && peerStatus != null && (
                        <PresenceIndicator
                          status={peerStatus}
                          labelOnline={presenceLabels.online}
                          labelAway={presenceLabels.away}
                          labelOffline={presenceLabels.offline}
                          dotBorderClass={dotBorder}
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-medium text-slate-100">{title}</span>
                        <span className="shrink-0 text-xs text-slate-500">
                          {last ? formatTime(last.createdAt, localeTag) : ""}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center justify-between gap-2">
                        <p className="truncate text-sm text-slate-400">
                          {last
                            ? last.text.trim()
                              ? `${last.senderEmail === normEmail(me) ? "" : `${last.senderName}: `}${last.text}`
                              : last.attachment?.kind === "image"
                                ? t("chatPreviewPhoto", "📷 Foto")
                                : last.attachment
                                  ? `📎 ${last.attachment.fileName}`
                                  : ""
                            : t("chatNoMessagesYet", "Noch keine Nachrichten")}
                        </p>
                        {unread > 0 && (
                          <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-emerald-600 px-1.5 text-[11px] font-bold text-white">
                            {unread > 99 ? "99+" : unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Thread */}
        <section
          className={`flex min-h-0 min-w-0 flex-1 flex-col bg-[#0b141a] bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23182229%22%20fill-opacity%3D%220.35%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] ${
            mobileShowList && !selectedId ? "hidden sm:flex" : "flex"
          }`}
        >
          {!selected ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 text-slate-500">
              <div className="rounded-full bg-[#202c33] p-8">
                <MessageCircle className="h-16 w-16 text-slate-600" />
              </div>
              <p className="max-w-sm text-center text-sm">{t("chatSelectThread", "Wählen Sie einen Chat aus der Liste.")}</p>
            </div>
          ) : (
            <>
              <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-800 bg-[#202c33] px-3">
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-200 sm:hidden"
                  onClick={() => {
                    setMobileShowList(true);
                    setSelectedId(null);
                  }}
                  aria-label={t("chatBack", "Zurück")}
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="relative">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 text-xs font-bold text-white">
                    {initials(convDisplayTitle(selected, me))}
                  </div>
                  {selected.kind === "direct" &&
                    (() => {
                      const peer = selected.memberEmails.find((em) => normEmail(em) !== normEmail(me));
                      const st = peer ? getPresenceStatus(peer) : "offline";
                      return (
                        <PresenceIndicatorHeader
                          status={st}
                          labelOnline={presenceLabels.online}
                          labelAway={presenceLabels.away}
                          labelOffline={presenceLabels.offline}
                        />
                      );
                    })()}
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="truncate font-semibold text-slate-100">{convDisplayTitle(selected, me)}</h1>
                  <p className="truncate text-xs text-slate-400">
                    {selected.kind === "group"
                      ? t("chatMembersCount", "{n} Mitglieder").replace("{n}", String(selected.memberEmails.length))
                      : (() => {
                          const peer = selected.memberEmails.find((em) => normEmail(em) !== normEmail(me));
                          const st = peer ? getPresenceStatus(peer) : "offline";
                          if (st === "online") return presenceLabels.online;
                          if (st === "away") return presenceLabels.away;
                          return presenceLabels.offline;
                        })()}
                  </p>
                </div>
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
                <div className="mx-auto flex max-w-3xl flex-col gap-1">
                  {selected.messages.map((m: ChatMessage) => {
                    const mine = normEmail(m.senderEmail) === normEmail(me);
                    const tick = mine ? getOutgoingMessageTick(selected, m, me, chatState) : null;
                    return (
                      <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[85%] rounded-lg px-3 py-2 shadow-sm ${
                            mine
                              ? "rounded-tr-none bg-[#005c4b] text-slate-50"
                              : "rounded-tl-none bg-[#202c33] text-slate-100"
                          }`}
                        >
                          {selected.kind === "group" && !mine && (
                            <p className="mb-1 text-xs font-medium text-emerald-400">{m.senderName}</p>
                          )}
                          {m.attachment?.kind === "image" && (
                            <a href={m.attachment.dataUrl} download={m.attachment.fileName} className="block">
                              <img
                                src={m.attachment.dataUrl}
                                alt=""
                                className="mb-1 max-h-64 max-w-full rounded-md object-cover"
                              />
                            </a>
                          )}
                          {m.attachment?.kind === "file" && (
                            <a
                              href={m.attachment.dataUrl}
                              download={m.attachment.fileName}
                              className="mb-1 flex items-center gap-2 rounded-md bg-black/20 px-2 py-2 text-sm underline"
                            >
                              <Paperclip className="h-4 w-4 shrink-0" />
                              {m.attachment.fileName}
                            </a>
                          )}
                          {m.text.trim() ? (
                            <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.text}</p>
                          ) : null}
                          <div
                            className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                              mine ? "text-emerald-200/80" : "text-slate-500"
                            }`}
                          >
                            <span>{formatTime(m.createdAt, localeTag)}</span>
                            {mine && tick === "single_grey" && (
                              <span title={t("chatTickSent", "Gesendet")}>
                                <Check className="h-3.5 w-3.5 text-slate-400/90" aria-hidden />
                              </span>
                            )}
                            {mine && tick === "double_grey" && (
                              <span title={t("chatTickDelivered", "Zugestellt")}>
                                <CheckCheck className="h-3.5 w-3.5 text-slate-400/90" aria-hidden />
                              </span>
                            )}
                            {mine && tick === "double_blue" && (
                              <span title={t("chatTickRead", "Gelesen")}>
                                <CheckCheck className="h-3.5 w-3.5 text-sky-400" aria-hidden />
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={listEndRef} />
                </div>
              </div>

              <footer className="shrink-0 border-t border-slate-800 bg-[#202c33] px-3 py-2">
                <div className="mx-auto flex max-w-3xl items-end gap-2">
                  <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPickFile(e.target.files)} />
                  <input ref={fileRef} type="file" className="hidden" onChange={(e) => onPickFile(e.target.files)} />
                  <button
                    type="button"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-[#2a3942] hover:text-slate-200"
                    onClick={() => imgRef.current?.click()}
                    title={t("chatAddPhoto", "Foto")}
                  >
                    <ImagePlus className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-[#2a3942] hover:text-slate-200"
                    onClick={() => fileRef.current?.click()}
                    title={t("chatAddFile", "Datei")}
                  >
                    <Paperclip className="h-5 w-5" />
                  </button>
                  <textarea
                    rows={1}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void onSend();
                      }
                    }}
                    placeholder={t("chatMessagePlaceholder", "Nachricht")}
                    className="max-h-32 min-h-[44px] flex-1 resize-none rounded-xl border-0 bg-[#2a3942] px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-600/40"
                  />
                  <button
                    type="button"
                    onClick={() => void onSend()}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white transition hover:bg-emerald-500 disabled:opacity-40"
                    disabled={!draft.trim()}
                    title={t("chatSend", "Senden")}
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </div>
              </footer>
            </>
          )}
        </section>
      </div>

      {/* New chat modal */}
      {showNewChat && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4" role="dialog">
          <div className="w-full max-w-md rounded-2xl bg-[#111b21] p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">{t("chatNewChat", "Neuer Chat")}</h2>
              <button type="button" onClick={() => setShowNewChat(false)} className="rounded-lg p-2 text-slate-400 hover:bg-white/10">
                <X className="h-5 w-5" />
              </button>
            </div>
            {contacts.length === 0 ? (
              <p className="text-sm text-slate-400">{t("chatNoContacts", "Keine weiteren Konten. Registrieren Sie ein zweites Konto im Browser.")}</p>
            ) : (
              <ul className="max-h-72 space-y-1 overflow-y-auto">
                {contacts.map((c) => {
                  const st = getPresenceStatus(c.email);
                  return (
                    <li key={c.email}>
                      <button
                        type="button"
                        onClick={() => openDirect(c.email, c.name)}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-slate-200 hover:bg-[#202c33]"
                      >
                        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-xs font-bold text-white">
                          {initials(c.name)}
                          <PresenceIndicator
                            status={st}
                            labelOnline={presenceLabels.online}
                            labelAway={presenceLabels.away}
                            labelOffline={presenceLabels.offline}
                            dotBorderClass="border-emerald-900"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{c.name}</p>
                          <p className="text-xs text-slate-500">{c.email}</p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* New group modal */}
      {showNewGroup && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4" role="dialog">
          <div className="w-full max-w-md rounded-2xl bg-[#111b21] p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">{t("chatNewGroup", "Neue Gruppe")}</h2>
              <button type="button" onClick={() => setShowNewGroup(false)} className="rounded-lg p-2 text-slate-400 hover:bg-white/10">
                <X className="h-5 w-5" />
              </button>
            </div>
            <label className="mb-3 block text-sm text-slate-400">{t("chatGroupName", "Gruppenname")}</label>
            <input
              value={groupTitle}
              onChange={(e) => setGroupTitle(e.target.value)}
              className="mb-4 w-full rounded-xl border-0 bg-[#202c33] px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-600/40"
              placeholder={t("chatGroupNamePh", "z. B. Projektteam")}
            />
            <p className="mb-2 text-sm text-slate-400">{t("chatGroupMembers", "Mitglieder")}</p>
            <ul className="mb-4 max-h-48 space-y-1 overflow-y-auto">
              {contacts.map((c) => {
                const id = normEmail(c.email);
                const st = getPresenceStatus(c.email);
                return (
                  <li key={c.email}>
                    <label className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 hover:bg-[#202c33]">
                      <input
                        type="checkbox"
                        checked={!!groupPick[id]}
                        onChange={(e) => setGroupPick((p) => ({ ...p, [id]: e.target.checked }))}
                        className="rounded border-slate-600"
                      />
                      <span className="flex-1 text-slate-200">{c.name}</span>
                      <PresenceIndicator
                        variant="inline"
                        status={st}
                        labelOnline={presenceLabels.online}
                        labelAway={presenceLabels.away}
                        labelOffline={presenceLabels.offline}
                      />
                    </label>
                  </li>
                );
              })}
            </ul>
            <button
              type="button"
              onClick={submitGroup}
              className="w-full rounded-xl bg-emerald-600 py-3 font-medium text-white hover:bg-emerald-500"
            >
              {t("chatCreateGroup", "Gruppe erstellen")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
