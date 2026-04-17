import { useId } from "react";

export type SimpleChartPoint = {
  label: string;
  value: number;
  color?: string;
};

function finiteValue(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function chartBounds(points: SimpleChartPoint[]) {
  const values = points.map((p) => finiteValue(p.value));
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: 0, max: 1 };
  if (min === max) return { min: Math.max(0, min - 1), max: max + 1 };
  return { min, max };
}

function pathFor(points: { x: number; y: number }[]): string {
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
}

export function SimpleLineChart({
  points,
  color = "#2563eb",
  area = false,
  ariaLabel = "Line chart",
}: {
  points: SimpleChartPoint[];
  color?: string;
  area?: boolean;
  ariaLabel?: string;
}) {
  const gradientId = `simple-line-${useId().replace(/:/g, "")}`;
  const safePoints = points.length > 0 ? points : [{ label: "-", value: 0 }];
  const width = 360;
  const height = 180;
  const left = 24;
  const right = 14;
  const top = 14;
  const bottom = 30;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const { min, max } = chartBounds(safePoints);
  const span = max - min || 1;
  const coords = safePoints.map((p, i) => {
    const x = left + (safePoints.length === 1 ? chartWidth / 2 : (i / (safePoints.length - 1)) * chartWidth);
    const y = top + (1 - (finiteValue(p.value) - min) / span) * chartHeight;
    return { x, y };
  });
  const line = pathFor(coords);
  const areaPath =
    coords.length > 0
      ? `${line} L ${coords[coords.length - 1]!.x.toFixed(2)} ${height - bottom} L ${coords[0]!.x.toFixed(2)} ${
          height - bottom
        } Z`
      : "";
  const labelEvery = safePoints.length > 6 ? Math.ceil(safePoints.length / 4) : 1;

  return (
    <svg className="h-full w-full overflow-visible" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.24" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1={left} y1={height - bottom} x2={width - right} y2={height - bottom} stroke="#e2e8f0" />
      {area && <path d={areaPath} fill={`url(#${gradientId})`} />}
      <path d={line} fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
      {coords.map((p, i) => (
        <circle key={`${safePoints[i]!.label}-${i}`} cx={p.x} cy={p.y} r="3.5" fill="#ffffff" stroke={color} strokeWidth="2" />
      ))}
      {safePoints.map((p, i) =>
        i % labelEvery === 0 || i === safePoints.length - 1 ? (
          <text key={`${p.label}-${i}`} x={coords[i]!.x} y={height - 9} textAnchor="middle" className="fill-slate-500 text-[11px]">
            {p.label}
          </text>
        ) : null
      )}
    </svg>
  );
}

export function SimpleBarChart({
  points,
  color = "#0d9488",
  ariaLabel = "Bar chart",
}: {
  points: SimpleChartPoint[];
  color?: string;
  ariaLabel?: string;
}) {
  const safePoints = points.length > 0 ? points : [{ label: "-", value: 0 }];
  const width = 360;
  const height = 180;
  const left = 18;
  const right = 18;
  const top = 18;
  const bottom = 32;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const max = Math.max(1, ...safePoints.map((p) => finiteValue(p.value)));
  const slot = chartWidth / safePoints.length;
  const barWidth = Math.max(12, Math.min(72, slot * 0.58));
  const labelEvery = safePoints.length > 6 ? Math.ceil(safePoints.length / 4) : 1;

  return (
    <svg className="h-full w-full overflow-visible" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel}>
      <line x1={left} y1={height - bottom} x2={width - right} y2={height - bottom} stroke="#e2e8f0" />
      {safePoints.map((p, i) => {
        const value = Math.max(0, finiteValue(p.value));
        const barHeight = (value / max) * chartHeight;
        const x = left + i * slot + (slot - barWidth) / 2;
        const y = top + chartHeight - barHeight;
        return (
          <g key={`${p.label}-${i}`}>
            <rect x={x} y={y} width={barWidth} height={barHeight} rx="7" fill={p.color ?? color} />
            {(i % labelEvery === 0 || i === safePoints.length - 1) && (
              <text x={x + barWidth / 2} y={height - 9} textAnchor="middle" className="fill-slate-500 text-[11px]">
                {p.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export function SimpleDonutChart({
  segments,
  ariaLabel = "Donut chart",
}: {
  segments: SimpleChartPoint[];
  ariaLabel?: string;
}) {
  const safeSegments = segments.filter((s) => finiteValue(s.value) > 0);
  const total = safeSegments.reduce((sum, s) => sum + finiteValue(s.value), 0) || 1;
  const size = 150;
  const center = size / 2;
  const radius = 52;
  const stroke = 18;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <svg className="h-full w-full" viewBox={`0 0 ${size} ${size}`} role="img" aria-label={ariaLabel}>
      <circle cx={center} cy={center} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
      {safeSegments.map((segment, index) => {
        const portion = finiteValue(segment.value) / total;
        const dash = portion * circumference;
        const dashOffset = -offset;
        offset += dash;
        return (
          <circle
            key={`${segment.label}-${index}`}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={segment.color ?? "#2563eb"}
            strokeWidth={stroke}
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${center} ${center})`}
          />
        );
      })}
      <text x={center} y={center - 2} textAnchor="middle" className="fill-slate-800 text-[22px] font-bold">
        {Math.round(total)}
      </text>
      <text x={center} y={center + 17} textAnchor="middle" className="fill-slate-500 text-[10px] font-semibold uppercase">
        Total
      </text>
    </svg>
  );
}
