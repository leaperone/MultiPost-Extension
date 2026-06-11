import type { UIMessage } from 'ai';
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
  chatHistories: Record<string, UIMessage[]>;
  suggestions: Record<string, Suggestion[]>;
}

const initialState: ChatHistoryState = {
  chatHistories: {},
  suggestions: {},
};

interface ChatHistoryStore extends ChatHistoryState {
  getChatHistory: (draftId: string) => UIMessage[];
  setChatHistory: (draftId: string, messages: UIMessage[]) => void;
  clearChatHistory: (draftId: string) => void;
  getSuggestions: (draftId: string) => Suggestion[];
  setSuggestions: (draftId: string, suggestions: Suggestion[]) => void;
  clearSuggestions: (draftId: string) => void;
}

/** Pre-v5 AI SDK messages were persisted with a flat `content` string. */
interface LegacyMessage {
  id: string;
  role: UIMessage['role'];
  content?: string;
  parts?: UIMessage['parts'];
}

function toUIMessage(message: LegacyMessage): UIMessage {
  if (Array.isArray(message.parts)) {
    return { id: message.id, role: message.role, parts: message.parts };
  }
  return {
    id: message.id,
    role: message.role,
    parts: [{ type: 'text', text: message.content ?? '' }],
  };
}

export const useChatHistoryStore = create(
  persist<ChatHistoryStore>(
    (set, get) => ({
      ...initialState,

      getChatHistory: (draftId: string) => {
        return get().chatHistories[draftId] || [];
      },

      setChatHistory: (draftId: string, messages: UIMessage[]) => {
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
      version: 1,
      migrate: (persistedState) => {
        const state = persistedState as ChatHistoryStore & {
          chatHistories: Record<string, LegacyMessage[]>;
        };
        return {
          ...state,
          chatHistories: Object.fromEntries(
            Object.entries(state.chatHistories ?? {}).map(([draftId, messages]) => [
              draftId,
              (messages ?? []).map(toUIMessage),
            ]),
          ),
        };
      },
    },
  ),
);
