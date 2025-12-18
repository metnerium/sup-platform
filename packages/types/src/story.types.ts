// Story types

export type StoryPrivacy = 'all' | 'contacts' | 'selected';

export interface Story {
  id: string;
  userId: string;
  mediaType: 'image' | 'video' | 'text';
  s3Key: string;
  captionEncrypted?: string;
  privacy: StoryPrivacy;
  expiresAt: Date;
  createdAt: Date;
}

export interface StoryView {
  storyId: string;
  viewerId: string;
  viewedAt: Date;
}

export interface StoryPrivacyList {
  storyId: string;
  allowedUserId: string;
}

export interface StoryWithViews extends Story {
  viewsCount: number;
  hasViewed?: boolean;
}

export interface StoryFeedItem {
  userId: string;
  username: string;
  avatarUrl?: string;
  stories: StoryWithViews[];
  hasUnviewed: boolean;
}

export interface CreateStoryRequest {
  mediaType: 'image' | 'video' | 'text';
  s3Key: string;
  captionEncrypted?: string;
  privacy: StoryPrivacy;
  allowedUserIds?: string[];
}

export interface StoryViewRequest {
  storyId: string;
}

export interface StoryViewerInfo {
  viewerId: string;
  username: string;
  avatarUrl?: string;
  viewedAt: Date;
}
