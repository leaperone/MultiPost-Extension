import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  createDynamicDraft,
  getDynamicDrafts,
  getDynamicDraft,
  updateDynamicDraft,
  deleteDynamicDraft,
} from '@/actions/draft';
import type { Draft, DraftFileData, DraftFileDataClient } from '@/lib/types/draft';
import { nanoid } from 'nanoid';

interface MdDraftState {
  drafts: Draft[];
  activeDraftId: string | null;
  currentTitle: string;
  currentContent: string;
  currentFiles: DraftFileDataClient[];
  isLoading: boolean;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  isInitialized: boolean;
  lastActiveTab: string;
  sidebarOpen: boolean;
}

const initState: MdDraftState = {
  drafts: [],
  activeDraftId: null,
  currentTitle: '',
  currentContent: '',
  currentFiles: [],
  isLoading: false,
  isSaving: false,
  hasUnsavedChanges: false,
  isInitialized: false,
  lastActiveTab: 'editor',
  sidebarOpen: true,
};

let saveTimeout: ReturnType<typeof setTimeout> | null = null;

interface MdDraftStore extends MdDraftState {
  loadDrafts: () => Promise<void>;
  loadDraft: (id: string) => Promise<void>;
  createDraft: () => Promise<string | null>;
  deleteDraft: (id: string) => Promise<void>;
  saveDraft: () => Promise<void>;
  setTitle: (title: string) => void;
  setContent: (content: string) => void;
  setFiles: (files: DraftFileDataClient[]) => void;
  addFile: (file: DraftFileDataClient) => void;
  switchDraft: (id: string) => Promise<void>;
  setLastActiveTab: (tab: string) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

function scheduleSave(store: MdDraftStore) {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  saveTimeout = setTimeout(() => {
    saveTimeout = null;
    store.saveDraft();
  }, 2000);
}

export const useMdDraftStore = create(
  persist<MdDraftStore>(
    (set, get) => ({
      ...initState,

      loadDrafts: async () => {
        if (get().isLoading) return;
        set({ isLoading: true });
        try {
          const result = await getDynamicDrafts();
          if (result.success && result.data) {
            const drafts: Draft[] = result.data.map((d) => ({
              id: d.id,
              title: d.title ?? undefined,
              content: d.content ?? undefined,
              createdAt: d.createdAt,
              updatedAt: d.updatedAt,
              files: (d.files as DraftFileData[]) || [],
            }));
            set({ drafts, isInitialized: true });

            // Auto-load last active draft or first draft
            const { activeDraftId } = get();
            if (activeDraftId) {
              const exists = drafts.some((d) => d.id === activeDraftId);
              if (exists) {
                await get().loadDraft(activeDraftId);
              } else if (drafts.length > 0) {
                await get().loadDraft(drafts[0].id);
              }
            } else if (drafts.length > 0) {
              await get().loadDraft(drafts[0].id);
            }

            if (drafts.length === 0) {
              await get().createDraft();
            }
          }
        } finally {
          set({ isLoading: false });
        }
      },

      loadDraft: async (id: string) => {
        try {
          const result = await getDynamicDraft(id);
          if (result.success && result.data) {
            set({
              activeDraftId: id,
              currentTitle: result.data.title || '',
              currentContent: result.data.content || '',
              currentFiles: ((result.data.files as DraftFileDataClient[]) || []).map((f) => ({
                ...f,
                rid: f.rid || nanoid(),
              })),
              hasUnsavedChanges: false,
            });
          }
        } catch (error) {
          console.error('Failed to load draft:', error);
        }
      },

      createDraft: async () => {
        try {
          const result = await createDynamicDraft();
          if (result.success && result.data) {
            const newDraft: Draft = {
              id: result.data.id,
              title: '',
              content: '',
              createdAt: result.data.createdAt,
              updatedAt: result.data.updatedAt,
              files: [],
            };
            set((state) => ({
              drafts: [newDraft, ...state.drafts],
            }));
            await get().loadDraft(result.data.id);
            return result.data.id;
          }
          return null;
        } catch (error) {
          console.error('Failed to create draft:', error);
          return null;
        }
      },

      deleteDraft: async (id: string) => {
        try {
          const result = await deleteDynamicDraft(id);
          if (result.success) {
            const { activeDraftId, drafts } = get();
            const newDrafts = drafts.filter((d) => d.id !== id);
            set({ drafts: newDrafts });

            if (activeDraftId === id) {
              if (newDrafts.length > 0) {
                await get().loadDraft(newDrafts[0].id);
              } else {
                set({
                  activeDraftId: null,
                  currentTitle: '',
                  currentContent: '',
                  currentFiles: [],
                  hasUnsavedChanges: false,
                });
              }
            }
          }
        } catch (error) {
          console.error('Failed to delete draft:', error);
        }
      },

      saveDraft: async () => {
        const { activeDraftId, currentTitle, currentContent, currentFiles, hasUnsavedChanges } = get();
        if (!activeDraftId || !hasUnsavedChanges) return;
        if (currentFiles.some((f) => f.source === 'local')) return;

        set({ isSaving: true });
        try {
          const filesToSave: DraftFileData[] = currentFiles.map(({ file: _f, uploadProgress: _u, ...rest }) => rest);
          const result = await updateDynamicDraft(activeDraftId, {
            title: currentTitle,
            content: currentContent,
            files: filesToSave,
          });

          if (result.success) {
            set((state) => ({
              hasUnsavedChanges: false,
              drafts: state.drafts.map((d) =>
                d.id === activeDraftId
                  ? { ...d, title: currentTitle, content: currentContent, updatedAt: new Date() }
                  : d,
              ),
            }));
          }
        } catch (error) {
          console.error('Failed to save draft:', error);
        } finally {
          set({ isSaving: false });
        }
      },

      setTitle: (title: string) => {
        set({ currentTitle: title, hasUnsavedChanges: true });
        scheduleSave(get());
      },

      setContent: (content: string) => {
        set({ currentContent: content, hasUnsavedChanges: true });
        scheduleSave(get());
      },

      setFiles: (files: DraftFileDataClient[]) => {
        const hasLocal = files.some((f) => f.source === 'local');
        set({ currentFiles: files, hasUnsavedChanges: !hasLocal });
        if (!hasLocal) {
          scheduleSave(get());
        }
      },

      addFile: (file: DraftFileDataClient) => {
        set((state) => ({
          currentFiles: [...state.currentFiles, file],
          hasUnsavedChanges: true,
        }));
        scheduleSave(get());
      },

      switchDraft: async (id: string) => {
        const { activeDraftId, hasUnsavedChanges } = get();
        if (activeDraftId === id) return;

        // Save current draft before switching
        if (activeDraftId && hasUnsavedChanges) {
          if (saveTimeout) {
            clearTimeout(saveTimeout);
            saveTimeout = null;
          }
          await get().saveDraft();
        }

        await get().loadDraft(id);
      },

      setLastActiveTab: (tab: string) => {
        set({ lastActiveTab: tab });
      },

      toggleSidebar: () => {
        set((state) => ({ sidebarOpen: !state.sidebarOpen }));
      },

      setSidebarOpen: (open: boolean) => {
        set({ sidebarOpen: open });
      },
    }),
    {
      name: 'multipost.md.draft',
      partialize: (state) =>
        ({
          activeDraftId: state.activeDraftId,
          lastActiveTab: state.lastActiveTab,
          sidebarOpen: state.sidebarOpen,
        }) as unknown as MdDraftStore,
    },
  ),
);
