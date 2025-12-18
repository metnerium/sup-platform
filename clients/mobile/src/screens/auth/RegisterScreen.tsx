import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useAuthStore} from '@/store/authStore';
import {useThemeStore} from '@/store/themeStore';
import {Button} from '@/components/common/Button';
import {Input} from '@/components/common/Input';
import {spacing, typography} from '@/constants/theme';

export const RegisterScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const {colors} = useThemeStore();
  const {register, isLoading} = useAuthStore();
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleRegister = async () => {
    if (!displayName || !phoneNumber || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    try {
      setError('');
      await register({phoneNumber, displayName, password});
      navigation.navigate('VerifyOtp', {phoneNumber});
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, {backgroundColor: colors.background}]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={[styles.title, {color: colors.text}]}>
              Create Account
            </Text>
            <Text style={[styles.subtitle, {color: colors.textSecondary}]}>
              Sign up to get started
            </Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Display Name"
              placeholder="Enter your name"
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
            />

            <Input
              label="Phone Number"
              placeholder="+1 234 567 8900"
              keyboardType="phone-pad"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              autoCapitalize="none"
            />

            <Input
              label="Password"
              placeholder="Enter password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
            />

            <Input
              label="Confirm Password"
              placeholder="Re-enter password"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              autoCapitalize="none"
            />

            {error ? (
              <Text style={[styles.error, {color: colors.error}]}>
                {error}
              </Text>
            ) : null}

            <Button
              title="Sign Up"
              onPress={handleRegister}
              loading={isLoading}
              fullWidth
              style={styles.registerButton}
            />
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, {color: colors.textSecondary}]}>
              Already have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={[styles.signInText, {color: colors.primary}]}>
                Sign In
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
  },
  header: {
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h1,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
  },
  form: {
    flex: 1,
  },
  error: {
    ...typography.caption,
    marginBottom: spacing.md,
  },
  registerButton: {
    marginTop: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  footerText: {
    ...typography.body,
  },
  signInText: {
    ...typography.bodyBold,
  },
});
