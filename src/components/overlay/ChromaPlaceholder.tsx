import { useTheme } from '@/context/ThemeContext';
import type { OverlayWidgetProps } from './types';

export function ChromaPlaceholder({ width, height, settings }: OverlayWidgetProps) {
  const { theme } = useTheme();
  const chromaColor = theme.chromaKeyColor || '#FF00FF';
  const borderRadius = settings?.borderRadius || '1rem';

  // Chroma key placeholder - just a solid color that OBS will key out
  // Label is only shown in the admin editor, not on the actual overlay
  return (
    <div
      className="h-full w-full pointer-events-none"
      style={{
        backgroundColor: chromaColor,
        borderRadius,
      }}
    />
  );
}
