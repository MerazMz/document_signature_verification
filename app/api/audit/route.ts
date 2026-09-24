import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { pool } from "@/lib/db";
import { verifyAuditChain, StoredAuditEvent } from "@/lib/crypto";

export async function GET(request: Request) {
  const authUser = await getAuthUser();
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const documentIdParam = searchParams.get("documentId");

  try {
    let query = `
      SELECT a.id, a.document_id as "documentId", a.actor_id as "actorId",
             a.event_type as "eventType", a.event_data as "eventData",
             a.previous_hash as "previousHash", a.current_hash as "currentHash",
             a.sequence_number as "sequenceNumber", a.created_at as "createdAt",
             u.name as actor_name, u.email as actor_email,
             d.title as document_title, d.file_name as document_file_name
      FROM audit_events a
      LEFT JOIN users u ON a.actor_id = u.id
      LEFT JOIN documents d ON a.document_id = d.id
    `;
    const params: (number | string)[] = [];

    if (documentIdParam) {
      const docId = parseInt(documentIdParam, 10);
      if (!isNaN(docId)) {
        query += ` WHERE a.document_id = $1 ORDER BY a.sequence_number ASC`;
        params.push(docId);
      } else {
        query += ` ORDER BY a.created_at DESC LIMIT 100`;
      }
    } else {
      query += ` ORDER BY a.created_at DESC LIMIT 100`;
    }

    const res = await pool.query(query, params);

    // Format events
    const events: (StoredAuditEvent & {
      actor_name?: string;
      actor_email?: string;
      document_title?: string;
      document_file_name?: string;
    })[] = res.rows.map((row) => ({
      id: row.id,
      sequenceNumber: row.sequenceNumber,
      documentId: row.documentId,
      actorId: row.actorId,
      eventType: row.eventType,
      timestamp: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
      eventData: typeof row.eventData === "string" ? JSON.parse(row.eventData) : row.eventData || {},
      previousHash: row.previousHash,
      currentHash: row.currentHash,
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
      actor_name: row.actor_name,
      actor_email: row.actor_email,
      document_title: row.document_title,
      document_file_name: row.document_file_name,
    }));

    // If a specific document was queried, verify its cryptographic hash chain
    let chainVerification = null;
    if (documentIdParam && events.length > 0) {
      chainVerification = await verifyAuditChain(events);
    }

    return NextResponse.json({
      events,
      chainVerification,
    });
  } catch (error) {
    console.error("Error fetching audit events:", error);
    return NextResponse.json({ error: "Failed to fetch audit trail" }, { status: 500 });
  }
}
