const rows = [
  { id: "1", kunde: "Weber GmbH", status: "Angebot", betrag: "€ 42.500" },
  { id: "2", kunde: "Schmidt AG", status: "Deal", betrag: "€ 28.900" },
  { id: "3", kunde: "Meyer KG", status: "Anfrage", betrag: "—" },
  { id: "4", kunde: "Kuhn Transport", status: "Lieferung", betrag: "€ 12.100" },
];

export function TableWidget() {
  return (
    <div className="flex h-full flex-col">
      <h2 className="mb-3 text-lg font-bold text-slate-800">Tabelle</h2>
      <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[280px] text-left text-sm">
          <thead className="sticky top-0 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2.5">Kunde</th>
              <th className="px-3 py-2.5">Status</th>
              <th className="px-3 py-2.5 text-right">Betrag</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/80">
                <td className="px-3 py-2.5 font-medium text-slate-800">{r.kunde}</td>
                <td className="px-3 py-2.5 text-slate-600">{r.status}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">{r.betrag}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
