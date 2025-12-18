import React, { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useChatStore } from '@/store/chatStore';
import { Avatar } from '@/components/common/Avatar';
import { ChatList } from './ChatList';
import { StoriesBar } from '@/components/stories/StoriesBar';

export const Sidebar: React.FC = () => {
  const { user } = useAuthStore();
  const { searchQuery, setSearchQuery } = useChatStore();
  const [activeTab, setActiveTab] = useState<'chats' | 'contacts' | 'settings'>('chats');

  return (
    <div className="w-full md:w-96 h-full flex flex-col bg-white dark:bg-dark-surface border-r dark:border-dark-border">
      {/* Header */}
      <div className="p-4 border-b dark:border-dark-border">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text">
            Chats
          </h1>
          <div className="flex items-center gap-2">
            <button className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-bg rounded-full">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
            <Avatar
              src={user?.avatar}
              name={user?.username || 'User'}
              size="sm"
              isOnline={true}
              className="cursor-pointer"
            />
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-dark-bg border-none rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-dark-text"
          />
        </div>
      </div>

      {/* Stories */}
      <StoriesBar />

      {/* Tabs */}
      <div className="flex border-b dark:border-dark-border">
        <button
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'chats'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
          onClick={() => setActiveTab('chats')}
        >
          Chats
        </button>
        <button
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'contacts'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
          onClick={() => setActiveTab('contacts')}
        >
          Contacts
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'chats' && <ChatList />}
        {activeTab === 'contacts' && (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <p>Contacts coming soon...</p>
          </div>
        )}
      </div>
    </div>
  );
};
