import React, { useEffect, useState } from 'react';
import { useStoryStore } from '@/store/storyStore';
import { Avatar } from '@/components/common/Avatar';
import { formatDistanceToNow } from 'date-fns';

export const StoryViewer: React.FC = () => {
  const { stories, currentStory, nextStory, previousStory, setCurrentStory } = useStoryStore();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!currentStory) return;

    const userStories = stories[currentStory.userId];
    if (!userStories || !userStories[currentStory.storyIndex]) return;

    const story = userStories[currentStory.storyIndex];
    const duration = story.duration * 1000; // Convert to ms
    const startTime = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(newProgress);

      if (newProgress >= 100) {
        nextStory();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [currentStory, stories, nextStory]);

  if (!currentStory) return null;

  const userStories = stories[currentStory.userId];
  if (!userStories || !userStories[currentStory.storyIndex]) return null;

  const story = userStories[currentStory.storyIndex];

  const renderStoryContent = () => {
    switch (story.type) {
      case 'image':
        return (
          <img
            src={story.mediaUrl}
            alt="Story"
            className="w-full h-full object-contain"
          />
        );
      case 'video':
        return (
          <video
            src={story.mediaUrl}
            autoPlay
            muted
            className="w-full h-full object-contain"
          />
        );
      case 'text':
        return (
          <div
            className="w-full h-full flex items-center justify-center p-8"
            style={{ backgroundColor: story.backgroundColor || '#000' }}
          >
            <p className="text-white text-2xl font-medium text-center">
              {story.content}
            </p>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      {/* Close Button */}
      <button
        onClick={() => setCurrentStory(null)}
        className="absolute top-4 right-4 z-10 text-white hover:bg-white/20 rounded-full p-2"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Navigation Areas */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1/3 cursor-pointer z-10"
        onClick={previousStory}
      />
      <div
        className="absolute right-0 top-0 bottom-0 w-1/3 cursor-pointer z-10"
        onClick={nextStory}
      />

      {/* Story Container */}
      <div className="relative w-full max-w-md h-full md:h-auto md:aspect-[9/16] bg-black">
        {/* Progress Bars */}
        <div className="absolute top-0 left-0 right-0 z-10 flex gap-1 p-2">
          {userStories.map((_, index) => (
            <div
              key={index}
              className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden"
            >
              <div
                className="h-full bg-white transition-all duration-100"
                style={{
                  width:
                    index < currentStory.storyIndex
                      ? '100%'
                      : index === currentStory.storyIndex
                      ? `${progress}%`
                      : '0%',
                }}
              />
            </div>
          ))}
        </div>

        {/* Story Header */}
        <div className="absolute top-4 left-4 right-16 z-10 flex items-center gap-3">
          <Avatar
            src={story.userId}
            name={story.userId}
            size="sm"
          />
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium text-sm truncate">
              User {story.userId.slice(0, 8)}
            </p>
            <p className="text-white/70 text-xs">
              {formatDistanceToNow(new Date(story.createdAt), { addSuffix: true })}
            </p>
          </div>
        </div>

        {/* Story Content */}
        <div className="w-full h-full">{renderStoryContent()}</div>

        {/* Story Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/50">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Send a reaction..."
              className="flex-1 px-4 py-2 bg-white/20 text-white placeholder-white/70 border border-white/30 rounded-full focus:outline-none focus:ring-2 focus:ring-white/50"
            />
            <button className="text-white hover:bg-white/20 rounded-full p-2">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
