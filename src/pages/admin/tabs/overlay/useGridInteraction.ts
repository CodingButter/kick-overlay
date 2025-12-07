import { useState, useCallback } from 'react';
import type { OverlayLayoutConfig, OverlayComponentPlacement } from '@/components/overlay';
import type { GridSelection, DragState, ResizeHandle } from './types';
import { normalizeSelection } from './types';

interface UseGridInteractionProps {
  layout: OverlayLayoutConfig | null;
  updateComponent: (id: string, updates: Partial<OverlayComponentPlacement>) => void;
  isPositionValid: (testPosition: { row: number; column: number; rowSpan: number; colSpan: number }, excludeComponentId: string) => boolean;
}

export function useGridInteraction({ layout, updateComponent, isPositionValid }: UseGridInteractionProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selection, setSelection] = useState<GridSelection | null>(null);
  const [hoveredComponentId, setHoveredComponentId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [showComponentPicker, setShowComponentPicker] = useState(false);

  // Grid cell mouse handlers
  const handleCellMouseDown = useCallback((row: number, col: number) => {
    setIsDragging(true);
    setSelection({ startRow: row, startCol: col, endRow: row, endCol: col });
  }, []);

  const handleCellMouseEnter = useCallback((row: number, col: number) => {
    if (isDragging && selection) {
      setSelection({ ...selection, endRow: row, endCol: col });
    }
  }, [isDragging, selection]);

  const handleCellMouseUp = useCallback(() => {
    setIsDragging(false);
    if (selection) {
      setShowComponentPicker(true);
    }
  }, [selection]);

  const isCellSelected = useCallback((row: number, col: number): boolean => {
    if (!selection) return false;
    const { minRow, maxRow, minCol, maxCol } = normalizeSelection(selection);
    return row >= minRow && row <= maxRow && col >= minCol && col <= maxCol;
  }, [selection]);

  // Component drag handlers
  const handleComponentDragStart = useCallback((
    e: React.MouseEvent,
    comp: OverlayComponentPlacement,
    mode: 'move' | 'resize',
    resizeHandle?: ResizeHandle
  ) => {
    e.preventDefault();
    e.stopPropagation();

    setDragState({
      componentId: comp.id,
      mode,
      resizeHandle,
      startRow: -1,
      startCol: -1,
      originalPosition: { ...comp.gridPosition },
    });
  }, []);

  const getGridCellFromMouse = useCallback((e: React.MouseEvent, containerRect: DOMRect, editorWidth: number): { row: number; col: number } => {
    if (!layout) return { row: 0, col: 0 };

    const editorH = (editorWidth / layout.width) * layout.height;
    const scale = editorWidth / layout.width;
    const padding = layout.grid.padding * scale;
    const gap = layout.grid.gap * scale;

    const relX = e.clientX - containerRect.left - padding;
    const relY = e.clientY - containerRect.top - padding;

    const cellW = (editorWidth - padding * 2 - gap * (layout.grid.columns - 1)) / layout.grid.columns;
    const cellH = (editorH - padding * 2 - gap * (layout.grid.rows - 1)) / layout.grid.rows;

    const col = Math.floor(relX / (cellW + gap));
    const row = Math.floor(relY / (cellH + gap));

    return {
      row: Math.max(0, Math.min(row, layout.grid.rows - 1)),
      col: Math.max(0, Math.min(col, layout.grid.columns - 1)),
    };
  }, [layout]);

  const handleComponentDragMove = useCallback((e: React.MouseEvent, containerRect: DOMRect, editorWidth: number) => {
    if (!dragState || !layout) return;

    const { row: currentRow, col: currentCol } = getGridCellFromMouse(e, containerRect, editorWidth);

    // Initialize start position on first move
    if (dragState.startRow === -1) {
      setDragState({ ...dragState, startRow: currentRow, startCol: currentCol });
      return;
    }

    const deltaRow = currentRow - dragState.startRow;
    const deltaCol = currentCol - dragState.startCol;

    if (deltaRow === 0 && deltaCol === 0) return;

    const { originalPosition, mode, resizeHandle } = dragState;
    let newPosition = { ...originalPosition };

    if (mode === 'move') {
      newPosition = {
        ...originalPosition,
        row: originalPosition.row + deltaRow,
        column: originalPosition.column + deltaCol,
      };
    } else if (mode === 'resize' && resizeHandle) {
      switch (resizeHandle) {
        case 'n':
          newPosition.row = originalPosition.row + deltaRow;
          newPosition.rowSpan = originalPosition.rowSpan - deltaRow;
          break;
        case 's':
          newPosition.rowSpan = originalPosition.rowSpan + deltaRow;
          break;
        case 'w':
          newPosition.column = originalPosition.column + deltaCol;
          newPosition.colSpan = originalPosition.colSpan - deltaCol;
          break;
        case 'e':
          newPosition.colSpan = originalPosition.colSpan + deltaCol;
          break;
        case 'nw':
          newPosition.row = originalPosition.row + deltaRow;
          newPosition.rowSpan = originalPosition.rowSpan - deltaRow;
          newPosition.column = originalPosition.column + deltaCol;
          newPosition.colSpan = originalPosition.colSpan - deltaCol;
          break;
        case 'ne':
          newPosition.row = originalPosition.row + deltaRow;
          newPosition.rowSpan = originalPosition.rowSpan - deltaRow;
          newPosition.colSpan = originalPosition.colSpan + deltaCol;
          break;
        case 'sw':
          newPosition.rowSpan = originalPosition.rowSpan + deltaRow;
          newPosition.column = originalPosition.column + deltaCol;
          newPosition.colSpan = originalPosition.colSpan - deltaCol;
          break;
        case 'se':
          newPosition.rowSpan = originalPosition.rowSpan + deltaRow;
          newPosition.colSpan = originalPosition.colSpan + deltaCol;
          break;
      }
    }

    // Ensure minimum size of 1x1
    if (newPosition.rowSpan < 1) {
      newPosition.rowSpan = 1;
      if (resizeHandle?.includes('n')) {
        newPosition.row = originalPosition.row + originalPosition.rowSpan - 1;
      }
    }
    if (newPosition.colSpan < 1) {
      newPosition.colSpan = 1;
      if (resizeHandle?.includes('w')) {
        newPosition.column = originalPosition.column + originalPosition.colSpan - 1;
      }
    }

    // Only update if position is valid
    if (isPositionValid(newPosition, dragState.componentId)) {
      updateComponent(dragState.componentId, { gridPosition: newPosition });
    }
  }, [dragState, layout, getGridCellFromMouse, isPositionValid, updateComponent]);

  const handleComponentDragEnd = useCallback(() => {
    setDragState(null);
  }, []);

  const clearSelection = useCallback(() => {
    setSelection(null);
    setShowComponentPicker(false);
  }, []);

  return {
    isDragging,
    selection,
    hoveredComponentId,
    dragState,
    showComponentPicker,
    setIsDragging,
    setSelection,
    setHoveredComponentId,
    setShowComponentPicker,
    handleCellMouseDown,
    handleCellMouseEnter,
    handleCellMouseUp,
    isCellSelected,
    handleComponentDragStart,
    handleComponentDragMove,
    handleComponentDragEnd,
    clearSelection,
  };
}
