import type { OverlayLayoutConfig, OverlayComponentPlacement } from '@/components/overlay';

export interface GridSelection {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

export type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w';

export interface DragState {
  componentId: string;
  mode: 'move' | 'resize';
  resizeHandle?: ResizeHandle;
  startRow: number;
  startCol: number;
  originalPosition: { row: number; column: number; rowSpan: number; colSpan: number };
}

export interface OverlayEditorState {
  layout: OverlayLayoutConfig | null;
  originalLayout: OverlayLayoutConfig | null;
  loading: boolean;
  saving: boolean;
  savedRecently: boolean;
  isDragging: boolean;
  selection: GridSelection | null;
  hoveredComponentId: string | null;
  dragState: DragState | null;
  showComponentPicker: boolean;
  editingComponent: OverlayComponentPlacement | null;
}

// Normalize selection (ensure start < end)
export function normalizeSelection(sel: GridSelection) {
  return {
    minRow: Math.min(sel.startRow, sel.endRow),
    maxRow: Math.max(sel.startRow, sel.endRow),
    minCol: Math.min(sel.startCol, sel.endCol),
    maxCol: Math.max(sel.startCol, sel.endCol),
  };
}
