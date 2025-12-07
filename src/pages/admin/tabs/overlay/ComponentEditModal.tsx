import { X, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OVERLAY_COMPONENTS, type OverlayLayoutConfig, type OverlayComponentPlacement } from '@/components/overlay';

interface ComponentEditModalProps {
  component: OverlayComponentPlacement;
  layout: OverlayLayoutConfig;
  onUpdate: (id: string, updates: Partial<OverlayComponentPlacement>) => void;
  onUpdateSettings: (id: string, settings: Record<string, any>) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function ComponentEditModal({
  component,
  layout,
  onUpdate,
  onUpdateSettings,
  onDelete,
  onClose,
}: ComponentEditModalProps) {
  const componentDef = OVERLAY_COMPONENTS[component.type];

  const handlePositionChange = (field: 'row' | 'column' | 'rowSpan' | 'colSpan', value: number) => {
    const newPos = { ...component.gridPosition, [field]: value };
    onUpdate(component.id, { gridPosition: newPos });
  };

  const handleSettingsChange = (key: string, value: string) => {
    const newSettings = { ...component.settings, [key]: value };
    onUpdateSettings(component.id, newSettings);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <span>{componentDef?.meta.icon}</span>
            Edit {component.settings?.label || componentDef?.meta.label}
          </h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Position */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Row</Label>
              <Input
                type="number"
                min={0}
                max={layout.grid.rows - 1}
                value={component.gridPosition.row}
                onChange={(e) => handlePositionChange('row', parseInt(e.target.value) || 0)}
                className="bg-secondary border-border mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Column</Label>
              <Input
                type="number"
                min={0}
                max={layout.grid.columns - 1}
                value={component.gridPosition.column}
                onChange={(e) => handlePositionChange('column', parseInt(e.target.value) || 0)}
                className="bg-secondary border-border mt-1"
              />
            </div>
          </div>

          {/* Size */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Row Span</Label>
              <Input
                type="number"
                min={1}
                max={layout.grid.rows}
                value={component.gridPosition.rowSpan}
                onChange={(e) => handlePositionChange('rowSpan', parseInt(e.target.value) || 1)}
                className="bg-secondary border-border mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Col Span</Label>
              <Input
                type="number"
                min={1}
                max={layout.grid.columns}
                value={component.gridPosition.colSpan}
                onChange={(e) => handlePositionChange('colSpan', parseInt(e.target.value) || 1)}
                className="bg-secondary border-border mt-1"
              />
            </div>
          </div>

          {/* Label for chroma/empty */}
          {(component.type === 'chroma' || component.type === 'empty') && (
            <div>
              <Label className="text-xs text-muted-foreground">Label</Label>
              <Input
                type="text"
                placeholder="e.g. Camera, VS Code, Music"
                value={component.settings?.label || ''}
                onChange={(e) => handleSettingsChange('label', e.target.value)}
                className="bg-secondary border-border mt-1"
              />
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={() => onDelete(component.id)}
            className="flex-1 py-2 px-4 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/80 transition-colors flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/80 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
