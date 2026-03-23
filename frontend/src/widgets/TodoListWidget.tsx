import { useState } from "react";
import { Check, Circle } from "lucide-react";

const initial = [
  { id: "a", text: "Angebot nachfassen — Weber", done: false },
  { id: "b", text: "Fahrzeug Fotos hochladen", done: true },
  { id: "c", text: "Rechnung prüfen #2847", done: false },
];

export function TodoListWidget() {
  const [items, setItems] = useState(initial);

  const toggle = (id: string) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, done: !it.done } : it)));
  };

  return (
    <div className="flex h-full flex-col">
      <h2 className="mb-3 text-lg font-bold text-slate-800">To-do Liste</h2>
      <ul className="min-h-0 flex-1 space-y-2 overflow-auto">
        {items.map((it) => (
          <li key={it.id}>
            <button
              type="button"
              onClick={() => toggle(it.id)}
              className="flex w-full items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 text-left transition hover:border-blue-200 hover:bg-white"
            >
              <span className="mt-0.5 shrink-0 text-blue-600">
                {it.done ? <Check className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
              </span>
              <span className={`text-sm font-medium ${it.done ? "text-slate-400 line-through" : "text-slate-800"}`}>
                {it.text}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
