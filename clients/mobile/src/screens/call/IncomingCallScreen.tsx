import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useCallStore} from '@/store/callStore';
import {useThemeStore} from '@/store/themeStore';
import {Avatar} from '@/components/common/Avatar';
import {spacing, typography} from '@/constants/theme';

const {width} = Dimensions.get('window');

export const IncomingCallScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const {colors} = useThemeStore();
  const {incomingCall, acceptCall, rejectCall} = useCallStore();

  if (!incomingCall) {
    return null;
  }

  const handleAccept = async () => {
    try {
      await acceptCall(incomingCall.id);
      navigation.navigate('InCall', {callId: incomingCall.id});
    } catch (error) {
      console.error('Error accepting call:', error);
    }
  };

  const handleReject = async () => {
    try {
      await rejectCall(incomingCall.id);
    } catch (error) {
      console.error('Error rejecting call:', error);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, {backgroundColor: colors.background}]}>
      <View style={styles.content}>
        <Text style={[styles.callType, {color: colors.textSecondary}]}>
          {incomingCall.type === 'video' ? 'Video Call' : 'Audio Call'}
        </Text>

        <Avatar
          uri={incomingCall.initiator.avatar}
          name={incomingCall.initiator.displayName}
          size="xxl"
          style={styles.avatar}
        />

        <Text style={[styles.callerName, {color: colors.text}]}>
          {incomingCall.initiator.displayName}
        </Text>

        <Text style={[styles.callingText, {color: colors.textSecondary}]}>
          is calling...
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.rejectButton, {backgroundColor: colors.error}]}
          onPress={handleReject}>
          <Text style={styles.actionIcon}>📞</Text>
          <Text style={styles.actionLabel}>Decline</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.acceptButton, {backgroundColor: colors.success}]}
          onPress={handleAccept}>
          <Text style={styles.actionIcon}>📞</Text>
          <Text style={styles.actionLabel}>Accept</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  callType: {
    ...typography.caption,
    textTransform: 'uppercase',
    marginBottom: spacing.xl,
  },
  avatar: {
    marginBottom: spacing.lg,
  },
  callerName: {
    ...typography.h1,
    marginBottom: spacing.sm,
  },
  callingText: {
    ...typography.body,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  rejectButton: {
    width: width * 0.35,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptButton: {
    width: width * 0.35,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: spacing.xs,
  },
  actionLabel: {
    color: '#FFFFFF',
    ...typography.captionBold,
  },
});
