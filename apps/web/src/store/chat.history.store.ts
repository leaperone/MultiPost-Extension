import { Message } from 'ai/react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const MAX_MESSAGES_PER_DRAFT = 10; // 5 conversations (user + assistant)

interface Suggestion {
  messageId: string;
  title?: string;
  content?: string;
  status: 'pending' | 'applied';
}

interface ChatHistoryState {
  chatHistories: Record<string, Message[]>;
  suggestions: Record<string, Suggestion[]>;
}

const initialState: ChatHistoryState = {
  chatHistories: {},
  suggestions: {},
};

interface ChatHistoryStore extends ChatHistoryState {
  getChatHistory: (draftId: string) => Message[];
  setChatHistory: (draftId: string, messages: Message[]) => void;
  clearChatHistory: (draftId: string) => void;
  getSuggestions: (draftId: string) => Suggestion[];
  setSuggestions: (draftId: string, suggestions: Suggestion[]) => void;
  clearSuggestions: (draftId: string) => void;
}

export const useChatHistoryStore = create(
  persist<ChatHistoryStore>(
    (set, get) => ({
      ...initialState,

      getChatHistory: (draftId: string) => {
        return get().chatHistories[draftId] || [];
      },

      setChatHistory: (draftId: string, messages: Message[]) => {
        const slicedMessages = messages.slice(-MAX_MESSAGES_PER_DRAFT);
        set((state) => ({
          chatHistories: {
            ...state.chatHistories,
            [draftId]: slicedMessages,
          },
        }));
      },

      clearChatHistory: (draftId: string) => {
        set((state) => {
          const newHistories = { ...state.chatHistories };
          delete newHistories[draftId];
          return {
            chatHistories: newHistories,
          };
        });
      },

      getSuggestions: (draftId: string) => {
        return get().suggestions[draftId] || [];
      },

      setSuggestions: (draftId: string, suggestions: Suggestion[]) => {
        set((state) => ({
          suggestions: {
            ...state.suggestions,
            [draftId]: suggestions,
          },
        }));
      },

      clearSuggestions: (draftId: string) => {
        set((state) => {
          const newSuggestions = { ...state.suggestions };
          delete newSuggestions[draftId];
          return {
            suggestions: newSuggestions,
          };
        });
      },
    }),
    {
      name: 'chat-history-storage',
    },
  ),
);
