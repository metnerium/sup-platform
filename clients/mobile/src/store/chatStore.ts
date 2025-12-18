import {create} from 'zustand';
import {Message, Conversation, TypingIndicator} from '@/types';
import api from '@/services/api';
import socketService from '@/services/socket';
import {PAGINATION, STORAGE_KEYS} from '@/constants/config';
import storageUtils from '@/utils/storage';

interface ChatState {
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  activeConversation: string | null;
  typingUsers: Record<string, TypingIndicator[]>;
  isLoading: boolean;
  hasMore: Record<string, boolean>;

  // Actions
  setActiveConversation: (conversationId: string | null) => void;
  loadConversations: () => Promise<void>;
  loadMessages: (conversationId: string, page?: number) => Promise<void>;
  sendMessage: (
    conversationId: string,
    message: Partial<Message>,
  ) => Promise<void>;
  deleteMessage: (messageId: string, forEveryone?: boolean) => Promise<void>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  addReaction: (messageId: string, emoji: string) => Promise<void>;
  removeReaction: (messageId: string, emoji: string) => Promise<void>;
  markAsRead: (conversationId: string) => Promise<void>;
  startTyping: (conversationId: string) => void;
  stopTyping: (conversationId: string) => void;
  handleNewMessage: (message: Message) => void;
  handleTypingStart: (data: TypingIndicator) => void;
  handleTypingStop: (data: TypingIndicator) => void;
  loadPersistedData: () => void;
  savePersistedData: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  messages: {},
  activeConversation: null,
  typingUsers: {},
  isLoading: false,
  hasMore: {},

  setActiveConversation: (conversationId) => {
    set({activeConversation: conversationId});
  },

  loadConversations: async () => {
    set({isLoading: true});
    try {
      const conversations = await api.get<Conversation[]>('/conversations', {
        params: {
          page: 1,
          limit: PAGINATION.CONVERSATIONS_PER_PAGE,
        },
      });
      set({conversations});
      get().savePersistedData();
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      set({isLoading: false});
    }
  },

  loadMessages: async (conversationId, page = 1) => {
    set({isLoading: true});
    try {
      const messages = await api.get<Message[]>(
        `/conversations/${conversationId}/messages`,
        {
          params: {
            page,
            limit: PAGINATION.MESSAGES_PER_PAGE,
          },
        },
      );

      set(state => ({
        messages: {
          ...state.messages,
          [conversationId]: page === 1
            ? messages
            : [...(state.messages[conversationId] || []), ...messages],
        },
        hasMore: {
          ...state.hasMore,
          [conversationId]: messages.length === PAGINATION.MESSAGES_PER_PAGE,
        },
      }));

      get().savePersistedData();
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      set({isLoading: false});
    }
  },

  sendMessage: async (conversationId, message) => {
    const tempId = `temp_${Date.now()}`;
    const tempMessage: Message = {
      id: tempId,
      localId: tempId,
      conversationId,
      senderId: '',
      sender: {} as any,
      content: message.content || '',
      type: message.type || 'text',
      status: 'sending',
      attachments: message.attachments || [],
      reactions: [],
      isEdited: false,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Add optimistic message
    set(state => ({
      messages: {
        ...state.messages,
        [conversationId]: [
          tempMessage,
          ...(state.messages[conversationId] || []),
        ],
      },
    }));

    try {
      const sentMessage = await api.post<Message>(
        `/conversations/${conversationId}/messages`,
        message,
      );

      // Replace temp message with actual message
      set(state => ({
        messages: {
          ...state.messages,
          [conversationId]: state.messages[conversationId].map(m =>
            m.id === tempId ? sentMessage : m,
          ),
        },
      }));

      // Also send via socket for real-time delivery
      socketService.sendMessage(conversationId, sentMessage);

      get().savePersistedData();
    } catch (error) {
      console.error('Error sending message:', error);
      // Mark message as failed
      set(state => ({
        messages: {
          ...state.messages,
          [conversationId]: state.messages[conversationId].map(m =>
            m.id === tempId ? {...m, status: 'failed' as const} : m,
          ),
        },
      }));
      throw error;
    }
  },

  deleteMessage: async (messageId, forEveryone = false) => {
    try {
      await api.delete(`/messages/${messageId}`, {
        params: {forEveryone},
      });
      socketService.deleteMessage(messageId, forEveryone);

      // Update local state
      set(state => {
        const newMessages = {...state.messages};
        Object.keys(newMessages).forEach(conversationId => {
          newMessages[conversationId] = newMessages[conversationId].map(m =>
            m.id === messageId
              ? {...m, isDeleted: true, deletedAt: new Date()}
              : m,
          );
        });
        return {messages: newMessages};
      });

      get().savePersistedData();
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  },

  editMessage: async (messageId, content) => {
    try {
      const editedMessage = await api.patch<Message>(`/messages/${messageId}`, {
        content,
      });
      socketService.editMessage(messageId, content);

      // Update local state
      set(state => {
        const newMessages = {...state.messages};
        Object.keys(newMessages).forEach(conversationId => {
          newMessages[conversationId] = newMessages[conversationId].map(m =>
            m.id === messageId ? editedMessage : m,
          );
        });
        return {messages: newMessages};
      });

      get().savePersistedData();
    } catch (error) {
      console.error('Error editing message:', error);
      throw error;
    }
  },

  addReaction: async (messageId, emoji) => {
    try {
      await api.post(`/messages/${messageId}/reactions`, {emoji});
      socketService.addReaction(messageId, emoji);
    } catch (error) {
      console.error('Error adding reaction:', error);
      throw error;
    }
  },

  removeReaction: async (messageId, emoji) => {
    try {
      await api.delete(`/messages/${messageId}/reactions/${emoji}`);
      socketService.removeReaction(messageId, emoji);
    } catch (error) {
      console.error('Error removing reaction:', error);
      throw error;
    }
  },

  markAsRead: async (conversationId) => {
    try {
      const messages = get().messages[conversationId] || [];
      const unreadMessages = messages.filter(m => m.status !== 'read');

      for (const message of unreadMessages) {
        socketService.markAsRead(message.id);
      }

      // Update conversation unread count
      set(state => ({
        conversations: state.conversations.map(c =>
          c.id === conversationId ? {...c, unreadCount: 0} : c,
        ),
      }));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  },

  startTyping: (conversationId) => {
    socketService.startTyping(conversationId);
  },

  stopTyping: (conversationId) => {
    socketService.stopTyping(conversationId);
  },

  handleNewMessage: (message) => {
    set(state => ({
      messages: {
        ...state.messages,
        [message.conversationId]: [
          message,
          ...(state.messages[message.conversationId] || []),
        ],
      },
      conversations: state.conversations.map(c =>
        c.id === message.conversationId
          ? {
              ...c,
              lastMessage: message,
              unreadCount: c.unreadCount + 1,
              updatedAt: message.createdAt,
            }
          : c,
      ),
    }));

    get().savePersistedData();
  },

  handleTypingStart: (data) => {
    set(state => ({
      typingUsers: {
        ...state.typingUsers,
        [data.conversationId]: [
          ...(state.typingUsers[data.conversationId] || []),
          data,
        ],
      },
    }));
  },

  handleTypingStop: (data) => {
    set(state => ({
      typingUsers: {
        ...state.typingUsers,
        [data.conversationId]: (
          state.typingUsers[data.conversationId] || []
        ).filter(t => t.userId !== data.userId),
      },
    }));
  },

  loadPersistedData: () => {
    const conversations = storageUtils.get<Conversation[]>(
      STORAGE_KEYS.CONVERSATIONS,
    );
    const messages = storageUtils.get<Record<string, Message[]>>(
      STORAGE_KEYS.MESSAGES,
    );

    if (conversations) {
      set({conversations});
    }
    if (messages) {
      set({messages});
    }
  },

  savePersistedData: () => {
    const state = get();
    storageUtils.set(STORAGE_KEYS.CONVERSATIONS, state.conversations);
    storageUtils.set(STORAGE_KEYS.MESSAGES, state.messages);
  },
}));
