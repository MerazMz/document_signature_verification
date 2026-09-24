"use client";

import React, { useState } from "react";
import { VerificationReport } from "@/lib/services/verificationService";
import { arrayBufferToBase64 } from "@/lib/crypto";

interface DocumentVerificationViewProps {
  theme: "dark" | "light";
  initialDocumentId?: number;
}

export default function DocumentVerificationView({
  theme,
  initialDocumentId,
}: DocumentVerificationViewProps) {
  const [file, setFile] = useState<File | null>(null);
  const [docHashInput, setDocHashInput] = useState("");
  const [docIdInput, setDocIdInput] = useState(initialDocumentId ? initialDocumentId.toString() : "");
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<VerificationReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showFullAudit, setShowFullAudit] = useState(false);

  const isDark = theme === "dark";

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      let fileBase64: string | undefined;
      if (file) {
        const buffer = await file.arrayBuffer();
        fileBase64 = arrayBufferToBase64(buffer);
      }

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

      setReport(data.report);
    } catch (err: unknown) {
      console.error("Verification failed:", err);
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
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
      <div className="flex items-center justify-between pb-5 border-b border-[#44444C]/40 mb-6">
        <div>
          <h2
            className={`text-base sm:text-lg font-semibold tracking-tight ${
              isDark ? "text-[#D6D6D6]" : "text-[#0B0909]"
            }`}
          >
            Cryptographic Document Verification
          </h2>
          <p
            className={`text-xs mt-1 ${
              isDark ? "text-[#8C8C8C]" : "text-[#44444C]"
            }`}
          >
            Verify document integrity (SHA-256), multi-party digital signatures (ECDSA P-256), and audit chain authenticity.
          </p>
        </div>
        <span
          className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase tracking-wider ${
            isDark
              ? "border-[#44444C] bg-[#44444C]/30 text-[#8C8C8C]"
              : "border-gray-200 bg-gray-100 text-[#44444C]"
          }`}
        >
          FIPS 186-4 Verified
        </span>
      </div>

      {/* Verification Inputs */}
      <form onSubmit={handleVerify} className="space-y-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* File Picker */}
          <div className="md:col-span-1">
            <label
              className={`block text-xs font-medium mb-1 ${
                isDark ? "text-[#8C8C8C]" : "text-[#44444C]"
              }`}
            >
              Upload PDF to verify
            </label>
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={handleFileChange}
              className={`w-full text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium p-1.5 rounded-lg border ${
                isDark
                  ? "border-[#44444C] bg-[#0B0909] text-[#D6D6D6] file:bg-[#44444C] file:text-[#D6D6D6]"
                  : "border-[#D6D6D6] bg-gray-50 text-black file:bg-[#0B0909] file:text-white"
              }`}
            />
          </div>

          {/* Document ID */}
          <div>
            <label
              className={`block text-xs font-medium mb-1 ${
                isDark ? "text-[#8C8C8C]" : "text-[#44444C]"
              }`}
            >
              Document ID (Optional)
            </label>
            <input
              type="number"
              placeholder="e.g. 1"
              value={docIdInput}
              onChange={(e) => setDocIdInput(e.target.value)}
              className={`w-full px-3 py-2 text-xs font-mono rounded-lg border focus:outline-none ${
                isDark
                  ? "bg-[#0B0909] border-[#44444C] text-[#D6D6D6] focus:border-[#8C8C8C]"
                  : "bg-white border-gray-300 text-black focus:border-black"
              }`}
            />
          </div>

          {/* Document Hash */}
          <div>
            <label
              className={`block text-xs font-medium mb-1 ${
                isDark ? "text-[#8C8C8C]" : "text-[#44444C]"
              }`}
            >
              Document Hash (SHA-256)
            </label>
            <input
              type="text"
              placeholder="Paste 64-char hex hash..."
              value={docHashInput}
              onChange={(e) => setDocHashInput(e.target.value)}
              className={`w-full px-3 py-2 text-xs font-mono rounded-lg border focus:outline-none ${
                isDark
                  ? "bg-[#0B0909] border-[#44444C] text-[#D6D6D6] focus:border-[#8C8C8C]"
                  : "bg-white border-gray-300 text-black focus:border-black"
              }`}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={`px-5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2 ${
            isDark
              ? "bg-[#D6D6D6] text-[#0B0909] hover:bg-white"
              : "bg-[#0B0909] text-white hover:bg-black"
          }`}
        >
          {isLoading ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
              <span>Verifying Cryptographic Attestation...</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>Run Verification</span>
            </>
          )}
        </button>
      </form>

      {error && (
        <div
          className={`p-3 rounded-lg border text-xs mb-6 flex items-center gap-2 ${
            isDark
              ? "border-red-500/40 bg-red-950/20 text-red-300"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Verification Report Output */}
      {report && (
        <div className="space-y-6 pt-2 animate-fadeIn">
          {/* Top Banner Status */}
          <div
            className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              report.isFullyVerified
                ? "border-emerald-500/40 bg-emerald-950/20 text-emerald-300"
                : !report.integrity.hashMatches
                ? "border-red-500/40 bg-red-950/20 text-red-300"
                : "border-amber-500/40 bg-amber-950/20 text-amber-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                  report.isFullyVerified
                    ? "bg-emerald-500/30 text-emerald-300 border border-emerald-500/50"
                    : !report.integrity.hashMatches
                    ? "bg-red-500/30 text-red-300 border border-red-500/50"
                    : "bg-amber-500/30 text-amber-300 border border-amber-500/50"
                }`}
              >
                {report.isFullyVerified ? "✓" : "✗"}
              </div>
              <div>
                <h3 className="text-sm font-semibold">
                  {report.isFullyVerified
                    ? "Full Cryptographic Attestation Verified"
                    : "Verification Alert"}
                </h3>
                <p className="text-xs opacity-90 mt-0.5">{report.summary}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono shrink-0">
              <span className="px-2.5 py-1 rounded bg-black/40 border border-current/30">
                {report.isFullyVerified ? "ALL 3 CHECKS PASSED" : "CHECK REQUIRED"}
              </span>
            </div>
          </div>

          {/* 3 Pillars of Cryptographic Verification */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Pillar 1: Document Integrity */}
            <div
              className={`p-4 rounded-xl border flex flex-col justify-between ${
                isDark ? "border-[#44444C]/60 bg-[#0B0909]/60" : "border-gray-200 bg-gray-50/60"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[11px] font-semibold uppercase tracking-wider ${
                    isDark ? "text-[#8C8C8C]" : "text-[#44444C]"
                  }`}>
                    1. Document Byte Hash
                  </span>
                  {report.integrity.hashMatches ? (
                    <span className="text-emerald-400 text-xs font-semibold">✓ Verified</span>
                  ) : (
                    <span className="text-red-400 text-xs font-semibold">✗ Modified</span>
                  )}
                </div>
                <p className="text-xs text-[#8C8C8C] mb-3 leading-relaxed">
                  {report.integrity.message}
                </p>
              </div>

              {report.document && (
                <div className="text-[11px] font-mono space-y-1 text-[#8C8C8C] border-t border-[#44444C]/30 pt-2">
                  <div className="truncate">File: {report.document.fileName}</div>
                  <div className="truncate">Recorded: {report.document.recordedHash.slice(0, 16)}...</div>
                  {report.integrity.computedHash && (
                    <div className="truncate">Computed: {report.integrity.computedHash.slice(0, 16)}...</div>
                  )}
                </div>
              )}
            </div>

            {/* Pillar 2: Signatures Status */}
            <div
              className={`p-4 rounded-xl border flex flex-col justify-between ${
                isDark ? "border-[#44444C]/60 bg-[#0B0909]/60" : "border-gray-200 bg-gray-50/60"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[11px] font-semibold uppercase tracking-wider ${
                    isDark ? "text-[#8C8C8C]" : "text-[#44444C]"
                  }`}>
                    2. ECDSA Signatures
                  </span>
                  {report.signatures.allRequiredVerified ? (
                    <span className="text-emerald-400 text-xs font-semibold">✓ All Verified</span>
                  ) : report.signatures.invalidCount > 0 ? (
                    <span className="text-red-400 text-xs font-semibold">✗ Invalid Signature</span>
                  ) : (
                    <span className="text-amber-400 text-xs font-semibold">
                      {report.signatures.validCount}/{report.signatures.totalRequired} Signed
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#8C8C8C] mb-3 leading-relaxed">
                  {report.signatures.validCount} of {report.signatures.totalRequired} required signers have valid cryptographic signatures.
                </p>
              </div>

              <div className="text-[11px] font-mono space-y-1 text-[#8C8C8C] border-t border-[#44444C]/30 pt-2">
                <div>Valid: {report.signatures.validCount}</div>
                <div>Pending: {report.signatures.pendingCount}</div>
                <div>Rejected: {report.signatures.rejectedCount}</div>
              </div>
            </div>

            {/* Pillar 3: Audit Trail Integrity */}
            <div
              className={`p-4 rounded-xl border flex flex-col justify-between ${
                isDark ? "border-[#44444C]/60 bg-[#0B0909]/60" : "border-gray-200 bg-gray-50/60"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[11px] font-semibold uppercase tracking-wider ${
                    isDark ? "text-[#8C8C8C]" : "text-[#44444C]"
                  }`}>
                    3. Audit Hash Chain
                  </span>
                  {report.auditTrail.isValid ? (
                    <span className="text-emerald-400 text-xs font-semibold">✓ Chain Intact</span>
                  ) : (
                    <span className="text-red-400 text-xs font-semibold">✗ Tampered</span>
                  )}
                </div>
                <p className="text-xs text-[#8C8C8C] mb-3 leading-relaxed">
                  {report.auditTrail.isValid
                    ? `Cryptographic chain of ${report.auditTrail.totalEvents} events verified from Genesis.`
                    : report.auditTrail.reason || "Audit chain verification failed."}
                </p>
              </div>

              <div className="text-[11px] font-mono space-y-1 text-[#8C8C8C] border-t border-[#44444C]/30 pt-2 flex items-center justify-between">
                <span>Events: {report.auditTrail.totalEvents}</span>
                <button
                  type="button"
                  onClick={() => setShowFullAudit(!showFullAudit)}
                  className={`underline cursor-pointer ${
                    isDark ? "text-[#D6D6D6]" : "text-[#0B0909]"
                  }`}
                >
                  {showFullAudit ? "Hide Events" : "View Events"}
                </button>
              </div>
            </div>
          </div>

          {/* Signers Detail Table */}
          {report.signatures.signers.length > 0 && (
            <div className={`p-4 rounded-xl border ${
              isDark ? "border-[#44444C]/60 bg-[#0B0909]/40" : "border-gray-200 bg-white"
            }`}>
              <h4 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${
                isDark ? "text-[#8C8C8C]" : "text-[#44444C]"
              }`}>
                Multi-Party Signer Status
              </h4>

              <div className="space-y-2.5">
                {report.signatures.signers.map((signer, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
                      signer.status === "VALID"
                        ? isDark
                          ? "border-emerald-500/30 bg-emerald-950/10"
                          : "border-emerald-200 bg-emerald-50/50"
                        : signer.status === "REJECTED"
                        ? isDark
                          ? "border-red-500/30 bg-red-950/10"
                          : "border-red-200 bg-red-50/50"
                        : isDark
                        ? "border-[#44444C]/40 bg-[#0B0909]"
                        : "border-gray-200 bg-gray-50"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[#D6D6D6]">{signer.userName}</span>
                        <span className="text-[#8C8C8C]">({signer.userEmail})</span>
                      </div>
                      {signer.keyFingerprint && (
                        <div className="text-[11px] font-mono text-[#8C8C8C] mt-0.5 truncate">
                          Key ID: #{signer.keyId} &middot; FP: {signer.keyFingerprint.slice(0, 24)}...
                        </div>
                      )}
                      {signer.rejectionReason && (
                        <div className="text-[11px] text-red-400 mt-0.5">
                          Reason: {signer.rejectionReason}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {signer.signedAt && (
                        <span className="text-[11px] text-[#8C8C8C]">
                          {new Date(signer.signedAt).toLocaleString()}
                        </span>
                      )}
                      <span
                        className={`px-2.5 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider ${
                          signer.status === "VALID"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                            : signer.status === "REJECTED"
                            ? "bg-red-500/20 text-red-400 border border-red-500/40"
                            : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        }`}
                      >
                        {signer.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tamper-Evident Audit Trail Chain Drawer */}
          {showFullAudit && report.auditTrail.events.length > 0 && (
            <div className={`p-4 rounded-xl border ${
              isDark ? "border-[#44444C]/60 bg-[#0B0909]/40" : "border-gray-200 bg-white"
            }`}>
              <div className="flex items-center justify-between mb-3">
                <h4 className={`text-xs font-semibold uppercase tracking-wider ${
                  isDark ? "text-[#8C8C8C]" : "text-[#44444C]"
                }`}>
                  Tamper-Evident Audit Hash Chain ({report.auditTrail.totalEvents} Events)
                </h4>
                <span className="text-[11px] text-emerald-400 font-mono">
                  H(i) = SHA-256(H(i-1) + canonical(Event))
                </span>
              </div>

              <div className="space-y-2">
                {report.auditTrail.events.map((ev) => (
                  <div
                    key={ev.sequenceNumber}
                    className={`p-3 rounded-lg border font-mono text-[11px] ${
                      isDark ? "border-[#44444C]/40 bg-[#0B0909]" : "border-gray-200 bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[#D6D6D6] mb-1 font-sans">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#44444C]/40 flex items-center justify-center text-[10px] font-mono text-[#D6D6D6]">
                          {ev.sequenceNumber}
                        </span>
                        <span className="font-semibold text-xs">{ev.eventType}</span>
                      </div>
                      <span className="text-[#8C8C8C] text-[11px]">
                        {new Date(ev.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[#8C8C8C] mt-2">
                      <div className="truncate">
                        Prev Hash: <span className="text-[#D6D6D6]">{ev.previousHash.slice(0, 20)}...</span>
                      </div>
                      <div className="truncate">
                        Event Hash: <span className="text-emerald-400">{ev.currentHash.slice(0, 20)}...</span>
                      </div>
                    </div>

                    <div className="mt-1 text-[#8C8C8C] text-[10px] truncate">
                      Payload: {JSON.stringify(ev.eventData)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
