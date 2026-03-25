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
  updateWidgetConfig,
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
    // Only fully-locked widgets are static; pinned widgets can still be moved/resized
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

  const handleSaveWidgetConfig = useCallback(
    (widgetId: string, patch: Record<string, unknown>) => {
      setLayoutState((prev) => {
        const next = updateWidgetConfig(prev, widgetId, patch);
        saveLayout(next);
        return next;
      });
    },
    []
  );

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
            const isPinned = !!w.pinned;
            const isDraggable = !isLocked;
            const isRemovable = !isLocked && !isPinned;
            const meta = getWidgetMeta(w.type);
            const moduleLabel = t(meta.titleKey ?? `widgetTitle_${w.type}`, meta.title);
            return (
              <div key={w.id} className="overflow-hidden rounded-2xl">
                <div className="dashboard-widget-shell flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                  {w.type !== "welcome" && (
                    <div className="flex h-9 shrink-0 items-center gap-0.5 border-b border-slate-200 bg-slate-50/90 px-1">
                      {isDraggable ? (
                        <button
                          type="button"
                          className="dashboard-drag-handle dashboard-widget-handle flex h-8 w-8 shrink-0 cursor-grab items-center justify-center rounded-lg text-slate-400 transition active:cursor-grabbing hover:bg-white hover:text-slate-600"
                          title={t("dynamicDragToMove", "Zum Verschieben ziehen")}
                          aria-label={t("dynamicMoveWidget", "Modul verschieben")}
                        >
                          <GripVertical className="h-4 w-4" />
                        </button>
                      ) : (
                        <span className="w-2 shrink-0" aria-hidden />
                      )}
                      <span
                        className="min-w-0 flex-1 truncate px-1.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                        title={moduleLabel}
                      >
                        {moduleLabel}
                      </span>
                      {isPinned && (
                        <span
                          className="mr-1 flex h-5 items-center rounded-full bg-blue-100 px-2 text-[10px] font-semibold text-blue-600"
                          title={t("dynamicPinnedWidget", "Dieses Widget ist fixiert und kann nicht entfernt werden")}
                        >
                          {t("dynamicPinned", "Fixiert")}
                        </span>
                      )}
                      {isRemovable && (
                        <button
                          type="button"
                          onClick={() => handleRemove(w.id)}
                          className="dashboard-widget-remove flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                          title={t("dynamicRemoveWidget", "Modul entfernen")}
                          aria-label={t("dynamicRemoveWidget", "Modul entfernen")}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )}
                  <div className="min-h-0 flex-1 overflow-auto p-4">
                    <Fragment key={language}>
                      {renderWidget({
                        config: w.config ?? {},
                        widgetId: w.id,
                        onUpdateConfig: (patch) => handleSaveWidgetConfig(w.id, patch),
                      })}
                    </Fragment>
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
