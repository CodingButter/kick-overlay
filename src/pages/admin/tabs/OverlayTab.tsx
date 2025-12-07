import { useState } from 'react';
import { Layout, Save, CheckCircle } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OVERLAY_COMPONENTS, type OverlayComponentPlacement, type OverlayComponentType } from '@/components/overlay';
import { useOverlayLayout } from './overlay/useOverlayLayout';
import { useGridInteraction } from './overlay/useGridInteraction';
import { GridEditor } from './overlay/GridEditor';
import { ComponentPickerModal } from './overlay/ComponentPickerModal';
import { ComponentEditModal } from './overlay/ComponentEditModal';

interface OverlayTabProps {
  token: string;
}

export function OverlayTab({ token }: OverlayTabProps) {
  const { theme } = useTheme();
  const [editingComponent, setEditingComponent] = useState<OverlayComponentPlacement | null>(null);

  const {
    layout,
    loading,
    saving,
    savedRecently,
    saveLayout,
    hasChanges,
    updateGridSetting,
    addComponent,
    removeComponent,
    updateComponent,
    updateComponentSettings,
    isPositionValid,
    getCellComponent,
  } = useOverlayLayout(token);

  const {
    isDragging,
    selection,
    hoveredComponentId,
    dragState,
    showComponentPicker,
    setIsDragging,
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
  } = useGridInteraction({ layout, updateComponent, isPositionValid });

  if (loading || !layout) {
    return <div className="text-center py-8 text-muted-foreground">Loading layout...</div>;
  }

  const editorWidth = 900;

  const handleComponentSelect = (type: OverlayComponentType) => {
    if (selection) {
      addComponent(type, selection);
      clearSelection();
    }
  };

  const handleRemoveComponent = (id: string) => {
    removeComponent(id);
    setEditingComponent(null);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/20">
            <Layout className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Overlay Layout Editor</h2>
            <p className="text-sm text-muted-foreground">
              Click and drag on the grid to add components. Hover over components to edit or delete.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {savedRecently && (
            <div className="flex items-center gap-2 text-primary">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-medium">Saved!</span>
            </div>
          )}
          <button
            onClick={saveLayout}
            disabled={saving || !hasChanges()}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all ${
              saving || !hasChanges()
                ? 'bg-secondary text-muted-foreground cursor-not-allowed'
                : 'bg-primary text-primary-foreground hover:bg-primary/80 shadow-lg shadow-primary/25'
            }`}
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Layout'}
          </button>
        </div>
      </div>

      {/* Grid Settings Bar */}
      <div className="flex items-center gap-6 p-4 bg-card/50 rounded-xl border border-border">
        <div className="flex items-center gap-2">
          <Label className="text-sm text-muted-foreground">Rows:</Label>
          <Input
            type="number"
            min={1}
            max={24}
            value={layout.grid.rows}
            onChange={(e) => updateGridSetting('rows', parseInt(e.target.value) || 1)}
            className="w-16 bg-secondary border-border"
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm text-muted-foreground">Columns:</Label>
          <Input
            type="number"
            min={1}
            max={32}
            value={layout.grid.columns}
            onChange={(e) => updateGridSetting('columns', parseInt(e.target.value) || 1)}
            className="w-16 bg-secondary border-border"
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm text-muted-foreground">Gap:</Label>
          <Input
            type="number"
            min={0}
            max={50}
            value={layout.grid.gap}
            onChange={(e) => updateGridSetting('gap', parseInt(e.target.value) || 0)}
            className="w-16 bg-secondary border-border"
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm text-muted-foreground">Padding:</Label>
          <Input
            type="number"
            min={0}
            max={100}
            value={layout.grid.padding}
            onChange={(e) => updateGridSetting('padding', parseInt(e.target.value) || 0)}
            className="w-16 bg-secondary border-border"
          />
        </div>
        <div className="flex-1" />
        <div className="text-xs text-muted-foreground">
          {layout.width} × {layout.height}px
        </div>
      </div>

      {/* Interactive Grid Editor */}
      <GridEditor
        layout={layout}
        hoveredComponentId={hoveredComponentId}
        dragState={dragState}
        isDragging={isDragging}
        editorWidth={editorWidth}
        getCellComponent={getCellComponent}
        isCellSelected={isCellSelected}
        onCellMouseDown={handleCellMouseDown}
        onCellMouseEnter={handleCellMouseEnter}
        onMouseUp={() => {
          if (dragState) {
            handleComponentDragEnd();
          } else {
            handleCellMouseUp();
          }
        }}
        onMouseLeave={() => {
          if (dragState) {
            handleComponentDragEnd();
          } else if (isDragging) {
            setIsDragging(false);
            clearSelection();
          }
        }}
        onMouseMove={(e, rect) => {
          if (dragState) {
            handleComponentDragMove(e, rect, editorWidth);
          }
        }}
        onComponentHover={setHoveredComponentId}
        onComponentDragStart={handleComponentDragStart}
        onComponentEdit={setEditingComponent}
        onComponentDelete={handleRemoveComponent}
      />

      {/* Component Picker Modal */}
      {showComponentPicker && selection && (
        <ComponentPickerModal
          selection={selection}
          onSelect={handleComponentSelect}
          onClose={clearSelection}
        />
      )}

      {/* Component Edit Modal */}
      {editingComponent && (
        <ComponentEditModal
          component={editingComponent}
          layout={layout}
          onUpdate={(id, updates) => {
            updateComponent(id, updates);
            setEditingComponent({ ...editingComponent, ...updates });
          }}
          onUpdateSettings={(id, settings) => {
            updateComponentSettings(id, settings);
            setEditingComponent({ ...editingComponent, settings });
          }}
          onDelete={handleRemoveComponent}
          onClose={() => setEditingComponent(null)}
        />
      )}

      {/* Chroma Key Color info */}
      <div className="flex items-center gap-4 p-4 bg-card/50 rounded-xl border border-border">
        <div
          className="w-10 h-10 rounded-lg shadow-lg ring-1 ring-white/10"
          style={{ backgroundColor: theme.chromaKeyColor }}
        />
        <div className="flex-1">
          <div className="text-sm font-medium text-foreground">Chroma Key Color: {theme.chromaKeyColor}</div>
          <div className="text-xs text-muted-foreground">
            Used by {layout.components.filter((c) => OVERLAY_COMPONENTS[c.type]?.meta.isChroma).length} components. Edit in Theme tab.
          </div>
        </div>
      </div>
    </div>
  );
}
