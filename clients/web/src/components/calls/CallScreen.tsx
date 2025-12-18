import React, { useState } from 'react';
import { useCallStore } from '@/store/callStore';
import { Avatar } from '@/components/common/Avatar';
import { socketService } from '@/services/socket';

export const CallScreen: React.FC = () => {
  const { currentCall, endCall, isCallMinimized, toggleMinimize } = useCallStore();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  if (!currentCall) return null;

  const handleEndCall = () => {
    socketService.endCall(currentCall.id);
    endCall();
  };

  if (isCallMinimized) {
    return (
      <div className="fixed bottom-4 right-4 w-64 bg-dark-surface rounded-lg shadow-xl overflow-hidden z-40">
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Avatar
                src=""
                name={currentCall.participantIds[0]}
                size="sm"
              />
              <span className="text-sm font-medium text-white">
                {currentCall.type === 'video' ? 'Video' : 'Audio'} Call
              </span>
            </div>
            <button
              onClick={toggleMinimize}
              className="text-white hover:bg-white/20 rounded p-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
          </div>

          <div className="flex justify-center gap-2">
            <button
              onClick={handleEndCall}
              className="p-2 bg-error rounded-full text-white hover:bg-red-600"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-dark-bg z-50 flex flex-col">
      {/* Call Header */}
      <div className="p-6 flex items-center justify-between">
        <div className="text-white">
          <h2 className="text-xl font-semibold">
            {currentCall.type === 'video' ? 'Video' : 'Audio'} Call
          </h2>
          <p className="text-sm text-gray-400">
            {currentCall.status === 'ringing' ? 'Ringing...' : 'Connected'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleMinimize}
            className="p-2 text-white hover:bg-white/20 rounded-full"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Video Container */}
      <div className="flex-1 relative">
        {currentCall.type === 'video' ? (
          <>
            {/* Remote Video */}
            <div className="w-full h-full bg-gray-900 flex items-center justify-center">
              <Avatar
                src=""
                name={currentCall.participantIds[0]}
                size="xl"
              />
            </div>

            {/* Local Video (Picture-in-Picture) */}
            {!isVideoOff && (
              <div className="absolute top-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden border-2 border-white/20">
                <div className="w-full h-full flex items-center justify-center text-white">
                  Your video
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <Avatar
                src=""
                name={currentCall.participantIds[0]}
                size="xl"
                className="mb-4"
              />
              <p className="text-white text-xl font-medium">
                {currentCall.participantIds[0]}
              </p>
              <p className="text-gray-400 mt-2">
                {currentCall.duration ? `${Math.floor(currentCall.duration / 60)}:${(currentCall.duration % 60).toString().padStart(2, '0')}` : '00:00'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Call Controls */}
      <div className="p-8 flex items-center justify-center gap-4">
        <button
          onClick={() => setIsMuted(!isMuted)}
          className={`p-4 rounded-full ${
            isMuted ? 'bg-error' : 'bg-white/20'
          } text-white hover:bg-white/30 transition-colors`}
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {isMuted ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            )}
          </svg>
        </button>

        {currentCall.type === 'video' && (
          <button
            onClick={() => setIsVideoOff(!isVideoOff)}
            className={`p-4 rounded-full ${
              isVideoOff ? 'bg-error' : 'bg-white/20'
            } text-white hover:bg-white/30 transition-colors`}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        )}

        <button
          onClick={handleEndCall}
          className="p-4 bg-error rounded-full text-white hover:bg-red-600 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <button className="p-4 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        </button>
      </div>
    </div>
  );
};
