import {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
  type LegacyRef,
  type RefObject,
} from "react";
import GridLayout, { type Layout } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import {
  addWidget,
  applyGridLayout,
  getDefaultWidgets,
  loadLayout,
  removeWidget,
  saveLayout,
} from "../store/dashboardLayout";
import type { WidgetInstance, WidgetType } from "../types/dashboard";
import {
  getWidgetComponent,
  getWidgetMeta,
  getAddableWidgetsByGroup,
  WIDGET_GROUP_I18N_KEY,
} from "../widgets/registry";
import { Plus, X, GripVertical } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";

const COLS = 12;
const ROW_HEIGHT = 80;
const MARGIN: [number, number] = [16, 16];
const CONTAINER_PADDING: [number, number] = [0, 0];

function widgetToLayoutItem(w: WidgetInstance, meta: ReturnType<typeof getWidgetMeta>): Layout {
  return {
    i: w.id,
    x: w.grid.x,
    y: w.grid.y,
    w: w.grid.w,
    h: w.grid.h,
    static: !!w.locked,
    minW: meta.minW ?? 1,
    minH: meta.minH ?? 1,
    maxW: meta.maxW ?? COLS,
    maxH: meta.maxH ?? 24,
  };
}

function useContainerWidth(): { ref: RefObject<HTMLDivElement | null>; width: number } {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(1200);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setWidth(Math.max(el.offsetWidth, 320));
    });
    ro.observe(el);
    setWidth(Math.max(el.offsetWidth, 320));
    return () => ro.disconnect();
  }, []);

  return { ref, width };
}

export function DynamicDashboard() {
  const { language, t } = useLanguage();
  const [layoutState, setLayoutState] = useState(() => loadLayout());
  const [showAddPalette, setShowAddPalette] = useState(false);
  const { ref: gridWrapRef, width: gridWidth } = useContainerWidth();

  const layoutItems: Layout[] = layoutState.widgets.map((w) =>
    widgetToLayoutItem(w, getWidgetMeta(w.type))
  );

  const onLayoutChange = useCallback(
    (newLayout: Layout[]) => {
      const next = applyGridLayout(layoutState, newLayout);
      setLayoutState(next);
      saveLayout(next);
    },
    [layoutState]
  );

  const handleRemove = useCallback(
    (widgetId: string) => {
      const next = removeWidget(layoutState, widgetId);
      setLayoutState(next);
      saveLayout(next);
    },
    [layoutState]
  );

  const handleAddWidget = useCallback(
    (type: WidgetType) => {
      const meta = getWidgetMeta(type);
      const maxY = layoutState.widgets.reduce((acc, w) => Math.max(acc, w.grid.y + w.grid.h), 0);
      const newWidget = addWidget(type, {
        x: 0,
        y: maxY,
        w: meta.defaultSize.w,
        h: meta.defaultSize.h,
      });
      const next = {
        ...layoutState,
        widgets: [...layoutState.widgets, newWidget],
      };
      setLayoutState(next);
      saveLayout(next);
      setShowAddPalette(false);
    },
    [layoutState]
  );

  const handleResetLayout = useCallback(() => {
    const defaultLayout = { widgets: getDefaultWidgets(), version: 1 };
    setLayoutState(defaultLayout);
    saveLayout(defaultLayout);
    setShowAddPalette(false);
  }, []);

  const groupedPalette = getAddableWidgetsByGroup();

  return (
    <div className="relative p-6 pb-12">
      <div className="mb-4 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowAddPalette((v) => !v)}
              className="flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              {t("dynamicAddWidget", "Widget hinzufügen")}
            </button>
            <button
              type="button"
              onClick={handleResetLayout}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              {t("dynamicResetLayout", "Layout zurücksetzen")}
            </button>
          </div>
          <p className="text-xs text-slate-500">
            {t(
              "dynamicHint",
              "Ziehen Sie Widgets an eine neue Position · Ecke zum Größen ändern (nicht bei fixen Blöcken)"
            )}
          </p>
        </div>

        {showAddPalette && (
          <div className="glass-card space-y-4 p-4">
            {groupedPalette.map(({ groupKey, items }) => (
              <div key={groupKey}>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                  {t(WIDGET_GROUP_I18N_KEY[groupKey], groupKey)}
                </p>
                <div className="flex flex-wrap gap-2">
                  {items.map((m) => (
                    <button
                      key={m.type}
                      type="button"
                      onClick={() => handleAddWidget(m.type)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:bg-blue-50"
                    >
                      {t(m.titleKey ?? `widgetTitle_${m.type}`, m.title)}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div ref={gridWrapRef as LegacyRef<HTMLDivElement>} className="w-full">
        <GridLayout
          key={language}
          className="layout"
          layout={layoutItems}
          onLayoutChange={onLayoutChange}
          width={gridWidth}
          cols={COLS}
          rowHeight={ROW_HEIGHT}
          margin={MARGIN}
          containerPadding={CONTAINER_PADDING}
          isDraggable={true}
          isResizable={true}
          compactType="vertical"
          preventCollision={false}
          draggableHandle=".dashboard-drag-handle"
        >
          {layoutState.widgets.map((w) => {
            const renderWidget = getWidgetComponent(w.type);
            const isLocked = !!w.locked;
            return (
              <div key={w.id} className="overflow-hidden rounded-2xl">
                <div className="dashboard-widget-shell relative flex h-full flex-col overflow-hidden rounded-2xl bg-white/95 shadow-sm ring-1 ring-slate-200/60">
                  {!isLocked && (
                    <button
                      type="button"
                      className="dashboard-drag-handle dashboard-widget-handle absolute left-2 top-2 z-20 flex h-8 w-8 cursor-grab items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm active:cursor-grabbing hover:bg-slate-50"
                      title={t("dynamicDragToMove", "Ziehen zum Verschieben")}
                      aria-label={t("dynamicMoveWidget", "Widget verschieben")}
                    >
                      <GripVertical className="h-4 w-4" />
                    </button>
                  )}
                  {!isLocked && (
                    <button
                      type="button"
                      onClick={() => handleRemove(w.id)}
                      className="dashboard-widget-remove absolute right-2 top-2 z-20 flex h-8 w-8 items-center justify-center rounded-xl bg-slate-800/80 text-white shadow transition hover:bg-slate-800"
                      title={t("dynamicRemoveWidget", "Widget entfernen")}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  <div
                    className={`flex h-full min-h-0 flex-1 flex-col overflow-auto p-4 ${isLocked ? "" : "pt-12"}`}
                  >
                    <Fragment key={language}>{renderWidget()}</Fragment>
                  </div>
                </div>
              </div>
            );
          })}
        </GridLayout>
      </div>
    </div>
  );
}
