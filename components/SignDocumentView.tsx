"use client";

import React, { useState } from "react";
import { DocumentItem } from "./DashboardOverview";
import { signDocumentHash } from "@/lib/crypto";
import { useKeyManagement } from "@/hooks/useKeyManagement";
import WorkflowStepper, { WorkflowStep } from "./WorkflowStepper";

interface SignDocumentViewProps {
  documents: DocumentItem[];
  currentUserId: number;
  theme: "dark" | "light";
  onSignComplete: (docId: number) => void;
  onNavigateToSettings: () => void;
}

const SIGN_WORKFLOW_STEPS: WorkflowStep[] = [
  { id: "key", label: "Access Private Key", sublabel: "Web Crypto client key" },
  { id: "sign", label: "Generating Signature", sublabel: "ECDSA P-256 + SHA-256" },
  { id: "verify", label: "Server Verification", sublabel: "Public key validation" },
  { id: "audit", label: "Audit Log Append", sublabel: "Genesis hash chain" },
  { id: "complete", label: "Signature Recorded", sublabel: "Legally binding record" },
];

export default function SignDocumentView({
  documents,
  currentUserId,
  theme,
  onSignComplete,
  onNavigateToSettings,
}: SignDocumentViewProps) {
  const isDark = theme === "dark";
  const {
    isUnlockedOnDevice,
    hasBackupOnServer,
    getActivePrivateKey,
    initializeKeySetup,
    restorePrivateKey,
  } = useKeyManagement(currentUserId);

  // Documents waiting for the current user's signature
  const pendingDocs = documents.filter((d) => d.user_signing_status === "PENDING");
  const [selectedDocId, setSelectedDocId] = useState<number | null>(
    pendingDocs.length > 0 ? pendingDocs[0].id : null
  );

  const [isSigning, setIsSigning] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [copiedHash, setCopiedHash] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Signing Workflow Checkpoint State
  const [signWorkflowState, setSignWorkflowState] = useState<{
    active: boolean;
    currentStep: number;
    isComplete: boolean;
    isError: boolean;
    errorMessage?: string;
  }>({
    active: false,
    currentStep: 0,
    isComplete: false,
    isError: false,
  });

  // Inline Key Activation State
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [keyPassword, setKeyPassword] = useState("");
  const [isKeyLoading, setIsKeyLoading] = useState(false);
  const [keyModalError, setKeyModalError] = useState<string | null>(null);

  const selectedDoc = documents.find((d) => d.id === selectedDocId) || pendingDocs[0] || null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const handleSetupOrUnlockKey = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!keyPassword.trim()) {
      setKeyModalError("Please enter your account password");
      return;
    }

    setKeyModalError(null);
    setIsKeyLoading(true);

    try {
      if (hasBackupOnServer) {
        await restorePrivateKey(keyPassword);
      } else {
        await initializeKeySetup(keyPassword);
      }

      setShowKeyModal(false);
      setKeyPassword("");
      setFeedback({
        type: "success",
        text: "ECDSA key pair successfully activated on this device! You can now sign.",
      });
    } catch (err: unknown) {
      console.error("Key activation error:", err);
      setKeyModalError(
        err instanceof Error ? err.message : "Failed to activate cryptographic key"
      );
    } finally {
      setIsKeyLoading(false);
    }
  };

  const handleSign = async () => {
    if (!selectedDoc) return;
    setFeedback(null);

    // 1. If key is not ready, prompt user with modal
    if (!isUnlockedOnDevice) {
      setShowKeyModal(true);
      return;
    }

    setIsSigning(true);
    setSignWorkflowState({
      active: true,
      currentStep: 0,
      isComplete: false,
      isError: false,
    });

    try {
      // Step 0: Access Private Key via Web Crypto API
      await new Promise((r) => setTimeout(r, 220));
      const privateKey = await getActivePrivateKey();
      if (!privateKey) {
        setShowKeyModal(true);
        throw new Error("ECDSA private key not accessible. Please enter password to unlock.");
      }

      // Fetch key ID from backend
      const keyRes = await fetch("/api/keys");
      const keyData = await keyRes.json();
      if (!keyRes.ok || !keyData.key) {
        setShowKeyModal(true);
        throw new Error("User public key not found on backend. Please enter your password to generate it.");
      }
      const keyId = keyData.key.id;

      // Step 1: Client-side ECDSA P-256 signature calculation
      setSignWorkflowState((prev) => ({ ...prev, currentStep: 1 }));
      await new Promise((r) => setTimeout(r, 260));
      const signatureBase64 = await signDocumentHash(privateKey, selectedDoc.document_hash);

      // Step 2: Send signature to backend for cryptographic verification
      setSignWorkflowState((prev) => ({ ...prev, currentStep: 2 }));
      const res = await fetch(`/api/documents/${selectedDoc.id}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentHash: selectedDoc.document_hash,
          signature: signatureBase64,
          keyId,
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Cryptographic signature rejected by server");
      }

      // Step 3: Append signature to tamper-evident audit chain
      setSignWorkflowState((prev) => ({ ...prev, currentStep: 3 }));
      await new Promise((r) => setTimeout(r, 220));

      // Step 4: Signature Recorded & Complete!
      setSignWorkflowState((prev) => ({ ...prev, currentStep: 4, isComplete: true }));
      await new Promise((r) => setTimeout(r, 260));

      setFeedback({
        type: "success",
        text: "Document signed successfully with ECDSA P-256! Signature cryptographically verified and recorded.",
      });

      onSignComplete(selectedDoc.id);
    } catch (err: unknown) {
      console.error("Signing failed:", err);
      const msg = err instanceof Error ? err.message : "Failed to sign document";
      setFeedback({
        type: "error",
        text: msg,
      });
      setSignWorkflowState((prev) => ({
        ...prev,
        isError: true,
        errorMessage: msg,
      }));
    } finally {
      setIsSigning(false);
    }
  };

  const handleReject = async () => {
    if (!selectedDoc) return;
    setIsRejecting(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/documents/${selectedDoc.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason.trim() || "Rejected by signer" }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to reject document");
      }

      setShowRejectModal(false);
      setFeedback({
        type: "success",
        text: "Document rejected and audit event recorded.",
      });

      onSignComplete(selectedDoc.id);
    } catch (err: unknown) {
      console.error("Rejection failed:", err);
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to reject document",
      });
    } finally {
      setIsRejecting(false);
    }
  };

  if (pendingDocs.length === 0 && !feedback) {
    return (
      <div
        className={`p-12 sm:p-16 rounded-2xl border text-center transition-all ${
          isDark
            ? "bg-[#0B0909] border-[#44444C]/70 shadow-xl"
            : "bg-white border-[#D6D6D6] shadow-sm"
        }`}
      >
        <div
          className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 ${
            isDark ? "bg-[#44444C]/30 text-[#8C8C8C]" : "bg-gray-100 text-gray-500"
          }`}
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold tracking-tight">All Caught Up!</h3>
        <p className="text-xs text-[#8C8C8C] mt-1 max-w-sm mx-auto">
          You have no documents currently pending your signature. You will be notified when a new signing request is initiated.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Signing Workflow Checkpoint Pipeline */}
      {signWorkflowState.active && (
        <WorkflowStepper
          steps={SIGN_WORKFLOW_STEPS}
          currentStepIndex={signWorkflowState.currentStep}
          isComplete={signWorkflowState.isComplete}
          isError={signWorkflowState.isError}
          errorMessage={signWorkflowState.errorMessage}
          theme={theme}
          title="ECDSA Cryptographic Signing Pipeline"
          subtitle="Signing document hash client-side with ECDSA P-256 and recording to tamper-evident audit trail"
        />
      )}

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between ${
            feedback.type === "success"
              ? "border-emerald-500/40 bg-emerald-950/20 text-emerald-300"
              : "border-rose-500/40 bg-rose-950/20 text-rose-300"
          }`}
        >
          <span>{feedback.text}</span>
          <button
            onClick={() => setFeedback(null)}
            className="p-1 hover:text-white"
          >
            ×
          </button>
        </div>
      )}

      {/* If multiple pending docs, show selector tabs */}
      {pendingDocs.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {pendingDocs.map((doc) => {
            const isSelected = doc.id === selectedDoc?.id;
            return (
              <button
                key={doc.id}
                onClick={() => {
                  setSelectedDocId(doc.id);
                  setFeedback(null);
                  setSignWorkflowState({
                    active: false,
                    currentStep: 0,
                    isComplete: false,
                    isError: false,
                  });
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? isDark
                      ? "bg-[#D6D6D6] text-[#0B0909]"
                      : "bg-[#0B0909] text-white"
                    : isDark
                    ? "bg-[#44444C]/30 text-[#8C8C8C] hover:text-[#D6D6D6]"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {doc.title || doc.file_name}
              </button>
            );
          })}
        </div>
      )}

      {selectedDoc && (
        <div
          className={`p-6 sm:p-8 rounded-2xl border transition-all space-y-6 ${
            isDark
              ? "bg-[#0B0909] border-[#44444C]/70 shadow-xl"
              : "bg-white border-[#D6D6D6] shadow-sm"
          }`}
        >
          {/* Document Preview Header (matches mockup) */}
          <div className="flex items-center justify-between pb-6 border-b border-inherit">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 flex items-center justify-center font-bold text-sm shrink-0">
                PDF
              </div>
              <div>
                <p className="font-semibold text-base">{selectedDoc.title || selectedDoc.file_name}</p>
                <p className="text-xs text-[#8C8C8C] mt-0.5">
                  {selectedDoc.file_name} • {formatFileSize(selectedDoc.file_size)}
                </p>
              </div>
            </div>

            <button
              onClick={() => copyToClipboard(selectedDoc.document_hash)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                isDark
                  ? "border-[#44444C] text-[#D6D6D6] hover:bg-[#44444C]/30"
                  : "border-[#D6D6D6] text-[#0B0909] hover:bg-gray-100"
              }`}
            >
              Verify Hash
            </button>
          </div>

          {/* Document Hash (SHA-256) Box */}
          <div>
            <label className="block text-xs font-medium text-[#8C8C8C] mb-2 uppercase tracking-wider">
              Document Hash (SHA-256)
            </label>
            <div
              className={`p-3.5 rounded-xl border flex items-center justify-between font-mono text-xs sm:text-sm break-all ${
                isDark
                  ? "bg-[#0B0909] border-[#44444C]/60 text-[#D6D6D6]"
                  : "bg-gray-50 border-[#D6D6D6] text-[#0B0909]"
              }`}
            >
              <span className="select-all">{selectedDoc.document_hash}</span>
              <button
                type="button"
                onClick={() => copyToClipboard(selectedDoc.document_hash)}
                className="ml-3 p-1.5 rounded-lg text-[#8C8C8C] hover:text-inherit hover:bg-[#44444C]/30 shrink-0 cursor-pointer"
                title="Copy SHA-256 hash"
              >
                {copiedHash ? (
                  <span className="text-emerald-400 text-xs">Copied!</span>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Cryptographic Key Status Alert */}
          <div
            className={`p-4 rounded-xl border text-xs flex items-center justify-between ${
              isUnlockedOnDevice
                ? isDark
                  ? "border-emerald-500/30 bg-emerald-950/10 text-emerald-400"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
                : isDark
                ? "border-amber-500/30 bg-amber-950/10 text-amber-400"
                : "border-amber-200 bg-amber-50 text-amber-700"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>
                {isUnlockedOnDevice
                  ? "ECDSA P-256 signing key active and ready in your browser storage."
                  : hasBackupOnServer
                  ? "ECDSA key is locked on this device. Enter password to unlock."
                  : "Cryptographic signing key pair not yet initialized for this account."}
              </span>
            </div>

            {!isUnlockedOnDevice && (
              <div className="flex items-center gap-2 ml-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowKeyModal(true)}
                  className={`font-semibold underline cursor-pointer ${
                    isDark ? "text-amber-400 hover:text-amber-300" : "text-amber-700 hover:text-amber-800"
                  }`}
                >
                  {hasBackupOnServer ? "Unlock Key" : "Initialize Key (1-click)"}
                </button>
                <span className="text-[#8C8C8C] text-[11px]">•</span>
                <button
                  type="button"
                  onClick={onNavigateToSettings}
                  className="text-xs text-[#8C8C8C] hover:text-inherit underline cursor-pointer"
                >
                  Settings
                </button>
              </div>
            )}
          </div>

          {/* Primary Action Button: "Sign with My Key" or "Unlock & Sign" */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSign}
              disabled={isSigning}
              className={`flex-1 py-3.5 rounded-xl text-xs sm:text-sm font-semibold cursor-pointer transition-all flex items-center justify-center gap-2 ${
                isDark
                  ? "bg-[#D6D6D6] text-[#0B0909] hover:bg-white shadow-lg disabled:opacity-50"
                  : "bg-[#0B0909] text-white hover:bg-gray-800 disabled:opacity-50"
              }`}
            >
              {isSigning ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Computing ECDSA Signature with Web Crypto...</span>
                </>
              ) : isUnlockedOnDevice ? (
                <span>Sign with My Key</span>
              ) : (
                <span>{hasBackupOnServer ? "Unlock Key & Sign Document" : "Set Up Key & Sign Document"}</span>
              )}
            </button>

            <button
              onClick={() => setShowRejectModal(true)}
              className={`px-4 py-3.5 rounded-xl text-xs sm:text-sm font-semibold border transition-colors cursor-pointer ${
                isDark
                  ? "border-[#44444C] text-[#8C8C8C] hover:text-rose-400 hover:border-rose-500/50"
                  : "border-[#D6D6D6] text-gray-600 hover:text-rose-600 hover:border-rose-300"
              }`}
            >
              Reject
            </button>
          </div>
        </div>
      )}

      {/* Setup / Unlock Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div
            className={`w-full max-w-md p-6 sm:p-7 rounded-2xl border space-y-4 ${
              isDark ? "bg-[#0B0909] border-[#44444C] text-[#D6D6D6] shadow-2xl" : "bg-white border-[#D6D6D6] text-[#0B0909] shadow-xl"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isDark ? "bg-[#44444C]/40 text-[#D6D6D6]" : "bg-gray-100 text-gray-800"
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-base">
                  {hasBackupOnServer ? "Unlock Your Signing Key" : "Initialize ECDSA Key Pair"}
                </h3>
                <p className="text-xs text-[#8C8C8C] mt-0.5">
                  {hasBackupOnServer
                    ? "Enter your account password to decrypt your private key into IndexedDB."
                    : "Enter your account password to encrypt and back up your new ECDSA P-256 key pair."}
                </p>
              </div>
            </div>

            {keyModalError && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  isDark
                    ? "border-rose-500/40 bg-rose-950/20 text-rose-300"
                    : "border-rose-200 bg-rose-50 text-rose-700"
                }`}
              >
                <span>{keyModalError}</span>
              </div>
            )}

            <form onSubmit={handleSetupOrUnlockKey} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#8C8C8C] mb-1.5 uppercase tracking-wider">
                  Account Password
                </label>
                <input
                  type="password"
                  autoFocus
                  required
                  value={keyPassword}
                  onChange={(e) => setKeyPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-all focus:outline-none ${
                    isDark
                      ? "bg-[#0B0909] border-[#44444C] text-[#D6D6D6] focus:border-[#8C8C8C]"
                      : "bg-white border-[#D6D6D6] text-[#0B0909] focus:border-[#8C8C8C]"
                  }`}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowKeyModal(false);
                    setKeyPassword("");
                    setKeyModalError(null);
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs border border-inherit text-[#8C8C8C] hover:text-inherit cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isKeyLoading}
                  className={`px-5 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-2 ${
                    isDark
                      ? "bg-[#D6D6D6] text-[#0B0909] hover:bg-white disabled:opacity-50"
                      : "bg-[#0B0909] text-white hover:bg-gray-800 disabled:opacity-50"
                  }`}
                >
                  {isKeyLoading ? (
                    <>
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <span>{hasBackupOnServer ? "Unlock Key" : "Generate & Activate Key"}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div
            className={`w-full max-w-md p-6 rounded-2xl border space-y-4 ${
              isDark ? "bg-[#0B0909] border-[#44444C] text-[#D6D6D6]" : "bg-white border-[#D6D6D6] text-[#0B0909]"
            }`}
          >
            <h3 className="font-semibold text-base">Reject Document</h3>
            <p className="text-xs text-[#8C8C8C]">
              This will record a permanent DOCUMENT_REJECTED audit event in the cryptographic chain.
            </p>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection (optional)"
              className={`w-full p-3 rounded-xl border text-xs focus:outline-none ${
                isDark ? "bg-[#0B0909] border-[#44444C] text-[#D6D6D6]" : "bg-white border-[#D6D6D6] text-[#0B0909]"
              }`}
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 rounded-xl text-xs border border-inherit text-[#8C8C8C] hover:text-inherit"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={isRejecting}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 text-white hover:bg-rose-500"
              >
                {isRejecting ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
