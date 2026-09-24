/**
 * Cryptographic Type Definitions for ECDSA Key Management and Backup
 */

export interface EncryptedKeyBackup {
  publicKey: string; // Base64 encoded SPKI
  encryptedPrivateKey: string; // Base64 encoded AES-GCM ciphertext + tag
  kdfSalt: string; // Base64 encoded 16-byte salt
  kdfIterations: number; // e.g. 100000
  iv: string; // Base64 encoded 12-byte AES-GCM IV
  keyAlgorithm: string; // "ECDSA-P256"
  createdAt?: string;
}

export interface UserKeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
  publicKeySpki: string; // Base64
  fingerprint: string; // SHA-256 hex fingerprint
}

export interface KeyStatus {
  hasBackupOnServer: boolean;
  isUnlockedOnDevice: boolean;
  publicKey: string | null;
  fingerprint: string | null;
  keyAlgorithm: string;
  createdAt: string | null;
}
