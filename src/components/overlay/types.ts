// Overlay Layout Types
export type OverlayComponentType =
  | 'goals'
  | 'chat'
  | 'events'
  | 'tips'
  | 'chroma'
  | 'empty';

export interface OverlayComponentPlacement {
  id: string;
  type: OverlayComponentType;
  gridPosition: {
    row: number;
    column: number;
    rowSpan: number;
    colSpan: number;
  };
  settings?: Record<string, any>;
}

export interface OverlayLayoutConfig {
  width: number;
  height: number;
  grid: {
    rows: number;
    columns: number;
    gap: number;
    padding: number;
  };
  components: OverlayComponentPlacement[];
}

// Widget Props Interface
export interface OverlayWidgetProps {
  width: number;
  height: number;
  settings?: Record<string, any>;
}

// Component metadata for the editor
export interface OverlayComponentMeta {
  label: string;
  icon: string;
  description: string;
  defaultSize: { rowSpan: number; colSpan: number };
  minSize: { rowSpan: number; colSpan: number };
  isChroma: boolean;
}
