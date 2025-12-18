# SUP Messenger - Main API

RESTful API service для SUP Messenger с поддержкой аутентификации, управления пользователями и криптографических операций.

## Оглавление

- [Структура проекта](#структура-проекта)
- [Установка](#установка)
- [Конфигурация](#конфигурация)
- [API Endpoints](#api-endpoints)
  - [Authentication](#authentication)
  - [Users](#users)
  - [Crypto](#crypto)
- [Middleware](#middleware)
- [Обработка ошибок](#обработка-ошибок)
- [Разработка](#разработка)

## Структура проекта

```
services/main-api/
├── src/
│   ├── modules/               # Бизнес-модули
│   │   ├── auth/             # Аутентификация и авторизация
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.routes.ts
│   │   │   └── auth.validator.ts
│   │   ├── user/             # Управление пользователями
│   │   │   ├── user.service.ts
│   │   │   ├── user.controller.ts
│   │   │   ├── user.routes.ts
│   │   │   └── user.validator.ts
│   │   └── crypto/           # Криптографические операции (Signal Protocol)
│   │       ├── crypto.service.ts
│   │       ├── crypto.controller.ts
│   │       ├── crypto.routes.ts
│   │       └── crypto.validator.ts
│   ├── common/
│   │   ├── middleware/       # Общие middleware
│   │   │   ├── auth.middleware.ts
│   │   │   ├── error.middleware.ts
│   │   │   └── ratelimit.middleware.ts
│   │   └── utils/           # Утилиты
│   │       ├── logger.ts
│   │       ├── validation.ts
│   │       ├── asyncHandler.ts
│   │       └── response.ts
│   ├── config/              # Конфигурация
│   │   ├── index.ts
│   │   ├── database.ts
│   │   └── redis.ts
│   ├── app.ts               # Express приложение
│   └── index.ts             # Точка входа
├── package.json
└── tsconfig.json
```

## Установка

```bash
# Установка зависимостей
npm install

# Запуск миграций базы данных
npm run migrate

# Разработка (с hot reload)
npm run dev

# Сборка для продакшена
npm run build

# Запуск продакшен версии
npm start
```

## Конфигурация

Создайте `.env` файл:

```env
# Server
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/sup_messenger

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key-here
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=30d

# Bcrypt
BCRYPT_ROUNDS=12

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

## API Endpoints

Базовый URL: `http://localhost:3000/api/v1`

### Общий формат ответа

#### Успешный ответ
```json
{
  "success": true,
  "data": { ... }
}
```

#### Ошибка
```json
{
  "success": false,
  "error": {
    "message": "Error message",
    "statusCode": 400,
    "details": [...]
  }
}
```

---

## Authentication

### POST /auth/register
Регистрация нового пользователя.

**Rate Limit:** 5 запросов / 15 минут

**Request:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "password": "SecurePass123",
  "deviceId": "device-uuid",
  "deviceName": "iPhone 13",
  "deviceType": "mobile"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "username": "johndoe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "createdAt": "2025-12-18T10:00:00Z"
    },
    "tokens": {
      "accessToken": "eyJhbGc...",
      "refreshToken": "eyJhbGc..."
    }
  }
}
```

**Validation:**
- `username`: 3-30 символов, только буквы, цифры, underscore
- `email` или `phone`: хотя бы одно обязательно
- `password`: минимум 8 символов, содержит заглавную букву, строчную букву и цифру
- `deviceType`: `web`, `mobile`, или `desktop`

---

### POST /auth/login
Вход в систему.

**Rate Limit:** 5 запросов / 15 минут

**Request:**
```json
{
  "username": "johndoe",
  "password": "SecurePass123",
  "deviceId": "device-uuid",
  "deviceName": "iPhone 13",
  "deviceType": "mobile"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "username": "johndoe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "avatarUrl": "https://...",
      "bio": "Hello world",
      "status": "online"
    },
    "tokens": {
      "accessToken": "eyJhbGc...",
      "refreshToken": "eyJhbGc..."
    }
  }
}
```

**Note:** Можно войти используя `username`, `email` или `phone`.

---

### POST /auth/refresh
Обновление access токена.

**Request:**
```json
{
  "refreshToken": "eyJhbGc..."
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

---

### GET /auth/me
Получить информацию о текущем пользователе.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "username": "johndoe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "avatarUrl": "https://...",
    "bio": "Hello world",
    "status": "online",
    "createdAt": "2025-12-18T10:00:00Z"
  }
}
```

---

### POST /auth/logout
Выход из системы.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request:**
```json
{
  "refreshToken": "eyJhbGc..."
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

---

## Users

Все endpoints требуют аутентификации (`Authorization: Bearer <accessToken>`).

### GET /users/me
Получить свой профиль.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "username": "johndoe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "avatarUrl": "https://...",
    "bio": "Hello world",
    "status": "online",
    "lastSeen": "2025-12-18T10:00:00Z",
    "emailVerified": true,
    "phoneVerified": false,
    "twoFactorEnabled": false,
    "createdAt": "2025-12-18T10:00:00Z",
    "updatedAt": "2025-12-18T10:00:00Z"
  }
}
```

---

### PUT /users/me
Обновить свой профиль.

**Request:**
```json
{
  "username": "newusername",
  "email": "newemail@example.com",
  "bio": "New bio",
  "avatarUrl": "https://..."
}
```

**Response:** `200 OK` - возвращает обновленный профиль

---

### PATCH /users/me/avatar
Обновить аватар.

**Request:**
```json
{
  "avatarUrl": "https://..."
}
```

**Response:** `200 OK`

---

### PATCH /users/me/status
Обновить статус.

**Request:**
```json
{
  "status": "online"
}
```

**Values:** `online`, `offline`, `away`

**Response:** `200 OK`

---

### POST /users/search
Поиск пользователей.

**Request:**
```json
{
  "query": "john",
  "limit": 20,
  "offset": 0
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "user-uuid",
        "username": "johndoe",
        "avatarUrl": "https://...",
        "bio": "Hello world",
        "status": "online",
        "lastSeen": "2025-12-18T10:00:00Z"
      }
    ],
    "total": 42,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

---

### GET /users/:id
Получить профиль пользователя по ID.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "username": "johndoe",
    "avatarUrl": "https://...",
    "bio": "Hello world",
    "status": "online",
    "lastSeen": "2025-12-18T10:00:00Z"
  }
}
```

---

### GET /users/contacts
Получить список контактов.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "userId": "current-user-uuid",
      "contactUserId": "contact-uuid",
      "displayName": "John Doe",
      "addedAt": "2025-12-18T10:00:00Z"
    }
  ]
}
```

---

### POST /users/contacts
Добавить контакт.

**Request:**
```json
{
  "contactUserId": "user-uuid",
  "displayName": "John Doe"
}
```

**Response:** `201 Created`

---

### DELETE /users/contacts/:contactId
Удалить контакт.

**Response:** `200 OK`

---

### POST /users/block
Заблокировать пользователя.

**Request:**
```json
{
  "blockedUserId": "user-uuid"
}
```

**Response:** `200 OK`

---

### DELETE /users/block/:blockedUserId
Разблокировать пользователя.

**Response:** `200 OK`

---

### GET /users/blocked
Получить список заблокированных пользователей.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "user-uuid",
      "username": "blockeduser",
      "avatarUrl": "https://...",
      "bio": "...",
      "status": "offline",
      "lastSeen": "2025-12-18T10:00:00Z"
    }
  ]
}
```

---

## Crypto

Все endpoints требуют аутентификации. Криптографические операции основаны на Signal Protocol (X3DH + Double Ratchet).

**Rate Limit:** 30 запросов / 15 минут (общий), 10 запросов / 1 час (генерация ключей)

### POST /crypto/keys
Регистрация криптографических ключей для устройства.

**Rate Limit:** 10 запросов / 1 час

**Request:**
```json
{
  "deviceId": "device-uuid",
  "identityKey": "base64-encoded-key",
  "signedPreKey": {
    "keyId": 1,
    "publicKey": "base64-encoded-key",
    "signature": "base64-encoded-signature"
  },
  "oneTimePreKeys": [
    {
      "keyId": 1,
      "publicKey": "base64-encoded-key"
    },
    {
      "keyId": 2,
      "publicKey": "base64-encoded-key"
    }
  ]
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "success": true,
    "registeredOneTimePreKeys": 100
  }
}
```

**Validation:**
- `oneTimePreKeys`: 1-100 ключей
- Все ключи должны быть в формате base64
- Минимальная длина ключа: 44 символа (32 байта)

---

### GET /crypto/keys/:userId/:deviceId
Получить PreKey bundle для инициализации зашифрованной сессии.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "userId": "user-uuid",
    "deviceId": "device-uuid",
    "bundle": {
      "identityKey": "base64-encoded-key",
      "signedPreKey": {
        "keyId": 1,
        "publicKey": "base64-encoded-key",
        "signature": "base64-encoded-signature"
      },
      "oneTimePreKey": {
        "keyId": 42,
        "publicKey": "base64-encoded-key"
      }
    }
  }
}
```

**Note:** OneTimePreKey автоматически помечается как использованный и может отсутствовать, если пул исчерпан.

---

### GET /crypto/identity/:userId/:deviceId
Получить identity key для конкретного устройства.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "userId": "user-uuid",
    "deviceId": "device-uuid",
    "identityKey": "base64-encoded-key",
    "createdAt": "2025-12-18T10:00:00Z"
  }
}
```

---

### POST /crypto/keys/refresh
Обновить signed prekey (рекомендуется делать периодически для forward secrecy).

**Request:**
```json
{
  "deviceId": "device-uuid",
  "signedPreKey": {
    "keyId": 2,
    "publicKey": "base64-encoded-key",
    "signature": "base64-encoded-signature"
  }
}
```

**Response:** `200 OK`

---

### POST /crypto/keys/generate
Сгенерировать и загрузить новые one-time prekeys.

**Rate Limit:** 10 запросов / 1 час

**Request:**
```json
{
  "deviceId": "device-uuid",
  "count": 100,
  "oneTimePreKeys": [
    {
      "keyId": 101,
      "publicKey": "base64-encoded-key"
    }
  ]
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "success": true,
    "registeredCount": 100
  }
}
```

---

### GET /crypto/keys/count/:deviceId
Получить количество неиспользованных one-time prekeys.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "count": 42
  }
}
```

---

### GET /crypto/devices
Получить все устройства с зарегистрированными ключами.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "devices": [
      {
        "deviceId": "device-uuid",
        "hasIdentityKey": true,
        "hasSignedPreKey": true,
        "oneTimePreKeysCount": 42
      }
    ]
  }
}
```

---

### DELETE /crypto/keys/:deviceId
Удалить все криптографические ключи для устройства.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "message": "Device keys deleted successfully"
  }
}
```

---

## Middleware

### Authentication Middleware
- Проверяет JWT токен в заголовке `Authorization: Bearer <token>`
- Извлекает `userId` и `deviceId` из токена
- Добавляет `req.user = { id, deviceId }` к запросу

### Rate Limiting
- **General API Limiter:** 100 запросов / 15 минут (применяется ко всем `/api/v1/*`)
- **Auth Limiter:** 5 запросов / 15 минут (для `/auth/register`, `/auth/login`)
- **Crypto Limiter:** 30 запросов / 15 минут (для всех `/crypto/*`)
- **Key Generation Limiter:** 10 запросов / 1 час (для генерации ключей)

### Error Handling
Глобальный error handler перехватывает все ошибки и возвращает единообразный формат:

```json
{
  "success": false,
  "error": {
    "message": "Error message",
    "statusCode": 400,
    "details": []
  }
}
```

### Validation
- **express-validator** для Auth модуля
- **Zod** для User модуля
- Кастомные валидаторы для Crypto модуля

---

## Обработка ошибок

### Коды ошибок

| Код | Описание |
|-----|----------|
| 400 | Bad Request - ошибка валидации |
| 401 | Unauthorized - невалидный или отсутствующий токен |
| 403 | Forbidden - доступ запрещен |
| 404 | Not Found - ресурс не найден |
| 409 | Conflict - конфликт данных (например, username уже занят) |
| 429 | Too Many Requests - превышен rate limit |
| 500 | Internal Server Error - внутренняя ошибка сервера |

### Примеры ошибок

**Validation Error:**
```json
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "statusCode": 400,
    "details": [
      {
        "field": "username",
        "message": "Username must be at least 3 characters"
      }
    ]
  }
}
```

**Authentication Error:**
```json
{
  "success": false,
  "error": {
    "message": "Invalid token",
    "statusCode": 401
  }
}
```

**Rate Limit Error:**
```json
{
  "success": false,
  "error": {
    "message": "Too many requests, please try again later",
    "statusCode": 429
  }
}
```

---

## Разработка

### Запуск в режиме разработки
```bash
npm run dev
```

### Тестирование
```bash
# Запуск тестов
npm test

# Линтинг
npm run lint
```

### Миграции базы данных
```bash
# Применить миграции
npm run migrate

# Откатить миграцию
npm run migrate:rollback

# Статус миграций
npm run migrate:status
```

### Логирование
Используется Winston для логирования. Логи выводятся в консоль и в файлы:
- `logs/error.log` - только ошибки
- `logs/combined.log` - все логи

**Log Levels:** error, warn, info, http, debug

### Health Check
```bash
GET http://localhost:3000/health
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-12-18T10:00:00Z",
    "uptime": 12345.67
  }
}
```

---

## Архитектурные решения

### Модульная структура
Каждый модуль (auth, user, crypto) имеет полный набор:
- **Service** - бизнес-логика
- **Controller** - обработка HTTP запросов
- **Routes** - определение endpoints
- **Validator** - валидация входных данных

### Безопасность
- Helmet.js для базовой защиты
- CORS настроен через переменные окружения
- Rate limiting на разных уровнях
- JWT с коротким временем жизни access токенов
- Bcrypt для хеширования паролей
- Blacklist для refresh токенов в Redis

### Производительность
- Compression middleware для сжатия ответов
- Индексы в базе данных
- Redis для кеширования и rate limiting
- Connection pooling для PostgreSQL

---

## Зависимости

**Production:**
- `express` - веб-фреймворк
- `pg-promise` - PostgreSQL клиент
- `redis` - Redis клиент
- `bcrypt` - хеширование паролей
- `jsonwebtoken` - JWT токены
- `helmet` - безопасность HTTP заголовков
- `cors` - CORS middleware
- `express-rate-limit` - rate limiting
- `express-validator` - валидация (auth)
- `zod` - валидация (user)
- `winston` - логирование
- `morgan` - HTTP логирование

**Development:**
- `typescript` - типизация
- `ts-node-dev` - hot reload для разработки

---

## Лицензия

MIT
