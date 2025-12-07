import { useTheme } from '@/context/ThemeContext';
import type { OverlayWidgetProps } from './types';

export function EmptyPlaceholder({ width, height, settings }: OverlayWidgetProps) {
  const { theme, isDark } = useTheme();
  const colors = isDark ? theme.darkMode : theme.lightMode;
  const backgroundColor = settings?.backgroundColor || colors.card;
  const borderRadius = settings?.borderRadius || '1rem';

  return (
    <div
      className="h-full w-full"
      style={{
        backgroundColor,
        borderRadius,
      }}
    />
  );
}
