import {
  Room,
  RoomEvent,
  Track,
  Participant,
  LocalParticipant,
  RemoteParticipant,
  VideoPresets,
} from '@livekit/react-native';
import {LIVEKIT_URL} from '@/constants/config';
import api from './api';

export interface LiveKitCallOptions {
  roomId: string;
  audio: boolean;
  video: boolean;
}

class LiveKitServiceClass {
  private room: Room | null = null;
  private listeners: Map<string, Set<Function>> = new Map();

  async connect(options: LiveKitCallOptions): Promise<Room> {
    try {
      // Get LiveKit token from backend
      const {token} = await api.post<{token: string}>('/calls/livekit-token', {
        roomId: options.roomId,
      });

      // Create and connect to room
      this.room = new Room();

      // Setup event listeners
      this.setupEventListeners();

      await this.room.connect(LIVEKIT_URL, token, {
        audio: options.audio,
        video: options.video,
      });

      // Enable camera and microphone
      if (options.video) {
        await this.room.localParticipant.setCameraEnabled(true);
      }
      if (options.audio) {
        await this.room.localParticipant.setMicrophoneEnabled(true);
      }

      return this.room;
    } catch (error) {
      console.error('Error connecting to LiveKit:', error);
      throw error;
    }
  }

  private setupEventListeners() {
    if (!this.room) return;

    this.room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
      console.log('Participant connected:', participant.identity);
      this.emit('participantConnected', participant);
    });

    this.room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
      console.log('Participant disconnected:', participant.identity);
      this.emit('participantDisconnected', participant);
    });

    this.room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      console.log('Track subscribed:', track.kind);
      this.emit('trackSubscribed', {track, publication, participant});
    });

    this.room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
      console.log('Track unsubscribed:', track.kind);
      this.emit('trackUnsubscribed', {track, publication, participant});
    });

    this.room.on(RoomEvent.Disconnected, () => {
      console.log('Disconnected from room');
      this.emit('disconnected', {});
    });

    this.room.on(RoomEvent.ConnectionQualityChanged, (quality, participant) => {
      console.log('Connection quality changed:', quality);
      this.emit('connectionQualityChanged', {quality, participant});
    });
  }

  async disconnect() {
    if (this.room) {
      await this.room.disconnect();
      this.room = null;
    }
  }

  async toggleMicrophone(): Promise<boolean> {
    if (!this.room) return false;

    const enabled = this.room.localParticipant.isMicrophoneEnabled;
    await this.room.localParticipant.setMicrophoneEnabled(!enabled);
    return !enabled;
  }

  async toggleCamera(): Promise<boolean> {
    if (!this.room) return false;

    const enabled = this.room.localParticipant.isCameraEnabled;
    await this.room.localParticipant.setCameraEnabled(!enabled);
    return !enabled;
  }

  async switchCamera() {
    if (!this.room) return;

    await this.room.localParticipant.switchCamera();
  }

  async toggleSpeaker(): Promise<boolean> {
    // This would use native audio routing
    // Implementation depends on platform-specific modules
    return true;
  }

  getRoom(): Room | null {
    return this.room;
  }

  getLocalParticipant(): LocalParticipant | null {
    return this.room?.localParticipant || null;
  }

  getRemoteParticipants(): RemoteParticipant[] {
    return this.room ? Array.from(this.room.participants.values()) : [];
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: Function) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  private emit(event: string, data: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }
}

export const LiveKitService = new LiveKitServiceClass();
