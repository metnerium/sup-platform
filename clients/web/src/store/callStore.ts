import { create } from 'zustand';
import type { Call } from '@/types';

interface CallState {
  currentCall: Call | null;
  incomingCall: Call | null;
  isCallMinimized: boolean;

  setCurrentCall: (call: Call | null) => void;
  setIncomingCall: (call: Call | null) => void;
  acceptCall: () => void;
  declineCall: () => void;
  endCall: () => void;
  toggleMinimize: () => void;
}

export const useCallStore = create<CallState>((set) => ({
  currentCall: null,
  incomingCall: null,
  isCallMinimized: false,

  setCurrentCall: (call) => set({ currentCall: call }),

  setIncomingCall: (call) => set({ incomingCall: call }),

  acceptCall: () =>
    set((state) => ({
      currentCall: state.incomingCall,
      incomingCall: null,
    })),

  declineCall: () => set({ incomingCall: null }),

  endCall: () =>
    set({
      currentCall: null,
      isCallMinimized: false,
    }),

  toggleMinimize: () =>
    set((state) => ({
      isCallMinimized: !state.isCallMinimized,
    })),
}));
