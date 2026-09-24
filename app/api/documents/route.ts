import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import {
  createDocumentWithSigners,
  getUserDocuments,
} from "@/lib/services/documentService";

/**
 * GET /api/documents
 * List all documents where the authenticated user is owner or signer.
 */
export async function GET() {
  const authUser = await getAuthUser();
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const documents = await getUserDocuments(authUser.userId);
    return NextResponse.json({ documents });
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }
}

/**
 * POST /api/documents
 * Upload / register a document with multi-party signers and initialize audit chain.
 */
export async function POST(request: Request) {
  const authUser = await getAuthUser();
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, fileName, fileSize, fileData, documentHash, signerUserIds } = body;

    if (!title || !fileName || !documentHash) {
      return NextResponse.json(
        { error: "Title, fileName, and documentHash are required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(signerUserIds) || signerUserIds.length === 0) {
      return NextResponse.json(
        { error: "At least one required signer must be specified" },
        { status: 400 }
      );
    }

    const document = await createDocumentWithSigners({
      ownerId: authUser.userId,
      title,
      fileName,
      fileSize: fileSize || 0,
      fileData,
      documentHash,
      signerUserIds,
    });

    return NextResponse.json({
      success: true,
      message: "Document created and registered for multi-party signing",
      document,
    });
  } catch (error: unknown) {
    console.error("Error creating document:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create document" },
      { status: 500 }
    );
  }
}
