import { pool } from "@/lib/db";
import {
  computeDocumentHash,
  verifyDocumentSignature,
  computeKeyFingerprint,
  verifyAuditChain,
  StoredAuditEvent,
} from "@/lib/crypto";

export interface SignerVerificationDetail {
  userId: number;
  userName: string;
  userEmail: string;
  status: "VALID" | "INVALID" | "PENDING" | "REJECTED";
  keyId?: number;
  keyFingerprint?: string;
  signature?: string;
  signedAt?: string;
  rejectionReason?: string;
  error?: string;
}

export interface VerificationReport {
  documentFound: boolean;
  document?: {
    id: number;
    title: string;
    fileName: string;
    fileSize: number;
    recordedHash: string;
    computedHash: string;
    status: string;
    createdAt: string;
    owner: {
      id: number;
      name: string;
      email: string;
    };
  };
  integrity: {
    hashMatches: boolean;
    computedHash: string;
    recordedHash: string;
    status: "VERIFIED" | "TAMPERED" | "NO_DOCUMENT_FOUND";
    message: string;
  };
  signatures: {
    totalRequired: number;
    validCount: number;
    pendingCount: number;
    invalidCount: number;
    rejectedCount: number;
    allRequiredVerified: boolean;
    signers: SignerVerificationDetail[];
  };
  auditTrail: {
    isValid: boolean;
    totalEvents: number;
    brokenAtSequence?: number;
    reason?: string;
    events: StoredAuditEvent[];
  };
  isFullyVerified: boolean;
  summary: string;
}

export interface VerifyDocumentInput {
  documentId?: number;
  documentHash?: string;
  fileBytes?: ArrayBuffer | Uint8Array;
}

/**
 * Complete document verification pipeline:
 * 1. Computes raw PDF byte SHA-256 hash and compares with recorded hash.
 * 2. Cryptographically verifies all ECDSA signatures against each signer's registered public key.
 * 3. Cryptographically verifies the tamper-evident audit trail hash chain from Genesis.
 */
export async function verifyDocument(
  input: VerifyDocumentInput
): Promise<VerificationReport> {
  const client = await pool.connect();
  try {
    // 1. Calculate uploaded file bytes hash if bytes were supplied
    let computedHash = "";
    if (input.fileBytes) {
      computedHash = await computeDocumentHash(input.fileBytes);
    } else if (input.documentHash) {
      computedHash = input.documentHash.toLowerCase();
    }

    // 2. Locate document by ID or computed hash
    let docQuery = "";
    const params: unknown[] = [];

    if (input.documentId) {
      docQuery = `SELECT d.*, u.id as owner_id, u.name as owner_name, u.email as owner_email
                  FROM documents d
                  JOIN users u ON d.owner_id = u.id
                  WHERE d.id = $1`;
      params.push(input.documentId);
    } else if (computedHash) {
      docQuery = `SELECT d.*, u.id as owner_id, u.name as owner_name, u.email as owner_email
                  FROM documents d
                  JOIN users u ON d.owner_id = u.id
                  WHERE d.document_hash = $1
                  LIMIT 1`;
      params.push(computedHash);
    } else {
      throw new Error("Either documentId, documentHash, or fileBytes must be provided");
    }

    const docRes = await client.query(docQuery, params);

    if (docRes.rows.length === 0) {
      return {
        documentFound: false,
        integrity: {
          hashMatches: false,
          computedHash,
          recordedHash: "",
          status: "NO_DOCUMENT_FOUND",
          message: "No matching document record was found in the database.",
        },
        signatures: {
          totalRequired: 0,
          validCount: 0,
          pendingCount: 0,
          invalidCount: 0,
          rejectedCount: 0,
          allRequiredVerified: false,
          signers: [],
        },
        auditTrail: {
          isValid: false,
          totalEvents: 0,
          events: [],
        },
        isFullyVerified: false,
        summary: "Document not found in registry.",
      };
    }

    const doc = docRes.rows[0];
    const documentId = doc.id;
    const recordedHash = doc.document_hash.toLowerCase();

    // If computedHash was not supplied by raw bytes, assume recorded hash for hash-only checks
    if (!computedHash) {
      computedHash = recordedHash;
    }

    // Check integrity: Does the uploaded file byte hash match the originally registered document hash?
    const hashMatches = computedHash.toLowerCase() === recordedHash.toLowerCase();

    // 3. Fetch signers
    const signersRes = await client.query(
      `SELECT ds.user_id, ds.status, ds.signed_at, ds.rejection_reason,
              u.name as user_name, u.email as user_email
       FROM document_signers ds
       JOIN users u ON ds.user_id = u.id
       WHERE ds.document_id = $1
       ORDER BY ds.id ASC`,
      [documentId]
    );

    // 4. Fetch signatures with signer public keys
    const sigsRes = await client.query(
      `SELECT s.id, s.signer_id, s.key_id, s.document_hash, s.signature, s.status, s.created_at,
              uk.public_key, uk.key_algorithm
       FROM signatures s
       JOIN user_keys uk ON s.key_id = uk.id
       WHERE s.document_id = $1`,
      [documentId]
    );

    const sigMap = new Map<number, (typeof sigsRes.rows)[0]>();
    for (const sig of sigsRes.rows) {
      sigMap.set(sig.signer_id, sig);
    }

    // 5. Cryptographically verify each signer's signature
    const signerDetails: SignerVerificationDetail[] = [];
    let validCount = 0;
    let pendingCount = 0;
    let invalidCount = 0;
    let rejectedCount = 0;

    for (const signer of signersRes.rows) {
      const sigRecord = sigMap.get(signer.user_id);

      if (signer.status === "REJECTED") {
        rejectedCount++;
        signerDetails.push({
          userId: signer.user_id,
          userName: signer.user_name,
          userEmail: signer.user_email,
          status: "REJECTED",
          rejectionReason: signer.rejection_reason,
        });
        continue;
      }

      if (!sigRecord || signer.status === "PENDING") {
        pendingCount++;
        signerDetails.push({
          userId: signer.user_id,
          userName: signer.user_name,
          userEmail: signer.user_email,
          status: "PENDING",
        });
        continue;
      }

      // We have a signature record -> execute cryptographic verification
      const fp = await computeKeyFingerprint(sigRecord.public_key);

      // Verify signature over the recorded document hash
      const isSigValid = await verifyDocumentSignature(
        sigRecord.public_key,
        sigRecord.signature,
        recordedHash
      );

      if (isSigValid && hashMatches) {
        validCount++;
        signerDetails.push({
          userId: signer.user_id,
          userName: signer.user_name,
          userEmail: signer.user_email,
          status: "VALID",
          keyId: sigRecord.key_id,
          keyFingerprint: fp,
          signature: sigRecord.signature,
          signedAt: sigRecord.created_at.toISOString(),
        });
      } else {
        invalidCount++;
        signerDetails.push({
          userId: signer.user_id,
          userName: signer.user_name,
          userEmail: signer.user_email,
          status: "INVALID",
          keyId: sigRecord.key_id,
          keyFingerprint: fp,
          signature: sigRecord.signature,
          signedAt: sigRecord.created_at.toISOString(),
          error: !hashMatches
            ? "Signature invalidated by modified document bytes"
            : "Cryptographic ECDSA signature verification failed",
        });
      }
    }

    const totalRequired = signersRes.rows.length;
    const allRequiredVerified =
      totalRequired > 0 && validCount === totalRequired && hashMatches;

    // 6. Verify Audit Trail Hash Chain
    const auditRes = await client.query(
      `SELECT id, document_id as "documentId", actor_id as "actorId",
              event_type as "eventType", event_data as "eventData",
              previous_hash as "previousHash", current_hash as "currentHash",
              sequence_number as "sequenceNumber", created_at as "createdAt"
       FROM audit_events
       WHERE document_id = $1
       ORDER BY sequence_number ASC`,
      [documentId]
    );

    const auditEvents: StoredAuditEvent[] = auditRes.rows.map((r) => ({
      ...r,
      timestamp: r.createdAt.toISOString(),
    }));

    const auditVerification = await verifyAuditChain(auditEvents);

    const isFullyVerified =
      hashMatches && allRequiredVerified && auditVerification.isValid;

    let summary = "";
    if (!hashMatches) {
      summary = "✗ Document modified or corrupted. The computed byte hash does not match the registered hash.";
    } else if (invalidCount > 0) {
      summary = "✗ One or more digital signatures failed cryptographic verification.";
    } else if (rejectedCount > 0) {
      summary = "✗ Document was rejected by an authorized signer.";
    } else if (pendingCount > 0) {
      summary = `⚠ Document is authentic, but waiting for ${pendingCount} pending signer(s).`;
    } else if (!auditVerification.isValid) {
      summary = "✗ Audit trail has been tampered with or corrupted.";
    } else if (isFullyVerified) {
      summary = "✓ Document integrity verified, all required ECDSA signatures are authentic, and audit trail is intact.";
    }

    return {
      documentFound: true,
      document: {
        id: doc.id,
        title: doc.title,
        fileName: doc.file_name,
        fileSize: doc.file_size,
        recordedHash,
        computedHash,
        status: doc.status,
        createdAt: doc.created_at.toISOString(),
        owner: {
          id: doc.owner_id,
          name: doc.owner_name,
          email: doc.owner_email,
        },
      },
      integrity: {
        hashMatches,
        computedHash,
        recordedHash,
        status: hashMatches ? "VERIFIED" : "TAMPERED",
        message: hashMatches
          ? "Document byte hash matches original registration perfectly."
          : "Computed byte hash differs from registered document hash. Document has been altered.",
      },
      signatures: {
        totalRequired,
        validCount,
        pendingCount,
        invalidCount,
        rejectedCount,
        allRequiredVerified,
        signers: signerDetails,
      },
      auditTrail: {
        isValid: auditVerification.isValid,
        totalEvents: auditVerification.totalEvents,
        brokenAtSequence: auditVerification.brokenAtSequence,
        reason: auditVerification.reason,
        events: auditEvents,
      },
      isFullyVerified,
      summary,
    };
  } finally {
    client.release();
  }
}
