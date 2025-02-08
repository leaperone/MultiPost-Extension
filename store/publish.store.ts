import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PlatformState {
  dynamicPlatforms: string[];
  videoPlatforms: string[];
}

const initState: PlatformState = {
  dynamicPlatforms: [],
  videoPlatforms: [],
};

interface State extends PlatformState {
  setDynamicPlatforms: (platforms: string[]) => void;
  setVideoPlatforms: (platforms: string[]) => void;
  clearDynamicPlatforms: () => void;
  clearVideoPlatforms: () => void;
  clearAll: () => void;
}

export const usePlatformStore = create(
  persist<State>(
    (set) => ({
      ...initState,
      setDynamicPlatforms: (platforms: string[]) => set({ dynamicPlatforms: platforms }),
      setVideoPlatforms: (platforms: string[]) => set({ videoPlatforms: platforms }),
      clearDynamicPlatforms: () => set({ dynamicPlatforms: [] }),
      clearVideoPlatforms: () => set({ videoPlatforms: [] }),
      clearAll: () => set({ ...initState }),
    }),
    {
      name: 'platform-selection',
    },
  ),
);
