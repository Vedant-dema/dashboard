import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useLanguage } from "../contexts/LanguageContext";

type SignatureInputProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

function isDataUrl(v: string): boolean {
  return v.startsWith("data:image/");
}

function typedValue(v: string): string {
  if (v.startsWith("typed:")) return v.slice("typed:".length);
  return isDataUrl(v) ? "" : v;
}

export function SignatureInput({ value, onChange, className = "" }: SignatureInputProps) {
  const { t } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const modeFromValue = useMemo<"draw" | "type">(
    () => (isDataUrl(value) ? "draw" : "type"),
    [value]
  );
  const [mode, setMode] = useState<"draw" | "type">(modeFromValue);
  const [typed, setTyped] = useState(typedValue(value));

  useEffect(() => {
    setMode(modeFromValue);
    setTyped(typedValue(value));
  }, [modeFromValue, value]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || 360;
    const height = canvas.clientHeight || 120;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (isDataUrl(value)) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, width, height);
      img.src = value;
    }
  }, [value, mode]);

  function pointerPos(e: ReactPointerEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function beginDraw(e: ReactPointerEvent<HTMLCanvasElement>) {
    const ctx = e.currentTarget.getContext("2d");
    if (!ctx) return;
    drawingRef.current = true;
    const { x, y } = pointerPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function draw(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const ctx = e.currentTarget.getContext("2d");
    if (!ctx) return;
    const { x, y } = pointerPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function endDraw(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
    onChange(e.currentTarget.toDataURL("image/png"));
  }

  function clearSignature() {
    onChange("");
  }

  return (
    <div className={className}>
      <div className="mb-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setMode("draw");
            if (!isDataUrl(value)) onChange("");
          }}
          className={`rounded-md px-2.5 py-1.5 text-xs font-semibold ${
            mode === "draw" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"
          }`}
        >
          {t("signatureDraw", "Draw")}
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("type");
            if (isDataUrl(value)) onChange(`typed:${typed}`);
          }}
          className={`rounded-md px-2.5 py-1.5 text-xs font-semibold ${
            mode === "type" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"
          }`}
        >
          {t("signatureType", "Type")}
        </button>
        <button
          type="button"
          onClick={clearSignature}
          className="ml-auto rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          {t("signatureClear", "Clear")}
        </button>
      </div>

      {mode === "draw" ? (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <canvas
            ref={canvasRef}
            className="h-28 w-full touch-none"
            onPointerDown={beginDraw}
            onPointerMove={draw}
            onPointerUp={endDraw}
            onPointerCancel={endDraw}
          />
        </div>
      ) : (
        <input
          value={typed}
          onChange={(e) => {
            const next = e.target.value;
            setTyped(next);
            onChange(next ? `typed:${next}` : "");
          }}
          placeholder={t("signatureTypePlaceholder", "Type full name")}
          className="h-10 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-800"
        />
      )}
    </div>
  );
}

