import { useState, useEffect, useCallback } from 'react';
import type { OverlayLayoutConfig, OverlayComponentPlacement, OverlayComponentType } from '@/components/overlay';
import type { GridSelection, DragState, ResizeHandle } from './types';
import { normalizeSelection } from './types';

export function useOverlayLayout(token: string) {
  const [layout, setLayout] = useState<OverlayLayoutConfig | null>(null);
  const [originalLayout, setOriginalLayout] = useState<OverlayLayoutConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedRecently, setSavedRecently] = useState(false);

  const fetchLayout = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/overlay/layout', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      setLayout(data);
      setOriginalLayout(JSON.parse(JSON.stringify(data)));
    } catch (err) {
      console.error('Failed to fetch layout:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchLayout();
  }, [fetchLayout]);

  const saveLayout = useCallback(async () => {
    if (!layout) return;
    setSaving(true);
    try {
      await fetch('/api/admin/overlay/layout', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(layout),
      });
      setOriginalLayout(JSON.parse(JSON.stringify(layout)));
      setSavedRecently(true);
      setTimeout(() => setSavedRecently(false), 2000);
    } catch (err) {
      console.error('Failed to save layout:', err);
    } finally {
      setSaving(false);
    }
  }, [layout, token]);

  const hasChanges = useCallback((): boolean => {
    if (!layout || !originalLayout) return false;
    return JSON.stringify(layout) !== JSON.stringify(originalLayout);
  }, [layout, originalLayout]);

  const updateGridSetting = useCallback((field: 'rows' | 'columns' | 'gap' | 'padding', value: number) => {
    if (!layout) return;
    setLayout({
      ...layout,
      grid: { ...layout.grid, [field]: value },
    });
  }, [layout]);

  const addComponent = useCallback((type: OverlayComponentType, selection: GridSelection) => {
    if (!layout) return;
    const { minRow, maxRow, minCol, maxCol } = normalizeSelection(selection);
    const newId = `${type}-${Date.now()}`;
    const newComponent: OverlayComponentPlacement = {
      id: newId,
      type,
      gridPosition: {
        row: minRow,
        column: minCol,
        rowSpan: maxRow - minRow + 1,
        colSpan: maxCol - minCol + 1,
      },
      settings: {},
    };
    setLayout({
      ...layout,
      components: [...layout.components, newComponent],
    });
  }, [layout]);

  const removeComponent = useCallback((id: string) => {
    if (!layout) return;
    setLayout({
      ...layout,
      components: layout.components.filter((c) => c.id !== id),
    });
  }, [layout]);

  const updateComponent = useCallback((id: string, updates: Partial<OverlayComponentPlacement>) => {
    if (!layout) return;
    setLayout({
      ...layout,
      components: layout.components.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    });
  }, [layout]);

  const updateComponentSettings = useCallback((id: string, settings: Record<string, any>) => {
    if (!layout) return;
    setLayout({
      ...layout,
      components: layout.components.map((c) =>
        c.id === id ? { ...c, settings } : c
      ),
    });
  }, [layout]);

  const isPositionValid = useCallback((
    testPosition: { row: number; column: number; rowSpan: number; colSpan: number },
    excludeComponentId: string
  ): boolean => {
    if (!layout) return false;
    const { row, column, rowSpan, colSpan } = testPosition;

    // Check bounds
    if (row < 0 || column < 0) return false;
    if (row + rowSpan > layout.grid.rows) return false;
    if (column + colSpan > layout.grid.columns) return false;

    // Check for overlaps with other components
    for (const comp of layout.components) {
      if (comp.id === excludeComponentId) continue;

      const compEnd = {
        row: comp.gridPosition.row + comp.gridPosition.rowSpan,
        col: comp.gridPosition.column + comp.gridPosition.colSpan,
      };
      const testEnd = { row: row + rowSpan, col: column + colSpan };

      // Check if rectangles overlap
      const noOverlap =
        testEnd.row <= comp.gridPosition.row ||
        row >= compEnd.row ||
        testEnd.col <= comp.gridPosition.column ||
        column >= compEnd.col;

      if (!noOverlap) return false;
    }

    return true;
  }, [layout]);

  const getCellComponent = useCallback((row: number, col: number): OverlayComponentPlacement | null => {
    if (!layout) return null;
    for (const comp of layout.components) {
      const { row: compRow, column: compCol, rowSpan, colSpan } = comp.gridPosition;
      if (row >= compRow && row < compRow + rowSpan && col >= compCol && col < compCol + colSpan) {
        return comp;
      }
    }
    return null;
  }, [layout]);

  return {
    layout,
    loading,
    saving,
    savedRecently,
    fetchLayout,
    saveLayout,
    hasChanges,
    updateGridSetting,
    addComponent,
    removeComponent,
    updateComponent,
    updateComponentSettings,
    isPositionValid,
    getCellComponent,
  };
}
