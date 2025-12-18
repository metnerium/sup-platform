import { create } from 'zustand';
import type { Story } from '@/types';

interface StoryState {
  stories: Record<string, Story[]>; // userId -> stories
  currentStory: { userId: string; storyIndex: number } | null;
  isCreating: boolean;

  setStories: (userId: string, stories: Story[]) => void;
  addStory: (story: Story) => void;
  removeStory: (storyId: string) => void;
  setCurrentStory: (userId: string | null, storyIndex?: number) => void;
  nextStory: () => void;
  previousStory: () => void;
  setIsCreating: (isCreating: boolean) => void;
}

export const useStoryStore = create<StoryState>((set, get) => ({
  stories: {},
  currentStory: null,
  isCreating: false,

  setStories: (userId, stories) =>
    set((state) => ({
      stories: {
        ...state.stories,
        [userId]: stories,
      },
    })),

  addStory: (story) =>
    set((state) => {
      const userStories = state.stories[story.userId] || [];
      return {
        stories: {
          ...state.stories,
          [story.userId]: [...userStories, story],
        },
      };
    }),

  removeStory: (storyId) =>
    set((state) => {
      const newStories = { ...state.stories };
      Object.keys(newStories).forEach((userId) => {
        newStories[userId] = newStories[userId].filter((s) => s.id !== storyId);
      });
      return { stories: newStories };
    }),

  setCurrentStory: (userId, storyIndex = 0) =>
    set({
      currentStory: userId ? { userId, storyIndex } : null,
    }),

  nextStory: () => {
    const { currentStory, stories } = get();
    if (!currentStory) return;

    const userStories = stories[currentStory.userId] || [];
    const nextIndex = currentStory.storyIndex + 1;

    if (nextIndex < userStories.length) {
      set({
        currentStory: {
          userId: currentStory.userId,
          storyIndex: nextIndex,
        },
      });
    } else {
      // Move to next user's stories
      const userIds = Object.keys(stories);
      const currentUserIndex = userIds.indexOf(currentStory.userId);
      const nextUserId = userIds[currentUserIndex + 1];

      if (nextUserId) {
        set({
          currentStory: {
            userId: nextUserId,
            storyIndex: 0,
          },
        });
      } else {
        set({ currentStory: null });
      }
    }
  },

  previousStory: () => {
    const { currentStory, stories } = get();
    if (!currentStory) return;

    const prevIndex = currentStory.storyIndex - 1;

    if (prevIndex >= 0) {
      set({
        currentStory: {
          userId: currentStory.userId,
          storyIndex: prevIndex,
        },
      });
    } else {
      // Move to previous user's stories
      const userIds = Object.keys(stories);
      const currentUserIndex = userIds.indexOf(currentStory.userId);
      const prevUserId = userIds[currentUserIndex - 1];

      if (prevUserId) {
        const prevUserStories = stories[prevUserId];
        set({
          currentStory: {
            userId: prevUserId,
            storyIndex: prevUserStories.length - 1,
          },
        });
      }
    }
  },

  setIsCreating: (isCreating) => set({ isCreating }),
}));
