/**
 * Example client implementation for SUP Call Service
 * This demonstrates how to integrate the call service into a client application
 */

import io, { Socket } from 'socket.io-client';
import { Room, RoomEvent, RemoteParticipant, RemoteTrackPublication } from 'livekit-client';

interface CallClient {
  socket: Socket;
  room: Room | null;
  currentCallId: string | null;
}

class SupCallClient implements CallClient {
  socket: Socket;
  room: Room | null = null;
  currentCallId: string | null = null;
  private apiBaseUrl: string;
  private wsUrl: string;
  private token: string;

  constructor(apiBaseUrl: string, wsUrl: string, token: string) {
    this.apiBaseUrl = apiBaseUrl;
    this.wsUrl = wsUrl;
    this.token = token;

    // Initialize WebSocket connection
    this.socket = io(wsUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    this.setupSocketListeners();
  }

  /**
   * Set up WebSocket event listeners
   */
  private setupSocketListeners(): void {
    this.socket.on('connect', () => {
      console.log('Connected to call service');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from call service');
    });

    // Incoming call notification
    this.socket.on('call:incoming', (data) => {
      console.log('Incoming call:', data);
      this.handleIncomingCall(data);
    });

    // Call accepted
    this.socket.on('call:accepted', (data) => {
      console.log('Call accepted:', data);
      // Update UI
    });

    // Call declined
    this.socket.on('call:declined', (data) => {
      console.log('Call declined:', data);
      // Show notification and cleanup
    });

    // Call ended
    this.socket.on('call:ended', (data) => {
      console.log('Call ended:', data);
      this.handleCallEnded(data);
    });

    // Participant joined
    this.socket.on('call:participant_joined', (data) => {
      console.log('Participant joined:', data);
      // Update participant list
    });

    // Participant left
    this.socket.on('call:participant_left', (data) => {
      console.log('Participant left:', data);
      // Update participant list
    });

    // Participant updated
    this.socket.on('call:participant_updated', (data) => {
      console.log('Participant updated:', data);
      // Update participant status (muted, video off, etc.)
    });

    // WebRTC signaling (if not using LiveKit)
    this.socket.on('webrtc:offer', (data) => {
      console.log('Received WebRTC offer:', data);
    });

    this.socket.on('webrtc:answer', (data) => {
      console.log('Received WebRTC answer:', data);
    });

    this.socket.on('webrtc:ice_candidate', (data) => {
      console.log('Received ICE candidate:', data);
    });

    // Error handling
    this.socket.on('call:error', (data) => {
      console.error('Call error:', data);
      alert(`Call error: ${data.error}`);
    });
  }

  /**
   * Start a new call
   */
  async startCall(
    type: 'audio' | 'video',
    participantIds: string[],
    chatId?: string
  ): Promise<void> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/v1/calls/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          participantIds,
          chatId,
          videoEnabled: type === 'video',
          audioEnabled: true,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to start call');
      }

      const { call, token, iceServers } = result.data;
      this.currentCallId = call.id;

      // Connect to LiveKit room
      await this.connectToRoom(token.token, token.url);

      console.log('Call started successfully');
    } catch (error) {
      console.error('Failed to start call:', error);
      throw error;
    }
  }

  /**
   * Join an existing call
   */
  async joinCall(callId: string): Promise<void> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/api/v1/calls/${callId}/join`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            videoEnabled: true,
            audioEnabled: true,
          }),
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to join call');
      }

      const { call, token, iceServers } = result.data;
      this.currentCallId = call.id;

      // Notify via socket that we're accepting
      this.socket.emit('call:accept', { callId });

      // Connect to LiveKit room
      await this.connectToRoom(token.token, token.url);

      console.log('Joined call successfully');
    } catch (error) {
      console.error('Failed to join call:', error);
      throw error;
    }
  }

  /**
   * End current call
   */
  async endCall(reason: string = 'normal'): Promise<void> {
    if (!this.currentCallId) {
      console.warn('No active call to end');
      return;
    }

    try {
      await fetch(
        `${this.apiBaseUrl}/api/v1/calls/${this.currentCallId}/end`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ reason }),
        }
      );

      // Disconnect from room
      await this.disconnectFromRoom();

      this.currentCallId = null;
      console.log('Call ended');
    } catch (error) {
      console.error('Failed to end call:', error);
    }
  }

  /**
   * Decline incoming call
   */
  declineCall(callId: string): void {
    this.socket.emit('call:decline', { callId });
  }

  /**
   * Toggle audio
   */
  async toggleAudio(enabled: boolean): Promise<void> {
    if (!this.currentCallId || !this.room) return;

    // Update local track
    await this.room.localParticipant.setMicrophoneEnabled(enabled);

    // Update server
    this.socket.emit('call:toggle_audio', {
      callId: this.currentCallId,
      enabled,
    });
  }

  /**
   * Toggle video
   */
  async toggleVideo(enabled: boolean): Promise<void> {
    if (!this.currentCallId || !this.room) return;

    // Update local track
    await this.room.localParticipant.setCameraEnabled(enabled);

    // Update server
    this.socket.emit('call:toggle_video', {
      callId: this.currentCallId,
      enabled,
    });
  }

  /**
   * Toggle screen share
   */
  async toggleScreenShare(enabled: boolean): Promise<void> {
    if (!this.currentCallId || !this.room) return;

    // Update local track
    await this.room.localParticipant.setScreenShareEnabled(enabled);

    // Update server
    this.socket.emit('call:toggle_screen_share', {
      callId: this.currentCallId,
      enabled,
    });
  }

  /**
   * Connect to LiveKit room
   */
  private async connectToRoom(token: string, url: string): Promise<void> {
    this.room = new Room();

    // Set up room event listeners
    this.room.on(RoomEvent.Connected, () => {
      console.log('Connected to LiveKit room');
    });

    this.room.on(RoomEvent.Disconnected, () => {
      console.log('Disconnected from LiveKit room');
    });

    this.room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
      console.log('Participant connected:', participant.identity);
    });

    this.room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
      console.log('Participant disconnected:', participant.identity);
    });

    this.room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      console.log('Track subscribed:', track.kind, 'from', participant.identity);
      // Attach track to video/audio element
      const element = track.attach();
      document.body.appendChild(element);
    });

    this.room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
      console.log('Track unsubscribed:', track.kind, 'from', participant.identity);
      // Remove track element
      track.detach();
    });

    // Connect to room
    await this.room.connect(url, token);

    // Enable local audio/video
    await this.room.localParticipant.setCameraEnabled(true);
    await this.room.localParticipant.setMicrophoneEnabled(true);

    // Start quality monitoring
    this.startQualityMonitoring();
  }

  /**
   * Disconnect from LiveKit room
   */
  private async disconnectFromRoom(): Promise<void> {
    if (this.room) {
      await this.room.disconnect();
      this.room = null;
    }
  }

  /**
   * Start monitoring connection quality
   */
  private startQualityMonitoring(): void {
    if (!this.room || !this.currentCallId) return;

    const interval = setInterval(() => {
      if (!this.room || !this.currentCallId) {
        clearInterval(interval);
        return;
      }

      // Get quality stats from LiveKit
      const stats = this.room.localParticipant.connectionQuality;

      // Send to server
      this.socket.emit('call:quality_update', {
        callId: this.currentCallId,
        jitter: 0, // Get from WebRTC stats
        packetLoss: 0, // Get from WebRTC stats
        roundTripTime: 0, // Get from WebRTC stats
        bandwidth: 0, // Get from WebRTC stats
      });
    }, 5000); // Every 5 seconds
  }

  /**
   * Handle incoming call notification
   */
  private handleIncomingCall(data: any): void {
    const { callId, invitation } = data;

    // Show incoming call UI
    const accept = confirm(
      `Incoming ${invitation.type} call from ${invitation.initiatorName}. Accept?`
    );

    if (accept) {
      this.joinCall(callId);
    } else {
      this.declineCall(callId);
    }
  }

  /**
   * Handle call ended event
   */
  private handleCallEnded(data: any): void {
    this.disconnectFromRoom();
    this.currentCallId = null;
    console.log('Call ended:', data.reason);
    // Update UI
  }

  /**
   * Get call history
   */
  async getCallHistory(limit: number = 50, offset: number = 0): Promise<any> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/api/v1/calls/history?limit=${limit}&offset=${offset}`,
        {
          headers: {
            'Authorization': `Bearer ${this.token}`,
          },
        }
      );

      const result = await response.json();
      return result.data.calls;
    } catch (error) {
      console.error('Failed to get call history:', error);
      return [];
    }
  }

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    this.socket.disconnect();
    this.disconnectFromRoom();
  }
}

// Usage example
export function initializeCallClient(
  apiBaseUrl: string,
  wsUrl: string,
  authToken: string
): SupCallClient {
  return new SupCallClient(apiBaseUrl, wsUrl, authToken);
}

// Example usage in app
/*
const callClient = initializeCallClient(
  'http://localhost:3003',
  'ws://localhost:3003',
  'your-jwt-token'
);

// Start a video call
await callClient.startCall('video', ['user-uuid-1', 'user-uuid-2']);

// Toggle audio/video
await callClient.toggleAudio(false); // Mute
await callClient.toggleVideo(false); // Turn off camera

// End call
await callClient.endCall();

// Get history
const history = await callClient.getCallHistory();
*/
