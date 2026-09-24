"use client";

import React, { useState, useRef } from "react";
import { VerificationReport } from "@/lib/services/verificationService";
import { arrayBufferToBase64 } from "@/lib/crypto";
import WorkflowStepper, { WorkflowStep } from "./WorkflowStepper";

interface VerifyDocumentViewProps {
  theme: "dark" | "light";
  initialDocumentId?: number;
}

const VERIFY_WORKFLOW_STEPS: WorkflowStep[] = [
  { id: "read", label: "Reading Document", sublabel: "Extracting binary buffer" },
  { id: "hash", label: "Generating SHA-256", sublabel: "Computing digest" },
  { id: "registry", label: "Registry Lookup", sublabel: "Locating document" },
  { id: "signatures", label: "ECDSA Verification", sublabel: "Checking public keys" },
  { id: "audit", label: "Audit Integrity", sublabel: "Genesis hash chain" },
];

export default function VerifyDocumentView({
  theme,
  initialDocumentId,
}: VerifyDocumentViewProps) {
  const isDark = theme === "dark";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<"file" | "id">("file");
  const [file, setFile] = useState<File | null>(null);
  const [docIdInput, setDocIdInput] = useState(initialDocumentId ? initialDocumentId.toString() : "");
  const [docHashInput, setDocHashInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [report, setReport] = useState<VerificationReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);

  // Workflow Checkpoint Stepper State
  const [verifyState, setVerifyState] = useState<{
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

  const handleVerify = async (selectedFile?: File) => {
    setError(null);
    setIsLoading(true);
    setReport(null);

    const targetFile = selectedFile || file;

    setVerifyState({
      active: true,
      currentStep: 0,
      isComplete: false,
      isError: false,
    });

    try {
      // Step 0: Reading Document
      await new Promise((r) => setTimeout(r, 200));
      let fileBase64: string | undefined;
      if (targetFile) {
        const buffer = await targetFile.arrayBuffer();
        fileBase64 = arrayBufferToBase64(buffer);
      }

      // Step 1: Generating SHA-256
      setVerifyState((prev) => ({ ...prev, currentStep: 1 }));
      await new Promise((r) => setTimeout(r, 240));

      // Step 2: Registry Lookup
      setVerifyState((prev) => ({ ...prev, currentStep: 2 }));
      const res = await fetch("/api/documents/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: docIdInput ? parseInt(docIdInput, 10) : undefined,
          documentHash: docHashInput ? docHashInput.trim() : undefined,
          fileBase64,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to verify document");
      }

      await new Promise((r) => setTimeout(r, 200));

      // Step 3: ECDSA Verification
      setVerifyState((prev) => ({ ...prev, currentStep: 3 }));
      await new Promise((r) => setTimeout(r, 240));

      // Step 4: Audit Integrity
      setVerifyState((prev) => ({ ...prev, currentStep: 4 }));
      await new Promise((r) => setTimeout(r, 200));

      // Step Complete
      setVerifyState((prev) => ({ ...prev, currentStep: 4, isComplete: true }));
      await new Promise((r) => setTimeout(r, 220));

      setReport(data.report);
    } catch (err: unknown) {
      console.error("Verification failed:", err);
      const msg = err instanceof Error ? err.message : "Verification failed";
      setError(msg);
      setVerifyState((prev) => ({
        ...prev,
        isError: true,
        errorMessage: msg,
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      handleVerify(selected);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selected = e.dataTransfer.files[0];
      setFile(selected);
      handleVerify(selected);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Workflow Checkpoint Animation Pipeline */}
      {verifyState.active && (
        <WorkflowStepper
          steps={VERIFY_WORKFLOW_STEPS}
          currentStepIndex={verifyState.currentStep}
          isComplete={verifyState.isComplete}
          isError={verifyState.isError}
          errorMessage={verifyState.errorMessage}
          theme={theme}
          title="Cryptographic Verification Pipeline"
          subtitle="Verifying document bytes, SHA-256 hash match, ECDSA P-256 signatures, and tamper-evident audit trail"
        />
      )}

      {/* Error display */}
      {error && !verifyState.active && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between ${
            isDark
              ? "border-rose-500/40 bg-rose-950/20 text-rose-300"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          <span>{error}</span>
          <button onClick={() => setError(null)} className="p-1 hover:text-white">
            ×
          </button>
        </div>
      )}

      {/* If Report is not yet generated and not loading, show Input Selector */}
      {!report ? (
        <div
          className={`p-6 sm:p-8 rounded-2xl border transition-all space-y-6 ${
            isDark
              ? "bg-[#0B0909] border-[#44444C]/70 shadow-xl"
              : "bg-white border-[#D6D6D6] shadow-sm"
          }`}
        >
          {/* Sub-tabs: Upload File | Enter Document ID */}
          <div className="flex gap-6 border-b border-inherit text-sm">
            <button
              onClick={() => setActiveTab("file")}
              className={`pb-3 font-medium transition-colors cursor-pointer border-b-2 -mb-[1px] ${
                activeTab === "file"
                  ? isDark
                    ? "border-[#D6D6D6] text-[#D6D6D6]"
                    : "border-[#0B0909] text-[#0B0909]"
                  : "border-transparent text-[#8C8C8C] hover:text-inherit"
              }`}
            >
              Upload File
            </button>
            <button
              onClick={() => setActiveTab("id")}
              className={`pb-3 font-medium transition-colors cursor-pointer border-b-2 -mb-[1px] ${
                activeTab === "id"
                  ? isDark
                    ? "border-[#D6D6D6] text-[#D6D6D6]"
                    : "border-[#0B0909] text-[#0B0909]"
                  : "border-transparent text-[#8C8C8C] hover:text-inherit"
              }`}
            >
              Enter Document ID / Hash
            </button>
          </div>

          {activeTab === "file" ? (
            /* Drag & drop zone */
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-12 sm:p-16 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                isDragging
                  ? "border-[#D6D6D6] bg-[#44444C]/30 scale-[1.01]"
                  : isDark
                  ? "border-[#44444C] bg-[#0B0909] hover:border-[#8C8C8C] hover:bg-[#44444C]/10"
                  : "border-[#D6D6D6] bg-white hover:border-[#8C8C8C] hover:bg-gray-50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />

              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${
                  isDark ? "bg-[#44444C]/30 text-[#D6D6D6]" : "bg-gray-100 text-gray-700"
                }`}
              >
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>

              <h3 className="text-base sm:text-lg font-semibold tracking-tight">
                {isLoading ? "Verifying..." : "Drag & drop a PDF here"}
              </h3>
              <p className="text-xs text-[#8C8C8C] mt-1">or click to browse from your device</p>

              <button
                type="button"
                className={`mt-5 px-5 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                  isDark
                    ? "bg-[#D6D6D6] text-[#0B0909] hover:bg-white shadow-md"
                    : "bg-[#0B0909] text-white hover:bg-gray-800"
                }`}
              >
                {isLoading ? "Processing Cryptographic Hashes..." : "Select PDF"}
              </button>

              <p className="text-[11px] text-[#8C8C8C] mt-6">
                We&apos;ll check the document hash, signatures, and audit trail.
              </p>
            </div>
          ) : (
            /* Enter Document ID / Hash */
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#8C8C8C] mb-1.5 uppercase tracking-wider">
                  Document ID
                </label>
                <input
                  type="number"
                  value={docIdInput}
                  onChange={(e) => setDocIdInput(e.target.value)}
                  placeholder="e.g. 1"
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-all focus:outline-none ${
                    isDark
                      ? "bg-[#0B0909] border-[#44444C] text-[#D6D6D6] focus:border-[#8C8C8C]"
                      : "bg-white border-[#D6D6D6] text-[#0B0909] focus:border-[#8C8C8C]"
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8C8C8C] mb-1.5 uppercase tracking-wider">
                  Or Document SHA-256 Hash
                </label>
                <input
                  type="text"
                  value={docHashInput}
                  onChange={(e) => setDocHashInput(e.target.value)}
                  placeholder="64-character hex hash"
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm font-mono transition-all focus:outline-none ${
                    isDark
                      ? "bg-[#0B0909] border-[#44444C] text-[#D6D6D6] focus:border-[#8C8C8C]"
                      : "bg-white border-[#D6D6D6] text-[#0B0909] focus:border-[#8C8C8C]"
                  }`}
                />
              </div>

              <button
                type="button"
                onClick={() => handleVerify()}
                disabled={isLoading || (!docIdInput && !docHashInput)}
                className={`w-full py-3 rounded-xl text-xs sm:text-sm font-semibold cursor-pointer transition-all flex items-center justify-center gap-2 ${
                  isDark
                    ? "bg-[#D6D6D6] text-[#0B0909] hover:bg-white shadow-lg disabled:opacity-50"
                    : "bg-[#0B0909] text-white hover:bg-gray-800 disabled:opacity-50"
                }`}
              >
                {isLoading ? "Running Verification..." : "Run Cryptographic Verification"}
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Verification Result (Screen 8 in mockup) */
        <div
          className={`p-6 sm:p-8 rounded-2xl border transition-all space-y-6 ${
            isDark
              ? "bg-[#0B0909] border-[#44444C]/70 shadow-xl"
              : "bg-white border-[#D6D6D6] shadow-sm"
          }`}
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between pb-6 border-b border-inherit">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 flex items-center justify-center font-bold text-sm shrink-0">
                PDF
              </div>
              <div>
                <p className="font-semibold text-base">
                  {report.document?.fileName || "Uploaded Document.pdf"}
                </p>
                <p className="text-xs text-[#8C8C8C] mt-0.5">
                  {report.document?.title || "Document Verification Report"}
                </p>
              </div>
            </div>

            {/* Document is valid / modified badge */}
            <div>
              {report.isFullyVerified ? (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Document is valid</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>Verification Failed / Modified</span>
                </span>
              )}
            </div>
          </div>

          {/* Document Hash Box */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-[#8C8C8C] uppercase tracking-wider">
                Document Hash (SHA-256)
              </label>
              <span
                className={`text-[11px] font-medium ${
                  report.integrity.hashMatches ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {report.integrity.hashMatches ? "Hash Verified Match" : "Hash Mismatch / Tampered"}
              </span>
            </div>
            <div
              className={`p-3.5 rounded-xl border flex items-center justify-between font-mono text-xs sm:text-sm break-all ${
                isDark
                  ? "bg-[#0B0909] border-[#44444C]/60 text-[#D6D6D6]"
                  : "bg-gray-50 border-[#D6D6D6] text-[#0B0909]"
              }`}
            >
              <span className="select-all">{report.integrity.recordedHash}</span>
              <button
                type="button"
                onClick={() => copyToClipboard(report.integrity.recordedHash)}
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

          {/* Signatures List (X/X valid) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold">
                Signatures ({report.signatures.validCount}/{report.signatures.totalRequired} valid)
              </h4>
            </div>

            <div className="divide-y divide-inherit border rounded-xl overflow-hidden">
              {report.signatures.signers.map((sig) => (
                <div
                  key={sig.userId}
                  className="p-3.5 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                        sig.status === "VALID"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                      }`}
                    >
                      {sig.userName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-semibold">{sig.userName}</p>
                      <p className="text-[11px] text-[#8C8C8C]">
                        {sig.signedAt ? `Signed on ${formatDate(sig.signedAt)}` : "Pending Signature"}
                      </p>
                    </div>
                  </div>

                  <div>
                    {sig.status === "VALID" ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Valid
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        {sig.status === "REJECTED" ? "Rejected" : "Missing / Invalid"}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Audit Trail Verified Pill Banner */}
          <div
            className={`p-4 rounded-xl border flex items-center justify-between ${
              report.auditTrail.isValid
                ? "border-emerald-500/30 bg-emerald-950/10 text-emerald-400"
                : "border-rose-500/30 bg-rose-950/10 text-rose-400"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold">
                  {report.auditTrail.isValid
                    ? "Cryptographic Audit Trail Verified"
                    : "Audit Trail Integrity Compromised"}
                </p>
                <p className="text-[11px] text-[#8C8C8C] mt-0.5">
                  {report.auditTrail.totalEvents} sequential events verified against genesis hash
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setReport(null);
                setFile(null);
                setError(null);
                setVerifyState({
                  active: false,
                  currentStep: 0,
                  isComplete: false,
                  isError: false,
                });
              }}
              className="text-xs underline text-[#8C8C8C] hover:text-inherit cursor-pointer"
            >
              Verify Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
