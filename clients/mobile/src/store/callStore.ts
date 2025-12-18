import {create} from 'zustand';
import {Call, CallParticipant} from '@/types';
import api from '@/services/api';
import socketService from '@/services/socket';

interface CallState {
  activeCall: Call | null;
  incomingCall: Call | null;
  callHistory: Call[];
  isMuted: boolean;
  isVideoEnabled: boolean;
  isSpeakerEnabled: boolean;
  isLoading: boolean;

  // Actions
  initiateCall: (
    participantIds: string[],
    type: 'audio' | 'video',
  ) => Promise<void>;
  acceptCall: (callId: string) => Promise<void>;
  rejectCall: (callId: string) => Promise<void>;
  endCall: () => Promise<void>;
  toggleMute: () => void;
  toggleVideo: () => void;
  toggleSpeaker: () => void;
  setIncomingCall: (call: Call | null) => void;
  setActiveCall: (call: Call | null) => void;
  loadCallHistory: () => Promise<void>;
  handleCallEnded: () => void;
}

export const useCallStore = create<CallState>((set, get) => ({
  activeCall: null,
  incomingCall: null,
  callHistory: [],
  isMuted: false,
  isVideoEnabled: false,
  isSpeakerEnabled: false,
  isLoading: false,

  initiateCall: async (participantIds, type) => {
    set({isLoading: true});
    try {
      const call = await api.post<Call>('/calls', {
        participantIds,
        type,
      });

      set({activeCall: call, isVideoEnabled: type === 'video'});
      socketService.initiateCall(participantIds, type);
    } catch (error) {
      console.error('Error initiating call:', error);
      throw error;
    } finally {
      set({isLoading: false});
    }
  },

  acceptCall: async (callId) => {
    set({isLoading: true});
    try {
      const call = await api.post<Call>(`/calls/${callId}/accept`);
      set({
        activeCall: call,
        incomingCall: null,
        isVideoEnabled: call.type === 'video',
      });
      socketService.acceptCall(callId);
    } catch (error) {
      console.error('Error accepting call:', error);
      throw error;
    } finally {
      set({isLoading: false});
    }
  },

  rejectCall: async (callId) => {
    try {
      await api.post(`/calls/${callId}/reject`);
      set({incomingCall: null});
      socketService.rejectCall(callId);
    } catch (error) {
      console.error('Error rejecting call:', error);
      throw error;
    }
  },

  endCall: async () => {
    const {activeCall} = get();
    if (!activeCall) return;

    try {
      await api.post(`/calls/${activeCall.id}/end`);
      socketService.endCall(activeCall.id);
      get().handleCallEnded();
    } catch (error) {
      console.error('Error ending call:', error);
      throw error;
    }
  },

  toggleMute: () => {
    set(state => ({isMuted: !state.isMuted}));
  },

  toggleVideo: () => {
    set(state => ({isVideoEnabled: !state.isVideoEnabled}));
  },

  toggleSpeaker: () => {
    set(state => ({isSpeakerEnabled: !state.isSpeakerEnabled}));
  },

  setIncomingCall: (call) => {
    set({incomingCall: call});
  },

  setActiveCall: (call) => {
    set({activeCall: call});
  },

  loadCallHistory: async () => {
    set({isLoading: true});
    try {
      const callHistory = await api.get<Call[]>('/calls/history');
      set({callHistory});
    } catch (error) {
      console.error('Error loading call history:', error);
    } finally {
      set({isLoading: false});
    }
  },

  handleCallEnded: () => {
    set({
      activeCall: null,
      isMuted: false,
      isVideoEnabled: false,
      isSpeakerEnabled: false,
    });
  },
}));
