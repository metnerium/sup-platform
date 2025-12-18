import {useState, useEffect} from 'react';
import * as LocalAuthentication from 'expo-local-authentication';

export const useBiometric = () => {
  const [isAvailable, setIsAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<string>('');

  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    setIsAvailable(compatible);

    if (compatible) {
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const typeNames = types.map(type => {
        switch (type) {
          case LocalAuthentication.AuthenticationType.FINGERPRINT:
            return 'Fingerprint';
          case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
            return 'Face ID';
          case LocalAuthentication.AuthenticationType.IRIS:
            return 'Iris';
          default:
            return 'Biometric';
        }
      });
      setBiometricType(typeNames[0] || 'Biometric');
    }
  };

  const authenticate = async (
    promptMessage?: string,
  ): Promise<{success: boolean; error?: string}> => {
    try {
      const hasEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasEnrolled) {
        return {
          success: false,
          error: 'No biometric authentication enrolled',
        };
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: promptMessage || 'Authenticate to continue',
        fallbackLabel: 'Use passcode',
        disableDeviceFallback: false,
      });

      if (result.success) {
        return {success: true};
      } else {
        return {
          success: false,
          error: result.error || 'Authentication failed',
        };
      }
    } catch (error) {
      return {
        success: false,
        error: 'Authentication error',
      };
    }
  };

  return {
    isAvailable,
    biometricType,
    authenticate,
  };
};
