import { OVERLAY_COMPONENTS, type OverlayComponentType } from '@/components/overlay';
import type { GridSelection } from './types';
import { normalizeSelection } from './types';

interface ComponentPickerModalProps {
  selection: GridSelection;
  onSelect: (type: OverlayComponentType) => void;
  onClose: () => void;
}

export function ComponentPickerModal({ selection, onSelect, onClose }: ComponentPickerModalProps) {
  const { minRow, maxRow, minCol, maxCol } = normalizeSelection(selection);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-foreground mb-4">Add Component</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Selected area: {maxRow - minRow + 1} rows × {maxCol - minCol + 1} columns
        </p>
        <div className="grid grid-cols-3 gap-3">
          {(Object.keys(OVERLAY_COMPONENTS) as OverlayComponentType[]).map((type) => {
            const { meta } = OVERLAY_COMPONENTS[type];
            return (
              <button
                key={type}
                onClick={() => onSelect(type)}
                className="flex flex-col items-center gap-2 p-4 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
              >
                <span className="text-3xl">{meta.icon}</span>
                <span className="text-sm font-medium text-foreground">{meta.label}</span>
              </button>
            );
          })}
        </div>
        <button
          onClick={onClose}
          className="mt-4 w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
