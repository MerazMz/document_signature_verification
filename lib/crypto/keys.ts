/**
 * Modular Web Cryptography API implementation for ECDSA P-256 key management,
 * password-derived client-side encryption, and secure backup.
 * Fully isomorphic (runs on both client and server).
 */

import { EncryptedKeyBackup, UserKeyPair } from "./types";

const PBKDF2_ITERATIONS = 100000;
const AES_KEY_LENGTH = 256;

function getCrypto(): Crypto {
  if (typeof globalThis !== "undefined" && globalThis.crypto) {
    return globalThis.crypto;
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("crypto").webcrypto;
}

// ==========================================
// Base64 & Hex Conversion Utilities
// ==========================================

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(buffer).toString("base64");
  }
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return globalThis.btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  if (typeof Buffer !== "undefined") {
    const buf = Buffer.from(base64, "base64");
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  }
  const binary = globalThis.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function hexToArrayBuffer(hex: string): ArrayBuffer {
  const cleanHex = hex.replace(/[^0-9a-fA-F]/g, "");
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
  }
  return bytes.buffer;
}

// ==========================================
// Key Generation & Public Key Fingerprinting
// ==========================================

/**
 * Generates an ECDSA key pair using the NIST P-256 (secp256r1) curve.
 * Private key usage: ["sign"]
 * Public key usage: ["verify"]
 */
export async function generateECDSAKeyPair(): Promise<UserKeyPair> {
  const crypto = getCrypto();
  if (!crypto.subtle) {
    throw new Error("Web Crypto API is not available in this environment");
  }

  const keyPair = await crypto.subtle.generateKey(
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    true, // extractable so we can export & client-side encrypt the backup
    ["sign", "verify"]
  );

  // Export public key to standard SPKI (SubjectPublicKeyInfo) format
  const spkiBuffer = await crypto.subtle.exportKey("spki", keyPair.publicKey);
  const publicKeySpki = arrayBufferToBase64(spkiBuffer);

  // Compute SHA-256 fingerprint of the public key
  const fpBuffer = await crypto.subtle.digest("SHA-256", spkiBuffer);
  const fingerprint = bufferToHex(fpBuffer);

  return {
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey,
    publicKeySpki,
    fingerprint,
  };
}

/**
 * Computes a readable SHA-256 fingerprint for an SPKI Base64 public key.
 */
export async function computeKeyFingerprint(publicKeySpki: string): Promise<string> {
  const crypto = getCrypto();
  const spkiBuffer = base64ToArrayBuffer(publicKeySpki);
  const fpBuffer = await crypto.subtle.digest("SHA-256", spkiBuffer);
  return bufferToHex(fpBuffer);
}

/**
 * Imports an SPKI Base64 public key back into a CryptoKey for verification.
 */
export async function importPublicKeySpki(spkiBase64: string): Promise<CryptoKey> {
  const crypto = getCrypto();
  const spkiBuffer = base64ToArrayBuffer(spkiBase64);
  return crypto.subtle.importKey(
    "spki",
    spkiBuffer,
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    true,
    ["verify"]
  );
}

// ==========================================
// Password-Based Private Key Encryption (PBKDF2 + AES-GCM)
// ==========================================

/**
 * Derives a 256-bit AES-GCM encryption key from the user's password using PBKDF2-HMAC-SHA256.
 */
async function deriveAesKeyFromPassword(
  password: string,
  salt: Uint8Array,
  iterations: number
): Promise<CryptoKey> {
  const crypto = getCrypto();
  const enc = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations,
      hash: "SHA-256",
    },
    passwordKey,
    {
      name: "AES-GCM",
      length: AES_KEY_LENGTH,
    },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts an ECDSA private key using AES-GCM-256 with a key derived from the user's password.
 * The output includes the salt, iterations, IV, and authenticated ciphertext.
 * This is the ONLY private-key payload sent to the backend.
 */
export async function encryptPrivateKey(
  privateKey: CryptoKey,
  password: string,
  publicKeySpki: string
): Promise<EncryptedKeyBackup> {
  if (!password || password.trim().length === 0) {
    throw new Error("Password is required to encrypt private key");
  }

  const crypto = getCrypto();

  // 1. Export private key in standard PKCS#8 format
  const pkcs8Buffer = await crypto.subtle.exportKey("pkcs8", privateKey);

  // 2. Generate cryptographically secure random 16-byte salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // 3. Derive AES-GCM key from password
  const aesKey = await deriveAesKeyFromPassword(password, salt, PBKDF2_ITERATIONS);

  // 4. Generate cryptographically secure random 12-byte IV for AES-GCM
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // 5. Encrypt private key bytes with AES-GCM (128-bit authentication tag is automatically appended)
  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    aesKey,
    pkcs8Buffer
  );

  return {
    publicKey: publicKeySpki,
    encryptedPrivateKey: arrayBufferToBase64(encryptedBuffer),
    kdfSalt: arrayBufferToBase64(salt.buffer),
    kdfIterations: PBKDF2_ITERATIONS,
    iv: arrayBufferToBase64(iv.buffer),
    keyAlgorithm: "ECDSA-P256",
  };
}

/**
 * Decrypts an encrypted private key backup using the user's password.
 * If the password is wrong or ciphertext is tampered with, AES-GCM fails authentication.
 */
export async function decryptPrivateKey(
  backup: EncryptedKeyBackup,
  password: string
): Promise<CryptoKey> {
  if (!password || password.trim().length === 0) {
    throw new Error("Password is required to restore private key");
  }

  const crypto = getCrypto();
  const saltBuffer = base64ToArrayBuffer(backup.kdfSalt);
  const salt = new Uint8Array(saltBuffer);
  const ivBuffer = base64ToArrayBuffer(backup.iv);
  const iv = new Uint8Array(ivBuffer);
  const ciphertextBuffer = base64ToArrayBuffer(backup.encryptedPrivateKey);

  // 1. Derive AES-GCM key using the recorded salt and iteration count
  const aesKey = await deriveAesKeyFromPassword(password, salt, backup.kdfIterations);

  let decryptedPkcs8: ArrayBuffer;
  try {
    // 2. Decrypt with AES-GCM
    decryptedPkcs8 = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv,
      },
      aesKey,
      ciphertextBuffer
    );
  } catch (err) {
    console.error("AES-GCM decryption failed:", err);
    throw new Error("Incorrect account password. Unable to decrypt private key.");
  }

  // 3. Import decrypted PKCS#8 bytes back into a CryptoKey for signing
  return crypto.subtle.importKey(
    "pkcs8",
    decryptedPkcs8,
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    true,
    ["sign"]
  );
}

// ==========================================
// Modular Sign Function
// ==========================================

/**
 * Signs a document SHA-256 digest using the user's ECDSA P-256 private key.
 * @param privateKey The user's ECDSA CryptoKey
 * @param hashHex The SHA-256 hex string of the PDF
 * @returns Base64 encoded ECDSA signature
 */
export async function signDocumentHash(
  privateKey: CryptoKey,
  hashHex: string
): Promise<string> {
  const crypto = getCrypto();
  const hashBytes = hexToArrayBuffer(hashHex);
  const signatureBuffer = await crypto.subtle.sign(
    {
      name: "ECDSA",
      hash: { name: "SHA-256" },
    },
    privateKey,
    hashBytes
  );
  return arrayBufferToBase64(signatureBuffer);
}
