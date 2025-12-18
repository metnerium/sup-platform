/**
 * Auth module constants
 */

// Token expiry times (in seconds)
export const TOKEN_EXPIRY = {
  ACCESS_TOKEN: 15 * 60, // 15 minutes
  REFRESH_TOKEN: 30 * 24 * 60 * 60, // 30 days
  PASSWORD_RESET: 60 * 60, // 1 hour
  EMAIL_VERIFICATION: 24 * 60 * 60, // 24 hours
  PHONE_VERIFICATION: 5 * 60, // 5 minutes
} as const;

// Rate limit configuration
export const RATE_LIMITS = {
  AUTH_ENDPOINTS: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
  },
  GENERAL_API: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
  },
  UPLOAD: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 uploads per hour
  },
} as const;

// Password validation rules
export const PASSWORD_RULES = {
  MIN_LENGTH: 8,
  MAX_LENGTH: 128,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBER: true,
  REQUIRE_SPECIAL_CHAR: false,
} as const;

// Username validation rules
export const USERNAME_RULES = {
  MIN_LENGTH: 3,
  MAX_LENGTH: 30,
  PATTERN: /^[a-zA-Z0-9_]+$/,
  ALLOWED_CHARS: 'letters, numbers, and underscores',
} as const;

// Device types
export const DEVICE_TYPES = ['ios', 'android', 'web', 'desktop', 'other'] as const;
export type DeviceType = (typeof DEVICE_TYPES)[number];

// User status
export const USER_STATUS = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  AWAY: 'away',
  DO_NOT_DISTURB: 'dnd',
} as const;

// Redis key prefixes
export const REDIS_KEYS = {
  BLACKLIST: 'blacklist:',
  PASSWORD_RESET: 'password_reset:',
  EMAIL_VERIFICATION: 'email_verification:',
  PHONE_VERIFICATION: 'phone_verification:',
  RATE_LIMIT: 'rl:',
  SESSION: 'session:',
} as const;

// Error messages
export const ERROR_MESSAGES = {
  // Authentication
  INVALID_CREDENTIALS: 'Invalid credentials',
  INVALID_TOKEN: 'Invalid token',
  TOKEN_EXPIRED: 'Token expired',
  TOKEN_REVOKED: 'Token has been revoked',
  NO_TOKEN: 'No token provided',
  INVALID_TOKEN_TYPE: 'Invalid token type',

  // Registration
  USERNAME_EXISTS: 'Username already exists',
  EMAIL_EXISTS: 'Email already exists',
  PHONE_EXISTS: 'Phone number already exists',
  EMAIL_OR_PHONE_REQUIRED: 'Email or phone is required',

  // Validation
  VALIDATION_FAILED: 'Validation failed',
  INVALID_EMAIL: 'Invalid email format',
  INVALID_PHONE: 'Invalid phone number format (E.164 format required)',
  WEAK_PASSWORD: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  PASSWORD_TOO_SHORT: 'Password must be at least 8 characters',
  PASSWORD_TOO_LONG: 'Password must not exceed 128 characters',
  USERNAME_TOO_SHORT: 'Username must be at least 3 characters',
  USERNAME_TOO_LONG: 'Username must not exceed 30 characters',
  INVALID_USERNAME_CHARS: 'Username can only contain letters, numbers, and underscores',
  INVALID_DEVICE_TYPE: 'Invalid device type',

  // User
  USER_NOT_FOUND: 'User not found',
  UNAUTHORIZED: 'Unauthorized',

  // Session
  SESSION_NOT_FOUND: 'Session not found',
  INVALID_SESSION: 'Invalid or expired session',

  // Password
  INVALID_CURRENT_PASSWORD: 'Invalid current password',
  PASSWORDS_DO_NOT_MATCH: 'Passwords do not match',

  // Rate limiting
  TOO_MANY_REQUESTS: 'Too many requests, please try again later',
  TOO_MANY_AUTH_ATTEMPTS: 'Too many authentication attempts, please try again later',

  // Not implemented
  NOT_IMPLEMENTED: 'Feature not implemented yet',
  EMAIL_VERIFICATION_NOT_IMPLEMENTED: 'Email verification not implemented yet',
  PHONE_VERIFICATION_NOT_IMPLEMENTED: 'Phone verification not implemented yet',
  PASSWORD_RESET_NOT_IMPLEMENTED: 'Password reset not implemented yet',
  TWO_FACTOR_NOT_IMPLEMENTED: '2FA not implemented yet',
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  REGISTRATION_SUCCESS: 'User registered successfully',
  LOGIN_SUCCESS: 'Login successful',
  LOGOUT_SUCCESS: 'Logged out successfully',
  TOKEN_REFRESHED: 'Token refreshed successfully',
  PASSWORD_CHANGED: 'Password changed successfully',
  PASSWORD_RESET_SENT: 'Password reset email sent',
  EMAIL_VERIFIED: 'Email verified successfully',
  PHONE_VERIFIED: 'Phone verified successfully',
  TWO_FACTOR_ENABLED: '2FA enabled successfully',
  TWO_FACTOR_DISABLED: '2FA disabled successfully',
  SESSION_REVOKED: 'Session revoked successfully',
  ALL_SESSIONS_REVOKED: 'All sessions revoked successfully',
} as const;

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
} as const;

// Bcrypt configuration
export const BCRYPT_CONFIG = {
  ROUNDS: 12, // Default bcrypt rounds
  MAX_INPUT_LENGTH: 72, // Bcrypt max input length
} as const;

// JWT configuration
export const JWT_CONFIG = {
  ALGORITHM: 'HS256' as const,
  ISSUER: 'sup-messenger',
  AUDIENCE: 'sup-api',
} as const;

// Validation patterns
export const VALIDATION_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\+?[1-9]\d{1,14}$/, // E.164 format
  USERNAME: /^[a-zA-Z0-9_]+$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  PASSWORD_STRENGTH: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
} as const;

// Field length limits
export const FIELD_LIMITS = {
  USERNAME: { min: 3, max: 30 },
  PASSWORD: { min: 8, max: 128 },
  DEVICE_ID: { min: 1, max: 255 },
  DEVICE_NAME: { max: 255 },
  BIO: { max: 500 },
  EMAIL: { max: 255 },
  PHONE: { max: 20 },
} as const;

// 2FA configuration (future)
export const TWO_FACTOR_CONFIG = {
  CODE_LENGTH: 6,
  WINDOW: 1, // Time window for TOTP verification
  BACKUP_CODES_COUNT: 10,
  BACKUP_CODE_LENGTH: 8,
} as const;

// Session configuration
export const SESSION_CONFIG = {
  MAX_DEVICES_PER_USER: 10, // Maximum concurrent devices
  CLEANUP_INTERVAL: 24 * 60 * 60 * 1000, // 24 hours (cleanup expired sessions)
} as const;
