import { useEffect, useCallback } from 'react';
import { useChatStore } from '@/stores/chatStore';

export function useChat(pollInterval = 2000) {
  const {
    messages,
    userCountries,
    isLoading,
    error,
    fetchMessages,
    setUserCountry,
  } = useChatStore();

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, pollInterval);
    return () => clearInterval(interval);
  }, [fetchMessages, pollInterval]);

  return {
    messages,
    userCountries,
    loading: isLoading,
    error,
    refetch: fetchMessages,
    setUserCountry,
  };
}
