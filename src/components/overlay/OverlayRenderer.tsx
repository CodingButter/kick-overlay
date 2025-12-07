import { useTheme, type ThemeConfig } from '@/context/ThemeContext';
import { OVERLAY_COMPONENTS } from './index';
import type { OverlayLayoutConfig, OverlayComponentPlacement } from './types';

interface OverlayRendererProps {
  layout: OverlayLayoutConfig;
  scale?: number;
  showGrid?: boolean;
  selectedComponentId?: string | null;
  onComponentClick?: (id: string) => void;
  isEditing?: boolean;
}

export function OverlayRenderer({
  layout,
  scale = 1,
  showGrid = false,
  selectedComponentId,
  onComponentClick,
  isEditing = false,
}: OverlayRendererProps) {
  const { theme, isDark } = useTheme();
  const colors = isDark ? theme.darkMode : theme.lightMode;
  const { grid, components } = layout;

  // Calculate cell dimensions
  const totalGapWidth = grid.gap * (grid.columns - 1);
  const totalGapHeight = grid.gap * (grid.rows - 1);
  const availableWidth = layout.width - grid.padding * 2 - totalGapWidth;
  const availableHeight = layout.height - grid.padding * 2 - totalGapHeight;
  const cellWidth = availableWidth / grid.columns;
  const cellHeight = availableHeight / grid.rows;

  // Calculate position and size for a component
  const getComponentStyle = (placement: OverlayComponentPlacement) => {
    const x = grid.padding + placement.gridPosition.column * (cellWidth + grid.gap);
    const y = grid.padding + placement.gridPosition.row * (cellHeight + grid.gap);
    const width =
      placement.gridPosition.colSpan * cellWidth +
      (placement.gridPosition.colSpan - 1) * grid.gap;
    const height =
      placement.gridPosition.rowSpan * cellHeight +
      (placement.gridPosition.rowSpan - 1) * grid.gap;

    return { left: x, top: y, width, height };
  };

  return (
    <div
      style={{
        width: layout.width * scale,
        height: layout.height * scale,
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: colors.background,
        borderRadius: scale < 1 ? '8px' : 0,
      }}
    >
      {/* Inner container at full scale, then scaled down */}
      <div
        style={{
          width: layout.width,
          height: layout.height,
          position: 'relative',
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        {/* Grid overlay (for editor) */}
        {showGrid && (
          <div
            style={{
              position: 'absolute',
              inset: grid.padding,
              display: 'grid',
              gridTemplateColumns: `repeat(${grid.columns}, 1fr)`,
              gridTemplateRows: `repeat(${grid.rows}, 1fr)`,
              gap: grid.gap,
              pointerEvents: 'none',
              zIndex: 1,
            }}
          >
            {Array.from({ length: grid.rows * grid.columns }).map((_, i) => (
              <div
                key={i}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  border: '1px dashed rgba(255,255,255,0.1)',
                  borderRadius: '4px',
                }}
              />
            ))}
          </div>
        )}

        {/* Render components */}
        {components.map((placement) => {
          const componentDef = OVERLAY_COMPONENTS[placement.type];
          if (!componentDef) return null;

          const Component = componentDef.component;
          const style = getComponentStyle(placement);
          const isSelected = selectedComponentId === placement.id;

          return (
            <div
              key={placement.id}
              style={{
                position: 'absolute',
                ...style,
                zIndex: 2,
                cursor: isEditing ? 'pointer' : 'default',
                outline: isSelected ? '3px solid #53fc18' : 'none',
                outlineOffset: '2px',
              }}
              onClick={
                isEditing && onComponentClick
                  ? (e) => {
                      e.stopPropagation();
                      onComponentClick(placement.id);
                    }
                  : undefined
              }
            >
              <Component
                width={style.width}
                height={style.height}
                settings={placement.settings}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
