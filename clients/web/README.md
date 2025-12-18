# SUP Messenger - Web Client

A modern, production-ready web client for SUP Messenger built with React 18, TypeScript, and Tailwind CSS.

## Features

### Authentication
- Phone/Email + Password login
- User registration
- 2FA verification support
- Password reset functionality

### Chat Features
- Real-time messaging with WebSocket
- Message delivery status (sent, delivered, read)
- Typing indicators
- Read receipts (double checkmark)
- Message reactions
- Reply to messages
- Forward messages
- Edit/delete messages
- Message search
- File attachments (drag & drop)
- Voice message recording
- Emoji picker
- Image, video, audio, and file sharing

### Stories
- Stories carousel
- Create story (text, image, video)
- View story with progress bar
- Story reactions

### Calls
- Audio and video calls
- Incoming call modal
- Call screen with controls
- Screen sharing support (LiveKit)

### Groups
- Create group
- Add/remove members
- Group settings
- Admin controls

## Tech Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS
- Zustand (state management)
- React Router v6
- Socket.io-client
- Axios
- React Query
- LiveKit React SDK
- IndexedDB (offline caching)

## Getting Started

Install dependencies:
```bash
npm install
```

Start development server:
```bash
npm run dev
```

Build for production:
```bash
npm run build
```

## Environment Variables

Create a `.env` file:
```env
VITE_API_URL=http://localhost:4000
VITE_WS_URL=http://localhost:4001
VITE_LIVEKIT_URL=ws://localhost:7880
VITE_APP_NAME=SUP Messenger
```
