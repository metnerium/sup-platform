import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import {useRoute, useNavigation} from '@react-navigation/native';
import {useCallStore} from '@/store/callStore';
import {useThemeStore} from '@/store/themeStore';
import {Avatar} from '@/components/common/Avatar';
import {LiveKitService} from '@/services/livekit';
import {spacing, typography} from '@/constants/theme';
import {formatCallDuration} from '@/utils/dateUtils';

const {width, height} = Dimensions.get('window');

export const InCallScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const {colors} = useThemeStore();
  const {
    activeCall,
    isMuted,
    isVideoEnabled,
    isSpeakerEnabled,
    toggleMute,
    toggleVideo,
    toggleSpeaker,
    endCall,
  } = useCallStore();

  const [duration, setDuration] = useState(0);
  const [participants, setParticipants] = useState<any[]>([]);

  useEffect(() => {
    if (activeCall) {
      connectToCall();
    }

    return () => {
      LiveKitService.disconnect();
    };
  }, [activeCall]);

  useEffect(() => {
    const interval = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const connectToCall = async () => {
    if (!activeCall) return;

    try {
      await LiveKitService.connect({
        roomId: activeCall.roomId,
        audio: true,
        video: activeCall.type === 'video',
      });

      LiveKitService.on('participantConnected', (participant: any) => {
        setParticipants(prev => [...prev, participant]);
      });

      LiveKitService.on('participantDisconnected', (participant: any) => {
        setParticipants(prev =>
          prev.filter(p => p.identity !== participant.identity),
        );
      });
    } catch (error) {
      console.error('Error connecting to call:', error);
      handleEndCall();
    }
  };

  const handleToggleMute = async () => {
    await LiveKitService.toggleMicrophone();
    toggleMute();
  };

  const handleToggleVideo = async () => {
    await LiveKitService.toggleCamera();
    toggleVideo();
  };

  const handleToggleSpeaker = async () => {
    await LiveKitService.toggleSpeaker();
    toggleSpeaker();
  };

  const handleSwitchCamera = async () => {
    await LiveKitService.switchCamera();
  };

  const handleEndCall = async () => {
    await endCall();
    navigation.goBack();
  };

  if (!activeCall) {
    return null;
  }

  return (
    <SafeAreaView
      style={[styles.container, {backgroundColor: colors.background}]}>
      <View style={styles.header}>
        <Text style={[styles.duration, {color: colors.text}]}>
          {formatCallDuration(duration)}
        </Text>
        <Text style={[styles.status, {color: colors.textSecondary}]}>
          {activeCall.status}
        </Text>
      </View>

      <View style={styles.participantsContainer}>
        {activeCall.type === 'video' ? (
          <View style={styles.videoContainer}>
            {/* Video views would be rendered here using LiveKit components */}
            <View style={[styles.videoPlaceholder, {backgroundColor: colors.surface}]}>
              <Avatar
                uri={activeCall.initiator.avatar}
                name={activeCall.initiator.displayName}
                size="xxl"
              />
              <Text style={[styles.participantName, {color: colors.text}]}>
                {activeCall.initiator.displayName}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.audioContainer}>
            <Avatar
              uri={activeCall.initiator.avatar}
              name={activeCall.initiator.displayName}
              size="xxl"
            />
            <Text style={[styles.participantName, {color: colors.text}]}>
              {activeCall.initiator.displayName}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[
            styles.controlButton,
            {backgroundColor: isSpeakerEnabled ? colors.primary : colors.surface},
          ]}
          onPress={handleToggleSpeaker}>
          <Text style={styles.controlIcon}>🔊</Text>
        </TouchableOpacity>

        {activeCall.type === 'video' && (
          <TouchableOpacity
            style={[
              styles.controlButton,
              {backgroundColor: isVideoEnabled ? colors.primary : colors.surface},
            ]}
            onPress={handleToggleVideo}>
            <Text style={styles.controlIcon}>📹</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.controlButton,
            {backgroundColor: isMuted ? colors.error : colors.surface},
          ]}
          onPress={handleToggleMute}>
          <Text style={styles.controlIcon}>{isMuted ? '🔇' : '🎤'}</Text>
        </TouchableOpacity>

        {activeCall.type === 'video' && (
          <TouchableOpacity
            style={[styles.controlButton, {backgroundColor: colors.surface}]}
            onPress={handleSwitchCamera}>
            <Text style={styles.controlIcon}>🔄</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.endCallButton, {backgroundColor: colors.error}]}
          onPress={handleEndCall}>
          <Text style={styles.controlIcon}>📞</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  duration: {
    ...typography.h3,
    marginBottom: spacing.xs,
  },
  status: {
    ...typography.caption,
  },
  participantsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoContainer: {
    width: width,
    height: height * 0.6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  participantName: {
    ...typography.h2,
    marginTop: spacing.lg,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlIcon: {
    fontSize: 24,
  },
  endCallButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
