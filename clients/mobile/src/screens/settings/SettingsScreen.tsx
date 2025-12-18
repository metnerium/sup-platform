import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useAuthStore} from '@/store/authStore';
import {useThemeStore} from '@/store/themeStore';
import {Avatar} from '@/components/common/Avatar';
import {spacing, typography, borderRadius} from '@/constants/theme';

const SettingsSection: React.FC<{title: string; children: React.ReactNode}> = ({
  title,
  children,
}) => {
  const {colors} = useThemeStore();

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, {color: colors.textSecondary}]}>
        {title}
      </Text>
      <View style={[styles.sectionContent, {backgroundColor: colors.surface}]}>
        {children}
      </View>
    </View>
  );
};

const SettingsItem: React.FC<{
  label: string;
  value?: string;
  onPress?: () => void;
  showArrow?: boolean;
  rightComponent?: React.ReactNode;
}> = ({label, value, onPress, showArrow = true, rightComponent}) => {
  const {colors} = useThemeStore();

  return (
    <TouchableOpacity
      style={[styles.settingsItem, {borderBottomColor: colors.border}]}
      onPress={onPress}
      disabled={!onPress && !rightComponent}
      activeOpacity={0.7}>
      <Text style={[styles.settingsLabel, {color: colors.text}]}>{label}</Text>
      {rightComponent || (
        <View style={styles.settingsRight}>
          {value && (
            <Text style={[styles.settingsValue, {color: colors.textSecondary}]}>
              {value}
            </Text>
          )}
          {showArrow && onPress && (
            <Text style={[styles.arrow, {color: colors.textTertiary}]}>›</Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const {colors, mode, setTheme} = useThemeStore();
  const {user, logout, biometricEnabled, enableBiometric, disableBiometric} =
    useAuthStore();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ],
    );
  };

  const toggleBiometric = () => {
    if (biometricEnabled) {
      disableBiometric();
    } else {
      enableBiometric();
    }
  };

  return (
    <ScrollView
      style={[styles.container, {backgroundColor: colors.background}]}
      contentContainerStyle={styles.content}>
      <TouchableOpacity
        style={[styles.profileSection, {backgroundColor: colors.surface}]}
        onPress={() => navigation.navigate('EditProfile')}
        activeOpacity={0.7}>
        <Avatar
          uri={user?.avatar}
          name={user?.displayName || ''}
          size="xl"
        />
        <View style={styles.profileInfo}>
          <Text style={[styles.profileName, {color: colors.text}]}>
            {user?.displayName}
          </Text>
          <Text style={[styles.profilePhone, {color: colors.textSecondary}]}>
            {user?.phoneNumber}
          </Text>
        </View>
        <Text style={[styles.arrow, {color: colors.textTertiary}]}>›</Text>
      </TouchableOpacity>

      <SettingsSection title="Account">
        <SettingsItem
          label="Privacy"
          onPress={() => navigation.navigate('Privacy')}
        />
        <SettingsItem
          label="Security"
          onPress={() => navigation.navigate('Security')}
        />
        <SettingsItem
          label="Two-Factor Authentication"
          value={user?.twoFactorEnabled ? 'Enabled' : 'Disabled'}
          onPress={() => navigation.navigate('TwoFactor')}
        />
        <SettingsItem
          label="Biometric Authentication"
          showArrow={false}
          rightComponent={
            <Switch
              value={biometricEnabled}
              onValueChange={toggleBiometric}
              trackColor={{false: colors.border, true: colors.primary}}
              thumbColor="#FFFFFF"
            />
          }
        />
      </SettingsSection>

      <SettingsSection title="Appearance">
        <SettingsItem
          label="Theme"
          value={mode === 'system' ? 'System' : mode === 'dark' ? 'Dark' : 'Light'}
          onPress={() => navigation.navigate('Theme')}
        />
        <SettingsItem
          label="Chat Wallpaper"
          onPress={() => navigation.navigate('Wallpaper')}
        />
      </SettingsSection>

      <SettingsSection title="Chats">
        <SettingsItem
          label="Archived Chats"
          onPress={() => navigation.navigate('ArchivedChats')}
        />
        <SettingsItem
          label="Storage Usage"
          onPress={() => navigation.navigate('StorageUsage')}
        />
      </SettingsSection>

      <SettingsSection title="Notifications">
        <SettingsItem
          label="Message Notifications"
          onPress={() => navigation.navigate('Notifications')}
        />
        <SettingsItem
          label="Call Notifications"
          onPress={() => navigation.navigate('CallNotifications')}
        />
      </SettingsSection>

      <SettingsSection title="Help">
        <SettingsItem
          label="Help Center"
          onPress={() => navigation.navigate('Help')}
        />
        <SettingsItem
          label="Contact Us"
          onPress={() => navigation.navigate('Contact')}
        />
        <SettingsItem
          label="Terms of Service"
          onPress={() => navigation.navigate('Terms')}
        />
        <SettingsItem
          label="Privacy Policy"
          onPress={() => navigation.navigate('PrivacyPolicy')}
        />
      </SettingsSection>

      <TouchableOpacity
        style={[styles.logoutButton, {backgroundColor: colors.error}]}
        onPress={handleLogout}
        activeOpacity={0.8}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <Text style={[styles.version, {color: colors.textTertiary}]}>
        Version 1.0.0
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  profileInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  profileName: {
    ...typography.h3,
    marginBottom: spacing.xs,
  },
  profilePhone: {
    ...typography.caption,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.smallBold,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  sectionContent: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 0.5,
  },
  settingsLabel: {
    ...typography.body,
    flex: 1,
  },
  settingsRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsValue: {
    ...typography.caption,
    marginRight: spacing.sm,
  },
  arrow: {
    fontSize: 24,
    fontWeight: '300',
  },
  logoutButton: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  logoutText: {
    ...typography.bodyBold,
    color: '#FFFFFF',
  },
  version: {
    ...typography.small,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
});
