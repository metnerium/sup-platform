// Authentication types

export interface RegisterRequest {
  username: string;
  email?: string;
  phone?: string;
  password: string;
  deviceId: string;
  deviceName?: string;
  deviceType?: string;
}

export interface RegisterResponse {
  user: {
    id: string;
    username: string;
    email?: string;
    phone?: string;
    createdAt: string;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export interface LoginRequest {
  username?: string;
  email?: string;
  phone?: string;
  password: string;
  deviceId: string;
  deviceName?: string;
  deviceType?: string;
}

export interface LoginResponse {
  user: {
    id: string;
    username: string;
    email?: string;
    phone?: string;
    avatarUrl?: string;
    bio?: string;
    status: string;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

export interface LogoutRequest {
  refreshToken: string;
}

export interface JWTPayload {
  userId: string;
  deviceId: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

export interface Session {
  id: string;
  userId: string;
  deviceId: string;
  refreshTokenHash: string;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: Date;
  createdAt: Date;
}
