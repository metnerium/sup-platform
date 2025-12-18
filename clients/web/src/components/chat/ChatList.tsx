import React, { useMemo } from 'react';
import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';
import { ChatListItem } from './ChatListItem';

export const ChatList: React.FC = () => {
  const { chats, searchQuery, setCurrentChat } = useChatStore();
  const { user } = useAuthStore();

  const filteredChats = useMemo(() => {
    let filtered = chats;

    if (searchQuery) {
      filtered = filtered.filter((chat) =>
        chat.name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort: pinned first, then by last message time
    return filtered.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      const aTime = a.lastMessage?.createdAt || a.updatedAt;
      const bTime = b.lastMessage?.createdAt || b.updatedAt;

      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });
  }, [chats, searchQuery]);

  const pinnedChats = filteredChats.filter((chat) => chat.isPinned && !chat.isArchived);
  const regularChats = filteredChats.filter((chat) => !chat.isPinned && !chat.isArchived);
  const archivedChats = filteredChats.filter((chat) => chat.isArchived);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-dark-surface">
      <div className="flex-1 overflow-y-auto">
        {pinnedChats.length > 0 && (
          <div>
            <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
              Pinned
            </div>
            {pinnedChats.map((chat) => (
              <ChatListItem
                key={chat.id}
                chat={chat}
                onClick={() => setCurrentChat(chat.id)}
              />
            ))}
          </div>
        )}

        {regularChats.length > 0 && (
          <div>
            {pinnedChats.length > 0 && (
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                All Chats
              </div>
            )}
            {regularChats.map((chat) => (
              <ChatListItem
                key={chat.id}
                chat={chat}
                onClick={() => setCurrentChat(chat.id)}
              />
            ))}
          </div>
        )}

        {archivedChats.length > 0 && (
          <div>
            <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
              Archived
            </div>
            {archivedChats.map((chat) => (
              <ChatListItem
                key={chat.id}
                chat={chat}
                onClick={() => setCurrentChat(chat.id)}
              />
            ))}
          </div>
        )}

        {filteredChats.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <svg className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-lg font-medium">No conversations yet</p>
            <p className="text-sm">Start a new chat to begin messaging</p>
          </div>
        )}
      </div>
    </div>
  );
};
