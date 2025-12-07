import { useState, useEffect } from 'react';
import { RATE_LIMIT_MAX, RATE_LIMIT_WINDOW } from '../types';

export function usePreviewRateLimit() {
  const [playCount, setPlayCount] = useState(0);
  const [resetTime, setResetTime] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('voicePreviewRateLimit');
    if (stored) {
      const { count, windowStart } = JSON.parse(stored);
      const now = Date.now();
      if (now - windowStart < RATE_LIMIT_WINDOW) {
        setPlayCount(count);
        setResetTime(windowStart + RATE_LIMIT_WINDOW);
      } else {
        localStorage.removeItem('voicePreviewRateLimit');
      }
    }
  }, []);

  useEffect(() => {
    if (!resetTime) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = resetTime - now;
      if (remaining <= 0) {
        setPlayCount(0);
        setResetTime(null);
        setTimeLeft('');
        localStorage.removeItem('voicePreviewRateLimit');
      } else {
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [resetTime]);

  const canPlay = playCount < RATE_LIMIT_MAX;
  const remaining = RATE_LIMIT_MAX - playCount;

  const recordPlay = () => {
    const now = Date.now();
    const stored = localStorage.getItem('voicePreviewRateLimit');
    let newCount = 1;
    let windowStart = now;

    if (stored) {
      const data = JSON.parse(stored);
      if (now - data.windowStart < RATE_LIMIT_WINDOW) {
        newCount = data.count + 1;
        windowStart = data.windowStart;
      }
    }

    localStorage.setItem('voicePreviewRateLimit', JSON.stringify({ count: newCount, windowStart }));
    setPlayCount(newCount);
    setResetTime(windowStart + RATE_LIMIT_WINDOW);
  };

  return { canPlay, remaining, timeLeft, recordPlay };
}
