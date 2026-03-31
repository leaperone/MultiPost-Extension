import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PlatformState {
  dynamicPlatforms: string[];
  videoPlatforms: string[];
  podcastPlatforms: string[];
}

const initState: PlatformState = {
  dynamicPlatforms: [],
  videoPlatforms: [],
  podcastPlatforms: [],
};

interface State extends PlatformState {
  setDynamicPlatforms: (platforms: string[]) => void;
  setVideoPlatforms: (platforms: string[]) => void;
  setPodcastPlatforms: (platforms: string[]) => void;
  clearDynamicPlatforms: () => void;
  clearVideoPlatforms: () => void;
  clearPodcastPlatforms: () => void;
  clearAll: () => void;
}

export const usePlatformStore = create(
  persist<State>(
    (set) => ({
      ...initState,
      setDynamicPlatforms: (platforms: string[]) => set({ dynamicPlatforms: platforms }),
      setVideoPlatforms: (platforms: string[]) => set({ videoPlatforms: platforms }),
      setPodcastPlatforms: (platforms: string[]) => set({ podcastPlatforms: platforms }),
      clearDynamicPlatforms: () => set({ dynamicPlatforms: [] }),
      clearVideoPlatforms: () => set({ videoPlatforms: [] }),
      clearPodcastPlatforms: () => set({ podcastPlatforms: [] }),
      clearAll: () => set({ ...initState }),
    }),
    {
      name: 'platform-selection',
    },
  ),
);
