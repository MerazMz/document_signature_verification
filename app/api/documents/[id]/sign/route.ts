import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { signDocument } from "@/lib/services/documentService";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthUser();
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const docId = parseInt(id, 10);
  if (isNaN(docId)) {
    return NextResponse.json({ error: "Invalid document ID" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const signatureBase64 = body.signatureBase64 || body.signature;
    const { keyId, documentHash } = body;

    if (!signatureBase64 || !keyId || !documentHash) {
      return NextResponse.json(
        { error: "signatureBase64, keyId, and documentHash are required" },
        { status: 400 }
      );
    }

    const result = await signDocument({
      documentId: docId,
      signerId: authUser.userId,
      signatureBase64,
      keyId,
      documentHash,
    });

    return NextResponse.json({
      success: true,
      message: result.isCompleted
        ? "Document signed successfully and all required signers have completed signing!"
        : "Document signed successfully. Waiting for remaining signers.",
      isCompleted: result.isCompleted,
    });
  } catch (error: unknown) {
    console.error("Document signing error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to sign document" },
      { status: 400 }
    );
  }
}
