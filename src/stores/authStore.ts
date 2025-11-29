import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/lib/api';

interface AuthState {
  username: string | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, token: string) => void;
  logout: () => void;
  validateSession: () => Promise<boolean>;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      username: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,

      login: (username, token) => {
        set({ username, token, isAuthenticated: true, isLoading: false });
      },

      logout: () => {
        set({ username: null, token: null, isAuthenticated: false });
      },

      setLoading: (loading) => {
        set({ isLoading: loading });
      },

      validateSession: async () => {
        const { username, token } = get();
        if (!username || !token) {
          set({ isLoading: false });
          return false;
        }
        try {
          const result = await api.validateSession(username, token);
          if (!result.valid) {
            get().logout();
          }
          set({ isLoading: false, isAuthenticated: result.valid });
          return result.valid;
        } catch {
          set({ isLoading: false });
          return false;
        }
      },
    }),
    {
      name: 'kick-auth',
      partialize: (state) => ({
        username: state.username,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setLoading(false);
      },
    }
  )
);
