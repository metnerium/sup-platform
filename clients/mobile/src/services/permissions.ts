import {Platform, Alert, Linking} from 'react-native';
import {
  PERMISSIONS,
  RESULTS,
  request,
  check,
  openSettings,
} from 'react-native-permissions';

class PermissionServiceClass {
  async requestNotificationPermission(): Promise<boolean> {
    if (Platform.OS === 'ios') {
      const result = await request(PERMISSIONS.IOS.NOTIFICATIONS);
      return result === RESULTS.GRANTED;
    }
    return true; // Android handles this differently
  }

  async requestCameraPermission(): Promise<boolean> {
    const permission =
      Platform.OS === 'ios'
        ? PERMISSIONS.IOS.CAMERA
        : PERMISSIONS.ANDROID.CAMERA;

    const result = await request(permission);

    if (result === RESULTS.BLOCKED || result === RESULTS.DENIED) {
      this.showPermissionAlert('Camera');
      return false;
    }

    return result === RESULTS.GRANTED;
  }

  async requestMicrophonePermission(): Promise<boolean> {
    const permission =
      Platform.OS === 'ios'
        ? PERMISSIONS.IOS.MICROPHONE
        : PERMISSIONS.ANDROID.RECORD_AUDIO;

    const result = await request(permission);

    if (result === RESULTS.BLOCKED || result === RESULTS.DENIED) {
      this.showPermissionAlert('Microphone');
      return false;
    }

    return result === RESULTS.GRANTED;
  }

  async requestPhotoLibraryPermission(): Promise<boolean> {
    const permission =
      Platform.OS === 'ios'
        ? PERMISSIONS.IOS.PHOTO_LIBRARY
        : PERMISSIONS.ANDROID.READ_MEDIA_IMAGES;

    const result = await request(permission);

    if (result === RESULTS.BLOCKED || result === RESULTS.DENIED) {
      this.showPermissionAlert('Photo Library');
      return false;
    }

    return result === RESULTS.GRANTED;
  }

  async requestContactsPermission(): Promise<boolean> {
    const permission =
      Platform.OS === 'ios'
        ? PERMISSIONS.IOS.CONTACTS
        : PERMISSIONS.ANDROID.READ_CONTACTS;

    const result = await request(permission);

    if (result === RESULTS.BLOCKED || result === RESULTS.DENIED) {
      this.showPermissionAlert('Contacts');
      return false;
    }

    return result === RESULTS.GRANTED;
  }

  async requestLocationPermission(): Promise<boolean> {
    const permission =
      Platform.OS === 'ios'
        ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
        : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;

    const result = await request(permission);

    if (result === RESULTS.BLOCKED || result === RESULTS.DENIED) {
      this.showPermissionAlert('Location');
      return false;
    }

    return result === RESULTS.GRANTED;
  }

  async checkCameraPermission(): Promise<boolean> {
    const permission =
      Platform.OS === 'ios'
        ? PERMISSIONS.IOS.CAMERA
        : PERMISSIONS.ANDROID.CAMERA;

    const result = await check(permission);
    return result === RESULTS.GRANTED;
  }

  async checkMicrophonePermission(): Promise<boolean> {
    const permission =
      Platform.OS === 'ios'
        ? PERMISSIONS.IOS.MICROPHONE
        : PERMISSIONS.ANDROID.RECORD_AUDIO;

    const result = await check(permission);
    return result === RESULTS.GRANTED;
  }

  async checkPhotoLibraryPermission(): Promise<boolean> {
    const permission =
      Platform.OS === 'ios'
        ? PERMISSIONS.IOS.PHOTO_LIBRARY
        : PERMISSIONS.ANDROID.READ_MEDIA_IMAGES;

    const result = await check(permission);
    return result === RESULTS.GRANTED;
  }

  async requestCallPermissions(): Promise<boolean> {
    const cameraGranted = await this.requestCameraPermission();
    const microphoneGranted = await this.requestMicrophonePermission();

    return cameraGranted && microphoneGranted;
  }

  private showPermissionAlert(permissionName: string) {
    Alert.alert(
      `${permissionName} Permission Required`,
      `Please enable ${permissionName} permission in settings to use this feature.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Open Settings',
          onPress: () => openSettings(),
        },
      ],
    );
  }
}

export const PermissionService = new PermissionServiceClass();
