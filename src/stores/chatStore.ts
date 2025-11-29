import { create } from 'zustand';
import type { ChatMessage, UserCountryCache } from '@/types/chat';
import { api } from '@/lib/api';

interface ChatState {
  messages: ChatMessage[];
  userCountries: UserCountryCache;
  isLoading: boolean;
  error: string | null;
  fetchMessages: () => Promise<void>;
  setUserCountry: (userId: string, country: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  userCountries: {},
  isLoading: true,
  error: null,

  fetchMessages: async () => {
    try {
      const data = await api.getChat();
      set({ messages: data.slice(-20), isLoading: false, error: null });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  setUserCountry: (userId, country) => {
    set((state) => ({
      userCountries: { ...state.userCountries, [userId]: country },
    }));
  },
}));
