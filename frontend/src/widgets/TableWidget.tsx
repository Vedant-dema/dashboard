import { useMemo } from "react";
import type { WidgetRenderProps } from "../types/dashboard";
import { cfgString } from "./widgetConfigHelpers";
import { DEFAULT_TABLE_ROWS } from "./defaultWidgetData";
import { parseTableConfig } from "./parseLineFormats";

const DEFAULT_HEADERS = ["Kunde", "Status", "Betrag"];
const DEFAULT_ROWS = DEFAULT_TABLE_ROWS.map((r) => [r.kunde, r.status, r.betrag]);

export function TableWidget({ config }: WidgetRenderProps) {
  const title = cfgString(config, "customTitle", "Tabelle");
  const { headers, rows } = useMemo(
    () =>
      parseTableConfig(
        config.tableHeaders as string | undefined,
        config.tableRows as string | undefined,
        DEFAULT_HEADERS,
        DEFAULT_ROWS
      ),
    [config.tableHeaders, config.tableRows]
  );

  return (
    <div className="flex h-full flex-col">
      <h2 className="mb-3 text-lg font-bold text-slate-800">{title}</h2>
      <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[280px] text-left text-sm">
          <thead className="sticky top-0 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              {headers.map((h) => (
                <th key={h} className="px-3 py-2.5">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((cells, ri) => (
              <tr key={ri} className="hover:bg-slate-50/80">
                {cells.map((cell, ci) => (
                  <td
                    key={ci}
                    className={`px-3 py-2.5 text-slate-800 ${ci === cells.length - 1 ? "text-right tabular-nums" : "font-medium"}`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
