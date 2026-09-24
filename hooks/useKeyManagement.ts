"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  generateECDSAKeyPair,
  encryptPrivateKey,
  decryptPrivateKey,
  computeKeyFingerprint,
  importPublicKeySpki,
  saveLocalKeyPair,
  getLocalKeyPair,
  EncryptedKeyBackup,
} from "@/lib/crypto";

export interface KeyManagementState {
  isLoading: boolean;
  hasBackupOnServer: boolean;
  isUnlockedOnDevice: boolean;
  publicKey: string | null;
  fingerprint: string | null;
  keyAlgorithm: string;
  createdAt: string | null;
  error: string | null;
}

export function useKeyManagement(userId?: number | null) {
  const [state, setState] = useState<KeyManagementState>({
    isLoading: true,
    hasBackupOnServer: false,
    isUnlockedOnDevice: false,
    publicKey: null,
    fingerprint: null,
    keyAlgorithm: "ECDSA-P256",
    createdAt: null,
    error: null,
  });

  // Cached server backup details in memory for decryption on restore
  const serverBackupRef = useRef<EncryptedKeyBackup | null>(null);
  // Active in-memory private key for fast signature operations
  const activePrivateKeyRef = useRef<CryptoKey | null>(null);

  /**
   * Refreshes and inspects both device IndexedDB and backend server backup state.
   */
  const checkKeyStatus = useCallback(async () => {
    if (!userId) {
      setState((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // 1. Check local IndexedDB on this device
      const localRecord = await getLocalKeyPair(userId);
      const isLocallyAvailable = !!localRecord?.privateKey;

      if (isLocallyAvailable && localRecord) {
        activePrivateKeyRef.current = localRecord.privateKey;
      }

      // 2. Check server for user's public key & encrypted backup
      const res = await fetch("/api/keys", { credentials: "same-origin" });
      if (!res.ok) {
        throw new Error("Failed to query key status from server");
      }

      const data = await res.json();

      if (data.hasKey) {
        serverBackupRef.current = {
          publicKey: data.publicKey,
          encryptedPrivateKey: data.encryptedPrivateKey,
          kdfSalt: data.kdfSalt,
          kdfIterations: data.kdfIterations,
          iv: data.iv,
          keyAlgorithm: data.keyAlgorithm,
          createdAt: data.createdAt,
        };

        const fp = await computeKeyFingerprint(data.publicKey);

        setState({
          isLoading: false,
          hasBackupOnServer: true,
          isUnlockedOnDevice: isLocallyAvailable,
          publicKey: data.publicKey,
          fingerprint: fp,
          keyAlgorithm: data.keyAlgorithm || "ECDSA-P256",
          createdAt: data.createdAt,
          error: null,
        });
      } else {
        // No key exists yet on server
        serverBackupRef.current = null;
        setState({
          isLoading: false,
          hasBackupOnServer: false,
          isUnlockedOnDevice: isLocallyAvailable,
          publicKey: localRecord?.publicKeySpki || null,
          fingerprint: localRecord?.fingerprint || null,
          keyAlgorithm: "ECDSA-P256",
          createdAt: null,
          error: null,
        });
      }
    } catch (err: unknown) {
      console.error("Key status check error:", err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : "Error checking key status",
      }));
    }
  }, [userId]);

  useEffect(() => {
    checkKeyStatus();
  }, [checkKeyStatus]);

  /**
   * First-time key setup:
   * 1. Generates ECDSA P-256 key pair locally in browser.
   * 2. Encrypts private key using AES-GCM + PBKDF2 derived from user's account password.
   * 3. Stores only public key + encrypted backup in database.
   * 4. Stores unencrypted CryptoKey in origin-scoped IndexedDB on device.
   */
  const initializeKeySetup = async (password: string): Promise<boolean> => {
    if (!userId) {
      throw new Error("User must be logged in to initialize key pair");
    }
    if (!password || password.trim().length === 0) {
      throw new Error("Account password is required to encrypt private key backup");
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // 1. Generate ECDSA P-256 key pair
      const keyPair = await generateECDSAKeyPair();

      // 2. Encrypt private key client-side with password
      const encryptedBackup = await encryptPrivateKey(
        keyPair.privateKey,
        password,
        keyPair.publicKeySpki
      );

      // 3. Send encrypted backup + public key to backend
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(encryptedBackup),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to store key backup on server");
      }

      // 4. Save active CryptoKey into local device IndexedDB
      await saveLocalKeyPair(
        userId,
        keyPair.privateKey,
        keyPair.publicKey,
        keyPair.publicKeySpki,
        keyPair.fingerprint
      );

      activePrivateKeyRef.current = keyPair.privateKey;
      serverBackupRef.current = encryptedBackup;

      setState({
        isLoading: false,
        hasBackupOnServer: true,
        isUnlockedOnDevice: true,
        publicKey: keyPair.publicKeySpki,
        fingerprint: keyPair.fingerprint,
        keyAlgorithm: "ECDSA-P256",
        createdAt: new Date().toISOString(),
        error: null,
      });

      return true;
    } catch (err: unknown) {
      console.error("Key setup error:", err);
      const message = err instanceof Error ? err.message : "Key generation failed";
      setState((prev) => ({ ...prev, isLoading: false, error: message }));
      throw err;
    }
  };

  /**
   * Restores and decrypts the private key on a new device or cleared cache using the account password.
   */
  const restorePrivateKey = async (password: string): Promise<boolean> => {
    if (!userId) {
      throw new Error("User must be logged in to restore key pair");
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      let backup = serverBackupRef.current;
      if (!backup) {
        // Fetch backup from server if not cached
        const res = await fetch("/api/keys", { credentials: "same-origin" });
        const data = await res.json();
        if (!data.hasKey) {
          throw new Error("No key backup found on server to restore");
        }
        backup = data as EncryptedKeyBackup;
        serverBackupRef.current = backup;
      }

      // Decrypt private key with entered password
      const decryptedPrivateKey = await decryptPrivateKey(backup, password);

      // Import corresponding public key
      const importedPublicKey = await importPublicKeySpki(backup.publicKey);
      const fp = await computeKeyFingerprint(backup.publicKey);

      // Save to local device IndexedDB
      await saveLocalKeyPair(
        userId,
        decryptedPrivateKey,
        importedPublicKey,
        backup.publicKey,
        fp
      );

      activePrivateKeyRef.current = decryptedPrivateKey;

      setState((prev) => ({
        ...prev,
        isLoading: false,
        isUnlockedOnDevice: true,
        publicKey: backup?.publicKey || null,
        fingerprint: fp,
        error: null,
      }));

      return true;
    } catch (err: unknown) {
      console.error("Key restoration error:", err);
      const message = err instanceof Error ? err.message : "Key restoration failed";
      setState((prev) => ({ ...prev, isLoading: false, error: message }));
      throw err;
    }
  };

  /**
   * Returns the user's active private key for signing.
   * If in memory, returns immediately; otherwise attempts to load from IndexedDB.
   */
  const getActivePrivateKey = async (): Promise<CryptoKey | null> => {
    if (activePrivateKeyRef.current) {
      return activePrivateKeyRef.current;
    }
    if (userId) {
      const localRecord = await getLocalKeyPair(userId);
      if (localRecord?.privateKey) {
        activePrivateKeyRef.current = localRecord.privateKey;
        return localRecord.privateKey;
      }
    }
    return null;
  };

  return {
    ...state,
    initializeKeySetup,
    restorePrivateKey,
    getActivePrivateKey,
    refreshKeyStatus: checkKeyStatus,
  };
}
