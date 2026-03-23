import type { KundenStamm } from "../types/kunden";

/** 07:00 … 19:00 in 15-minute steps */
export function timeSlotOptions(): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [];
  for (let h = 7; h <= 19; h++) {
    for (const m of [0, 15, 30, 45]) {
      if (h === 19 && m > 0) break;
      const hh = String(h).padStart(2, "0");
      const mm = String(m).padStart(2, "0");
      out.push({ value: `${hh}:${mm}`, label: `${hh}:${mm}` });
    }
  }
  return out;
}

export const APPOINTMENT_ACTIVITIES = [
  { id: "consult", label: "Kundenberatung" },
  { id: "pickup", label: "Fahrzeugabholung" },
  { id: "delivery", label: "Lieferung / Übergabe" },
  { id: "internal", label: "Internes Meeting" },
  { id: "call", label: "Telefonat / Rückruf" },
  { id: "workshop", label: "Werkstatt-Termin" },
] as const;

export const MEETING_TOPICS = [
  { id: "sprint", label: "Sprint Planning" },
  { id: "sales", label: "Verkaufs-Review" },
  { id: "customer", label: "Kunden-Call" },
  { id: "1on1", label: "1:1 Gespräch" },
  { id: "training", label: "Schulung" },
  { id: "other", label: "Sonstiges" },
] as const;

export const MEETING_ROOMS = [
  { id: "zoom", label: "Zoom" },
  { id: "teams", label: "Microsoft Teams" },
  { id: "meet", label: "Google Meet" },
  { id: "office", label: "Vor-Ort Büro" },
  { id: "phone", label: "Telefon" },
] as const;

export const TASK_TITLE_PRESETS = [
  { id: "offer", label: "Angebot nachfassen" },
  { id: "handover", label: "Fahrzeug-Übergabe vorbereiten" },
  { id: "invoice", label: "Rechnung prüfen" },
  { id: "wash", label: "Waschtermin bestätigen" },
  { id: "callback", label: "Kunde zurückrufen" },
  { id: "parts", label: "Ersatzteil bestellen" },
] as const;

export const TODO_PRESETS = [
  { id: "docs", label: "Unterlagen für Kunde vorbereiten" },
  { id: "photos", label: "Fahrzeugfotos hochladen" },
  { id: "invoice_check", label: "Rechnung #2847 prüfen" },
  { id: "follow_weber", label: "Angebot nachfassen — Weber" },
  { id: "insurance", label: "Versicherung melden" },
  { id: "tuev", label: "TÜV-Termin einplanen" },
] as const;

export const TASK_PRIORITIES = [
  { id: "high", label: "Hoch", tagClass: "bg-red-100 text-red-700" },
  { id: "medium", label: "Mittel", tagClass: "bg-amber-100 text-amber-800" },
  { id: "new", label: "Neu", tagClass: "bg-blue-100 text-blue-700" },
] as const;

export const WELCOME_PRESETS = [
  {
    id: "default",
    title: "Willkommen im DEMA Management System",
    subtitle: "Hier ist Ihre Übersicht — Sales, Purchase und Waschanlage auf einen Blick.",
  },
  {
    id: "compact",
    title: "Guten Tag",
    subtitle: "Ihre Übersicht für heute.",
  },
  {
    id: "formal",
    title: "Willkommen zurück",
    subtitle: "Verwalten Sie Kunden, Bestand und Termine zentral.",
  },
] as const;

export const NOTES_PRESETS = [
  { id: "empty", body: "" },
  { id: "calls", body: "Rückrufe: Weber 14:00, Schmidt morgen vormittag." },
  { id: "orders", body: "Offen: 2 Angebote freigeben, 1 Lieferung Donnerstag." },
  { id: "wash", body: "Waschanlage: Tarife Q2 prüfen." },
] as const;

export function customerOptionsFromDb(kunden: KundenStamm[]): { value: string; label: string }[] {
  return kunden.map((k) => ({
    value: k.kunden_nr,
    label: `${k.kunden_nr} — ${k.firmenname}`,
  }));
}

export function appointmentTitle(activityId: string, customerNr: string, kunden: KundenStamm[]): string {
  const act = APPOINTMENT_ACTIVITIES.find((a) => a.id === activityId)?.label ?? "Termin";
  if (!customerNr) return act;
  const k = kunden.find((x) => x.kunden_nr === customerNr);
  return k ? `${act} — ${k.firmenname}` : act;
}

export function meetingDisplay(topicId: string, roomId: string): { title: string; room: string } {
  const title = MEETING_TOPICS.find((t) => t.id === topicId)?.label ?? "Meeting";
  const room = MEETING_ROOMS.find((r) => r.id === roomId)?.label ?? "—";
  return { title, room };
}
