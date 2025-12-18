import React from 'react';
import {View, Text, StyleSheet, ViewStyle} from 'react-native';
import FastImage from 'react-native-fast-image';
import {useThemeStore} from '@/store/themeStore';
import {layout} from '@/constants/theme';

interface AvatarProps {
  uri?: string;
  name?: string;
  size?: keyof typeof layout.avatarSize;
  style?: ViewStyle;
  showOnlineIndicator?: boolean;
  isOnline?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({
  uri,
  name = '',
  size = 'md',
  style,
  showOnlineIndicator = false,
  isOnline = false,
}) => {
  const {colors} = useThemeStore();
  const avatarSize = layout.avatarSize[size];

  const getInitials = (fullName: string): string => {
    const names = fullName.trim().split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
  };

  const getBackgroundColor = (str: string): string => {
    const colors = [
      '#FF6B6B',
      '#4ECDC4',
      '#45B7D1',
      '#FFA07A',
      '#98D8C8',
      '#F7DC6F',
      '#BB8FCE',
      '#85C1E2',
    ];
    const index = str.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <View style={[styles.container, style]}>
      {uri ? (
        <FastImage
          source={{uri, priority: FastImage.priority.high}}
          style={[styles.image, {width: avatarSize, height: avatarSize}]}
          resizeMode={FastImage.resizeMode.cover}
        />
      ) : (
        <View
          style={[
            styles.placeholder,
            {
              width: avatarSize,
              height: avatarSize,
              backgroundColor: getBackgroundColor(name),
            },
          ]}>
          <Text
            style={[
              styles.initials,
              {fontSize: avatarSize * 0.4},
            ]}>
            {getInitials(name)}
          </Text>
        </View>
      )}
      {showOnlineIndicator && (
        <View
          style={[
            styles.onlineIndicator,
            {
              backgroundColor: isOnline ? colors.online : colors.offline,
              width: avatarSize * 0.25,
              height: avatarSize * 0.25,
              borderColor: colors.background,
            },
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  image: {
    borderRadius: 999,
  },
  placeholder: {
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderRadius: 999,
    borderWidth: 2,
  },
});
