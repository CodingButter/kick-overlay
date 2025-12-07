import { useState, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import type { OverlayWidgetProps } from './types';

interface LastEvent {
  type: 'follow' | 'subscription' | 'gift';
  username: string;
  timestamp: string;
  details?: string;
}

function getRelativeTime(timestamp: string): string {
  const now = Date.now();
  const eventTime = new Date(timestamp).getTime();
  const diffMs = now - eventTime;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return 'Just now';
  if (diffMinutes === 1) return '1 minute ago';
  if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return '1 day ago';
  return `${diffDays} days ago`;
}

export function EventsWidget({ width, height }: OverlayWidgetProps) {
  const { theme, isDark } = useTheme();
  const colors = isDark ? theme.darkMode : theme.lightMode;

  const [lastEvent, setLastEvent] = useState<LastEvent | null>(null);

  useEffect(() => {
    const fetchLastEvent = async () => {
      try {
        const response = await fetch('/api/events/last');
        const data = (await response.json()) as LastEvent | null;
        setLastEvent(data);
      } catch (error) {
        console.error('Failed to fetch last event:', error);
      }
    };

    fetchLastEvent();
    const interval = setInterval(fetchLastEvent, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="rounded-2xl shadow-2xl p-4 h-full overflow-hidden"
      style={{ backgroundColor: colors.card, color: colors.cardForeground }}
    >
      <h2
        className="text-lg font-bold mb-2 flex items-center gap-2"
        style={{ color: colors.accentForeground }}
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
        </svg>
        Latest Event
      </h2>
      <div className="flex items-center gap-2 text-sm">
        {!lastEvent && (
          <span style={{ color: colors.mutedForeground }}>No Recent Events</span>
        )}
        {lastEvent?.type === 'follow' && (
          <>
            <span className="text-destructive">
              <svg className="w-4 h-4 inline" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
            <span style={{ color: colors.foreground }}>
              <span className="font-bold text-destructive">{lastEvent.username}</span> followed!{' '}
              <span style={{ color: colors.mutedForeground }}>
                - {getRelativeTime(lastEvent.timestamp)}
              </span>
            </span>
          </>
        )}
        {lastEvent?.type === 'subscription' && (
          <>
            <span style={{ color: colors.primary }}>
              <svg className="w-4 h-4 inline" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </span>
            <span style={{ color: colors.foreground }}>
              <span className="font-bold" style={{ color: colors.primary }}>
                {lastEvent.username}
              </span>{' '}
              subscribed!{' '}
              <span style={{ color: colors.mutedForeground }}>
                - {getRelativeTime(lastEvent.timestamp)}
              </span>
            </span>
          </>
        )}
        {lastEvent?.type === 'gift' && (
          <>
            <span style={{ color: colors.primary }}>
              <svg className="w-4 h-4 inline" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M5 5a3 3 0 015-2.236A3 3 0 0114.83 6H16a2 2 0 110 4h-5V9a1 1 0 10-2 0v1H4a2 2 0 110-4h1.17C5.06 5.687 5 5.35 5 5zm4 1V5a1 1 0 10-1 1h1zm3 0a1 1 0 10-1-1v1h1z"
                  clipRule="evenodd"
                />
                <path d="M9 11H3v5a2 2 0 002 2h4v-7zM11 18h4a2 2 0 002-2v-5h-6v7z" />
              </svg>
            </span>
            <span style={{ color: colors.foreground }}>
              <span className="font-bold" style={{ color: colors.primary }}>
                {lastEvent.username}
              </span>{' '}
              gifted {lastEvent.details}!{' '}
              <span style={{ color: colors.mutedForeground }}>
                - {getRelativeTime(lastEvent.timestamp)}
              </span>
            </span>
          </>
        )}
      </div>
    </div>
  );
}
