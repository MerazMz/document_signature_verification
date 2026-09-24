import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { rejectDocument } from "@/lib/services/documentService";

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
    const body = await request.json().catch(() => ({}));
    const { reason } = body;

    const result = await rejectDocument({
      documentId: docId,
      signerId: authUser.userId,
      reason,
    });

    return NextResponse.json({
      ...result,
      message: "Document marked as rejected",
    });
  } catch (error: unknown) {
    console.error("Document rejection error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to reject document" },
      { status: 400 }
    );
  }
}
