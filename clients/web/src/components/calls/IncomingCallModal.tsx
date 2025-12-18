import React from 'react';
import { useCallStore } from '@/store/callStore';
import { Avatar } from '@/components/common/Avatar';
import { Modal } from '@/components/common/Modal';
import { socketService } from '@/services/socket';

export const IncomingCallModal: React.FC = () => {
  const { incomingCall, acceptCall, declineCall } = useCallStore();

  if (!incomingCall) return null;

  const handleAccept = () => {
    socketService.acceptCall(incomingCall.id);
    acceptCall();
  };

  const handleDecline = () => {
    socketService.declineCall(incomingCall.id);
    declineCall();
  };

  return (
    <Modal isOpen={true} onClose={handleDecline} showCloseButton={false}>
      <div className="text-center py-8">
        <div className="mb-6 flex justify-center">
          <Avatar
            src=""
            name={incomingCall.initiatorId}
            size="xl"
          />
        </div>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text mb-2">
          Incoming {incomingCall.type} call
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          From {incomingCall.initiatorId}
        </p>

        <div className="flex items-center justify-center gap-8">
          <button
            onClick={handleDecline}
            className="w-16 h-16 bg-error text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
          >
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <button
            onClick={handleAccept}
            className="w-16 h-16 bg-green-500 text-white rounded-full flex items-center justify-center hover:bg-green-600 transition-colors"
          >
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </button>
        </div>
      </div>
    </Modal>
  );
};
