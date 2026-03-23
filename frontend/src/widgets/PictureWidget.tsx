import type { WidgetRenderProps } from "../types/dashboard";
import { cfgString } from "./widgetConfigHelpers";

const DEFAULT_URL = "https://picsum.photos/seed/dema-dashboard/800/450";

export function PictureWidget({ config }: WidgetRenderProps) {
  const title = cfgString(config, "customTitle", "Bild");
  const src = cfgString(config, "imageUrl", DEFAULT_URL);
  const caption = cfgString(config, "imageCaption", "Platzhalter — später eigenes Bild / URL");
  return (
    <div className="flex h-full flex-col">
      <h2 className="mb-3 text-lg font-bold text-slate-800">{title}</h2>
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200/80">
        <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
        <p className="absolute bottom-2 left-2 right-2 rounded-lg bg-black/50 px-2 py-1 text-center text-xs text-white backdrop-blur-sm">
          {caption}
        </p>
      </div>
    </div>
  );
}
