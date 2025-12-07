import { useState, useEffect, useCallback } from 'react';
import type { VerifyStatus } from '../types';

interface UseProfileSessionProps {
  username: string | undefined;
  onVerified: () => void;
}

export function useProfileSession({ username, onVerified }: UseProfileSessionProps) {
  const [isVerified, setIsVerified] = useState(false);
  const [verifyCode, setVerifyCode] = useState<string | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<VerifyStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Cookie helpers
  const getSessionCookie = useCallback((user: string): string | null => {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === `profile_session_${user}`) {
        return value ?? null;
      }
    }
    return null;
  }, []);

  const setSessionCookie = useCallback((user: string, token: string) => {
    const expires = new Date();
    expires.setDate(expires.getDate() + 7);
    document.cookie = `profile_session_${user}=${token}; expires=${expires.toUTCString()}; path=/; SameSite=Strict`;
  }, []);

  // Initialize session on mount
  useEffect(() => {
    if (!username) return;

    const initSession = async () => {
      const sessionToken = getSessionCookie(username);
      if (sessionToken) {
        try {
          const res = await fetch(`/api/session/validate/${username}/${sessionToken}`);
          if (res.ok) {
            const data = await res.json();
            if (data.valid) {
              setIsVerified(true);
              setVerifyStatus('verified');
              setLoading(false);
              onVerified();
              return;
            }
          }
        } catch {
          // Session validation failed
        }
      }

      try {
        const res = await fetch(`/api/verify/generate/${username}`, { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          setVerifyCode(data.code);
          setVerifyStatus('ready');
        } else {
          setError('Failed to generate verification code');
        }
      } catch {
        setError('Failed to connect to server');
      }
      setLoading(false);
    };
    initSession();
  }, [username, getSessionCookie, onVerified]);

  // Poll for verification
  useEffect(() => {
    if (!verifyCode || verifyStatus !== 'waiting' || !username) return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/verify/check/${username}/${verifyCode}`);
        if (res.ok) {
          const data = await res.json();
          if (data.verified) {
            setIsVerified(true);
            setVerifyStatus('verified');
            clearInterval(pollInterval);
            const sessionToken = data.sessionToken || verifyCode;
            setSessionCookie(username, sessionToken);
            onVerified();
          }
        }
      } catch {
        // Continue polling
      }
    }, 2000);

    const timeout = setTimeout(() => {
      clearInterval(pollInterval);
      setError('Verification expired. Please refresh the page to try again.');
      setVerifyStatus('ready');
    }, 5 * 60 * 1000);

    return () => {
      clearInterval(pollInterval);
      clearTimeout(timeout);
    };
  }, [verifyCode, verifyStatus, username, setSessionCookie, onVerified]);

  const startWaiting = useCallback(() => {
    setVerifyStatus('waiting');
  }, []);

  return {
    isVerified,
    verifyCode,
    verifyStatus,
    error,
    loading,
    startWaiting,
  };
}
