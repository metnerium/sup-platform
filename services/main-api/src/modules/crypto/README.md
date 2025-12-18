# Crypto Module - Signal Protocol Backend

This module implements the backend infrastructure for the Signal Protocol end-to-end encryption in SUP Messenger. It manages the storage and distribution of cryptographic keys required for the X3DH (Extended Triple Diffie-Hellman) key agreement protocol.

## Overview

The Signal Protocol is a cryptographic protocol that provides end-to-end encryption for messaging. This backend module is responsible for:

- Storing PUBLIC cryptographic keys only (private keys NEVER leave the client)
- Managing the PreKey infrastructure for asynchronous key exchange
- Distributing PreKey bundles to initiating parties
- Tracking one-time prekey usage for perfect forward secrecy

## Architecture

```
crypto/
├── crypto.service.ts      # Business logic for key management
├── crypto.controller.ts   # HTTP endpoint handlers
├── crypto.validator.ts    # Request validation middleware
├── crypto.routes.ts       # Express route definitions
└── README.md             # This file
```

## Database Tables

The module interacts with these database tables:

### `identity_keys`
- Stores long-term identity public keys for each device
- Primary key: `(user_id, device_id)`
- Fields: `user_id`, `device_id`, `identity_key`, `created_at`

### `signed_prekeys`
- Stores signed prekeys (rotated periodically for forward secrecy)
- Primary key: `(user_id, device_id)`
- Fields: `user_id`, `device_id`, `key_id`, `public_key`, `signature`, `created_at`

### `one_time_prekeys`
- Stores one-time prekeys (used once then marked as used)
- Primary key: `id`
- Unique: `(user_id, device_id, key_id)`
- Fields: `user_id`, `device_id`, `key_id`, `public_key`, `used`, `used_at`, `created_at`

### `group_sender_keys`
- Stores encrypted sender keys for group messaging
- Primary key: `id`
- Fields: `chat_id`, `user_id`, `device_id`, `distribution_id`, `chain_key_encrypted`, `created_at`, `rotated_at`

## API Endpoints

All endpoints require authentication via Bearer token in the `Authorization` header.

### 1. Register Keys
**POST** `/api/v1/crypto/keys`

Register cryptographic keys for a device. Should be called once when a device first connects.

**Rate Limit:** 10 requests per hour

**Request Body:**
```json
{
  "deviceId": "device-uuid",
  "identityKey": "base64-encoded-public-key",
  "signedPreKey": {
    "keyId": 1,
    "publicKey": "base64-encoded-public-key",
    "signature": "base64-encoded-signature"
  },
  "oneTimePreKeys": [
    {
      "keyId": 1,
      "publicKey": "base64-encoded-public-key"
    },
    // ... up to 100 keys
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "registeredOneTimePreKeys": 50
  }
}
```

### 2. Get PreKey Bundle
**GET** `/api/v1/crypto/keys/:userId/:deviceId`

Retrieve a PreKey bundle to initiate an encrypted session with a user's device. The bundle includes the identity key, signed prekey, and one one-time prekey (if available).

**Rate Limit:** 30 requests per 15 minutes

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "user-uuid",
    "deviceId": "device-uuid",
    "bundle": {
      "identityKey": "base64-encoded-public-key",
      "signedPreKey": {
        "keyId": 1,
        "publicKey": "base64-encoded-public-key",
        "signature": "base64-encoded-signature"
      },
      "oneTimePreKey": {
        "keyId": 123,
        "publicKey": "base64-encoded-public-key"
      }
    }
  }
}
```

**Note:** The one-time prekey is automatically marked as used after retrieval.

### 3. Get Identity Key
**GET** `/api/v1/crypto/identity/:userId/:deviceId`

Retrieve only the identity key for a specific device.

**Rate Limit:** 30 requests per 15 minutes

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "user-uuid",
    "deviceId": "device-uuid",
    "identityKey": "base64-encoded-public-key",
    "createdAt": "2023-01-01T00:00:00.000Z"
  }
}
```

### 4. Refresh Signed PreKey
**POST** `/api/v1/crypto/keys/refresh`

Update the signed prekey for a device. Should be done periodically (e.g., weekly) for forward secrecy.

**Rate Limit:** 30 requests per 15 minutes

**Request Body:**
```json
{
  "deviceId": "device-uuid",
  "signedPreKey": {
    "keyId": 2,
    "publicKey": "base64-encoded-public-key",
    "signature": "base64-encoded-signature"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Signed prekey refreshed successfully"
  }
}
```

### 5. Generate One-Time PreKeys
**POST** `/api/v1/crypto/keys/generate`

Add new one-time prekeys to replenish the pool. Should be called when the count is low.

**Rate Limit:** 10 requests per hour

**Request Body:**
```json
{
  "deviceId": "device-uuid",
  "count": 50,
  "oneTimePreKeys": [
    {
      "keyId": 201,
      "publicKey": "base64-encoded-public-key"
    },
    // ... up to 100 keys
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "registeredCount": 50
  }
}
```

### 6. Get One-Time PreKeys Count
**GET** `/api/v1/crypto/keys/count/:deviceId`

Check how many unused one-time prekeys remain for a device.

**Rate Limit:** 30 requests per 15 minutes

**Response:**
```json
{
  "success": true,
  "data": {
    "deviceId": "device-uuid",
    "count": 45
  }
}
```

### 7. Get User Devices
**GET** `/api/v1/crypto/devices`

Get all devices with registered keys for the authenticated user.

**Rate Limit:** 30 requests per 15 minutes

**Response:**
```json
{
  "success": true,
  "data": {
    "devices": [
      {
        "deviceId": "device-uuid-1",
        "hasIdentityKey": true,
        "hasSignedPreKey": true,
        "oneTimePreKeysCount": 45
      },
      {
        "deviceId": "device-uuid-2",
        "hasIdentityKey": true,
        "hasSignedPreKey": true,
        "oneTimePreKeysCount": 0
      }
    ]
  }
}
```

### 8. Delete Device Keys
**DELETE** `/api/v1/crypto/keys/:deviceId`

Delete all cryptographic keys for a device. Should be called when a device is removed.

**Rate Limit:** 30 requests per 15 minutes

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Device keys deleted successfully"
  }
}
```

## Security Considerations

### What This Module Does NOT Store

- **Private Keys:** All private keys remain on the client device only
- **Message Content:** No message encryption/decryption happens on the server
- **Plaintext Messages:** The server never sees unencrypted message content

### Security Features

1. **Base64 Validation:** All keys are validated to ensure they are properly encoded
2. **Rate Limiting:** Strict rate limits prevent abuse and denial-of-service attacks
3. **Authentication Required:** All endpoints require valid JWT authentication
4. **Automatic Key Usage Tracking:** One-time prekeys are automatically marked as used
5. **Transaction Safety:** Key operations use database transactions for consistency

### Best Practices

1. **Key Rotation:**
   - Rotate signed prekeys weekly or monthly
   - Maintain a pool of 50-100 one-time prekeys
   - Replenish one-time prekeys when count drops below 20

2. **Device Management:**
   - Delete keys when a device is permanently removed
   - Re-register keys if a device is reinstalled

3. **Error Handling:**
   - Monitor 404 errors (device not found or keys not registered)
   - Implement exponential backoff for failed requests
   - Handle cases where one-time prekeys are exhausted (fallback to signed prekey only)

## Signal Protocol Flow

### 1. Initial Key Registration (One-time Setup)
```
Client                          Server
  |                               |
  |--- POST /crypto/keys -------->|
  |    (identity + signed + OTPs) |
  |                               |
  |<------ 201 Created -----------|
```

### 2. Initiating Encrypted Session (X3DH)
```
Alice                          Server                          Bob
  |                               |                               |
  |--- GET /crypto/keys/bob ----->|                               |
  |                               |                               |
  |<---- PreKey Bundle -----------|                               |
  |    (identity + signed + 1 OTP)|                               |
  |                               |                               |
  | [Performs X3DH locally]       |                               |
  | [Derives shared secret]       |                               |
  |                               |                               |
  |--- Send encrypted message --->|--- Forward to Bob ----------->|
  |    (includes ephemeral key)   |                               |
```

### 3. Ongoing Communication
```
Alice                                                           Bob
  |                                                               |
  |--- Encrypted messages using Double Ratchet algorithm -------->|
  |<-------------- Encrypted responses ----------------------------|
  |                                                               |
```

## Service Layer Methods

### `cryptoService.registerKeys(userId, data)`
Register all cryptographic keys for a device.

### `cryptoService.getPreKeyBundle(requesterId, data)`
Retrieve a PreKey bundle for initiating a session. Automatically marks one-time prekey as used.

### `cryptoService.getIdentityKey(userId, deviceId)`
Get the identity key for a specific device.

### `cryptoService.refreshSignedPreKey(userId, deviceId, signedPreKey)`
Update the signed prekey for a device.

### `cryptoService.generateOneTimePreKeys(userId, deviceId, oneTimePreKeys, count)`
Add new one-time prekeys to the pool.

### `cryptoService.getOneTimePreKeysCount(userId, deviceId)`
Get count of remaining unused one-time prekeys.

### `cryptoService.getUserDevicesWithKeys(userId)`
Get all devices with key registration status.

### `cryptoService.deleteDeviceKeys(userId, deviceId)`
Delete all keys for a device.

## Error Codes

- **400 Bad Request:** Invalid input (malformed base64, invalid structure, etc.)
- **401 Unauthorized:** Missing or invalid authentication token
- **404 Not Found:** Device not found or keys not registered
- **409 Conflict:** Duplicate key registration attempt
- **429 Too Many Requests:** Rate limit exceeded
- **500 Internal Server Error:** Server-side error during key operations

## Testing Recommendations

1. **Unit Tests:**
   - Base64 validation
   - Key registration with valid/invalid data
   - One-time prekey depletion handling

2. **Integration Tests:**
   - Full X3DH handshake simulation
   - Multi-device key management
   - Concurrent access to one-time prekeys

3. **Load Tests:**
   - Rate limiting effectiveness
   - Concurrent PreKey bundle requests
   - Large batch one-time prekey uploads

## Future Enhancements

- [ ] Automatic one-time prekey replenishment notifications
- [ ] Signed prekey rotation reminders
- [ ] Key usage analytics and monitoring
- [ ] Support for key fingerprint verification
- [ ] Webhook notifications for low key counts
- [ ] Multi-device sync support

## References

- [Signal Protocol Specifications](https://signal.org/docs/)
- [X3DH Key Agreement Protocol](https://signal.org/docs/specifications/x3dh/)
- [Double Ratchet Algorithm](https://signal.org/docs/specifications/doubleratchet/)
- [libsignal-protocol](https://github.com/signalapp/libsignal)
