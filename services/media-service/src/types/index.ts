export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
  message?: string;
}

export interface UploadFileRequest {
  file: Express.Multer.File;
  userId: string;
  chatId?: string;
}

export interface ChunkedUploadInitRequest {
  filename: string;
  mimeType: string;
  userId: string;
  chatId?: string;
}

export interface ChunkedUploadPartRequest {
  uploadId: string;
  partNumber: number;
  chunk: Buffer;
}

export interface FileInfo {
  s3Key: string;
  url: string;
  thumbnailS3Key?: string;
  thumbnailUrl?: string;
  size: number;
  mimeType: string;
  originalName?: string;
  metadata?: {
    duration?: number;
    width?: number;
    height?: number;
    waveform?: number[];
  };
}

export interface S3Metadata {
  userId: string;
  chatId?: string;
  originalName: string;
  uploadedAt: string;
  isThumbnail?: string;
}

export interface HealthCheckResponse {
  success: boolean;
  message: string;
  timestamp: string;
  checks?: {
    s3?: string;
  };
}
