import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Draft publish state interface
 */
interface DraftPublishState {
  clientId: string;
  selectedPlatforms: string[];
  // Direct publish state
  directSelectedPlatforms: string[];
  isAutoPublish: boolean;
}

/**
 * Initial state
 */
const initState: DraftPublishState = {
  clientId: '',
  selectedPlatforms: [],
  // Direct publish state
  directSelectedPlatforms: [],
  isAutoPublish: true,
};

/**
 * Draft store interface with actions
 */
interface DraftStore extends DraftPublishState {
  setClientId: (clientId: string) => void;
  setSelectedPlatforms: (platforms: string[]) => void;
  addSelectedPlatform: (platform: string) => void;
  removeSelectedPlatform: (platform: string) => void;
  clearClientId: () => void;
  clearSelectedPlatforms: () => void;
  clearAll: () => void;
  // Direct publish actions
  setDirectSelectedPlatforms: (platforms: string[]) => void;
  addDirectSelectedPlatform: (platform: string) => void;
  removeDirectSelectedPlatform: (platform: string) => void;
  setIsAutoPublish: (isAutoPublish: boolean) => void;
  clearDirectSelectedPlatforms: () => void;
}

/**
 * Draft store for managing draft publish selections
 */
export const useDraftStore = create(
  persist<DraftStore>(
    (set, get) => ({
      ...initState,

      /**
       * Set selected client ID
       */
      setClientId: (clientId: string) => set({ clientId }),

      /**
       * Set all selected platforms
       */
      setSelectedPlatforms: (platforms: string[]) => set({ selectedPlatforms: platforms }),

      /**
       * Add a platform to selected platforms
       */
      addSelectedPlatform: (platform: string) => {
        const { selectedPlatforms } = get();
        if (!selectedPlatforms.includes(platform)) {
          set({ selectedPlatforms: [...selectedPlatforms, platform] });
        }
      },

      /**
       * Remove a platform from selected platforms
       */
      removeSelectedPlatform: (platform: string) => {
        const { selectedPlatforms } = get();
        set({ selectedPlatforms: selectedPlatforms.filter((p) => p !== platform) });
      },

      /**
       * Clear client ID
       */
      clearClientId: () => set({ clientId: '' }),

      /**
       * Clear selected platforms
       */
      clearSelectedPlatforms: () => set({ selectedPlatforms: [] }),

      /**
       * Clear all draft publish data
       */
      clearAll: () => set({ ...initState }),

      /**
       * Set all selected platforms for direct publish
       */
      setDirectSelectedPlatforms: (platforms: string[]) => set({ directSelectedPlatforms: platforms }),

      /**
       * Add a platform to direct selected platforms
       */
      addDirectSelectedPlatform: (platform: string) => {
        const { directSelectedPlatforms } = get();
        if (!directSelectedPlatforms.includes(platform)) {
          set({ directSelectedPlatforms: [...directSelectedPlatforms, platform] });
        }
      },

      /**
       * Remove a platform from direct selected platforms
       */
      removeDirectSelectedPlatform: (platform: string) => {
        const { directSelectedPlatforms } = get();
        set({ directSelectedPlatforms: directSelectedPlatforms.filter((p) => p !== platform) });
      },

      /**
       * Set auto publish setting
       */
      setIsAutoPublish: (isAutoPublish: boolean) => set({ isAutoPublish }),

      /**
       * Clear direct selected platforms
       */
      clearDirectSelectedPlatforms: () => set({ directSelectedPlatforms: [] }),
    }),
    {
      name: 'draft-publish-selection',
    },
  ),
);
