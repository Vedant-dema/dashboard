import { useEffect, useState } from "react";
import { Bell, CheckCircle2, KeyRound, Mail, MapPin, ShieldCheck, UserRound } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((x) => x[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}

export function ProfilePage() {
  const { user } = useAuth();
  const defaultName = user?.name ?? "Benutzer";
  const email = user?.email ?? "—";
  const [name, setName] = useState(defaultName);
  const [location, setLocation] = useState("Hamburg");
  const [editing, setEditing] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(true);
  const [showSessions, setShowSessions] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("dema-profile-settings");
      if (!raw) return;
      const o = JSON.parse(raw) as { name?: string; location?: string; mfaEnabled?: boolean };
      if (typeof o.name === "string" && o.name.trim()) setName(o.name);
      if (typeof o.location === "string" && o.location.trim()) setLocation(o.location);
      if (typeof o.mfaEnabled === "boolean") setMfaEnabled(o.mfaEnabled);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        "dema-profile-settings",
        JSON.stringify({ name, location, mfaEnabled })
      );
    } catch {
      // ignore
    }
  }, [name, location, mfaEnabled]);

  function showInfo(text: string) {
    setMessage(text);
    window.setTimeout(() => setMessage(null), 1800);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto bg-slate-50/70">
      <div className="border-b border-slate-200/80 bg-white/90 px-6 py-6 backdrop-blur-sm">
        <div className="mx-auto w-full max-w-6xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Profil</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Mein Konto</h1>
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-6 lg:grid-cols-12">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-5">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-xl font-bold text-white shadow-lg shadow-blue-600/25">
              {initials(name)}
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900">{name}</p>
              <p className="text-sm text-slate-500">{email}</p>
            </div>
          </div>

          {message ? (
            <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              {message}
            </div>
          ) : null}

          <div className="mt-5 space-y-2">
            <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
              <UserRound className="h-4 w-4 text-blue-600" />
              Interne ID: EMP-1042
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
              <MapPin className="h-4 w-4 text-blue-600" />
              Standort: {location}
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
              <Mail className="h-4 w-4 text-blue-600" />
              {email}
            </div>
          </div>

          {editing ? (
            <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10"
                placeholder="Name"
              />
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10"
                placeholder="Standort"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditing(false);
                    showInfo("Profil gespeichert");
                  }}
                  className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  Speichern
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-7">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Sicherheit", Icon: ShieldCheck, value: "Aktiv" },
              { label: "MFA", Icon: KeyRound, value: "Eingeschaltet" },
              { label: "Benachrichtigungen", Icon: Bell, value: "Standard" },
            ].map(({ label, Icon, value }) => (
              <div key={label} className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
                  <Icon className="h-4 w-4 text-blue-600" />
                </div>
                <p className="mt-2 text-lg font-bold text-slate-900">
                  {label === "MFA" ? (mfaEnabled ? "Eingeschaltet" : "Aus") : value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => setEditing(true)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Profil bearbeiten
            </button>
            <button
              onClick={() => showInfo("Passwort-Dialog geöffnet (Demo)")}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Passwort ändern
            </button>
            <button
              onClick={() => {
                setMfaEnabled((v) => !v);
                showInfo(`2FA ${mfaEnabled ? "deaktiviert" : "aktiviert"}`);
              }}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              2FA verwalten
            </button>
            <button
              onClick={() => setShowSessions((v) => !v)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {showSessions ? "Sitzungen ausblenden" : "Sitzungen anzeigen"}
            </button>
          </div>

          {showSessions ? (
            <div className="mt-4 space-y-2 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
              {[
                ["Windows · Chrome", "Jetzt aktiv", "Hamburg"],
                ["Android · Chrome", "Heute, 08:12", "Hamburg"],
              ].map((s) => (
                <div key={s[0]} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-xs">
                  <span className="font-semibold text-slate-700">{s[0]}</span>
                  <span className="text-slate-500">{s[1]}</span>
                  <span className="text-slate-500">{s[2]}</span>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

