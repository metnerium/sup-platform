# SUP Messenger Mobile Client

A production-ready React Native mobile application for SUP Messenger with native iOS and Android support.

## Features

### Core Functionality
- **Authentication**: Phone number + OTP, password login, 2FA, biometric authentication
- **Real-time Messaging**: Text, images, videos, files, voice messages
- **Group Chats**: Create and manage group conversations
- **Stories**: Create and view ephemeral stories (24h)
- **Voice/Video Calls**: WebRTC-based calls using LiveKit
- **Push Notifications**: Firebase Cloud Messaging integration
- **Offline Support**: Local caching with MMKV, message queue

### Technical Features
- **TypeScript**: Full type safety
- **State Management**: Zustand for global state
- **API Integration**: Axios + React Query
- **Real-time**: Socket.io-client for WebSocket
- **Navigation**: React Navigation v6
- **Styling**: Custom theme system with dark mode
- **Performance**: Optimized FlatList, image caching, pagination
- **Native Features**: Camera, photo library, contacts, biometric auth

## Tech Stack

- **React Native**: 0.73.2
- **TypeScript**: 5.3.3
- **Navigation**: React Navigation v6
- **State Management**: Zustand
- **API Client**: Axios + React Query
- **WebSocket**: Socket.io-client
- **Storage**: React Native MMKV
- **Calls**: LiveKit React Native SDK
- **Notifications**: @notifee/react-native + Firebase
- **Permissions**: react-native-permissions
- **Media**: react-native-image-picker, react-native-fast-image

## Project Structure

```
src/
├── components/         # Reusable UI components
│   ├── common/        # Common components (Avatar, Button, Input)
│   └── chat/          # Chat-specific components
├── screens/           # Screen components
│   ├── auth/         # Authentication screens
│   ├── chat/         # Chat screens
│   ├── call/         # Call screens
│   ├── story/        # Story screens
│   └── settings/     # Settings screens
├── navigation/        # Navigation configuration
├── store/            # Zustand stores
├── services/         # API, Socket, LiveKit services
├── hooks/            # Custom React hooks
├── utils/            # Utility functions
├── constants/        # Constants and theme
├── types/            # TypeScript type definitions
└── App.tsx           # Root component
```

## Setup

### Prerequisites
- Node.js >= 18
- npm >= 9
- Xcode (for iOS)
- Android Studio (for Android)
- CocoaPods (for iOS)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Install iOS pods:
```bash
cd ios && pod install && cd ..
```

3. Configure Firebase:
   - Add `google-services.json` to `android/app/`
   - Add `GoogleService-Info.plist` to `ios/SupMessenger/`

### Running the App

#### iOS
```bash
npm run ios
# or
npm run ios -- --simulator="iPhone 15 Pro"
```

#### Android
```bash
npm run android
```

### Development
```bash
# Start Metro bundler
npm start

# Type checking
npm run type-check

# Linting
npm run lint
```

### Building

#### Android Release
```bash
npm run build:android
```

#### iOS Release
```bash
npm run build:ios
```

## Configuration

### Environment Variables
Create a `.env` file in the root directory:

```env
API_BASE_URL=https://api.supmessenger.com
WS_URL=https://ws.supmessenger.com
LIVEKIT_URL=wss://livekit.supmessenger.com
CDN_URL=https://cdn.supmessenger.com
```

### Theme Customization
Edit `src/constants/theme.ts` to customize colors, spacing, typography, etc.

## Features in Detail

### Authentication
- Phone number registration with OTP verification
- Password login
- Two-factor authentication
- Biometric authentication (Face ID / Touch ID / Fingerprint)
- Secure token storage

### Messaging
- Text messages with emoji support
- Image/video sharing
- File attachments
- Voice messages
- Message reactions
- Reply to messages
- Forward messages
- Edit messages (15 min window)
- Delete for everyone (24h window)
- Message status (sent, delivered, read)
- Typing indicators
- Read receipts

### Calls
- Audio and video calls
- LiveKit integration for WebRTC
- Call history
- Missed call notifications
- In-call controls (mute, video, speaker, camera switch)
- CallKit integration (iOS)
- ConnectionService integration (Android)

### Stories
- Image, video, and text stories
- 24-hour expiration
- View count and viewers list
- Story replies
- Camera integration

### Notifications
- Push notifications for messages
- Call notifications with accept/decline actions
- Notification channels (Android)
- Badge count management
- Custom notification sounds

### Offline Support
- Local message caching with MMKV
- Message queue for offline sending
- Automatic retry with exponential backoff
- Network status monitoring
- Sync on reconnection

## Performance Optimizations

- **FlatList**: Optimized with `getItemLayout`, proper `keyExtractor`
- **Images**: FastImage for caching and performance
- **Pagination**: Load messages and conversations incrementally
- **Memoization**: React.memo and useCallback for expensive operations
- **Native Driver**: Animations using native driver
- **Lazy Loading**: Code splitting and lazy component loading

## Platform-Specific Features

### iOS
- CallKit integration for native call UI
- App Groups for data sharing
- Background fetch for message sync
- Rich push notifications with images
- Live Activities (iOS 16.1+)

### Android
- ConnectionService for native call UI
- Foreground service for calls
- Notification channels
- Picture-in-picture mode
- Background restrictions handling

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm test -- --coverage
```

## Troubleshooting

### iOS Build Issues
- Clean build: `cd ios && xcodebuild clean && cd ..`
- Reinstall pods: `cd ios && rm -rf Pods && pod install && cd ..`

### Android Build Issues
- Clean gradle: `cd android && ./gradlew clean && cd ..`
- Clear cache: `cd android && ./gradlew cleanBuildCache && cd ..`

### Metro Bundler Issues
- Clear cache: `npm start -- --reset-cache`

## License

Proprietary - SUP Messenger

## Support

For support, email support@supmessenger.com
