import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Sidebar } from '@/components/chat/Sidebar';
import { ChatView } from '@/components/chat/ChatView';
import { IncomingCallModal } from '@/components/calls/IncomingCallModal';
import { CallScreen } from '@/components/calls/CallScreen';
import { StoryViewer } from '@/components/stories/StoryViewer';
import { useCallStore } from '@/store/callStore';
import { useStoryStore } from '@/store/storyStore';
import { socketService } from '@/services/socket';

export const ChatPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { currentCall } = useCallStore();
  const { currentStory } = useStoryStore();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    // Connect socket when component mounts
    const token = localStorage.getItem('accessToken');
    if (token && !socketService.isConnected()) {
      socketService.connect(token);
    }

    return () => {
      // Cleanup on unmount
    };
  }, []);

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50 dark:bg-dark-bg">
      <Sidebar />
      <ChatView />

      {/* Modals and Overlays */}
      <IncomingCallModal />
      {currentCall && <CallScreen />}
      {currentStory && <StoryViewer />}
    </div>
  );
};
