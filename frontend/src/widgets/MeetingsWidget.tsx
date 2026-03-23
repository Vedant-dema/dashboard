import { Video } from "lucide-react";

const meetings = [
  { time: "10:00", title: "Sprint Planning", room: "Zoom" },
  { time: "14:00", title: "Kunden-Call Schmidt", room: "Teams" },
  { time: "16:30", title: "Review Verkauf", room: "Zoom" },
];

export function MeetingsWidget() {
  return (
    <div className="glass-card flex h-full flex-col overflow-hidden p-6">
      <h2 className="mb-4 text-lg font-bold text-slate-800">Meetings</h2>
      <ul className="space-y-3 overflow-auto">
        {meetings.map((m) => (
          <li key={m.time} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
              <Video className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-800">{m.title}</p>
              <p className="text-xs text-slate-500">{m.time} · {m.room}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
