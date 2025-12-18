import {create} from 'zustand';
import {Story} from '@/types';
import api from '@/services/api';
import {PAGINATION} from '@/constants/config';

interface StoryState {
  stories: Story[];
  activeStory: Story | null;
  isLoading: boolean;
  hasMore: boolean;

  // Actions
  loadStories: (page?: number) => Promise<void>;
  createStory: (story: Partial<Story>) => Promise<void>;
  deleteStory: (storyId: string) => Promise<void>;
  viewStory: (storyId: string) => Promise<void>;
  replyToStory: (storyId: string, content: string) => Promise<void>;
  setActiveStory: (story: Story | null) => void;
}

export const useStoryStore = create<StoryState>((set, get) => ({
  stories: [],
  activeStory: null,
  isLoading: false,
  hasMore: true,

  loadStories: async (page = 1) => {
    set({isLoading: true});
    try {
      const stories = await api.get<Story[]>('/stories', {
        params: {
          page,
          limit: PAGINATION.STORIES_PER_PAGE,
        },
      });

      set(state => ({
        stories: page === 1 ? stories : [...state.stories, ...stories],
        hasMore: stories.length === PAGINATION.STORIES_PER_PAGE,
      }));
    } catch (error) {
      console.error('Error loading stories:', error);
    } finally {
      set({isLoading: false});
    }
  },

  createStory: async (story) => {
    set({isLoading: true});
    try {
      const newStory = await api.post<Story>('/stories', story);
      set(state => ({
        stories: [newStory, ...state.stories],
      }));
    } catch (error) {
      console.error('Error creating story:', error);
      throw error;
    } finally {
      set({isLoading: false});
    }
  },

  deleteStory: async (storyId) => {
    try {
      await api.delete(`/stories/${storyId}`);
      set(state => ({
        stories: state.stories.filter(s => s.id !== storyId),
      }));
    } catch (error) {
      console.error('Error deleting story:', error);
      throw error;
    }
  },

  viewStory: async (storyId) => {
    try {
      await api.post(`/stories/${storyId}/view`);
    } catch (error) {
      console.error('Error viewing story:', error);
    }
  },

  replyToStory: async (storyId, content) => {
    try {
      await api.post(`/stories/${storyId}/reply`, {content});
    } catch (error) {
      console.error('Error replying to story:', error);
      throw error;
    }
  },

  setActiveStory: (story) => {
    set({activeStory: story});
  },
}));
