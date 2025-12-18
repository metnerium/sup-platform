import React, {useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useCallStore} from '@/store/callStore';
import {useThemeStore} from '@/store/themeStore';
import {Avatar} from '@/components/common/Avatar';
import {Call} from '@/types';
import {formatMessageTime, formatCallDuration} from '@/utils/dateUtils';
import {spacing, typography} from '@/constants/theme';

const CallItem: React.FC<{call: Call; onPress: () => void}> = ({
  call,
  onPress,
}) => {
  const {colors} = useThemeStore();

  const getCallIcon = () => {
    switch (call.status) {
      case 'missed':
        return '📞❌';
      case 'declined':
        return '📞🚫';
      case 'ended':
        return call.type === 'video' ? '📹' : '📞';
      default:
        return call.type === 'video' ? '📹' : '📞';
    }
  };

  const getCallStatusText = () => {
    switch (call.status) {
      case 'missed':
        return 'Missed';
      case 'declined':
        return 'Declined';
      case 'ended':
        return call.duration
          ? formatCallDuration(call.duration)
          : 'Ended';
      default:
        return call.status;
    }
  };

  const getCallStatusColor = () => {
    switch (call.status) {
      case 'missed':
      case 'declined':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  return (
    <TouchableOpacity
      style={[styles.callItem, {backgroundColor: colors.background}]}
      onPress={onPress}
      activeOpacity={0.7}>
      <Avatar
        uri={call.initiator.avatar}
        name={call.initiator.displayName}
        size="lg"
      />

      <View style={styles.callContent}>
        <Text style={[styles.callerName, {color: colors.text}]} numberOfLines={1}>
          {call.initiator.displayName}
        </Text>
        <View style={styles.callInfo}>
          <Text style={styles.callIcon}>{getCallIcon()}</Text>
          <Text style={[styles.callStatus, {color: getCallStatusColor()}]}>
            {getCallStatusText()}
          </Text>
        </View>
      </View>

      <View style={styles.callActions}>
        <Text style={[styles.callTime, {color: colors.textTertiary}]}>
          {formatMessageTime(call.createdAt)}
        </Text>
        <TouchableOpacity
          style={[styles.callButton, {backgroundColor: colors.success}]}
          onPress={(e) => {
            e.stopPropagation();
            // Initiate new call
          }}>
          <Text style={styles.callButtonIcon}>
            {call.type === 'video' ? '📹' : '📞'}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

export const CallsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const {colors} = useThemeStore();
  const {callHistory, loadCallHistory, isLoading} = useCallStore();

  useEffect(() => {
    loadCallHistory();
  }, []);

  const handleRefresh = useCallback(() => {
    loadCallHistory();
  }, []);

  const handleCallPress = useCallback((call: Call) => {
    navigation.navigate('CallDetails', {callId: call.id});
  }, []);

  const renderItem = useCallback(
    ({item}: {item: Call}) => (
      <CallItem call={item} onPress={() => handleCallPress(item)} />
    ),
    [handleCallPress],
  );

  const keyExtractor = useCallback((item: Call) => item.id, []);

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <FlatList
        data={callHistory}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, {color: colors.textSecondary}]}>
              No call history
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
  },
  callItem: {
    flexDirection: 'row',
    padding: spacing.md,
    alignItems: 'center',
  },
  callContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  callerName: {
    ...typography.bodyBold,
    marginBottom: spacing.xs,
  },
  callInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  callIcon: {
    fontSize: 14,
    marginRight: spacing.xs,
  },
  callStatus: {
    ...typography.caption,
  },
  callActions: {
    alignItems: 'flex-end',
  },
  callTime: {
    ...typography.small,
    marginBottom: spacing.sm,
  },
  callButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  callButtonIcon: {
    fontSize: 18,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    ...typography.body,
  },
});
