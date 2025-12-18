import React from 'react';
import clsx from 'clsx';
import type { Chat } from '@/types';
import { Avatar } from '@/components/common/Avatar';
import { formatMessageTime, truncateText } from '@/utils/format';
import { useChatStore } from '@/store/chatStore';

interface ChatListItemProps {
  chat: Chat;
  onClick: () => void;
}

export const ChatListItem: React.FC<ChatListItemProps> = ({ chat, onClick }) => {
  const { currentChatId } = useChatStore();
  const isActive = currentChatId === chat.id;

  const getLastMessagePreview = () => {
    if (!chat.lastMessage) return 'No messages yet';

    const { content, type, senderId } = chat.lastMessage;

    if (type === 'text') {
      return truncateText(content || '', 50);
    } else if (type === 'image') {
      return '📷 Photo';
    } else if (type === 'video') {
      return '🎥 Video';
    } else if (type === 'audio') {
      return '🎵 Audio';
    } else if (type === 'voice') {
      return '🎤 Voice message';
    } else if (type === 'file') {
      return '📎 File';
    }

    return '';
  };

  return (
    <div
      className={clsx(
        'flex items-center px-4 py-3 cursor-pointer transition-colors',
        'hover:bg-gray-50 dark:hover:bg-dark-bg',
        isActive && 'bg-primary-50 dark:bg-primary-900/20 border-l-4 border-primary-600'
      )}
      onClick={onClick}
    >
      <Avatar
        src={chat.avatar}
        name={chat.name || 'Unknown'}
        size="md"
        isOnline={false}
      />

      <div className="flex-1 ml-3 min-w-0">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-dark-text truncate">
            {chat.name || 'Unknown'}
          </h3>
          {chat.lastMessage && (
            <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
              {formatMessageTime(chat.lastMessage.createdAt)}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between mt-1">
          <p className="text-sm text-gray-600 dark:text-gray-400 truncate flex-1">
            {getLastMessagePreview()}
          </p>

          <div className="flex items-center gap-2 ml-2">
            {chat.isMuted && (
              <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            )}

            {chat.isPinned && (
              <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L11 4.323V3a1 1 0 011-1zm-5 8.274l-.818 2.552c-.25.78.409 1.557 1.222 1.444l3.596-.464-3.182-3.182c-.377-.377-.79-.686-1.15-.936L5 10.274zm.904 6.304a1 1 0 01-1.414-1.414l9-9a1 1 0 011.414 1.414l-9 9z" />
              </svg>
            )}

            {chat.unreadCount > 0 && (
              <span className="bg-primary-600 text-white text-xs font-semibold rounded-full px-2 py-0.5 min-w-[20px] text-center">
                {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
