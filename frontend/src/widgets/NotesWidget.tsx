import { StickyNote } from "lucide-react";

export function NotesWidget() {
  return (
    <div className="glass-card flex h-full flex-col overflow-hidden p-6">
      <h2 className="mb-4 text-lg font-bold text-slate-800">Notizen</h2>
      <div className="flex flex-1 flex-col gap-3 overflow-auto">
        <textarea
          placeholder="Schnellnotiz hinzufügen…"
          className="min-h-[80px] w-full resize-none rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          rows={3}
        />
        <div className="flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50/80 p-3">
          <StickyNote className="h-5 w-5 shrink-0 text-amber-600" />
          <p className="text-sm text-slate-600">Ihre Notizen werden hier gespeichert.</p>
        </div>
      </div>
    </div>
  );
}
