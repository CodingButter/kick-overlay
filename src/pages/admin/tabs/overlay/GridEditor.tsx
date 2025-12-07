import { useRef } from 'react';
import { Settings, Trash2 } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { OVERLAY_COMPONENTS, type OverlayLayoutConfig, type OverlayComponentPlacement } from '@/components/overlay';
import type { DragState, ResizeHandle } from './types';

interface GridEditorProps {
  layout: OverlayLayoutConfig;
  hoveredComponentId: string | null;
  dragState: DragState | null;
  isDragging: boolean;
  editorWidth: number;
  getCellComponent: (row: number, col: number) => OverlayComponentPlacement | null;
  isCellSelected: (row: number, col: number) => boolean;
  onCellMouseDown: (row: number, col: number) => void;
  onCellMouseEnter: (row: number, col: number) => void;
  onMouseUp: () => void;
  onMouseLeave: () => void;
  onMouseMove: (e: React.MouseEvent, rect: DOMRect) => void;
  onComponentHover: (id: string | null) => void;
  onComponentDragStart: (e: React.MouseEvent, comp: OverlayComponentPlacement, mode: 'move' | 'resize', handle?: ResizeHandle) => void;
  onComponentEdit: (comp: OverlayComponentPlacement) => void;
  onComponentDelete: (id: string) => void;
}

export function GridEditor({
  layout,
  hoveredComponentId,
  dragState,
  isDragging,
  editorWidth,
  getCellComponent,
  isCellSelected,
  onCellMouseDown,
  onCellMouseEnter,
  onMouseUp,
  onMouseLeave,
  onMouseMove,
  onComponentHover,
  onComponentDragStart,
  onComponentEdit,
  onComponentDelete,
}: GridEditorProps) {
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const editorHeight = (editorWidth / layout.width) * layout.height;
  const scale = editorWidth / layout.width;
  const handleSize = 10;

  return (
    <div
      ref={containerRef}
      className="relative bg-secondary/30 rounded-xl overflow-hidden select-none"
      style={{
        width: editorWidth,
        height: editorHeight,
        margin: '0 auto',
      }}
      onMouseMove={(e) => {
        if (containerRef.current) {
          onMouseMove(e, containerRef.current.getBoundingClientRect());
        }
      }}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
    >
      {/* Background grid cells */}
      <div
        className="absolute inset-0"
        style={{
          padding: layout.grid.padding * scale,
          display: 'grid',
          gridTemplateColumns: `repeat(${layout.grid.columns}, 1fr)`,
          gridTemplateRows: `repeat(${layout.grid.rows}, 1fr)`,
          gap: layout.grid.gap * scale,
        }}
      >
        {Array.from({ length: layout.grid.rows * layout.grid.columns }).map((_, i) => {
          const row = Math.floor(i / layout.grid.columns);
          const col = i % layout.grid.columns;
          const isSelected = isCellSelected(row, col);
          const occupiedBy = getCellComponent(row, col);

          return (
            <div
              key={i}
              className={`rounded transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-primary/40 border-2 border-primary'
                  : occupiedBy
                  ? 'bg-transparent'
                  : 'bg-white/5 border border-dashed border-white/10 hover:bg-white/10'
              }`}
              onMouseDown={(e) => {
                if (!occupiedBy) {
                  e.preventDefault();
                  onCellMouseDown(row, col);
                }
              }}
              onMouseEnter={() => onCellMouseEnter(row, col)}
            />
          );
        })}
      </div>

      {/* Rendered components */}
      {layout.components.map((comp) => {
        const componentDef = OVERLAY_COMPONENTS[comp.type];
        if (!componentDef) return null;
        const meta = componentDef.meta;
        const { row, column, rowSpan, colSpan } = comp.gridPosition;

        // Calculate position
        const padding = layout.grid.padding * scale;
        const gap = layout.grid.gap * scale;
        const cellW = (editorWidth - padding * 2 - gap * (layout.grid.columns - 1)) / layout.grid.columns;
        const cellH = (editorHeight - padding * 2 - gap * (layout.grid.rows - 1)) / layout.grid.rows;
        const x = padding + column * (cellW + gap);
        const y = padding + row * (cellH + gap);
        const w = colSpan * cellW + (colSpan - 1) * gap;
        const h = rowSpan * cellH + (rowSpan - 1) * gap;

        const isHovered = hoveredComponentId === comp.id;
        const isDraggingThis = dragState?.componentId === comp.id;
        const displayLabel = comp.settings?.label || meta.label;

        // Determine resize possibilities
        const canExpandLeft = column > 0 && !layout.components.some(c =>
          c.id !== comp.id &&
          c.gridPosition.column + c.gridPosition.colSpan === column &&
          !(c.gridPosition.row + c.gridPosition.rowSpan <= row || c.gridPosition.row >= row + rowSpan)
        );
        const canExpandRight = column + colSpan < layout.grid.columns && !layout.components.some(c =>
          c.id !== comp.id &&
          c.gridPosition.column === column + colSpan &&
          !(c.gridPosition.row + c.gridPosition.rowSpan <= row || c.gridPosition.row >= row + rowSpan)
        );
        const canExpandUp = row > 0 && !layout.components.some(c =>
          c.id !== comp.id &&
          c.gridPosition.row + c.gridPosition.rowSpan === row &&
          !(c.gridPosition.column + c.gridPosition.colSpan <= column || c.gridPosition.column >= column + colSpan)
        );
        const canExpandDown = row + rowSpan < layout.grid.rows && !layout.components.some(c =>
          c.id !== comp.id &&
          c.gridPosition.row === row + rowSpan &&
          !(c.gridPosition.column + c.gridPosition.colSpan <= column || c.gridPosition.column >= column + colSpan)
        );

        return (
          <div
            key={comp.id}
            className="absolute rounded-lg transition-all"
            style={{
              left: x,
              top: y,
              width: w,
              height: h,
              backgroundColor: meta.isChroma ? theme.chromaKeyColor : 'var(--card)',
              border: isDraggingThis ? '3px solid var(--primary)' : isHovered ? '3px solid var(--primary)' : '2px solid rgba(255, 255, 255, 0.3)',
              cursor: isDraggingThis ? (dragState.mode === 'move' ? 'grabbing' : 'auto') : 'grab',
              zIndex: isDraggingThis ? 10 : 1,
            }}
            onMouseEnter={() => !dragState && onComponentHover(comp.id)}
            onMouseLeave={() => !dragState && onComponentHover(null)}
          >
            {/* Component content */}
            <div className="component-content w-full h-full flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <div className="text-2xl mb-1">{meta.icon}</div>
                <div className="text-xs font-medium text-foreground/80">{displayLabel}</div>
              </div>
            </div>

            {/* Hover controls */}
            {isHovered && !dragState && (
              <div
                className="absolute inset-0 bg-black/50 flex items-center justify-center gap-3 rounded-lg"
                onMouseDown={(e) => {
                  if (e.target === e.currentTarget) {
                    onComponentDragStart(e, comp, 'move');
                  }
                }}
              >
                <button
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onComponentEdit(comp);
                  }}
                  className="p-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/80 transition-colors shadow-lg"
                  title="Edit"
                >
                  <Settings className="w-6 h-6" />
                </button>
                <button
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onComponentDelete(comp.id);
                  }}
                  className="p-3 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/80 transition-colors shadow-lg"
                  title="Delete"
                >
                  <Trash2 className="w-6 h-6" />
                </button>
              </div>
            )}

            {/* Drag overlay when not hovered */}
            {!isHovered && !dragState && (
              <div
                className="absolute inset-0"
                onMouseDown={(e) => onComponentDragStart(e, comp, 'move')}
              />
            )}

            {/* Resize handles */}
            {(isHovered || isDraggingThis) && (
              <ResizeHandles
                handleSize={handleSize}
                canExpandUp={canExpandUp}
                canExpandDown={canExpandDown}
                canExpandLeft={canExpandLeft}
                canExpandRight={canExpandRight}
                rowSpan={rowSpan}
                colSpan={colSpan}
                onDragStart={(e, handle) => onComponentDragStart(e, comp, 'resize', handle)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

interface ResizeHandlesProps {
  handleSize: number;
  canExpandUp: boolean;
  canExpandDown: boolean;
  canExpandLeft: boolean;
  canExpandRight: boolean;
  rowSpan: number;
  colSpan: number;
  onDragStart: (e: React.MouseEvent, handle: ResizeHandle) => void;
}

function ResizeHandles({
  handleSize,
  canExpandUp,
  canExpandDown,
  canExpandLeft,
  canExpandRight,
  rowSpan,
  colSpan,
  onDragStart,
}: ResizeHandlesProps) {
  return (
    <>
      {/* Corner handles */}
      {(canExpandUp || canExpandLeft || colSpan > 1 || rowSpan > 1) && (
        <div
          className="absolute bg-primary rounded-sm"
          style={{ left: -handleSize / 2, top: -handleSize / 2, width: handleSize, height: handleSize, cursor: 'nwse-resize' }}
          onMouseDown={(e) => onDragStart(e, 'nw')}
        />
      )}
      {(canExpandUp || canExpandRight || colSpan > 1 || rowSpan > 1) && (
        <div
          className="absolute bg-primary rounded-sm"
          style={{ right: -handleSize / 2, top: -handleSize / 2, width: handleSize, height: handleSize, cursor: 'nesw-resize' }}
          onMouseDown={(e) => onDragStart(e, 'ne')}
        />
      )}
      {(canExpandDown || canExpandLeft || colSpan > 1 || rowSpan > 1) && (
        <div
          className="absolute bg-primary rounded-sm"
          style={{ left: -handleSize / 2, bottom: -handleSize / 2, width: handleSize, height: handleSize, cursor: 'nesw-resize' }}
          onMouseDown={(e) => onDragStart(e, 'sw')}
        />
      )}
      {(canExpandDown || canExpandRight || colSpan > 1 || rowSpan > 1) && (
        <div
          className="absolute bg-primary rounded-sm"
          style={{ right: -handleSize / 2, bottom: -handleSize / 2, width: handleSize, height: handleSize, cursor: 'nwse-resize' }}
          onMouseDown={(e) => onDragStart(e, 'se')}
        />
      )}

      {/* Edge handles */}
      {(canExpandUp || rowSpan > 1) && (
        <div
          className="absolute bg-primary/60 rounded-sm"
          style={{ left: '50%', transform: 'translateX(-50%)', top: -handleSize / 2, width: handleSize * 3, height: handleSize, cursor: 'ns-resize' }}
          onMouseDown={(e) => onDragStart(e, 'n')}
        />
      )}
      {(canExpandDown || rowSpan > 1) && (
        <div
          className="absolute bg-primary/60 rounded-sm"
          style={{ left: '50%', transform: 'translateX(-50%)', bottom: -handleSize / 2, width: handleSize * 3, height: handleSize, cursor: 'ns-resize' }}
          onMouseDown={(e) => onDragStart(e, 's')}
        />
      )}
      {(canExpandLeft || colSpan > 1) && (
        <div
          className="absolute bg-primary/60 rounded-sm"
          style={{ top: '50%', transform: 'translateY(-50%)', left: -handleSize / 2, width: handleSize, height: handleSize * 3, cursor: 'ew-resize' }}
          onMouseDown={(e) => onDragStart(e, 'w')}
        />
      )}
      {(canExpandRight || colSpan > 1) && (
        <div
          className="absolute bg-primary/60 rounded-sm"
          style={{ top: '50%', transform: 'translateY(-50%)', right: -handleSize / 2, width: handleSize, height: handleSize * 3, cursor: 'ew-resize' }}
          onMouseDown={(e) => onDragStart(e, 'e')}
        />
      )}
    </>
  );
}
