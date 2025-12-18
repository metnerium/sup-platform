import React, {useEffect, useState, useCallback, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import {useRoute, useNavigation} from '@react-navigation/native';
import {useChatStore} from '@/store/chatStore';
import {useAuthStore} from '@/store/authStore';
import {useThemeStore} from '@/store/themeStore';
import {Avatar} from '@/components/common/Avatar';
import {Message} from '@/types';
import {formatMessageTime, isSameDay} from '@/utils/dateUtils';
import {spacing, typography, borderRadius} from '@/constants/theme';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar: boolean;
  showTimestamp: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwn,
  showAvatar,
  showTimestamp,
}) => {
  const {colors} = useThemeStore();

  const renderContent = () => {
    switch (message.type) {
      case 'text':
        return (
          <Text style={[styles.messageText, {color: isOwn ? '#FFFFFF' : colors.text}]}>
            {message.content}
          </Text>
        );
      default:
        return (
          <Text style={[styles.messageText, {color: isOwn ? '#FFFFFF' : colors.text}]}>
            {message.type}
          </Text>
        );
    }
  };

  return (
    <View style={[styles.messageContainer, isOwn && styles.ownMessageContainer]}>
      {!isOwn && showAvatar && (
        <Avatar uri={message.sender.avatar} name={message.sender.displayName} size="sm" />
      )}
      {!isOwn && !showAvatar && <View style={styles.avatarPlaceholder} />}

      <View
        style={[
          styles.messageBubble,
          {backgroundColor: isOwn ? colors.sent : colors.received},
          isOwn && styles.ownMessageBubble,
        ]}>
        {message.replyTo && (
          <View style={[styles.replyContainer, {borderLeftColor: colors.primary}]}>
            <Text style={[styles.replyText, {color: colors.textSecondary}]} numberOfLines={1}>
              {message.replyTo.content}
            </Text>
          </View>
        )}
        {renderContent()}
        <View style={styles.messageFooter}>
          {showTimestamp && (
            <Text
              style={[
                styles.messageTime,
                {color: isOwn ? 'rgba(255,255,255,0.7)' : colors.textTertiary},
              ]}>
              {formatMessageTime(message.createdAt)}
            </Text>
          )}
          {isOwn && (
            <Text style={styles.messageStatus}>
              {message.status === 'read' ? '✓✓' : message.status === 'delivered' ? '✓✓' : '✓'}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

const DateSeparator: React.FC<{date: Date}> = ({date}) => {
  const {colors} = useThemeStore();

  return (
    <View style={styles.dateSeparator}>
      <Text style={[styles.dateSeparatorText, {color: colors.textSecondary}]}>
        {formatMessageTime(date)}
      </Text>
    </View>
  );
};

export const ChatScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const {colors} = useThemeStore();
  const {user} = useAuthStore();
  const {
    messages,
    loadMessages,
    sendMessage,
    markAsRead,
    startTyping,
    stopTyping,
  } = useChatStore();

  const {conversationId} = route.params;
  const conversationMessages = messages[conversationId] || [];

  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    loadMessages(conversationId);
    markAsRead(conversationId);
  }, [conversationId]);

  const handleSend = useCallback(async () => {
    if (!inputText.trim()) return;

    const messageContent = inputText.trim();
    setInputText('');

    try {
      await sendMessage(conversationId, {
        type: 'text',
        content: messageContent,
      });

      flatListRef.current?.scrollToOffset({offset: 0, animated: true});
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }, [inputText, conversationId]);

  const handleTextChange = useCallback((text: string) => {
    setInputText(text);

    if (text.length > 0 && !isTyping) {
      setIsTyping(true);
      startTyping(conversationId);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        stopTyping(conversationId);
      }
    }, 3000);
  }, [conversationId, isTyping]);

  const renderItem = useCallback(
    ({item, index}: {item: Message; index: number}) => {
      const isOwn = item.senderId === user?.id;
      const previousMessage = conversationMessages[index + 1];
      const nextMessage = conversationMessages[index - 1];

      const showAvatar = !nextMessage || nextMessage.senderId !== item.senderId;
      const showTimestamp = !nextMessage ||
        !isSameDay(item.createdAt, nextMessage.createdAt) ||
        (nextMessage.senderId !== item.senderId);

      const showDateSeparator = !nextMessage ||
        !isSameDay(item.createdAt, nextMessage.createdAt);

      return (
        <>
          {showDateSeparator && <DateSeparator date={item.createdAt} />}
          <MessageBubble
            message={item}
            isOwn={isOwn}
            showAvatar={showAvatar}
            showTimestamp={showTimestamp}
          />
        </>
      );
    },
    [conversationMessages, user?.id],
  );

  const keyExtractor = useCallback(
    (item: Message) => item.id || item.localId || '',
    [],
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, {backgroundColor: colors.background}]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <FlatList
        ref={flatListRef}
        data={conversationMessages}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        inverted
        contentContainerStyle={styles.messageList}
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          // Load more messages
        }}
      />

      <View style={[styles.inputContainer, {backgroundColor: colors.surface, borderTopColor: colors.border}]}>
        <TouchableOpacity style={styles.attachButton}>
          <Text style={{fontSize: 24}}>+</Text>
        </TouchableOpacity>

        <TextInput
          style={[styles.input, {backgroundColor: colors.background, color: colors.text}]}
          placeholder="Message"
          placeholderTextColor={colors.placeholder}
          value={inputText}
          onChangeText={handleTextChange}
          multiline
          maxLength={4000}
        />

        <TouchableOpacity
          style={[
            styles.sendButton,
            {backgroundColor: inputText.trim() ? colors.primary : colors.disabled},
          ]}
          onPress={handleSend}
          disabled={!inputText.trim()}>
          <Text style={styles.sendIcon}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messageList: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  messageContainer: {
    flexDirection: 'row',
    marginVertical: spacing.xs,
    alignItems: 'flex-end',
  },
  ownMessageContainer: {
    flexDirection: 'row-reverse',
  },
  avatarPlaceholder: {
    width: 32,
    marginRight: spacing.sm,
  },
  messageBubble: {
    maxWidth: '70%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    marginLeft: spacing.sm,
  },
  ownMessageBubble: {
    marginLeft: 0,
    marginRight: spacing.sm,
    borderBottomRightRadius: 4,
  },
  replyContainer: {
    borderLeftWidth: 3,
    paddingLeft: spacing.sm,
    marginBottom: spacing.xs,
  },
  replyText: {
    ...typography.small,
  },
  messageText: {
    ...typography.body,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  messageTime: {
    ...typography.small,
  },
  messageStatus: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  dateSeparatorText: {
    ...typography.small,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.sm,
    borderTopWidth: 1,
  },
  attachButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    maxHeight: 100,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.sm,
    ...typography.body,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendIcon: {
    color: '#FFFFFF',
    fontSize: 18,
  },
});
