import { useEffect } from 'react';
import { socketService } from '@/services/socket';
import { useChatStore } from '@/store/chatStore';
import { useCallStore } from '@/store/callStore';
import { useStoryStore } from '@/store/storyStore';

export const useSocket = () => {
  const { addMessage, updateMessage, deleteMessage, addTypingIndicator, removeTypingIndicator } = useChatStore();
  const { setIncomingCall } = useCallStore();
  const { addStory } = useStoryStore();

  useEffect(() => {
    // Message events
    socketService.onNewMessage((message) => {
      addMessage(message);
    });

    socketService.onMessageUpdate((message) => {
      updateMessage(message.id, message);
    });

    socketService.onMessageDelete((messageId) => {
      deleteMessage(messageId);
    });

    // Typing events
    socketService.onTyping((data) => {
      addTypingIndicator(data);
    });

    socketService.onStopTyping((data) => {
      removeTypingIndicator(data.chatId, data.userId);
    });

    // Call events
    socketService.onIncomingCall((call) => {
      setIncomingCall(call);
    });

    // Story events
    socketService.onNewStory((userId) => {
      console.log('New story from user:', userId);
    });

    return () => {
      // Cleanup listeners
      socketService.off('message:new');
      socketService.off('message:update');
      socketService.off('message:delete');
      socketService.off('typing:start');
      socketService.off('typing:stop');
      socketService.off('call:incoming');
      socketService.off('story:new');
    };
  }, []);
};
