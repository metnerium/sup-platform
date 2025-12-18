import React, { useState, useRef, useEffect } from 'react';
import EmojiPicker, { type EmojiClickData } from 'emoji-picker-react';
import { useDropzone } from 'react-dropzone';
import { socketService } from '@/services/socket';
import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';

export const MessageInput: React.FC = () => {
  const { currentChatId } = useChatStore();
  const { user } = useAuthStore();
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => handleFileUpload(files),
    noClick: true,
  });

  useEffect(() => {
    if (currentChatId && message.trim()) {
      const timeout = setTimeout(() => {
        socketService.startTyping(currentChatId);
      }, 100);

      return () => {
        clearTimeout(timeout);
        socketService.stopTyping(currentChatId);
      };
    }
  }, [message, currentChatId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim() || !currentChatId) return;

    socketService.sendMessage({
      chatId: currentChatId,
      senderId: user!.id,
      content: message.trim(),
      type: 'text',
      status: 'sending',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    setMessage('');
    inputRef.current?.focus();
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setMessage((prev) => prev + emojiData.emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const handleFileUpload = async (files: File[]) => {
    if (!currentChatId || files.length === 0) return;

    // TODO: Upload files and send message
    console.log('Uploading files:', files);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const audioChunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => {
        audioChunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        // TODO: Upload voice message
        console.log('Voice recording:', audioBlob);

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingTime(0);

      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!currentChatId) {
    return null;
  }

  return (
    <div className="border-t dark:border-dark-border bg-white dark:bg-dark-surface p-4">
      {isDragActive && (
        <div className="absolute inset-0 bg-primary-600 bg-opacity-10 border-2 border-dashed border-primary-600 flex items-center justify-center z-10">
          <p className="text-primary-600 font-medium">Drop files here...</p>
        </div>
      )}

      <div {...getRootProps()}>
        <input {...getInputProps()} />

        {isRecording ? (
          <div className="flex items-center gap-4 py-2">
            <button
              onClick={cancelRecording}
              className="text-error hover:text-red-700"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="flex-1 flex items-center gap-3">
              <div className="w-3 h-3 bg-error rounded-full animate-pulse" />
              <span className="text-gray-600 dark:text-gray-400 font-mono">
                {formatRecordingTime(recordingTime)}
              </span>
              <div className="flex-1 h-8 bg-gray-200 dark:bg-dark-bg rounded flex items-center px-2">
                {/* Waveform visualization placeholder */}
                <div className="flex-1 h-1 bg-primary-600 rounded" />
              </div>
            </div>

            <button
              onClick={stopRecording}
              className="bg-primary-600 text-white p-3 rounded-full hover:bg-primary-700"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <button
              type="button"
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
            <input
              id="file-upload"
              type="file"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && handleFileUpload(Array.from(e.target.files))}
            />

            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder="Type a message..."
                className="w-full px-4 py-2 pr-12 bg-gray-100 dark:bg-dark-bg border-none rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-dark-text max-h-32"
                rows={1}
                style={{
                  height: 'auto',
                  minHeight: '40px',
                }}
              />

              <button
                type="button"
                className="absolute right-2 bottom-2 p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>

              {showEmojiPicker && (
                <div className="absolute bottom-full right-0 mb-2 z-10">
                  <EmojiPicker onEmojiClick={handleEmojiClick} />
                </div>
              )}
            </div>

            {message.trim() ? (
              <button
                type="submit"
                className="p-3 bg-primary-600 text-white rounded-full hover:bg-primary-700 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            ) : (
              <button
                type="button"
                onClick={startRecording}
                className="p-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
};
