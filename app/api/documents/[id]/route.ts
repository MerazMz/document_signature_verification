import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getDocumentDetails } from "@/lib/services/documentService";

export async function GET(
  _request: Request,
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
    const details = await getDocumentDetails(docId);
    if (!details) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json(details);
  } catch (error) {
    console.error("Error fetching document details:", error);
    return NextResponse.json(
      { error: "Failed to fetch document details" },
      { status: 500 }
    );
  }
}
