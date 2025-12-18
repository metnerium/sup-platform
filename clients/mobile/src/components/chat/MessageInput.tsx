import React, {useState, useRef} from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import {useThemeStore} from '@/store/themeStore';
import {spacing, borderRadius, typography} from '@/constants/theme';
import {pickImage, pickDocument, takePhoto} from '@/utils/mediaUtils';
import {PermissionService} from '@/services/permissions';

interface MessageInputProps {
  onSend: (message: {type: string; content: string; attachments?: any[]}) => void;
  onTyping?: () => void;
  onStopTyping?: () => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSend,
  onTyping,
  onStopTyping,
}) => {
  const {colors} = useThemeStore();
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const handleTextChange = (value: string) => {
    setText(value);

    if (value.length > 0) {
      onTyping?.();

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        onStopTyping?.();
      }, 3000);
    } else {
      onStopTyping?.();
    }
  };

  const handleSend = () => {
    if (!text.trim()) return;

    onSend({
      type: 'text',
      content: text.trim(),
    });

    setText('');
    onStopTyping?.();
  };

  const handleAttachment = () => {
    Alert.alert('Attach', 'Choose attachment type', [
      {
        text: 'Camera',
        onPress: async () => {
          const hasPermission = await PermissionService.requestCameraPermission();
          if (hasPermission) {
            const photo = await takePhoto();
            if (photo?.assets?.[0]) {
              onSend({
                type: 'image',
                content: '',
                attachments: [photo.assets[0]],
              });
            }
          }
        },
      },
      {
        text: 'Photo Library',
        onPress: async () => {
          const hasPermission = await PermissionService.requestPhotoLibraryPermission();
          if (hasPermission) {
            const image = await pickImage();
            if (image?.assets?.[0]) {
              onSend({
                type: 'image',
                content: '',
                attachments: [image.assets[0]],
              });
            }
          }
        },
      },
      {
        text: 'Document',
        onPress: async () => {
          const document = await pickDocument();
          if (document) {
            onSend({
              type: 'file',
              content: '',
              attachments: [document],
            });
          }
        },
      },
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

  const handleVoiceRecord = () => {
    // Voice recording implementation
    setIsRecording(!isRecording);
  };

  return (
    <View style={[styles.container, {backgroundColor: colors.surface, borderTopColor: colors.border}]}>
      <TouchableOpacity
        style={styles.attachButton}
        onPress={handleAttachment}>
        <Text style={{fontSize: 24}}>+</Text>
      </TouchableOpacity>

      <TextInput
        style={[
          styles.input,
          {backgroundColor: colors.background, color: colors.text},
        ]}
        placeholder="Message"
        placeholderTextColor={colors.placeholder}
        value={text}
        onChangeText={handleTextChange}
        multiline
        maxLength={4000}
      />

      {text.trim() ? (
        <TouchableOpacity
          style={[styles.sendButton, {backgroundColor: colors.primary}]}
          onPress={handleSend}>
          <Text style={styles.sendIcon}>➤</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[
            styles.voiceButton,
            {backgroundColor: isRecording ? colors.error : colors.surface},
          ]}
          onPress={handleVoiceRecord}>
          <Text style={styles.voiceIcon}>{isRecording ? '⏹' : '🎤'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
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
  voiceButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceIcon: {
    fontSize: 20,
  },
});
