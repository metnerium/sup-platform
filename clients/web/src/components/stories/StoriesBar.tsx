import React from 'react';
import { useStoryStore } from '@/store/storyStore';
import { useAuthStore } from '@/store/authStore';
import { Avatar } from '@/components/common/Avatar';

export const StoriesBar: React.FC = () => {
  const { stories, setCurrentStory, setIsCreating } = useStoryStore();
  const { user } = useAuthStore();

  const userStories = Object.entries(stories);

  return (
    <div className="border-b dark:border-dark-border bg-white dark:bg-dark-surface">
      <div className="flex gap-3 px-4 py-3 overflow-x-auto scrollbar-hide">
        {/* Add Story Button */}
        <div
          className="flex flex-col items-center gap-1 cursor-pointer flex-shrink-0"
          onClick={() => setIsCreating(true)}
        >
          <div className="relative">
            <Avatar
              src={user?.avatar}
              name={user?.username || 'You'}
              size="md"
            />
            <div className="absolute bottom-0 right-0 w-5 h-5 bg-primary-600 rounded-full flex items-center justify-center border-2 border-white dark:border-dark-surface">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
          </div>
          <span className="text-xs text-gray-600 dark:text-gray-400 truncate max-w-[60px]">
            Your story
          </span>
        </div>

        {/* User Stories */}
        {userStories.map(([userId, userStoryList]) => {
          if (userStoryList.length === 0) return null;

          const hasUnviewed = userStoryList.some(
            (story) => !story.views.some((view) => view.userId === user?.id)
          );

          return (
            <div
              key={userId}
              className="flex flex-col items-center gap-1 cursor-pointer flex-shrink-0"
              onClick={() => setCurrentStory(userId, 0)}
            >
              <div
                className={`p-0.5 rounded-full ${
                  hasUnviewed
                    ? 'bg-gradient-to-tr from-yellow-400 via-red-500 to-pink-500'
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <div className="bg-white dark:bg-dark-surface rounded-full p-0.5">
                  <Avatar
                    src={userStoryList[0].userId}
                    name={userStoryList[0].userId}
                    size="md"
                  />
                </div>
              </div>
              <span className="text-xs text-gray-600 dark:text-gray-400 truncate max-w-[60px]">
                User {userId.slice(0, 6)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
