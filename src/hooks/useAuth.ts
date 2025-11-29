import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';

export function useAuth() {
  const {
    username,
    token,
    isAuthenticated,
    isLoading,
    login,
    logout,
    validateSession,
  } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && username && token) {
      validateSession();
    }
  }, []);

  return {
    username,
    token,
    isAuthenticated,
    isLoading,
    login,
    logout,
    validateSession,
  };
}
