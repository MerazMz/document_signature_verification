/**
 * Browser-native IndexedDB storage for CryptoKey objects.
 * Scoped securely to the web application origin.
 */

const DB_NAME = "DocSign_CryptoStorage_v1";
const STORE_NAME = "user_signing_keys";
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB is not supported in this environment"));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "userId" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export interface StoredKeyRecord {
  userId: number;
  privateKey: CryptoKey;
  publicKey: CryptoKey;
  publicKeySpki: string;
  fingerprint: string;
  savedAt: number;
}

/**
 * Persists the user's active CryptoKeys in client-side IndexedDB.
 */
export async function saveLocalKeyPair(
  userId: number,
  privateKey: CryptoKey,
  publicKey: CryptoKey,
  publicKeySpki: string,
  fingerprint: string
): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    const record: StoredKeyRecord = {
      userId,
      privateKey,
      publicKey,
      publicKeySpki,
      fingerprint,
      savedAt: Date.now(),
    };

    const req = store.put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

/**
 * Retrieves the user's active CryptoKeys from client-side IndexedDB.
 */
export async function getLocalKeyPair(userId: number): Promise<StoredKeyRecord | null> {
  if (typeof window === "undefined" || !window.indexedDB) {
    return null;
  }

  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(userId);

      req.onsuccess = () => {
        resolve(req.result || null);
      };
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  } catch (err) {
    console.warn("Could not retrieve local key pair from IndexedDB:", err);
    return null;
  }
}

/**
 * Removes the user's key pair from local IndexedDB (e.g. on logout or device wipe).
 */
export async function clearLocalKeyPair(userId: number): Promise<void> {
  if (typeof window === "undefined" || !window.indexedDB) {
    return;
  }

  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(userId);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  } catch (err) {
    console.warn("Could not clear local key pair from IndexedDB:", err);
  }
}
