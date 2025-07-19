import { Message } from 'ai/react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const MAX_MESSAGES_PER_DRAFT = 10; // 5 conversations (user + assistant)

interface ChatHistoryState {
  chatHistories: Record<string, Message[]>;
}

const initialState: ChatHistoryState = {
  chatHistories: {},
};

interface ChatHistoryStore extends ChatHistoryState {
  getChatHistory: (draftId: string) => Message[];
  setChatHistory: (draftId: string, messages: Message[]) => void;
  clearChatHistory: (draftId: string) => void;
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
    }),
    {
      name: 'chat-history-storage',
    },
  ),
);
