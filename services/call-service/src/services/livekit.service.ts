import {
  AccessToken,
  RoomServiceClient,
  Room,
  ParticipantInfo,
  DataPacket_Kind,
} from 'livekit-server-sdk';
import { config } from '../config';
import { logger } from '../utils/logger';
import { LiveKitToken } from '@sup/types';

export class LiveKitService {
  private roomService: RoomServiceClient;

  constructor() {
    this.roomService = new RoomServiceClient(
      config.livekit.url,
      config.livekit.apiKey,
      config.livekit.apiSecret
    );
  }

  /**
   * Create a LiveKit room
   */
  async createRoom(roomName: string, maxParticipants: number = 8): Promise<Room> {
    try {
      const room = await this.roomService.createRoom({
        name: roomName,
        emptyTimeout: 300, // 5 minutes
        maxParticipants,
        metadata: JSON.stringify({
          createdBy: 'sup-messenger',
          createdAt: new Date().toISOString(),
        }),
      });

      logger.info('LiveKit room created', { roomName, maxParticipants });
      return room;
    } catch (error) {
      logger.error('Failed to create LiveKit room', { roomName, error });
      throw error;
    }
  }

  /**
   * Generate access token for a participant
   */
  async generateToken(
    roomName: string,
    participantIdentity: string,
    participantName: string,
    metadata?: Record<string, any>
  ): Promise<LiveKitToken> {
    try {
      const token = new AccessToken(
        config.livekit.apiKey,
        config.livekit.apiSecret,
        {
          identity: participantIdentity,
          name: participantName,
          metadata: metadata ? JSON.stringify(metadata) : undefined,
        }
      );

      // Grant permissions
      token.addGrant({
        roomJoin: true,
        room: roomName,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      });

      const jwt = await token.toJwt();

      logger.info('Access token generated', {
        roomName,
        participantIdentity,
      });

      return {
        token: jwt,
        url: config.livekit.url,
        roomName,
        identity: participantIdentity,
      };
    } catch (error) {
      logger.error('Failed to generate access token', {
        roomName,
        participantIdentity,
        error,
      });
      throw error;
    }
  }

  /**
   * Get room details
   */
  async getRoom(roomName: string): Promise<Room | null> {
    try {
      const rooms = await this.roomService.listRooms([roomName]);
      return rooms.length > 0 ? rooms[0] : null;
    } catch (error) {
      logger.error('Failed to get room', { roomName, error });
      return null;
    }
  }

  /**
   * Delete a room
   */
  async deleteRoom(roomName: string): Promise<void> {
    try {
      await this.roomService.deleteRoom(roomName);
      logger.info('LiveKit room deleted', { roomName });
    } catch (error) {
      logger.error('Failed to delete room', { roomName, error });
      throw error;
    }
  }

  /**
   * List participants in a room
   */
  async listParticipants(roomName: string): Promise<ParticipantInfo[]> {
    try {
      const participants = await this.roomService.listParticipants(roomName);
      return participants;
    } catch (error) {
      logger.error('Failed to list participants', { roomName, error });
      return [];
    }
  }

  /**
   * Remove participant from room
   */
  async removeParticipant(roomName: string, participantIdentity: string): Promise<void> {
    try {
      await this.roomService.removeParticipant(roomName, participantIdentity);
      logger.info('Participant removed from room', {
        roomName,
        participantIdentity,
      });
    } catch (error) {
      logger.error('Failed to remove participant', {
        roomName,
        participantIdentity,
        error,
      });
      throw error;
    }
  }

  /**
   * Mute/unmute participant's track
   */
  async muteParticipantTrack(
    roomName: string,
    participantIdentity: string,
    trackSid: string,
    muted: boolean
  ): Promise<void> {
    try {
      await this.roomService.mutePublishedTrack(
        roomName,
        participantIdentity,
        trackSid,
        muted
      );
      logger.info('Participant track muted/unmuted', {
        roomName,
        participantIdentity,
        trackSid,
        muted,
      });
    } catch (error) {
      logger.error('Failed to mute/unmute track', {
        roomName,
        participantIdentity,
        trackSid,
        error,
      });
      throw error;
    }
  }

  /**
   * Update participant metadata
   */
  async updateParticipantMetadata(
    roomName: string,
    participantIdentity: string,
    metadata: Record<string, any>
  ): Promise<void> {
    try {
      await this.roomService.updateParticipant(roomName, participantIdentity, {
        metadata: JSON.stringify(metadata),
      });
      logger.info('Participant metadata updated', {
        roomName,
        participantIdentity,
      });
    } catch (error) {
      logger.error('Failed to update participant metadata', {
        roomName,
        participantIdentity,
        error,
      });
      throw error;
    }
  }

  /**
   * Send data message to room
   */
  async sendData(
    roomName: string,
    data: Uint8Array,
    destinationIdentities?: string[]
  ): Promise<void> {
    try {
      await this.roomService.sendData(
        roomName,
        data,
        DataPacket_Kind.RELIABLE,
        { destinationSids: destinationIdentities }
      );
      logger.debug('Data sent to room', { roomName });
    } catch (error) {
      logger.error('Failed to send data', { roomName, error });
      throw error;
    }
  }

  /**
   * Update room metadata
   */
  async updateRoomMetadata(
    roomName: string,
    metadata: Record<string, any>
  ): Promise<void> {
    try {
      await this.roomService.updateRoomMetadata(
        roomName,
        JSON.stringify(metadata)
      );
      logger.info('Room metadata updated', { roomName });
    } catch (error) {
      logger.error('Failed to update room metadata', { roomName, error });
      throw error;
    }
  }

  /**
   * Get active rooms count
   */
  async getActiveRoomsCount(): Promise<number> {
    try {
      const rooms = await this.roomService.listRooms();
      return rooms.length;
    } catch (error) {
      logger.error('Failed to get active rooms count', { error });
      return 0;
    }
  }
}

export const livekitService = new LiveKitService();
