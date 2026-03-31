import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
  username: string;
}

const initState: AppState = {
  username: '',
};

interface State extends AppState {
  setUsername: (username: string) => void;
  clearAll: () => void;
  collectAppState: () => AppState;
}

export const useAppStore = create(
  persist<State>(
    (set, get) => ({
      ...initState,
      setUsername: (username: string) => set({ username }),

      clearAll: () => {
        set({ ...initState });
      },

      collectAppState: () => {
        const state = get();
        return {
          username: state.username,
        };
      },
    }),
    {
      name: 'app',
    },
  ),
);
