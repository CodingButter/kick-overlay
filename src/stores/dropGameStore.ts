import { create } from 'zustand';
import type { Dropper, DropConfig, ConfettiParticle } from '@/types/dropgame';

interface DropGameState {
  droppers: Dropper[];
  config: DropConfig | null;
  confetti: ConfettiParticle[];
  platformX: number | null;
  isRunning: boolean;

  setConfig: (config: DropConfig) => void;
  addDropper: (dropper: Dropper) => void;
  updateDropper: (id: string, updates: Partial<Dropper>) => void;
  removeDropper: (id: string) => void;
  clearDroppers: () => void;
  setPlatformX: (x: number) => void;
  addConfetti: (particles: ConfettiParticle[]) => void;
  clearConfetti: () => void;
  setRunning: (running: boolean) => void;
}

export const useDropGameStore = create<DropGameState>((set) => ({
  droppers: [],
  config: null,
  confetti: [],
  platformX: null,
  isRunning: false,

  setConfig: (config) => set({ config }),

  addDropper: (dropper) =>
    set((state) => ({
      droppers: [...state.droppers, dropper],
    })),

  updateDropper: (id, updates) =>
    set((state) => ({
      droppers: state.droppers.map((d) =>
        d.id === id ? { ...d, ...updates } : d
      ),
    })),

  removeDropper: (id) =>
    set((state) => ({
      droppers: state.droppers.filter((d) => d.id !== id),
    })),

  clearDroppers: () => set({ droppers: [] }),

  setPlatformX: (x) => set({ platformX: x }),

  addConfetti: (particles) =>
    set((state) => ({
      confetti: [...state.confetti, ...particles],
    })),

  clearConfetti: () => set({ confetti: [] }),

  setRunning: (running) => set({ isRunning: running }),
}));
