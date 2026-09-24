import { PoolClient } from "pg";
import { pool } from "@/lib/db";
import {
  GENESIS_HASH,
  calculateAuditEventHash,
  AuditEventType,
  verifyDocumentSignature,
  computeKeyFingerprint,
} from "@/lib/crypto";

export interface CreateDocumentInput {
  ownerId: number;
  title: string;
  fileName: string;
  fileSize: number;
  fileData?: string; // Base64 of PDF bytes for storage and retrieval
  documentHash: string;
  signerUserIds: number[];
}

export interface SignDocumentInput {
  documentId: number;
  signerId: number;
  signatureBase64: string;
  keyId: number;
  documentHash: string;
}

export interface RejectDocumentInput {
  documentId: number;
  signerId: number;
  reason?: string;
}

/**
 * Appends a tamper-evident audit event to the document's cryptographic hash chain.
 */
export async function appendAuditEvent(
  client: PoolClient,
  documentId: number,
  actorId: number | null,
  eventType: AuditEventType,
  eventData: Record<string, unknown>
): Promise<string> {
  // Lock recent audit events for this document to ensure strict monotonic sequencing
  const latestEventRes = await client.query(
    `SELECT sequence_number, current_hash
     FROM audit_events
     WHERE document_id = $1
     ORDER BY sequence_number DESC
     LIMIT 1
     FOR UPDATE`,
    [documentId]
  );

  let sequenceNumber = 1;
  let previousHash = GENESIS_HASH;

  if (latestEventRes.rows.length > 0) {
    sequenceNumber = latestEventRes.rows[0].sequence_number + 1;
    previousHash = latestEventRes.rows[0].current_hash;
  }

  const timestamp = new Date().toISOString();

  const currentHash = await calculateAuditEventHash(previousHash, {
    sequenceNumber,
    documentId,
    actorId,
    eventType,
    timestamp,
    eventData,
  });

  await client.query(
    `INSERT INTO audit_events
     (document_id, actor_id, event_type, event_data, previous_hash, current_hash, sequence_number, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      documentId,
      actorId,
      eventType,
      JSON.stringify(eventData),
      previousHash,
      currentHash,
      sequenceNumber,
      timestamp,
    ]
  );

  return currentHash;
}

/**
 * Creates a new document with multi-party signers and initializes the audit trail.
 */
export async function createDocumentWithSigners(input: CreateDocumentInput) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Check if document with identical SHA-256 hash was already uploaded by this user
    const existingDoc = await client.query(
      `SELECT id, title, file_name, created_at, status
       FROM documents
       WHERE owner_id = $1 AND LOWER(document_hash) = LOWER($2)`,
      [input.ownerId, input.documentHash.trim().toLowerCase()]
    );

    if (existingDoc.rows.length > 0) {
      const doc = existingDoc.rows[0];
      const err = new Error(
        `Document already exists: A document with this identical SHA-256 hash has already been uploaded by your account ("${doc.title || doc.file_name}").`
      );
      (err as Error & { code?: string; existingDocument?: unknown }).code = "DOCUMENT_ALREADY_EXISTS";
      (err as Error & { code?: string; existingDocument?: unknown }).existingDocument = doc;
      throw err;
    }

    // 2. Insert document record
    const docRes = await client.query(
      `INSERT INTO documents
       (owner_id, title, file_name, file_size, file_data, document_hash, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'PENDING')
       RETURNING id, title, file_name, file_size, document_hash, status, created_at`,
      [
        input.ownerId,
        input.title,
        input.fileName,
        input.fileSize,
        input.fileData || null,
        input.documentHash.toLowerCase(),
      ]
    );

    const document = docRes.rows[0];
    const documentId = document.id;

    // 2. Initialize Audit Trail: Event 1 (DOCUMENT_UPLOADED)
    await appendAuditEvent(client, documentId, input.ownerId, "DOCUMENT_UPLOADED", {
      fileName: input.fileName,
      fileSize: input.fileSize,
      title: input.title,
    });

    // 3. Audit Trail: Event 2 (DOCUMENT_HASH_GENERATED)
    await appendAuditEvent(client, documentId, input.ownerId, "DOCUMENT_HASH_GENERATED", {
      documentHash: input.documentHash.toLowerCase(),
      algorithm: "SHA-256",
    });

    // 4. Ensure distinct signers
    const distinctSignerIds = Array.from(new Set(input.signerUserIds));
    if (distinctSignerIds.length === 0) {
      throw new Error("At least one required signer must be specified");
    }

    // 5. Insert document signers and log audit events
    for (const signerId of distinctSignerIds) {
      await client.query(
        `INSERT INTO document_signers (document_id, user_id, status)
         VALUES ($1, $2, 'PENDING')`,
        [documentId, signerId]
      );

      // Audit Trail: Event (SIGNER_ADDED)
      await appendAuditEvent(client, documentId, input.ownerId, "SIGNER_ADDED", {
        signerId,
      });
    }

    await client.query("COMMIT");
    return document;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Executes document signing with backend cryptographic verification.
 */
export async function signDocument(input: SignDocumentInput) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Fetch document and check status
    const docRes = await client.query(
      `SELECT id, document_hash, status
       FROM documents
       WHERE id = $1
       FOR UPDATE`,
      [input.documentId]
    );

    if (docRes.rows.length === 0) {
      throw new Error("Document not found");
    }

    const document = docRes.rows[0];
    if (document.status === "COMPLETED") {
      throw new Error("Document has already been fully signed and completed");
    }
    if (document.status === "REJECTED") {
      throw new Error("Document has been rejected and cannot be signed");
    }

    // 2. Verify that input documentHash matches the database's original documentHash
    if (document.document_hash.toLowerCase() !== input.documentHash.toLowerCase()) {
      throw new Error("Document hash mismatch! Integrity verification failed.");
    }

    // 3. Verify that signer is authorized and currently PENDING
    const signerRes = await client.query(
      `SELECT id, status
       FROM document_signers
       WHERE document_id = $1 AND user_id = $2
       FOR UPDATE`,
      [input.documentId, input.signerId]
    );

    if (signerRes.rows.length === 0) {
      throw new Error("User is not an authorized signer for this document");
    }

    if (signerRes.rows[0].status === "SIGNED") {
      throw new Error("User has already signed this document");
    }

    // 4. Retrieve signer's registered public key from user_keys
    const keyRes = await client.query(
      `SELECT id, public_key, key_algorithm
       FROM user_keys
       WHERE id = $1 AND user_id = $2`,
      [input.keyId, input.signerId]
    );

    if (keyRes.rows.length === 0) {
      throw new Error("Invalid or unverified key ID for this user");
    }

    const keyRecord = keyRes.rows[0];

    // 5. Cryptographically verify the ECDSA P-256 signature on the backend
    const isValidSignature = await verifyDocumentSignature(
      keyRecord.public_key,
      input.signatureBase64,
      document.document_hash
    );

    if (!isValidSignature) {
      // Record failed verification attempt in audit trail
      await appendAuditEvent(client, input.documentId, input.signerId, "VERIFICATION_FAILED", {
        reason: "Cryptographic ECDSA signature verification failed",
        keyId: input.keyId,
      });
      await client.query("COMMIT");
      throw new Error("ECDSA cryptographic signature verification failed. Signature is invalid.");
    }

    // 6. Insert signature record
    await client.query(
      `INSERT INTO signatures
       (document_id, signer_id, key_id, document_hash, signature, status)
       VALUES ($1, $2, $3, $4, $5, 'VALID')`,
      [
        input.documentId,
        input.signerId,
        input.keyId,
        document.document_hash,
        input.signatureBase64,
      ]
    );

    // 7. Update signer status
    await client.query(
      `UPDATE document_signers
       SET status = 'SIGNED', signed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE document_id = $1 AND user_id = $2`,
      [input.documentId, input.signerId]
    );

    const fp = await computeKeyFingerprint(keyRecord.public_key);

    // 8. Audit Trail: Event (DOCUMENT_SIGNED)
    await appendAuditEvent(client, input.documentId, input.signerId, "DOCUMENT_SIGNED", {
      signerId: input.signerId,
      keyId: input.keyId,
      keyFingerprint: fp,
    });

    // 9. Check if all required signers have completed signing
    const pendingSignersRes = await client.query(
      `SELECT COUNT(*) as pending_count
       FROM document_signers
       WHERE document_id = $1 AND status != 'SIGNED'`,
      [input.documentId]
    );

    const pendingCount = parseInt(pendingSignersRes.rows[0].pending_count, 10);
    let isCompleted = false;

    if (pendingCount === 0) {
      await client.query(
        `UPDATE documents
         SET status = 'COMPLETED', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [input.documentId]
      );

      // Audit Trail: Event (DOCUMENT_COMPLETED)
      await appendAuditEvent(client, input.documentId, null, "DOCUMENT_COMPLETED", {
        totalSignersCompleted: true,
      });

      isCompleted = true;
    }

    await client.query("COMMIT");
    return { success: true, isCompleted };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Rejects a document by an authorized signer.
 */
export async function rejectDocument(input: RejectDocumentInput) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const signerRes = await client.query(
      `SELECT id, status
       FROM document_signers
       WHERE document_id = $1 AND user_id = $2
       FOR UPDATE`,
      [input.documentId, input.signerId]
    );

    if (signerRes.rows.length === 0) {
      throw new Error("User is not an authorized signer for this document");
    }

    // Update signer
    await client.query(
      `UPDATE document_signers
       SET status = 'REJECTED', rejection_reason = $3, updated_at = CURRENT_TIMESTAMP
       WHERE document_id = $1 AND user_id = $2`,
      [input.documentId, input.signerId, input.reason || null]
    );

    // Update document status
    await client.query(
      `UPDATE documents
       SET status = 'REJECTED', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [input.documentId]
    );

    // Audit Trail: Event (DOCUMENT_REJECTED)
    await appendAuditEvent(client, input.documentId, input.signerId, "DOCUMENT_REJECTED", {
      reason: input.reason || "Signer rejected the document",
      signerId: input.signerId,
    });

    await client.query("COMMIT");
    return { success: true };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Retrieves full document details with signers, signatures, and audit trail.
 */
export async function getDocumentDetails(documentId: number) {
  const client = await pool.connect();
  try {
    // 1. Fetch document and owner
    const docRes = await client.query(
      `SELECT d.id, d.title, d.file_name, d.file_size, d.file_data, d.document_hash, d.status, d.created_at,
              u.id as owner_id, u.name as owner_name, u.email as owner_email
       FROM documents d
       JOIN users u ON d.owner_id = u.id
       WHERE d.id = $1`,
      [documentId]
    );

    if (docRes.rows.length === 0) {
      return null;
    }

    const doc = docRes.rows[0];

    // 2. Fetch required signers
    const signersRes = await client.query(
      `SELECT ds.id, ds.user_id, ds.status, ds.signed_at, ds.rejection_reason,
              u.name as user_name, u.email as user_email,
              uk.id as key_id, uk.public_key
       FROM document_signers ds
       JOIN users u ON ds.user_id = u.id
       LEFT JOIN user_keys uk ON ds.user_id = uk.user_id
       WHERE ds.document_id = $1
       ORDER BY ds.id ASC`,
      [documentId]
    );

    // 3. Fetch signatures
    const sigsRes = await client.query(
      `SELECT s.id, s.signer_id, s.key_id, s.document_hash, s.signature, s.status, s.created_at,
              u.name as signer_name, u.email as signer_email,
              uk.public_key
       FROM signatures s
       JOIN users u ON s.signer_id = u.id
       JOIN user_keys uk ON s.key_id = uk.id
       WHERE s.document_id = $1
       ORDER BY s.id ASC`,
      [documentId]
    );

    // 4. Fetch audit events
    const auditRes = await client.query(
      `SELECT a.id, a.document_id as "documentId", a.actor_id as "actorId",
              a.event_type as "eventType", a.event_data as "eventData",
              a.previous_hash as "previousHash", a.current_hash as "currentHash",
              a.sequence_number as "sequenceNumber", a.created_at as "createdAt",
              u.name as actor_name, u.email as actor_email
       FROM audit_events a
       LEFT JOIN users u ON a.actor_id = u.id
       WHERE a.document_id = $1
       ORDER BY a.sequence_number ASC`,
      [documentId]
    );

    return {
      document: {
        id: doc.id,
        title: doc.title,
        fileName: doc.file_name,
        fileSize: doc.file_size,
        fileData: doc.file_data,
        documentHash: doc.document_hash,
        status: doc.status,
        createdAt: doc.created_at,
        owner: {
          id: doc.owner_id,
          name: doc.owner_name,
          email: doc.owner_email,
        },
      },
      signers: signersRes.rows,
      signatures: sigsRes.rows,
      auditEvents: auditRes.rows.map((r) => ({
        ...r,
        timestamp: r.createdAt.toISOString(),
      })),
    };
  } finally {
    client.release();
  }
}

/**
 * Retrieves documents where the given user is owner or an authorized signer.
 */
export async function getUserDocuments(userId: number) {
  const client = await pool.connect();
  try {
    const res = await client.query(
      `SELECT DISTINCT d.id, d.title, d.file_name, d.file_size, d.document_hash, d.status, d.created_at,
              u.name as owner_name, u.email as owner_email,
              (d.owner_id = $1) as is_owner,
              ds.status as user_signing_status
       FROM documents d
       JOIN users u ON d.owner_id = u.id
       LEFT JOIN document_signers ds ON d.id = ds.document_id AND ds.user_id = $1
       WHERE d.owner_id = $1 OR ds.user_id = $1
       ORDER BY d.created_at DESC`,
      [userId]
    );

    return res.rows;
  } finally {
    client.release();
  }
}
