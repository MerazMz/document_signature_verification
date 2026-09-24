/**
 * Cryptographic Tamper-Evident Audit Trail
 * Implements a cryptographic hash chain:
 * H0 = GENESIS_HASH
 * H1 = SHA-256(H0 + canonical(Event1))
 * H2 = SHA-256(H1 + canonical(Event2))
 * ...
 */

import { bufferToHex } from "./keys";

export const GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000";

export type AuditEventType =
  | "DOCUMENT_UPLOADED"
  | "DOCUMENT_HASH_GENERATED"
  | "SIGNER_ADDED"
  | "DOCUMENT_SIGNED"
  | "SIGNATURE_VERIFIED"
  | "VERIFICATION_FAILED"
  | "DOCUMENT_REJECTED"
  | "DOCUMENT_COMPLETED";

export interface AuditEventPayload {
  sequenceNumber: number;
  documentId: number;
  actorId: number | null;
  eventType: AuditEventType;
  timestamp: string;
  eventData: Record<string, unknown>;
}

export interface StoredAuditEvent extends AuditEventPayload {
  id: number;
  previousHash: string;
  currentHash: string;
  createdAt: string;
}

/**
 * Deterministic JSON canonicalization to ensure identical cryptographic hashes.
 * Sorts object keys recursively.
 */
export function canonicalizeJson(obj: unknown): string {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return "[" + obj.map(canonicalizeJson).join(",") + "]";
  }
  const record = obj as Record<string, unknown>;
  const sortedKeys = Object.keys(record).sort();
  const entries = sortedKeys.map(
    (key) => `${JSON.stringify(key)}:${canonicalizeJson(record[key])}`
  );
  return "{" + entries.join(",") + "}";
}

/**
 * Computes the SHA-256 hash of a string using Web Crypto API (browser or Node.js).
 */
export async function sha256String(input: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(input);

  // Support both browser and Node.js global crypto
  const subtle: SubtleCrypto =
    (typeof globalThis !== "undefined" && globalThis.crypto?.subtle)
      ? globalThis.crypto.subtle
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      : (require("crypto").webcrypto as unknown as { subtle: SubtleCrypto }).subtle;

  const hashBuffer = await subtle.digest("SHA-256", data);
  return bufferToHex(hashBuffer);
}

/**
 * Calculates the tamper-evident hash for an audit event:
 * currentHash = SHA-256(previousHash + ":" + canonicalJson(eventPayload))
 */
export async function calculateAuditEventHash(
  previousHash: string,
  event: AuditEventPayload
): Promise<string> {
  const canonicalData = canonicalizeJson({
    sequenceNumber: event.sequenceNumber,
    documentId: event.documentId,
    actorId: event.actorId,
    eventType: event.eventType,
    timestamp: event.timestamp,
    eventData: event.eventData,
  });

  const hashInput = `${previousHash}:${canonicalData}`;
  return sha256String(hashInput);
}

export interface AuditVerificationResult {
  isValid: boolean;
  totalEvents: number;
  brokenAtSequence?: number;
  expectedHash?: string;
  actualHash?: string;
  reason?: string;
}

/**
 * Cryptographically verifies the integrity of an audit hash chain from Genesis to the latest event.
 */
export async function verifyAuditChain(
  events: StoredAuditEvent[]
): Promise<AuditVerificationResult> {
  if (!events || events.length === 0) {
    return {
      isValid: true,
      totalEvents: 0,
    };
  }

  // Sort events by sequence number
  const sorted = [...events].sort((a, b) => a.sequenceNumber - b.sequenceNumber);

  let expectedPreviousHash = GENESIS_HASH;

  for (let i = 0; i < sorted.length; i++) {
    const event = sorted[i];
    const expectedSeq = i + 1;

    // Check sequence numbering continuity
    if (event.sequenceNumber !== expectedSeq) {
      return {
        isValid: false,
        totalEvents: sorted.length,
        brokenAtSequence: event.sequenceNumber,
        reason: `Broken sequence order: expected ${expectedSeq} but found ${event.sequenceNumber}`,
      };
    }

    // Check previous hash matches
    if (event.previousHash !== expectedPreviousHash) {
      return {
        isValid: false,
        totalEvents: sorted.length,
        brokenAtSequence: event.sequenceNumber,
        expectedHash: expectedPreviousHash,
        actualHash: event.previousHash,
        reason: `Hash pointer mismatch at event #${event.sequenceNumber}. The audit trail was modified or reordered.`,
      };
    }

    // Recompute current event hash from canonical event payload
    const computedHash = await calculateAuditEventHash(event.previousHash, {
      sequenceNumber: event.sequenceNumber,
      documentId: event.documentId,
      actorId: event.actorId,
      eventType: event.eventType,
      timestamp: event.timestamp,
      eventData: event.eventData,
    });

    if (computedHash.toLowerCase() !== event.currentHash.toLowerCase()) {
      return {
        isValid: false,
        totalEvents: sorted.length,
        brokenAtSequence: event.sequenceNumber,
        expectedHash: computedHash,
        actualHash: event.currentHash,
        reason: `Cryptographic hash mismatch at event #${event.sequenceNumber}. Event data or timestamp was tampered with.`,
      };
    }

    expectedPreviousHash = event.currentHash;
  }

  return {
    isValid: true,
    totalEvents: sorted.length,
  };
}
