import { create } from 'zustand';
import type { Goals } from '@/types/goals';
import { api } from '@/lib/api';

interface GoalsState {
  goals: Goals | null;
  isLoading: boolean;
  error: string | null;
  fetchGoals: () => Promise<void>;
}

export const useGoalsStore = create<GoalsState>((set) => ({
  goals: null,
  isLoading: true,
  error: null,

  fetchGoals: async () => {
    try {
      const data = await api.getGoals();
      set({ goals: data, isLoading: false, error: null });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },
}));
