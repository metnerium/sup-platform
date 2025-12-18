import {useEffect} from 'react';
import socketService from '@/services/socket';
import {useChatStore} from '@/store/chatStore';
import {useCallStore} from '@/store/callStore';

export const useSocket = () => {
  const {handleNewMessage, handleTypingStart, handleTypingStop} = useChatStore();
  const {setIncomingCall} = useCallStore();

  useEffect(() => {
    // Message events
    socketService.on('message:new', handleNewMessage);
    socketService.on('typing:start', handleTypingStart);
    socketService.on('typing:stop', handleTypingStop);

    // Call events
    socketService.on('call:incoming', (call) => {
      setIncomingCall(call);
    });

    socketService.on('call:ended', () => {
      setIncomingCall(null);
    });

    return () => {
      socketService.off('message:new', handleNewMessage);
      socketService.off('typing:start', handleTypingStart);
      socketService.off('typing:stop', handleTypingStop);
    };
  }, []);

  return {
    isConnected: socketService.isConnected(),
  };
};
