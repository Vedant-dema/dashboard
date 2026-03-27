/**
 * DocExtractBanner
 * Document upload UI for the customer form.
 * Three states: idle (drop zone) → scanning (animated) → done (results summary).
 * This is UI-only — actual OCR/extraction is wired in by the parent via onFileSelect.
 */
import { useEffect, useRef, useState } from "react";
import {
  FileText,
  Upload,
  X,
  CheckCircle2,
  Sparkles,
  AlertCircle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ScanState = "idle" | "scanning" | "done" | "error";

interface DocExtractBannerProps {
  scanState: ScanState;
  fileName: string;
  extractedCount: number;
  onFileSelect: (file: File) => void;
  onClear: () => void;
}

// ─── Accepted file types ──────────────────────────────────────────────────────

const ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp,.docx";
const MAX_MB = 10;

// ─── Scanning progress animation ─────────────────────────────────────────────

const SCAN_STEPS = [
  "Dokument wird gelesen…",
  "Unternehmensname wird erkannt…",
  "Adressdaten werden extrahiert…",
  "Kontaktdaten werden analysiert…",
  "Formular wird ausgefüllt…",
];

function ScanningAnimation({ fileName }: { fileName: string }) {
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(8);

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setStep((s) => Math.min(s + 1, SCAN_STEPS.length - 1));
    }, 500);
    const progInterval = setInterval(() => {
      setProgress((p) => Math.min(p + 4, 92));
    }, 120);
    return () => { clearInterval(stepInterval); clearInterval(progInterval); };
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5">
        {/* Spinning doc icon */}
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100">
          <FileText className="h-5 w-5 text-blue-600" />
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600">
            <svg className="h-2.5 w-2.5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-700">{fileName}</p>
          <p className="text-xs text-blue-600 transition-all duration-300">{SCAN_STEPS[step]}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all duration-150"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Shimmer rows simulating field detection */}
      <div className="space-y-1.5">
        {[90, 70, 85, 60].map((w, i) => (
          <div
            key={i}
            className="h-3 animate-pulse rounded-full bg-slate-100"
            style={{ width: `${w}%`, animationDelay: `${i * 0.1}s` }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DocExtractBanner({
  scanState,
  fileName,
  extractedCount,
  onFileSelect,
  onClear,
}: DocExtractBannerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const file = files[0]!;
    if (file.size > MAX_MB * 1024 * 1024) return; // silently ignore oversized
    onFileSelect(file);
  };

  // ── Drag handlers ──
  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  // ── Idle state ────────────────────────────────────────────────────────────
  if (scanState === "idle") {
    return (
      <div
        className={`relative cursor-pointer overflow-hidden rounded-xl border border-dashed transition-all ${
          isDragging
            ? "border-blue-400 bg-blue-50/80 shadow-md shadow-blue-100"
            : "border-slate-200 bg-slate-50/40 hover:border-blue-300 hover:bg-blue-50/30"
        }`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click(); }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
          onClick={(e) => ((e.target as HTMLInputElement).value = "")}
        />

        <div className="flex items-center justify-center gap-3 px-4 py-2 text-center">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-100 to-violet-100">
            <Upload className="h-3.5 w-3.5 text-blue-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-700">
              Dokument hochladen
              <span className="ml-1.5 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-blue-600 to-violet-600 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                <Sparkles className="h-2 w-2" />
                KI-Extraktion
              </span>
            </p>
            <p className="text-[10px] text-slate-400">
              PDF, DOCX, PNG, JPG — max. {MAX_MB} MB
            </p>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-lg border border-blue-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-blue-600 shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
          >
            Datei auswählen
          </button>
        </div>
      </div>
    );
  }

  // ── Scanning state ────────────────────────────────────────────────────────
  if (scanState === "scanning") {
    return (
      <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50/80 to-violet-50/60 p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-blue-600">
            <Sparkles className="h-3 w-3" />
            KI-Analyse läuft
          </span>
        </div>
        <ScanningAnimation fileName={fileName} />
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (scanState === "error") {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/60 p-4">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
        <div className="flex-1 text-sm">
          <p className="font-semibold text-red-700">Extraktion fehlgeschlagen</p>
          <p className="text-xs text-red-600">Das Dokument konnte nicht verarbeitet werden. Bitte manuell ausfüllen.</p>
        </div>
        <button type="button" onClick={onClear} className="text-red-400 hover:text-red-600">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  // ── Done state ────────────────────────────────────────────────────────────
  return (
    <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50/80 to-teal-50/60 shadow-sm">
      <div className="flex items-start gap-3 p-3.5">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-slate-700">
              {extractedCount} Felder automatisch ausgefüllt
            </p>
            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-blue-600 to-violet-600 px-2 py-0.5 text-[10px] font-semibold text-white">
              <Sparkles className="h-2.5 w-2.5" />
              KI-Extraktion
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            Aus: <span className="font-medium text-slate-600">{fileName}</span>
          </p>
          <p className="mt-1 text-xs text-amber-700">
            Bitte überprüfen Sie die ausgefüllten Felder und korrigieren Sie bei Bedarf.
          </p>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="shrink-0 rounded-lg p-1 text-slate-400 transition hover:bg-white/60 hover:text-slate-600"
          title="Extraktion zurücksetzen"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Bottom info bar */}
      <div className="border-t border-emerald-200/60 bg-emerald-50/60 px-3.5 py-1.5">
        <p className="text-[10px] text-emerald-700">
          Markierte Felder{" "}
          <span className="inline-flex items-center gap-0.5 rounded-full bg-gradient-to-r from-blue-600 to-violet-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
            <Sparkles className="h-2 w-2" />KI
          </span>{" "}
          wurden automatisch erkannt — Mitarbeiter kann Werte jederzeit ändern.
        </p>
      </div>
    </div>
  );
}

// ─── KI badge for individual form fields ──────────────────────────────────────

/**
 * Renders a glowing "KI" pill to place next to a field label when the field
 * was auto-filled by document extraction.
 */
export function KiBadge() {
  return (
    <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-gradient-to-r from-blue-600 to-violet-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
      <Sparkles className="h-2 w-2" />
      KI
    </span>
  );
}

/**
 * Wraps an input/select with an amber highlight ring when extracted.
 */
export function ExtractedFieldWrapper({
  extracted,
  children,
}: {
  extracted: boolean;
  children: React.ReactNode;
}) {
  if (!extracted) return <>{children}</>;
  return (
    <div className="relative">
      <div className="absolute -inset-0.5 rounded-lg bg-gradient-to-r from-blue-500/20 to-violet-500/20 blur-sm" />
      <div className="relative ring-2 ring-blue-400/50 rounded-lg">
        {children}
      </div>
    </div>
  );
}
