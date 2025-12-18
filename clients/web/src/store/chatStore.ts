import { create } from 'zustand';
import type { Chat, Message, TypingIndicator } from '@/types';

interface ChatState {
  chats: Chat[];
  currentChatId: string | null;
  messages: Record<string, Message[]>;
  typingIndicators: Record<string, TypingIndicator[]>;
  searchQuery: string;

  setChats: (chats: Chat[]) => void;
  addChat: (chat: Chat) => void;
  updateChat: (chatId: string, updates: Partial<Chat>) => void;
  removeChat: (chatId: string) => void;
  setCurrentChat: (chatId: string | null) => void;

  setMessages: (chatId: string, messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  deleteMessage: (messageId: string) => void;

  addTypingIndicator: (indicator: TypingIndicator) => void;
  removeTypingIndicator: (chatId: string, userId: string) => void;

  setSearchQuery: (query: string) => void;

  pinChat: (chatId: string) => void;
  archiveChat: (chatId: string) => void;
  muteChat: (chatId: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  currentChatId: null,
  messages: {},
  typingIndicators: {},
  searchQuery: '',

  setChats: (chats) => set({ chats }),

  addChat: (chat) =>
    set((state) => ({
      chats: [chat, ...state.chats],
    })),

  updateChat: (chatId, updates) =>
    set((state) => ({
      chats: state.chats.map((chat) =>
        chat.id === chatId ? { ...chat, ...updates } : chat
      ),
    })),

  removeChat: (chatId) =>
    set((state) => ({
      chats: state.chats.filter((chat) => chat.id !== chatId),
      currentChatId: state.currentChatId === chatId ? null : state.currentChatId,
    })),

  setCurrentChat: (chatId) => set({ currentChatId: chatId }),

  setMessages: (chatId, messages) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [chatId]: messages,
      },
    })),

  addMessage: (message) =>
    set((state) => {
      const chatMessages = state.messages[message.chatId] || [];
      return {
        messages: {
          ...state.messages,
          [message.chatId]: [...chatMessages, message],
        },
      };
    }),

  updateMessage: (messageId, updates) =>
    set((state) => {
      const newMessages = { ...state.messages };
      Object.keys(newMessages).forEach((chatId) => {
        newMessages[chatId] = newMessages[chatId].map((msg) =>
          msg.id === messageId ? { ...msg, ...updates } : msg
        );
      });
      return { messages: newMessages };
    }),

  deleteMessage: (messageId) =>
    set((state) => {
      const newMessages = { ...state.messages };
      Object.keys(newMessages).forEach((chatId) => {
        newMessages[chatId] = newMessages[chatId].filter((msg) => msg.id !== messageId);
      });
      return { messages: newMessages };
    }),

  addTypingIndicator: (indicator) =>
    set((state) => {
      const chatIndicators = state.typingIndicators[indicator.chatId] || [];
      const exists = chatIndicators.some((ind) => ind.userId === indicator.userId);

      if (exists) return state;

      return {
        typingIndicators: {
          ...state.typingIndicators,
          [indicator.chatId]: [...chatIndicators, indicator],
        },
      };
    }),

  removeTypingIndicator: (chatId, userId) =>
    set((state) => ({
      typingIndicators: {
        ...state.typingIndicators,
        [chatId]: (state.typingIndicators[chatId] || []).filter(
          (ind) => ind.userId !== userId
        ),
      },
    })),

  setSearchQuery: (query) => set({ searchQuery: query }),

  pinChat: (chatId) =>
    set((state) => ({
      chats: state.chats.map((chat) =>
        chat.id === chatId ? { ...chat, isPinned: !chat.isPinned } : chat
      ),
    })),

  archiveChat: (chatId) =>
    set((state) => ({
      chats: state.chats.map((chat) =>
        chat.id === chatId ? { ...chat, isArchived: !chat.isArchived } : chat
      ),
    })),

  muteChat: (chatId) =>
    set((state) => ({
      chats: state.chats.map((chat) =>
        chat.id === chatId ? { ...chat, isMuted: !chat.isMuted } : chat
      ),
    })),
}));
