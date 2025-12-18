import React, { useState } from 'react';
import clsx from 'clsx';
import type { Message } from '@/types';
import { formatMessageTime } from '@/utils/format';
import { useAuthStore } from '@/store/authStore';

interface MessageBubbleProps {
  message: Message;
  onReply?: () => void;
  onReact?: (emoji: string) => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onReply,
  onReact,
  onEdit,
  onDelete,
}) => {
  const { user } = useAuthStore();
  const [showMenu, setShowMenu] = useState(false);
  const isSent = message.senderId === user?.id;

  const renderMessageContent = () => {
    switch (message.type) {
      case 'text':
        return (
          <p className="whitespace-pre-wrap break-words">
            {message.content}
          </p>
        );

      case 'image':
        return (
          <div className="space-y-2">
            {message.attachments?.map((attachment) => (
              <img
                key={attachment.id}
                src={attachment.url}
                alt="Sent image"
                className="rounded-lg max-w-sm cursor-pointer hover:opacity-90"
                loading="lazy"
              />
            ))}
            {message.content && <p className="mt-2">{message.content}</p>}
          </div>
        );

      case 'video':
        return (
          <div className="space-y-2">
            {message.attachments?.map((attachment) => (
              <video
                key={attachment.id}
                src={attachment.url}
                controls
                className="rounded-lg max-w-sm"
              />
            ))}
            {message.content && <p className="mt-2">{message.content}</p>}
          </div>
        );

      case 'voice':
        return (
          <div className="flex items-center gap-3 min-w-[200px]">
            <button className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center hover:bg-primary-700">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
              </svg>
            </button>
            <div className="flex-1">
              <div className="h-8 flex items-center">
                {/* Waveform placeholder */}
                <div className="flex-1 h-1 bg-gray-300 dark:bg-gray-600 rounded" />
              </div>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {message.attachments?.[0]?.duration ? `${Math.floor(message.attachments[0].duration)}s` : '0:00'}
            </span>
          </div>
        );

      case 'file':
        return (
          <div>
            {message.attachments?.map((attachment) => (
              <a
                key={attachment.id}
                href={attachment.url}
                download
                className="flex items-center gap-3 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                <svg className="w-8 h-8 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{attachment.filename || 'File'}</p>
                  <p className="text-xs text-gray-500">{attachment.size ? `${(attachment.size / 1024).toFixed(2)} KB` : ''}</p>
                </div>
              </a>
            ))}
            {message.content && <p className="mt-2">{message.content}</p>}
          </div>
        );

      default:
        return <p>{message.content}</p>;
    }
  };

  const getStatusIcon = () => {
    if (!isSent) return null;

    switch (message.status) {
      case 'sending':
        return (
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'sent':
        return (
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'delivered':
        return (
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13l4 4L23 7" />
          </svg>
        );
      case 'read':
        return (
          <svg className="w-4 h-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13l4 4L23 7" />
          </svg>
        );
    }
  };

  return (
    <div
      className={clsx(
        'flex items-end gap-2 mb-4 group',
        isSent ? 'justify-end' : 'justify-start'
      )}
      onMouseEnter={() => setShowMenu(true)}
      onMouseLeave={() => setShowMenu(false)}
    >
      {!isSent && showMenu && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          <button
            onClick={onReply}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            title="Reply"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>
        </div>
      )}

      <div
        className={clsx(
          'max-w-md px-4 py-2 rounded-2xl',
          isSent
            ? 'bg-primary-600 text-white rounded-br-none'
            : 'bg-gray-100 dark:bg-dark-surface text-gray-900 dark:text-dark-text rounded-bl-none'
        )}
      >
        {message.replyTo && (
          <div className={clsx(
            'mb-2 p-2 border-l-2 text-sm opacity-75',
            isSent ? 'border-white' : 'border-primary-600'
          )}>
            Replying to message...
          </div>
        )}

        {renderMessageContent()}

        <div className="flex items-center justify-end gap-2 mt-1">
          {message.edited && (
            <span className="text-xs opacity-70">edited</span>
          )}
          <span className="text-xs opacity-70">
            {formatMessageTime(message.createdAt)}
          </span>
          {getStatusIcon()}
        </div>

        {message.reactions && message.reactions.length > 0 && (
          <div className="flex gap-1 mt-2">
            {message.reactions.map((reaction, index) => (
              <span
                key={index}
                className="bg-white dark:bg-dark-bg rounded-full px-2 py-0.5 text-xs"
              >
                {reaction.emoji}
              </span>
            ))}
          </div>
        )}
      </div>

      {isSent && showMenu && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          <button
            onClick={onEdit}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            title="Edit"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            title="Delete"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};
