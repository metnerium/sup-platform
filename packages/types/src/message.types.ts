import { MessageType } from './common.types';

// Message types

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderDeviceId?: string;
  encryptedContent: string;
  type: MessageType;
  replyToId?: string;
  forwardFromId?: string;
  editedAt?: Date;
  deletedAt?: Date;
  createdAt: Date;
}

export interface MessageRecipient {
  messageId: string;
  userId: string;
  deviceId: string;
  deliveredAt?: Date;
  readAt?: Date;
}

export interface MessageReaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: Date;
}

export interface SendMessageRequest {
  chatId: string;
  encryptedContent: string;
  type: MessageType;
  replyToId?: string;
  recipientDeviceIds?: Record<string, string[]>; // userId -> deviceIds[]
}

export interface SendMessageResponse {
  message: Message;
  recipients: MessageRecipient[];
}

export interface MediaFile {
  id: string;
  messageId: string;
  fileType: string;
  mimeType?: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  durationSeconds?: number;
  s3Key: string;
  thumbnailS3Key?: string;
  encryptionKeyEncrypted?: string;
  createdAt: Date;
}
