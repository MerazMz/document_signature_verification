"use client";

import React, { useState, useEffect, useCallback } from "react";
import { signDocumentHash } from "@/lib/crypto";
import { useKeyManagement } from "@/hooks/useKeyManagement";

interface DocumentItem {
  id: number;
  title: string;
  file_name: string;
  file_size: number;
  document_hash: string;
  status: "PENDING" | "COMPLETED" | "REJECTED";
  created_at: string;
  owner_name: string;
  owner_email: string;
  is_owner: boolean;
  user_signing_status?: "PENDING" | "SIGNED" | "REJECTED" | null;
}

interface SignerDetail {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  status: "PENDING" | "SIGNED" | "REJECTED";
  signed_at?: string;
  rejection_reason?: string;
}

interface DocumentListProps {
  currentUserId: number;
  theme: "dark" | "light";
  onSelectForVerification?: (documentId: number) => void;
  onOpenCreateModal: () => void;
}

export default function DocumentList({
  currentUserId,
  theme,
  onSelectForVerification,
  onOpenCreateModal,
}: DocumentListProps) {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedDocId, setExpandedDocId] = useState<number | null>(null);
  const [expandedSigners, setExpandedSigners] = useState<Record<number, SignerDetail[]>>({});
  const [signingDocId, setSigningDocId] = useState<number | null>(null);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const { isUnlockedOnDevice, getActivePrivateKey } = useKeyManagement(currentUserId);
  const isDark = theme === "dark";

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch("/api/documents");
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (err) {
      console.error("Error fetching documents:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDocuments();
  }, [fetchDocuments]);

  const fetchSignersForDoc = async (docId: number) => {
    if (expandedSigners[docId]) return;
    try {
      const res = await fetch(`/api/documents/${docId}`);
      if (res.ok) {
        const data = await res.json();
        setExpandedSigners((prev) => ({
          ...prev,
          [docId]: data.signers || [],
        }));
      }
    } catch (err) {
      console.error("Error fetching doc details:", err);
    }
  };

  const handleToggleExpand = (docId: number) => {
    if (expandedDocId === docId) {
      setExpandedDocId(null);
    } else {
      setExpandedDocId(docId);
      fetchSignersForDoc(docId);
    }
  };

  const handleSignDocument = async (doc: DocumentItem) => {
    setActionMessage(null);

    if (!isUnlockedOnDevice) {
      setActionMessage({
        type: "error",
        text: "Signing key is locked or not found on this device. Please unlock/restore your key in Key Management above.",
      });
      return;
    }

    setSigningDocId(doc.id);

    try {
      // 1. Get user's active private key from device
      const privateKey = await getActivePrivateKey();
      if (!privateKey) {
        throw new Error("Private key unavailable on device. Please restore your key.");
      }

      // 2. Fetch user's registered keyId
      const keyRes = await fetch("/api/keys");
      const keyData = await keyRes.json();
      if (!keyData.hasKey) {
        throw new Error("No registered key pair found on server");
      }

      // 3. Cryptographically sign the document's SHA-256 hash using ECDSA P-256
      const signatureBase64 = await signDocumentHash(privateKey, doc.document_hash);

      // 4. Send signature to backend for independent cryptographic verification
      const signRes = await fetch(`/api/documents/${doc.id}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signatureBase64,
          keyId: keyData.keyId || 1,
          documentHash: doc.document_hash,
        }),
      });

      const signData = await signRes.json();
      if (!signRes.ok) {
        throw new Error(signData.error || "Failed to submit signature");
      }

      setActionMessage({
        type: "success",
        text: signData.message || "Document signed successfully!",
      });

      // Refresh documents
      await fetchDocuments();
      if (expandedDocId === doc.id) {
        fetchSignersForDoc(doc.id);
      }
    } catch (err: unknown) {
      console.error("Signing failed:", err);
      setActionMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Document signing failed",
      });
    } finally {
      setSigningDocId(null);
    }
  };

  const handleRejectDocument = async (docId: number) => {
    const reason = window.prompt("Enter reason for rejecting this document (optional):");
    if (reason === null) return; // User cancelled prompt

    try {
      const res = await fetch(`/api/documents/${docId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to reject document");
      }

      setActionMessage({
        type: "success",
        text: "Document rejected",
      });
      await fetchDocuments();
    } catch (err: unknown) {
      setActionMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to reject document",
      });
    }
  };

  return (
    <div
      className={`rounded-2xl border p-6 sm:p-7 transition-all ${
        isDark
          ? "border-[#44444C] bg-[#0B0909] text-[#D6D6D6] shadow-xl"
          : "border-[#D6D6D6] bg-white text-[#0B0909] shadow-sm"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-[#44444C]/40 mb-6">
        <div>
          <h2
            className={`text-base sm:text-lg font-semibold tracking-tight ${
              isDark ? "text-[#D6D6D6]" : "text-[#0B0909]"
            }`}
          >
            Multi-Party Document Queue
          </h2>
          <p
            className={`text-xs mt-1 ${
              isDark ? "text-[#8C8C8C]" : "text-[#44444C]"
            }`}
          >
            Review, sign with your client ECDSA private key, and track multi-party signature workflows.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchDocuments}
            className={`px-3 py-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
              isDark
                ? "border-[#44444C] text-[#8C8C8C] hover:text-[#D6D6D6]"
                : "border-gray-300 text-gray-600 hover:text-black"
            }`}
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={onOpenCreateModal}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              isDark
                ? "bg-[#D6D6D6] text-[#0B0909] hover:bg-white"
                : "bg-[#0B0909] text-white hover:bg-black"
            }`}
          >
            + New Document
          </button>
        </div>
      </div>

      {actionMessage && (
        <div
          className={`p-3 rounded-lg border text-xs mb-5 flex items-center justify-between ${
            actionMessage.type === "success"
              ? "border-emerald-500/40 bg-emerald-950/20 text-emerald-300"
              : "border-red-500/40 bg-red-950/20 text-red-300"
          }`}
        >
          <span>{actionMessage.text}</span>
          <button
            onClick={() => setActionMessage(null)}
            className="text-xs hover:opacity-80 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="py-12 text-center text-xs text-[#8C8C8C]">
          <div className="w-6 h-6 border-2 border-[#44444C] border-t-[#D6D6D6] rounded-full animate-spin mx-auto mb-2"></div>
          Loading document registry...
        </div>
      ) : documents.length === 0 ? (
        <div className="py-12 text-center text-xs text-[#8C8C8C]">
          <div className="w-12 h-12 rounded-xl bg-[#44444C]/20 border border-[#44444C]/30 flex items-center justify-center mx-auto mb-3 text-lg">
            📄
          </div>
          <p className="font-medium text-[#D6D6D6] mb-1">No documents in queue</p>
          <p className="mb-4">Upload a PDF to initiate your first multi-party signing workflow.</p>
          <button
            type="button"
            onClick={onOpenCreateModal}
            className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
              isDark ? "bg-[#44444C] text-[#D6D6D6] hover:bg-[#8C8C8C]" : "bg-black text-white"
            }`}
          >
            Upload Document
          </button>
        </div>
      ) : (
        <div className="space-y-3.5">
          {documents.map((doc) => {
            const isPendingMySign = doc.user_signing_status === "PENDING";
            const isExpanded = expandedDocId === doc.id;
            const signers = expandedSigners[doc.id] || [];

            return (
              <div
                key={doc.id}
                className={`rounded-xl border transition-all ${
                  isDark
                    ? "border-[#44444C]/60 bg-[#0B0909]/40 hover:border-[#8C8C8C]/80"
                    : "border-gray-200 bg-gray-50/50 hover:border-gray-400"
                }`}
              >
                {/* Header row */}
                <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm truncate">{doc.title}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                          doc.status === "COMPLETED"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : doc.status === "REJECTED"
                            ? "bg-red-500/20 text-red-400 border border-red-500/30"
                            : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        }`}
                      >
                        {doc.status}
                      </span>
                    </div>

                    <div className="text-xs text-[#8C8C8C] flex flex-wrap items-center gap-2.5">
                      <span>File: {doc.file_name}</span>
                      <span>&middot;</span>
                      <span>By: {doc.owner_name}</span>
                      <span>&middot;</span>
                      <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                    </div>

                    <div className="text-[11px] font-mono text-[#8C8C8C] mt-1 truncate">
                      SHA-256: {doc.document_hash}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {/* Sign Button */}
                    {isPendingMySign && (
                      <button
                        type="button"
                        onClick={() => handleSignDocument(doc)}
                        disabled={signingDocId === doc.id}
                        className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm disabled:opacity-50 ${
                          isDark
                            ? "bg-emerald-500 text-black hover:bg-emerald-400"
                            : "bg-emerald-600 text-white hover:bg-emerald-700"
                        }`}
                      >
                        {signingDocId === doc.id ? (
                          <>
                            <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                            <span>Signing...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                            <span>Sign Document</span>
                          </>
                        )}
                      </button>
                    )}

                    {isPendingMySign && (
                      <button
                        type="button"
                        onClick={() => handleRejectDocument(doc.id)}
                        className="px-3 py-1.5 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-950/20 text-xs transition-colors cursor-pointer"
                      >
                        Reject
                      </button>
                    )}

                    {/* View Signers / Details toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggleExpand(doc.id)}
                      className={`px-3 py-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                        isDark
                          ? "border-[#44444C] text-[#8C8C8C] hover:text-[#D6D6D6]"
                          : "border-gray-300 text-gray-700 hover:text-black"
                      }`}
                    >
                      {isExpanded ? "Hide Details" : "Signers & Audit"}
                    </button>

                    {/* Verify button */}
                    {onSelectForVerification && (
                      <button
                        type="button"
                        onClick={() => onSelectForVerification(doc.id)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                          isDark
                            ? "border-[#44444C] bg-[#44444C]/30 text-[#D6D6D6] hover:border-[#8C8C8C]"
                            : "border-gray-300 bg-white text-black hover:border-black"
                        }`}
                      >
                        Verify & Audit
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Drawer: Multi-Party Signers Status */}
                {isExpanded && (
                  <div className="p-4 sm:p-5 border-t border-[#44444C]/30 bg-black/20 text-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold uppercase tracking-wider text-[11px] text-[#8C8C8C]">
                        Multi-Party Signer Workflow
                      </span>
                      <span className="text-[11px] text-[#8C8C8C]">
                        All signers must sign to complete
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                      {signers.map((s) => (
                        <div
                          key={s.id}
                          className={`p-3 rounded-lg border flex flex-col justify-between ${
                            s.status === "SIGNED"
                              ? isDark
                                ? "border-emerald-500/30 bg-emerald-950/20"
                                : "border-emerald-200 bg-emerald-50"
                              : s.status === "REJECTED"
                              ? isDark
                                ? "border-red-500/30 bg-red-950/20"
                                : "border-red-200 bg-red-50"
                              : isDark
                              ? "border-[#44444C]/60 bg-[#0B0909]"
                              : "border-gray-200 bg-white"
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium truncate">{s.user_name}</span>
                              <span
                                className={`text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded ${
                                  s.status === "SIGNED"
                                    ? "text-emerald-400"
                                    : s.status === "REJECTED"
                                    ? "text-red-400"
                                    : "text-amber-400"
                                }`}
                              >
                                {s.status}
                              </span>
                            </div>
                            <div className="text-[11px] text-[#8C8C8C] truncate">
                              {s.user_email}
                            </div>
                          </div>

                          <div className="mt-2 pt-1.5 border-t border-current/10 text-[10px] text-[#8C8C8C]">
                            {s.signed_at
                              ? `Signed: ${new Date(s.signed_at).toLocaleTimeString()}`
                              : s.rejection_reason
                              ? `Reason: ${s.rejection_reason}`
                              : "Awaiting signature"}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
