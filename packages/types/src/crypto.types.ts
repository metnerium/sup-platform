// Cryptography types (Signal Protocol)

export interface PreKeyBundle {
  identityKey: string;
  signedPreKey: {
    keyId: number;
    publicKey: string;
    signature: string;
  };
  oneTimePreKey?: {
    keyId: number;
    publicKey: string;
  };
}

export interface RegisterKeysRequest {
  deviceId: string;
  identityKey: string;
  signedPreKey: {
    keyId: number;
    publicKey: string;
    signature: string;
  };
  oneTimePreKeys: Array<{
    keyId: number;
    publicKey: string;
  }>;
}

export interface RegisterKeysResponse {
  success: boolean;
  registeredOneTimePreKeys: number;
}

export interface GetPreKeyBundleRequest {
  userId: string;
  deviceId: string;
}

export interface GetPreKeyBundleResponse {
  userId: string;
  deviceId: string;
  bundle: PreKeyBundle;
}

export interface IdentityKey {
  userId: string;
  deviceId: string;
  identityKey: string;
  createdAt: Date;
}

export interface SignedPreKey {
  id: number;
  userId: string;
  deviceId: string;
  keyId: number;
  publicKey: string;
  signature: string;
  createdAt: Date;
}

export interface OneTimePreKey {
  id: number;
  userId: string;
  deviceId: string;
  keyId: number;
  publicKey: string;
  used: boolean;
  usedAt?: Date;
  createdAt: Date;
}

export interface SenderKey {
  id: string;
  chatId: string;
  userId: string;
  deviceId: string;
  distributionId: string;
  chainKeyEncrypted: string;
  createdAt: Date;
  rotatedAt?: Date;
}
