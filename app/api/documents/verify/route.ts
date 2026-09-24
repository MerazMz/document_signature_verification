import { NextResponse } from "next/server";
import { verifyDocument } from "@/lib/services/verificationService";
import { base64ToArrayBuffer } from "@/lib/crypto";

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";

    let documentId: number | undefined;
    let documentHash: string | undefined;
    let fileBytes: ArrayBuffer | undefined;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const docIdStr = formData.get("documentId");
      if (docIdStr) {
        documentId = parseInt(docIdStr.toString(), 10);
      }

      const hashStr = formData.get("documentHash");
      if (hashStr) {
        documentHash = hashStr.toString().trim();
      }

      const file = formData.get("file") as File | null;
      if (file && typeof file.arrayBuffer === "function") {
        fileBytes = await file.arrayBuffer();
      }
    } else {
      const body = await request.json();
      if (body.documentId) {
        documentId = parseInt(body.documentId, 10);
      }
      if (body.documentHash) {
        documentHash = body.documentHash.trim();
      }
      if (body.fileBase64) {
        fileBytes = base64ToArrayBuffer(body.fileBase64);
      }
    }

    if (!documentId && !documentHash && !fileBytes) {
      return NextResponse.json(
        { error: "Must provide either documentId, documentHash, or PDF file" },
        { status: 400 }
      );
    }

    const report = await verifyDocument({
      documentId,
      documentHash,
      fileBytes,
    });

    return NextResponse.json({ report });
  } catch (error: unknown) {
    console.error("Verification endpoint error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Verification failed" },
      { status: 500 }
    );
  }
}
