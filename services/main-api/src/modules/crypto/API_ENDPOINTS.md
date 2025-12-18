# Crypto Module API Endpoints - Quick Reference

## Base URL
`/api/v1/crypto`

## Authentication
All endpoints require Bearer token authentication:
```
Authorization: Bearer <access_token>
```

---

## Endpoint Summary

| Method | Endpoint | Description | Rate Limit |
|--------|----------|-------------|------------|
| POST | `/keys` | Register device keys | 10/hour |
| GET | `/keys/:userId/:deviceId` | Get PreKey bundle | 30/15min |
| GET | `/identity/:userId/:deviceId` | Get identity key | 30/15min |
| POST | `/keys/refresh` | Refresh signed prekey | 30/15min |
| POST | `/keys/generate` | Add one-time prekeys | 10/hour |
| GET | `/keys/count/:deviceId` | Get prekey count | 30/15min |
| GET | `/devices` | List user devices | 30/15min |
| DELETE | `/keys/:deviceId` | Delete device keys | 30/15min |

---

## 1. Register Device Keys

**Endpoint:** `POST /api/v1/crypto/keys`
**Rate Limit:** 10 requests per hour
**Description:** Initial registration of cryptographic keys for a device

### Request
```bash
curl -X POST https://api.example.com/api/v1/crypto/keys \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "device-uuid-123",
    "identityKey": "LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0=",
    "signedPreKey": {
      "keyId": 1,
      "publicKey": "LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0=",
      "signature": "U0lHTkFUVVJFX0RBVEFfSEVSRQ=="
    },
    "oneTimePreKeys": [
      {
        "keyId": 1,
        "publicKey": "T1RQX1BVQkxJQ19LRVlfMQ=="
      },
      {
        "keyId": 2,
        "publicKey": "T1RQX1BVQkxJQ19LRVlfMg=="
      }
    ]
  }'
```

### Response (201 Created)
```json
{
  "success": true,
  "data": {
    "success": true,
    "registeredOneTimePreKeys": 2
  }
}
```

### Validation Rules
- `deviceId`: Required, 1-255 characters
- `identityKey`: Required, valid base64, minimum 44 characters
- `signedPreKey.keyId`: Required, non-negative integer
- `signedPreKey.publicKey`: Required, valid base64
- `signedPreKey.signature`: Required, valid base64
- `oneTimePreKeys`: Required array, 1-100 items
- Each one-time prekey must have unique `keyId`

---

## 2. Get PreKey Bundle

**Endpoint:** `GET /api/v1/crypto/keys/:userId/:deviceId`
**Rate Limit:** 30 requests per 15 minutes
**Description:** Retrieve PreKey bundle for initiating encrypted session (X3DH)

### Request
```bash
curl -X GET https://api.example.com/api/v1/crypto/keys/user-123/device-456 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "userId": "user-123",
    "deviceId": "device-456",
    "bundle": {
      "identityKey": "LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0=",
      "signedPreKey": {
        "keyId": 1,
        "publicKey": "U0lHTkVEX1BSRV9LRVk=",
        "signature": "U0lHTkFUVVJF"
      },
      "oneTimePreKey": {
        "keyId": 42,
        "publicKey": "T05FX1RJTUVfS0VZ"
      }
    }
  }
}
```

### Notes
- `oneTimePreKey` may be `undefined` if pool is exhausted
- The returned one-time prekey is automatically marked as used
- Uses database transaction with `FOR UPDATE SKIP LOCKED` for concurrency

---

## 3. Get Identity Key

**Endpoint:** `GET /api/v1/crypto/identity/:userId/:deviceId`
**Rate Limit:** 30 requests per 15 minutes
**Description:** Retrieve only the identity key for a device

### Request
```bash
curl -X GET https://api.example.com/api/v1/crypto/identity/user-123/device-456 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "userId": "user-123",
    "deviceId": "device-456",
    "identityKey": "LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0=",
    "createdAt": "2023-12-18T10:30:00.000Z"
  }
}
```

---

## 4. Refresh Signed PreKey

**Endpoint:** `POST /api/v1/crypto/keys/refresh`
**Rate Limit:** 30 requests per 15 minutes
**Description:** Update signed prekey (should be done weekly/monthly for forward secrecy)

### Request
```bash
curl -X POST https://api.example.com/api/v1/crypto/keys/refresh \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "device-uuid-123",
    "signedPreKey": {
      "keyId": 2,
      "publicKey": "TkVXX1NJR05FRF9LRVk=",
      "signature": "TkVXX1NJR05BVFVSRQ=="
    }
  }'
```

### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "message": "Signed prekey refreshed successfully"
  }
}
```

---

## 5. Generate One-Time PreKeys

**Endpoint:** `POST /api/v1/crypto/keys/generate`
**Rate Limit:** 10 requests per hour
**Description:** Add new one-time prekeys to replenish the pool

### Request
```bash
curl -X POST https://api.example.com/api/v1/crypto/keys/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "device-uuid-123",
    "count": 50,
    "oneTimePreKeys": [
      {
        "keyId": 101,
        "publicKey": "T1RQXzEwMQ=="
      },
      {
        "keyId": 102,
        "publicKey": "T1RQXzEwMg=="
      }
    ]
  }'
```

### Response (201 Created)
```json
{
  "success": true,
  "data": {
    "success": true,
    "registeredCount": 50
  }
}
```

### Validation Rules
- `count`: 1-100
- `oneTimePreKeys`: 1-100 items
- `oneTimePreKeys.length` must be <= `count`
- Duplicate `keyId` values across the array are rejected

---

## 6. Get One-Time PreKeys Count

**Endpoint:** `GET /api/v1/crypto/keys/count/:deviceId`
**Rate Limit:** 30 requests per 15 minutes
**Description:** Check remaining unused one-time prekeys

### Request
```bash
curl -X GET https://api.example.com/api/v1/crypto/keys/count/device-uuid-123 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "deviceId": "device-uuid-123",
    "count": 45
  }
}
```

### Recommendations
- Replenish when count < 20
- Maintain pool of 50-100 keys for optimal availability

---

## 7. Get User Devices

**Endpoint:** `GET /api/v1/crypto/devices`
**Rate Limit:** 30 requests per 15 minutes
**Description:** List all devices with their key registration status

### Request
```bash
curl -X GET https://api.example.com/api/v1/crypto/devices \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Response (200 OK)
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
      },
      {
        "deviceId": "device-uuid-3",
        "hasIdentityKey": false,
        "hasSignedPreKey": false,
        "oneTimePreKeysCount": 0
      }
    ]
  }
}
```

### Use Cases
- Monitor key status across multiple devices
- Identify devices that need key registration
- Check which devices need one-time prekey replenishment

---

## 8. Delete Device Keys

**Endpoint:** `DELETE /api/v1/crypto/keys/:deviceId`
**Rate Limit:** 30 requests per 15 minutes
**Description:** Delete all cryptographic keys for a device

### Request
```bash
curl -X DELETE https://api.example.com/api/v1/crypto/keys/device-uuid-123 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "message": "Device keys deleted successfully"
  }
}
```

### Notes
- Deletes identity key, signed prekey, and all one-time prekeys
- Use when permanently removing a device
- Device can re-register keys later if needed

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": {
    "message": "identityKey must be valid base64",
    "statusCode": 400
  }
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": {
    "message": "No token provided",
    "statusCode": 401
  }
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": {
    "message": "Identity key not found for this device",
    "statusCode": 404
  }
}
```

### 429 Too Many Requests
```json
{
  "success": false,
  "error": {
    "message": "Too many crypto operations, please try again later",
    "statusCode": 429
  }
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": {
    "message": "Failed to register keys",
    "statusCode": 500
  }
}
```

---

## Rate Limiting Details

### General Crypto Operations (30/15min)
Applied to:
- GET /keys/:userId/:deviceId
- GET /identity/:userId/:deviceId
- POST /keys/refresh
- GET /keys/count/:deviceId
- GET /devices
- DELETE /keys/:deviceId

### Key Generation (10/hour)
Applied to:
- POST /keys (initial registration)
- POST /keys/generate (replenishment)

### Rate Limit Headers
```
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 27
X-RateLimit-Reset: 1702901234
```

---

## Client Implementation Checklist

### Initial Setup
- [ ] Generate identity key pair (long-term)
- [ ] Generate signed prekey pair with signature
- [ ] Generate 50-100 one-time prekey pairs
- [ ] Register all keys via POST /keys

### Ongoing Operations
- [ ] Check one-time prekey count regularly
- [ ] Replenish when count < 20
- [ ] Rotate signed prekey weekly/monthly
- [ ] Monitor rate limits and implement backoff

### Session Initiation
- [ ] Request PreKey bundle for target user/device
- [ ] Perform X3DH key agreement locally
- [ ] Derive shared secret
- [ ] Initialize Double Ratchet algorithm
- [ ] Send initial encrypted message

### Error Handling
- [ ] Handle 404 (keys not registered)
- [ ] Handle 429 (rate limit) with exponential backoff
- [ ] Handle missing one-time prekeys (fallback mode)
- [ ] Retry transient errors (500)

---

## Testing with cURL

### Complete Flow Example

```bash
# 1. Register keys
curl -X POST http://localhost:3000/api/v1/crypto/keys \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @register-keys.json

# 2. Check device status
curl -X GET http://localhost:3000/api/v1/crypto/devices \
  -H "Authorization: Bearer $TOKEN"

# 3. Get PreKey bundle for another user
curl -X GET http://localhost:3000/api/v1/crypto/keys/user-456/device-789 \
  -H "Authorization: Bearer $TOKEN"

# 4. Check remaining one-time prekeys
curl -X GET http://localhost:3000/api/v1/crypto/keys/count/device-123 \
  -H "Authorization: Bearer $TOKEN"

# 5. Replenish one-time prekeys
curl -X POST http://localhost:3000/api/v1/crypto/keys/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @generate-prekeys.json

# 6. Refresh signed prekey
curl -X POST http://localhost:3000/api/v1/crypto/keys/refresh \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @refresh-signed-key.json
```

---

## Security Best Practices

1. **Never transmit private keys** - Only public keys are sent to the server
2. **Use HTTPS** - Always use encrypted transport layer
3. **Validate certificates** - Implement certificate pinning if possible
4. **Monitor rate limits** - Implement exponential backoff
5. **Rotate keys regularly** - Signed prekeys should be rotated periodically
6. **Maintain key pool** - Keep 50-100 one-time prekeys available
7. **Handle errors gracefully** - Fallback to signed prekey if one-time prekeys exhausted
8. **Verify signatures** - Always verify signed prekey signatures on the client
9. **Secure local storage** - Protect private keys in device keychain/keystore
10. **Clean up old sessions** - Remove expired session keys

---

## Performance Considerations

### Database Queries
- Identity key lookup: Single indexed query
- PreKey bundle: 3 queries in transaction with row locking
- One-time prekey count: Single aggregation query
- Batch operations: Efficient bulk inserts

### Concurrency
- One-time prekey retrieval uses `FOR UPDATE SKIP LOCKED`
- Prevents duplicate usage under concurrent access
- Transaction isolation ensures consistency

### Scalability
- Horizontal scaling supported (stateless API)
- Redis-backed rate limiting for distributed systems
- Database connection pooling via pg-promise
- Consider read replicas for high-traffic deployments

---

## Monitoring & Metrics

### Key Metrics to Track
- One-time prekey depletion rate
- PreKey bundle requests per second
- Rate limit violations
- Failed key registrations
- Average one-time prekey pool size
- Signed prekey rotation frequency

### Log Events
- Key registration events
- PreKey bundle retrievals
- One-time prekey exhaustion warnings
- Rate limit violations
- Failed authentication attempts
- Suspicious activity patterns

---

## Support & Resources

- Main Documentation: `README.md`
- TypeScript Types: `packages/types/src/crypto.types.ts`
- Service Layer: `crypto.service.ts`
- Controller: `crypto.controller.ts`
- Validators: `crypto.validator.ts`
- Routes: `crypto.routes.ts`

For Signal Protocol specifications:
- https://signal.org/docs/
- https://signal.org/docs/specifications/x3dh/
- https://signal.org/docs/specifications/doubleratchet/
