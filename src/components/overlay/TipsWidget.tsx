import { useState, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import type { OverlayWidgetProps } from './types';

export function TipsWidget({ width, height }: OverlayWidgetProps) {
  const { theme, isDark } = useTheme();
  const colors = isDark ? theme.darkMode : theme.lightMode;

  const [tips, setTips] = useState<string[]>([]);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  useEffect(() => {
    const fetchTips = async () => {
      try {
        const response = await fetch('/api/tips');
        const data = (await response.json()) as string[];
        setTips(data);
      } catch (error) {
        console.error('Failed to fetch tips:', error);
      }
    };

    fetchTips();
  }, []);

  // Cycle through tips every 8 seconds
  useEffect(() => {
    if (tips.length === 0) return;
    const tipInterval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % tips.length);
    }, 8000);
    return () => clearInterval(tipInterval);
  }, [tips.length]);

  if (tips.length === 0) {
    return null;
  }

  return (
    <div
      className="rounded-2xl shadow-2xl px-6 py-3 h-full flex items-center overflow-hidden"
      style={{ backgroundColor: colors.card, color: colors.cardForeground }}
    >
      <div className="flex items-center gap-3 text-base">
        <span className="font-bold shrink-0" style={{ color: colors.primary }}>
          TIP:
        </span>
        <span style={{ color: colors.foreground }}>{tips[currentTipIndex]}</span>
      </div>
    </div>
  );
}
