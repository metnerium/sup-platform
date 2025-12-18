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

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const {colors} = useThemeStore();
  const {login, isLoading} = useAuthStore();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!phoneNumber || !password) {
      setError('Please enter phone number and password');
      return;
    }

    try {
      setError('');
      await login(phoneNumber, password);
      // Navigation handled by navigation component based on auth state
    } catch (err: any) {
      setError(err.message || 'Login failed');
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
              Welcome Back
            </Text>
            <Text style={[styles.subtitle, {color: colors.textSecondary}]}>
              Sign in to continue
            </Text>
          </View>

          <View style={styles.form}>
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
              placeholder="Enter your password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
            />

            {error ? (
              <Text style={[styles.error, {color: colors.error}]}>
                {error}
              </Text>
            ) : null}

            <Button
              title="Sign In"
              onPress={handleLogin}
              loading={isLoading}
              fullWidth
              style={styles.loginButton}
            />

            <TouchableOpacity
              onPress={() => navigation.navigate('ForgotPassword')}
              style={styles.forgotPassword}>
              <Text style={[styles.forgotPasswordText, {color: colors.primary}]}>
                Forgot Password?
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, {color: colors.textSecondary}]}>
              Don't have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={[styles.signUpText, {color: colors.primary}]}>
                Sign Up
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
    marginTop: spacing.xxl,
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
  loginButton: {
    marginTop: spacing.md,
  },
  forgotPassword: {
    alignSelf: 'center',
    marginTop: spacing.lg,
  },
  forgotPasswordText: {
    ...typography.captionBold,
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
  signUpText: {
    ...typography.bodyBold,
  },
});
