import { create } from 'zustand';
import type { UserData, Voice } from '@/types/profile';
import type { PowerupType } from '@/types/dropgame';
import { api } from '@/lib/api';

interface ProfileState {
  userData: UserData | null;
  voices: Voice[];
  isLoading: boolean;
  error: string | null;

  fetchProfile: (username: string) => Promise<void>;
  fetchVoices: () => Promise<void>;
  updateProfile: (
    username: string,
    data: Partial<UserData>,
    token: string
  ) => Promise<boolean>;
  buyPowerup: (
    username: string,
    type: PowerupType,
    token: string
  ) => Promise<boolean>;
  clearProfile: () => void;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  userData: null,
  voices: [],
  isLoading: true,
  error: null,

  fetchProfile: async (username) => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.getProfile(username);
      set({ userData: data, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  fetchVoices: async () => {
    try {
      const voices = await api.getVoices();
      set({ voices });
    } catch (err) {
      console.error('Failed to fetch voices:', err);
    }
  },

  updateProfile: async (username, data, token) => {
    try {
      const res = await api.updateProfile(username, { ...data, token });
      if (res.ok) {
        await get().fetchProfile(username);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  buyPowerup: async (username, type, token) => {
    try {
      const result = await api.buyPowerup(username, type, token);
      if (result.success) {
        await get().fetchProfile(username);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  clearProfile: () => {
    set({ userData: null, isLoading: false, error: null });
  },
}));
