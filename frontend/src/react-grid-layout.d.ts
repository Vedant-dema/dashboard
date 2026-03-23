declare module "react-grid-layout" {
  import type { ComponentType, CSSProperties, ReactNode } from "react";

  export interface Layout {
    i: string;
    x: number;
    y: number;
    w: number;
    h: number;
    minW?: number;
    maxW?: number;
    minH?: number;
    maxH?: number;
    static?: boolean;
  }

  export interface GridLayoutProps {
    className?: string;
    style?: CSSProperties;
    width: number;
    layout?: Layout[];
    cols?: number;
    rowHeight?: number;
    margin?: [number, number];
    containerPadding?: [number, number];
    onLayoutChange?: (layout: Layout[]) => void;
    isDraggable?: boolean;
    isResizable?: boolean;
    compactType?: "vertical" | "horizontal" | null;
    preventCollision?: boolean;
    draggableHandle?: string;
    children?: ReactNode;
  }

  const GridLayout: ComponentType<GridLayoutProps>;
  export default GridLayout;
}
