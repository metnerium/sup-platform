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
import {useChatStore} from '@/store/chatStore';
import {useThemeStore} from '@/store/themeStore';
import {Avatar} from '@/components/common/Avatar';
import {Conversation} from '@/types';
import {formatConversationTime} from '@/utils/dateUtils';
import {spacing, typography} from '@/constants/theme';

const ConversationItem: React.FC<{
  conversation: Conversation;
  onPress: () => void;
}> = ({conversation, onPress}) => {
  const {colors} = useThemeStore();
  const lastMessage = conversation.lastMessage;

  const getConversationName = () => {
    if (conversation.type === 'group') {
      return conversation.name || 'Group Chat';
    }
    const otherParticipant = conversation.participants.find(
      p => p.isActive,
    );
    return otherParticipant?.user.displayName || 'Unknown';
  };

  const getConversationAvatar = () => {
    if (conversation.avatar) {
      return conversation.avatar;
    }
    if (conversation.type === 'direct') {
      const otherParticipant = conversation.participants.find(
        p => p.isActive,
      );
      return otherParticipant?.user.avatar;
    }
    return undefined;
  };

  const getMessagePreview = () => {
    if (!lastMessage) return 'No messages yet';

    switch (lastMessage.type) {
      case 'image':
        return 'Photo';
      case 'video':
        return 'Video';
      case 'audio':
        return 'Audio';
      case 'voice':
        return 'Voice message';
      case 'file':
        return 'File';
      default:
        return lastMessage.content || '';
    }
  };

  return (
    <TouchableOpacity
      style={[styles.conversationItem, {backgroundColor: colors.background}]}
      onPress={onPress}
      activeOpacity={0.7}>
      <Avatar
        uri={getConversationAvatar()}
        name={getConversationName()}
        size="lg"
        showOnlineIndicator={conversation.type === 'direct'}
        isOnline={
          conversation.participants.find(p => p.isActive)?.user.status ===
          'online'
        }
      />

      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Text
            style={[styles.conversationName, {color: colors.text}]}
            numberOfLines={1}>
            {getConversationName()}
          </Text>
          {lastMessage && (
            <Text style={[styles.timestamp, {color: colors.textTertiary}]}>
              {formatConversationTime(lastMessage.createdAt)}
            </Text>
          )}
        </View>

        <View style={styles.conversationFooter}>
          <Text
            style={[
              styles.lastMessage,
              {color: colors.textSecondary},
              conversation.unreadCount > 0 && styles.unreadMessage,
            ]}
            numberOfLines={1}>
            {getMessagePreview()}
          </Text>
          {conversation.unreadCount > 0 && (
            <View
              style={[styles.badge, {backgroundColor: colors.primary}]}>
              <Text style={styles.badgeText}>
                {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>

      {conversation.isPinned && (
        <View style={styles.pinnedIndicator}>
          <Text style={{color: colors.textTertiary}}>📌</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

export const ChatListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const {colors} = useThemeStore();
  const {conversations, loadConversations, isLoading} = useChatStore();

  useEffect(() => {
    loadConversations();
  }, []);

  const handleRefresh = useCallback(() => {
    loadConversations();
  }, []);

  const handleConversationPress = useCallback((conversation: Conversation) => {
    navigation.navigate('Chat', {conversationId: conversation.id});
  }, []);

  const renderItem = useCallback(
    ({item}: {item: Conversation}) => (
      <ConversationItem
        conversation={item}
        onPress={() => handleConversationPress(item)}
      />
    ),
    [handleConversationPress],
  );

  const keyExtractor = useCallback(
    (item: Conversation) => item.id,
    [],
  );

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <FlatList
        data={conversations}
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
              No conversations yet
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={[styles.fab, {backgroundColor: colors.primary}]}
        onPress={() => navigation.navigate('NewChat')}
        activeOpacity={0.8}>
        <Text style={styles.fabIcon}>✏️</Text>
      </TouchableOpacity>
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
  conversationItem: {
    flexDirection: 'row',
    padding: spacing.md,
    alignItems: 'center',
  },
  conversationContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  conversationName: {
    ...typography.bodyBold,
    flex: 1,
  },
  timestamp: {
    ...typography.small,
    marginLeft: spacing.sm,
  },
  conversationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    ...typography.caption,
    flex: 1,
  },
  unreadMessage: {
    fontWeight: '600',
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    marginLeft: spacing.sm,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  pinnedIndicator: {
    marginLeft: spacing.sm,
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
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabIcon: {
    fontSize: 24,
  },
});
