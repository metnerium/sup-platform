import {Platform} from 'react-native';
import {
  launchCamera,
  launchImageLibrary,
  ImagePickerResponse,
  CameraOptions,
  ImageLibraryOptions,
} from 'react-native-image-picker';
import DocumentPicker from 'react-native-document-picker';
import {UPLOAD_LIMITS, MEDIA_QUALITY} from '@/constants/config';

export const pickImage = async (
  options?: Partial<ImageLibraryOptions>,
): Promise<ImagePickerResponse | null> => {
  try {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: MEDIA_QUALITY.IMAGE.QUALITY,
      maxWidth: MEDIA_QUALITY.IMAGE.WIDTH,
      maxHeight: MEDIA_QUALITY.IMAGE.HEIGHT,
      selectionLimit: 1,
      ...options,
    });

    if (result.didCancel) {
      return null;
    }

    if (result.errorCode) {
      console.error('Image picker error:', result.errorMessage);
      return null;
    }

    return result;
  } catch (error) {
    console.error('Error picking image:', error);
    return null;
  }
};

export const pickMultipleImages = async (
  limit: number = 10,
): Promise<ImagePickerResponse | null> => {
  try {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: MEDIA_QUALITY.IMAGE.QUALITY,
      maxWidth: MEDIA_QUALITY.IMAGE.WIDTH,
      maxHeight: MEDIA_QUALITY.IMAGE.HEIGHT,
      selectionLimit: limit,
    });

    if (result.didCancel) {
      return null;
    }

    if (result.errorCode) {
      console.error('Image picker error:', result.errorMessage);
      return null;
    }

    return result;
  } catch (error) {
    console.error('Error picking images:', error);
    return null;
  }
};

export const takePhoto = async (
  options?: Partial<CameraOptions>,
): Promise<ImagePickerResponse | null> => {
  try {
    const result = await launchCamera({
      mediaType: 'photo',
      quality: MEDIA_QUALITY.IMAGE.QUALITY,
      maxWidth: MEDIA_QUALITY.IMAGE.WIDTH,
      maxHeight: MEDIA_QUALITY.IMAGE.HEIGHT,
      saveToPhotos: true,
      ...options,
    });

    if (result.didCancel) {
      return null;
    }

    if (result.errorCode) {
      console.error('Camera error:', result.errorMessage);
      return null;
    }

    return result;
  } catch (error) {
    console.error('Error taking photo:', error);
    return null;
  }
};

export const pickVideo = async (): Promise<ImagePickerResponse | null> => {
  try {
    const result = await launchImageLibrary({
      mediaType: 'video',
      quality: 1,
      videoQuality: 'high',
    });

    if (result.didCancel) {
      return null;
    }

    if (result.errorCode) {
      console.error('Video picker error:', result.errorMessage);
      return null;
    }

    const asset = result.assets?.[0];
    if (asset && asset.fileSize && asset.fileSize > UPLOAD_LIMITS.MAX_VIDEO_SIZE) {
      throw new Error('Video file is too large');
    }

    return result;
  } catch (error) {
    console.error('Error picking video:', error);
    throw error;
  }
};

export const recordVideo = async (): Promise<ImagePickerResponse | null> => {
  try {
    const result = await launchCamera({
      mediaType: 'video',
      videoQuality: 'high',
      durationLimit: 60, // 1 minute
      saveToPhotos: true,
    });

    if (result.didCancel) {
      return null;
    }

    if (result.errorCode) {
      console.error('Video recording error:', result.errorMessage);
      return null;
    }

    const asset = result.assets?.[0];
    if (asset && asset.fileSize && asset.fileSize > UPLOAD_LIMITS.MAX_VIDEO_SIZE) {
      throw new Error('Video file is too large');
    }

    return result;
  } catch (error) {
    console.error('Error recording video:', error);
    throw error;
  }
};

export const pickDocument = async () => {
  try {
    const result = await DocumentPicker.pick({
      type: [DocumentPicker.types.allFiles],
      copyTo: 'cachesDirectory',
    });

    const file = result[0];
    if (file.size && file.size > UPLOAD_LIMITS.MAX_FILE_SIZE) {
      throw new Error('File is too large');
    }

    return file;
  } catch (error) {
    if (DocumentPicker.isCancel(error)) {
      return null;
    }
    console.error('Error picking document:', error);
    throw error;
  }
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

export const getFileExtension = (filename: string): string => {
  return filename.split('.').pop()?.toLowerCase() || '';
};

export const isImageFile = (mimeType: string): boolean => {
  return mimeType.startsWith('image/');
};

export const isVideoFile = (mimeType: string): boolean => {
  return mimeType.startsWith('video/');
};

export const isAudioFile = (mimeType: string): boolean => {
  return mimeType.startsWith('audio/');
};

export const getMediaDimensions = async (
  uri: string,
): Promise<{width: number; height: number}> => {
  return new Promise((resolve, reject) => {
    if (Platform.OS === 'web') {
      const img = new Image();
      img.onload = () => {
        resolve({width: img.width, height: img.height});
      };
      img.onerror = reject;
      img.src = uri;
    } else {
      // Use Image.getSize for React Native
      const Image = require('react-native').Image;
      Image.getSize(
        uri,
        (width: number, height: number) => {
          resolve({width, height});
        },
        reject,
      );
    }
  });
};

export const createThumbnail = async (
  videoUri: string,
): Promise<string | null> => {
  // This would use a native module or library to create video thumbnails
  // For now, return null as placeholder
  return null;
};

export const compressImage = async (
  uri: string,
  quality: number = 0.8,
): Promise<string> => {
  // This would use expo-image-manipulator or similar
  // For now, return original URI
  return uri;
};
