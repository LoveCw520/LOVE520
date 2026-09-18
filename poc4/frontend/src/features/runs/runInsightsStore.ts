import { create } from 'zustand';
import type { RunSummary } from '@/contracts/run';

type RunInsightsState = {
  run: RunSummary | null;
  logText: string;
  set(run: RunSummary | null, logText: string): void;
  clear(): void;
};

export const useRunInsightsStore = create<RunInsightsState>((set) => ({
  run: null,
  logText: '',
  set(run, logText) {
    set({ run, logText });
  },
  clear() {
    set({ run: null, logText: '' });
  },
}));
