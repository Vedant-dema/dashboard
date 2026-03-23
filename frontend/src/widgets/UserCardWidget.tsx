import { useState, useEffect } from "react";
import { MapPin, LogIn, LogOut } from "lucide-react";

const STORAGE_KEY = "dema-punch-status";

type PunchStatus = "in" | "out" | null;

function loadPunchStatus(): PunchStatus {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "in" || raw === "out") return raw;
    return null;
  } catch {
    return null;
  }
}

function savePunchStatus(status: PunchStatus): void {
  try {
    if (status) localStorage.setItem(STORAGE_KEY, status);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function UserCardWidget() {
  const [punchStatus, setPunchStatus] = useState<PunchStatus>(() => loadPunchStatus());

  useEffect(() => {
    savePunchStatus(punchStatus);
  }, [punchStatus]);

  const handlePunchIn = () => setPunchStatus("in");
  const handlePunchOut = () => setPunchStatus("out");

  const statusLabel =
    punchStatus === "in" ? "Eingestochen" : punchStatus === "out" ? "Ausgestochen" : "Nicht gestochen";

  return (
    <div className="glass-card flex h-full flex-col overflow-hidden p-6">
      <div className="flex items-start gap-4">
        <div className="h-14 w-14 shrink-0 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 ring-4 ring-blue-50" />
        <div className="min-w-0 flex-1">
          <p className="text-lg font-bold text-slate-800">Tom Müller</p>
          <p
            className={`mt-0.5 inline-flex items-center gap-1.5 text-sm font-medium ${
              punchStatus === "in"
                ? "text-emerald-600"
                : punchStatus === "out"
                  ? "text-red-600"
                  : "text-slate-500"
            }`}
          >
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                punchStatus === "in"
                  ? "bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"
                  : punchStatus === "out"
                    ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"
                    : "bg-slate-300"
              }`}
              title={statusLabel}
            />
            {statusLabel}
          </p>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
            <MapPin className="h-3.5 w-3.5" />
            Hamburg Büro
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-700">8:45</p>
          <p className="text-xs text-slate-400">Uhr</p>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={handlePunchIn}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition ${
            punchStatus === "in"
              ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30 ring-2 ring-emerald-400"
              : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
          }`}
        >
          <LogIn className="h-4 w-4" />
          Punch In
        </button>
        <button
          type="button"
          onClick={handlePunchOut}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition ${
            punchStatus === "out"
              ? "bg-red-500 text-white shadow-md shadow-red-500/30 ring-2 ring-red-400"
              : "bg-red-50 text-red-700 hover:bg-red-100"
          }`}
        >
          <LogOut className="h-4 w-4" />
          Punch Out
        </button>
      </div>
    </div>
  );
}
