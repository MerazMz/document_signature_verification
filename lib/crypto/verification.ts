/**
 * Interoperable ECDSA P-256 Verification and Hashing Module
 * Runs in both browser and Node.js server environments.
 */

import { base64ToArrayBuffer, hexToArrayBuffer, bufferToHex } from "./keys";

function getSubtleCrypto(): SubtleCrypto {
  if (typeof globalThis !== "undefined" && globalThis.crypto?.subtle) {
    return globalThis.crypto.subtle;
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodeCrypto = require("crypto");
  return (nodeCrypto.webcrypto as unknown as { subtle: SubtleCrypto }).subtle;
}

/**
 * Computes the SHA-256 hash of raw document bytes (Buffer or ArrayBuffer).
 * Returns lowercase 64-character hex string.
 */
export async function computeDocumentHash(
  buffer: ArrayBuffer | Uint8Array
): Promise<string> {
  const subtle = await getSubtleCrypto();
  const hashBuffer = await subtle.digest("SHA-256", buffer as BufferSource);
  return bufferToHex(hashBuffer);
}

/**
 * Cryptographically verifies an ECDSA P-256 signature against a document's SHA-256 hash.
 * @param publicKeySpkiBase64 The signer's SPKI Base64 public key
 * @param signatureBase64 The Base64 encoded ECDSA signature
 * @param documentHashHex The 64-character SHA-256 hex digest of the document
 */
export async function verifyDocumentSignature(
  publicKeySpkiBase64: string,
  signatureBase64: string,
  documentHashHex: string
): Promise<boolean> {
  try {
    const subtle = await getSubtleCrypto();
    const spkiBuffer = base64ToArrayBuffer(publicKeySpkiBase64);
    const signatureBuffer = base64ToArrayBuffer(signatureBase64);
    const hashBytes = hexToArrayBuffer(documentHashHex);

    // Import public key into Web Crypto
    const publicKey = await subtle.importKey(
      "spki",
      spkiBuffer,
      {
        name: "ECDSA",
        namedCurve: "P-256",
      },
      false,
      ["verify"]
    );

    // Cryptographically verify signature over the raw 32-byte digest
    return await subtle.verify(
      {
        name: "ECDSA",
        hash: { name: "SHA-256" },
      },
      publicKey,
      signatureBuffer,
      hashBytes
    );
  } catch (err) {
    console.error("Signature verification error:", err);
    return false;
  }
}
