import { useMemo, useState } from "react";
import {
  Bell,
  Truck,
  Search,
  Filter,
  MapPin,
  Gauge,
  Calendar,
  Zap,
  Gavel,
  Send,
  Mail,
  MessageSquare,
  TrendingDown,
  Link2,
  ShieldCheck,
  ChevronRight,
  X,
  Sparkles,
  Clock,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import {
  MOCK_LISTINGS,
  formatEur,
  type TruckListing,
} from "../data/b2bPortalMock";

const toneClasses: Record<TruckListing["imageTone"], string> = {
  slate: "from-slate-700 via-slate-800 to-slate-950",
  blue: "from-blue-800 via-indigo-900 to-slate-950",
  zinc: "from-zinc-700 via-zinc-800 to-zinc-950",
  stone: "from-stone-700 via-stone-800 to-stone-950",
};

const heroStats = [
  { value: "24", label: "Fahrzeuge live", sub: "Demo-Bestand" },
  { value: "100%", label: "Eigenes Portal", sub: "Ihre Marke" },
  { value: "90 T.", label: "Preis-Logik", sub: "Automatisiert" },
  { value: "0 €", label: "Marktplatz-Fee", sub: "Direktvertrieb" },
] as const;

function Badge({ type }: { type: TruckListing["badges"][number] }) {
  const map = {
    spot: {
      label: "Spot-Deal",
      className:
        "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25 ring-1 ring-white/20",
    },
    reduced: {
      label: "Preis gesenkt",
      className:
        "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20 ring-1 ring-white/20",
    },
    new: {
      label: "Neu",
      className:
        "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/25 ring-1 ring-white/20",
    },
    auction: {
      label: "Gebot aktiv",
      className:
        "bg-gradient-to-r from-violet-600 to-purple-700 text-white shadow-md shadow-violet-500/25 ring-1 ring-white/20",
    },
  };
  const b = map[type];
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${b.className}`}
    >
      {b.label}
    </span>
  );
}

function ListingCard({
  listing,
  onOpen,
}: {
  listing: TruckListing;
  onOpen: (l: TruckListing) => void;
}) {
  const urgent90 = listing.daysListed >= 75 && listing.previousPrice;
  return (
    <button
      type="button"
      onClick={() => onOpen(listing)}
      className="group relative w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white text-left shadow-sm shadow-slate-200/50 ring-0 transition duration-300 hover:-translate-y-1 hover:border-blue-200/90 hover:shadow-xl hover:shadow-blue-500/10"
    >
      <div
        className={`relative flex aspect-[16/10] items-center justify-center bg-gradient-to-br ${toneClasses[listing.imageTone]}`}
      >
        <div className="absolute inset-0 b2b-card-shine opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent" />
        <Truck className="relative z-[1] h-16 w-16 text-white/35 transition duration-500 group-hover:scale-110 group-hover:text-white/50" />
        <div className="absolute left-3 top-3 z-[2] flex flex-wrap gap-1.5">
          {listing.badges.map((b) => (
            <Badge key={b} type={b} />
          ))}
        </div>
        {urgent90 && (
          <div className="absolute bottom-3 left-3 right-3 z-[2] rounded-xl border border-amber-400/30 bg-slate-950/75 px-3 py-2 text-[11px] font-medium text-amber-50 backdrop-blur-md">
            <TrendingDown className="mr-1.5 inline h-3.5 w-3.5 text-amber-400" />
            90-Tage-Strategie aktiv — Kunden wurden informiert
          </div>
        )}
      </div>
      <div className="relative p-5">
        <div className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-400 opacity-0 transition group-hover:opacity-100 group-hover:text-blue-600">
          <ArrowRight className="h-4 w-4" />
        </div>
        <h3 className="pr-10 font-semibold tracking-tight text-slate-900 transition group-hover:text-blue-700">
          {listing.title}
        </h3>
        <p className="mt-1 line-clamp-1 text-sm text-slate-500">{listing.subtitle}</p>
        <div className="mt-4 flex flex-wrap items-baseline gap-2 border-t border-slate-100 pt-4">
          <span className="text-xl font-bold tabular-nums tracking-tight text-slate-900">
            {formatEur(listing.price)}
          </span>
          {listing.previousPrice && (
            <span className="text-sm tabular-nums text-slate-400 line-through">
              {formatEur(listing.previousPrice)}
            </span>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-slate-500">
          <span className="flex items-center gap-1.5">
            <Gauge className="h-3.5 w-3.5 text-slate-400" />
            {(listing.mileageKm / 1000).toFixed(0)}k km
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            EZ {listing.year}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-slate-400" />
            {listing.location}
          </span>
        </div>
        {listing.currentBid != null && (
          <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-violet-50 px-2.5 py-1.5 text-xs font-semibold text-violet-800">
            <Gavel className="h-3.5 w-3.5" />
            Höchstgebot {formatEur(listing.currentBid)} · {listing.bidCount} Gebote
          </p>
        )}
      </div>
    </button>
  );
}

function DetailPanel({
  listing,
  onClose,
}: {
  listing: TruckListing;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"details" | "bid" | "quote">("details");
  const [bidAmount, setBidAmount] = useState(
    listing.currentBid ? String(listing.currentBid + 500) : String(Math.round(listing.price * 0.95))
  );
  const [quoteAmount, setQuoteAmount] = useState(String(Math.round(listing.price * 0.92)));
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState<string | null>(null);

  const mockBids = useMemo(
    () =>
      listing.currentBid
        ? [
            { who: "FleetLogistik GmbH", amount: listing.currentBid, when: "vor 2 Std." },
            { who: "Transport Nord", amount: listing.currentBid - 1200, when: "gestern" },
            { who: "B2B Partner (anonym)", amount: listing.currentBid - 3500, when: "vor 3 Tagen" },
          ]
        : [],
    [listing]
  );

  function handleSubmitBid(e: React.FormEvent) {
    e.preventDefault();
    setSent("Gebot wurde zur Prüfung eingereicht (Demo). In Produktion: Bestätigung per E-Mail.");
  }

  function handleSubmitQuote(e: React.FormEvent) {
    e.preventDefault();
    setSent("Ihr Preisvorschlag wurde übermittelt (Demo). Vertrieb meldet sich mit Gegenangebot.");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end p-2 sm:p-4">
      <button
        type="button"
        aria-label="Schließen"
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/20 ring-1 ring-slate-900/5">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-white px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-lg font-bold tracking-tight text-slate-900">{listing.title}</h2>
            <p className="mt-0.5 text-sm text-slate-500">{listing.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Schließen"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div
          className={`relative flex aspect-video shrink-0 items-center justify-center bg-gradient-to-br ${toneClasses[listing.imageTone]}`}
        >
          <div className="absolute inset-0 b2b-card-shine opacity-50" />
          <Truck className="relative h-24 w-24 text-white/30" />
        </div>

        <div className="flex gap-0.5 border-b border-slate-100 bg-slate-50/80 px-2 pt-2">
          {(
            [
              ["details", "Fahrzeug"],
              ["bid", "Gebot"],
              ["quote", "Preisvorschlag"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                setTab(k);
                setSent(null);
              }}
              className={`flex-1 rounded-t-xl px-3 py-2.5 text-sm font-semibold transition ${
                tab === k
                  ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80"
                  : "text-slate-500 hover:bg-white/60 hover:text-slate-800"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {sent && (
            <div className="mb-4 rounded-xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50 to-teal-50/80 px-4 py-3 text-sm font-medium text-emerald-900">
              {sent}
            </div>
          )}

          {tab === "details" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-2xl font-bold tabular-nums text-slate-900">
                  {formatEur(listing.price)}
                </span>
                {listing.previousPrice && (
                  <span className="tabular-nums text-slate-400 line-through">
                    {formatEur(listing.previousPrice)}
                  </span>
                )}
              </div>
              <p className="text-sm leading-relaxed text-slate-600">
                Listenpreis inkl. MwSt. zzgl. Überführung. Exakte Vertragskonditionen erhalten Sie nach
                Anfrage oder Gebot.
              </p>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ["Leistung", `${listing.powerKw} kW`],
                  ["Kraftstoff", listing.fuel],
                  ["Getriebe", listing.gearbox],
                  ["Inserat", `${listing.daysListed} Tage`],
                ].map(([dt, dd]) => (
                  <div
                    key={dt}
                    className="rounded-xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white px-3 py-2.5"
                  >
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      {dt}
                    </dt>
                    <dd className="mt-0.5 font-semibold text-slate-800">{dd}</dd>
                  </div>
                ))}
              </dl>
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Highlights</p>
                <ul className="flex flex-wrap gap-2">
                  {listing.highlights.map((h) => (
                    <li
                      key={h}
                      className="rounded-lg border border-blue-100/80 bg-blue-50/90 px-2.5 py-1 text-xs font-semibold text-blue-900"
                    >
                      {h}
                    </li>
                  ))}
                </ul>
              </div>
              {listing.auctionEndsAt && (
                <div className="flex items-center gap-2 rounded-xl border border-violet-200/80 bg-violet-50 px-3 py-2.5 text-sm font-medium text-violet-950">
                  <Clock className="h-4 w-4 shrink-0 text-violet-600" />
                  Auktion endet (Demo): {new Date(listing.auctionEndsAt).toLocaleString("de-DE")}
                </div>
              )}
            </div>
          )}

          {tab === "bid" && (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-slate-600">
                Wie bei einer Auktion: Sie geben ein verbindliches Maximalgebot ab. Unser Team prüft und
                bestätigt schriftlich.
              </p>
              {mockBids.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                    Letzte Gebote (Beispiel)
                  </p>
                  <ul className="space-y-2">
                    {mockBids.map((b, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/90 px-3 py-2.5 text-sm"
                      >
                        <span className="text-slate-600">{b.who}</span>
                        <span className="font-bold tabular-nums text-slate-900">{formatEur(b.amount)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <form onSubmit={handleSubmitBid} className="space-y-3">
                <label className="block text-sm font-medium text-slate-700">
                  Gebot (EUR)
                  <input
                    type="number"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Firma
                  <input
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    required
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Ansprechpartner
                  <input
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    required
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  E-Mail
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    required
                  />
                </label>
                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/30 transition hover:from-violet-500 hover:to-purple-500"
                >
                  <Gavel className="h-4 w-4" />
                  Gebot absenden
                </button>
              </form>
            </div>
          )}

          {tab === "quote" && (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-slate-600">
                Nennen Sie uns Ihr Wunschangebot. Der Vertrieb antwortet mit Annahme, Gegenangebot oder
                Absage – ideal für Rahmenverträge und Flotten.
              </p>
              <form onSubmit={handleSubmitQuote} className="space-y-3">
                <label className="block text-sm font-medium text-slate-700">
                  Ihr Preisvorschlag (EUR)
                  <input
                    type="number"
                    value={quoteAmount}
                    onChange={(e) => setQuoteAmount(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Nachricht (optional)
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                    className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    placeholder="Liefertermin, Finanzierung, Inzahlungnahme …"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Firma
                  <input
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    required
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  E-Mail
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    required
                  />
                </label>
                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:from-blue-500 hover:to-indigo-500"
                >
                  <Send className="h-4 w-4" />
                  Preisvorschlag senden
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const services = [
  {
    icon: Mail,
    title: "Deal-Alerts per E-Mail",
    text: "Kunden mit Interessenprofil erhalten „Crazy Deals“ und Links direkt ins Portal – ohne mobile.de-Gebühren.",
    accent: "from-amber-500 to-orange-600",
    ring: "ring-amber-500/20",
  },
  {
    icon: Bell,
    title: "Preis & 90-Tage-Logik",
    text: "Wird ein Lkw nicht innerhalb von 90 Tagen verkauft, senken wir strategisch den Preis – automatische Benachrichtigung an registrierte B2B-Kontakte.",
    accent: "from-emerald-500 to-teal-600",
    ring: "ring-emerald-500/20",
  },
  {
    icon: Gavel,
    title: "Gebotsfunktion",
    text: "Wie bei Auktionsplattformen: transparente Gebote, Fristen und Nachverhandlung durch Ihr Vertriebsteam.",
    accent: "from-violet-600 to-purple-700",
    ring: "ring-violet-500/20",
  },
  {
    icon: MessageSquare,
    title: "Preisvorschläge",
    text: "Käufer senden ihr Wunschangebot; Sie antworten digital mit Gegenangebot – alles nachvollziehbar im CRM (Anbindung folgt).",
    accent: "from-blue-500 to-indigo-600",
    ring: "ring-blue-500/20",
  },
  {
    icon: Link2,
    title: "Teilbare Inserat-Links",
    text: "Jedes Fahrzeug hat eine stabile URL für Newsletter, WhatsApp Business und Sales-Pitches.",
    accent: "from-cyan-500 to-blue-600",
    ring: "ring-cyan-500/20",
  },
  {
    icon: ShieldCheck,
    title: "Nur B2B / geprüfte Kontakte",
    text: "Optional: Zugang nur nach Freigabe – weniger Zeitverschwendung, mehr ernsthafte Anfragen.",
    accent: "from-slate-600 to-slate-800",
    ring: "ring-slate-400/25",
  },
] as const;

export function B2BPortalPage() {
  const [q, setQ] = useState("");
  const [onlyReduced, setOnlyReduced] = useState(false);
  const [onlyAuction, setOnlyAuction] = useState(false);
  const [selected, setSelected] = useState<TruckListing | null>(null);

  const filtered = useMemo(() => {
    return MOCK_LISTINGS.filter((l) => {
      if (onlyReduced && !l.previousPrice) return false;
      if (onlyAuction) {
        const hasBidding =
          l.badges.includes("auction") || l.bidCount > 0 || l.currentBid != null;
        if (!hasBidding) return false;
      }
      if (!q.trim()) return true;
      const s = q.toLowerCase();
      return (
        l.title.toLowerCase().includes(s) ||
        l.subtitle.toLowerCase().includes(s) ||
        l.location.toLowerCase().includes(s)
      );
    });
  }, [q, onlyReduced, onlyAuction]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto bg-slate-50">
      {/* Premium hero */}
      <header className="relative overflow-hidden bg-slate-950 pb-28 pt-10 md:pb-32 md:pt-14">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_-10%,rgb(59_130_246_/_0.35),transparent_55%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgb(168_85_247_/_0.22),transparent_45%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_80%,rgb(251_191_36_/_0.12),transparent_40%)]" />
        <div className="pointer-events-none absolute inset-0 b2b-hero-noise opacity-90" />
        <div
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgb(255_255_255_/_0.04)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255_/_0.04)_1px,transparent_1px)] bg-[size:72px_72px]"
          style={{ maskImage: "linear-gradient(to bottom, black 30%, transparent)" }}
        />

        <div className="relative mx-auto max-w-6xl px-6">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-blue-200 backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                DEMA B2B · Nutzfahrzeug-Portal
              </p>
              <h1 className="text-3xl font-bold leading-[1.1] tracking-tight text-white md:text-5xl lg:text-[3.25rem]">
                Ihr Marktplatz auf{" "}
                <span className="bg-gradient-to-r from-amber-200 via-white to-blue-200 bg-clip-text text-transparent">
                  Enterprise-Niveau
                </span>
                . Crazy Deals inklusive.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-300 md:text-lg">
                Zentral alle Lkw-Inserate, E-Mail-Kampagnen, automatische Preislogik nach 90 Tagen, Gebote und
                Preisvorschläge — unter Ihrer Marke, ohne Marktplatz-Abgaben.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <a
                  href="#b2b-bestand"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-900 shadow-xl shadow-blue-500/10 transition hover:bg-slate-100"
                >
                  Bestand ansehen
                  <ArrowRight className="h-4 w-4" />
                </a>
                <a
                  href="#/"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/10"
                >
                  Zum Dashboard
                  <ChevronRight className="h-4 w-4 opacity-80" />
                </a>
              </div>
            </div>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {heroStats.map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-4 backdrop-blur-md"
              >
                <p className="text-2xl font-bold tabular-nums tracking-tight text-white md:text-3xl">{s.value}</p>
                <p className="mt-1 text-sm font-semibold text-white">{s.label}</p>
                <p className="text-xs text-slate-400">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Floating value cards — overlap hero */}
      <div className="relative z-10 mx-auto -mt-20 max-w-6xl px-6">
        <div className="grid gap-5 lg:grid-cols-3">
          <article className="b2b-gradient-border group relative overflow-hidden rounded-3xl border border-transparent bg-gradient-to-br from-amber-50 via-white to-orange-50/80 p-6 shadow-xl shadow-amber-900/10 transition duration-300 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-amber-900/15 md:p-7">
            <div className="relative flex items-start justify-between gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-lg shadow-amber-600/35">
                <Zap className="h-7 w-7" strokeWidth={2.2} />
              </div>
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                <span className="h-2 w-2 rounded-full bg-emerald-400 b2b-live-pulse" aria-hidden />
                Live
              </span>
            </div>
            <h2 className="relative mt-5 text-xl font-bold tracking-tight text-slate-900 md:text-2xl">Crazy Deals</h2>
            <p className="relative mt-2 text-sm leading-relaxed text-slate-600 md:text-[15px]">
              Top-Fahrzeuge, Sonderpreis, direkter Link ins Portal — messbar in Klicks und qualifizierten Leads.
              Wie die großen Player, nur bei Ihnen.
            </p>
            <ul className="relative mt-4 space-y-2 text-sm text-slate-700">
              {["E-Mail-Push an Stammkunden", "Zeitfenster & Kontingente", "Tracking pro Kampagne"].map((line) => (
                <li key={line} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-amber-600" />
                  {line}
                </li>
              ))}
            </ul>
          </article>

          <article className="group rounded-3xl border border-emerald-200/50 bg-gradient-to-br from-emerald-50 via-white to-teal-50/70 p-6 shadow-xl shadow-emerald-900/8 ring-1 ring-emerald-100/80 transition duration-300 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-emerald-900/12 md:p-7">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-600/30">
              <TrendingDown className="h-7 w-7" strokeWidth={2.2} />
            </div>
            <h2 className="mt-5 text-xl font-bold tracking-tight text-slate-900 md:text-2xl">90-Tage-Engine</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 md:text-[15px]">
              Kein Verkauf in 90 Tagen? Strategische Preisanpassung plus automatische Info an registrierte
              Interessenten — weniger Lagerkosten, schnellere Rotation.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              {["Regelbasierte Preisstufen", "Benachrichtigung ohne manuellen Aufwand", "Nachvollziehbar im System"].map(
                (line) => (
                  <li key={line} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    {line}
                  </li>
                )
              )}
            </ul>
          </article>

          <article className="group rounded-3xl border border-violet-200/50 bg-gradient-to-br from-violet-50 via-white to-indigo-50/70 p-6 shadow-xl shadow-violet-900/8 ring-1 ring-violet-100/80 transition duration-300 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-violet-900/12 md:p-7">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 text-white shadow-lg shadow-violet-600/35">
              <Gavel className="h-7 w-7" strokeWidth={2.2} />
            </div>
            <h2 className="mt-5 text-xl font-bold tracking-tight text-slate-900 md:text-2xl">Gebot &amp; Angebot</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 md:text-[15px]">
              Auktions-Feeling oder klassischer Preisvorschlag — beides integriert, damit professionelle Käufer sofort
              handeln können.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              {["Transparente Gebote & Fristen", "Vertrieb im Loop", "CRM-Anbindung (Roadmap)"].map((line) => (
                <li key={line} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-violet-600" />
                  {line}
                </li>
              ))}
            </ul>
          </article>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl flex-1 px-6 pb-16 pt-14">
        <section className="mb-16">
          <div className="mb-8 max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Plattform</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
              Leistungen, die Skalierung ermöglichen
            </h2>
            <p className="mt-2 text-slate-600">
              Vorschau Ihres B2B-Portals — CRM, Versand und Messaging folgen in der nächsten Ausbaustufe.
            </p>
          </div>
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <li
                key={s.title}
                className="group flex gap-4 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-md shadow-slate-200/40 ring-1 ring-slate-900/[0.02] transition duration-300 hover:-translate-y-0.5 hover:border-slate-300/90 hover:shadow-xl hover:shadow-slate-300/25"
              >
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${s.accent} text-white shadow-lg ${s.ring} ring-4`}
                >
                  <s.icon className="h-5 w-5" strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold tracking-tight text-slate-900">{s.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{s.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section id="b2b-bestand" className="scroll-mt-8">
          <div className="mb-8 flex flex-col gap-6 border-b border-slate-200/90 pb-8 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Inventar</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                Fahrzeuge im Bestand
              </h2>
              <p className="mt-1 text-sm text-slate-500">Filtern, vergleichen, Gebote &amp; Angebote — alles an einem Ort.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Marke, Modell, Ort …"
                  className="h-12 w-full min-w-[260px] rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium text-slate-800 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 sm:w-80"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOnlyReduced((v) => !v)}
                  className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                    onlyReduced
                      ? "border-emerald-300 bg-emerald-50 text-emerald-900 shadow-inner shadow-emerald-100"
                      : "border-slate-200 bg-white text-slate-600 shadow-sm hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <Filter className="h-4 w-4" />
                  Preis gesenkt
                </button>
                <button
                  type="button"
                  onClick={() => setOnlyAuction((v) => !v)}
                  className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                    onlyAuction
                      ? "border-violet-300 bg-violet-50 text-violet-900 shadow-inner shadow-violet-100"
                      : "border-slate-200 bg-white text-slate-600 shadow-sm hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <Gavel className="h-4 w-4" />
                  Mit Gebot
                </button>
              </div>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-gradient-to-b from-white to-slate-50/80 py-20 text-center">
              <Truck className="mx-auto h-12 w-12 text-slate-300" />
              <p className="mt-4 font-medium text-slate-600">Keine Fahrzeuge für diese Filter</p>
              <p className="mt-1 text-sm text-slate-500">Filter zurücksetzen oder Suche anpassen.</p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((listing) => (
                <ListingCard key={listing.id} listing={listing} onOpen={setSelected} />
              ))}
            </div>
          )}
        </section>
      </div>

      {selected && <DetailPanel listing={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
