"use client";

import React, { useState, useEffect } from "react";
import { DocumentItem } from "./DashboardOverview";

interface SignerInfo {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  status: "PENDING" | "SIGNED" | "REJECTED";
  signed_at?: string;
  rejection_reason?: string;
  key_id?: number;
  public_key?: string;
}

interface AuditEventInfo {
  id: number;
  sequenceNumber: number;
  eventType: string;
  actor_name?: string;
  createdAt: string;
  previousHash: string;
  currentHash: string;
  eventData: Record<string, unknown>;
}

interface DocumentDetailViewProps {
  document: DocumentItem;
  currentUserId: number;
  theme: "dark" | "light";
  onBack: () => void;
  onSign: (doc: DocumentItem) => void;
  onVerify: (docId: number) => void;
}

export default function DocumentDetailView({
  document,
  currentUserId,
  theme,
  onBack,
  onSign,
  onVerify,
}: DocumentDetailViewProps) {
  const isDark = theme === "dark";
  const [activeSubTab, setActiveSubTab] = useState<"overview" | "signers" | "audit">("overview");
  const [signers, setSigners] = useState<SignerInfo[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEventInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedHash, setCopiedHash] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await fetch(`/api/documents/${document.id}`);
        if (res.ok) {
          const data = await res.json();
          setSigners(data.signers || []);
          setAuditEvents(data.auditEvents || []);
        }
      } catch (err) {
        console.error("Error fetching document details:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [document.id]);

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

  const signedCount = signers.filter((s) => s.status === "SIGNED").length;
  const isPendingForMe = document.user_signing_status === "PENDING";

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-[#8C8C8C]">
        <button
          onClick={onBack}
          className="flex items-center gap-1 hover:text-[#D6D6D6] transition-colors cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>My Documents</span>
        </button>
        <span>/</span>
        <span className={isDark ? "text-[#D6D6D6]" : "text-[#0B0909]"}>
          {document.file_name}
        </span>
      </div>

      {/* Main Document Card Header */}
      <div
        className={`p-6 sm:p-7 rounded-2xl border transition-all ${
          isDark
            ? "bg-[#0B0909] border-[#44444C]/70 shadow-xl"
            : "bg-white border-[#D6D6D6] shadow-sm"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 flex items-center justify-center font-bold text-sm shrink-0">
              PDF
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight">
                {document.title || document.file_name}
              </h2>
              <p className="text-xs text-[#8C8C8C] mt-1">
                Uploaded on {formatDate(document.created_at)} • {formatFileSize(document.file_size)}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onVerify(document.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                isDark
                  ? "border-[#44444C] text-[#D6D6D6] hover:bg-[#44444C]/30"
                  : "border-[#D6D6D6] text-[#0B0909] hover:bg-gray-100"
              }`}
            >
              Verify Integrity
            </button>

            {isPendingForMe && (
              <button
                onClick={() => onSign(document)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                  isDark
                    ? "bg-[#D6D6D6] text-[#0B0909] hover:bg-white shadow-md"
                    : "bg-[#0B0909] text-white hover:bg-gray-800"
                }`}
              >
                Sign Document
              </button>
            )}
          </div>
        </div>

        {/* Sub-Tabs: Overview | Signers | Audit Trail */}
        <div className="mt-8 border-b border-inherit flex gap-6 text-sm">
          <button
            onClick={() => setActiveSubTab("overview")}
            className={`pb-3 font-medium transition-colors cursor-pointer border-b-2 -mb-[1px] ${
              activeSubTab === "overview"
                ? isDark
                  ? "border-[#D6D6D6] text-[#D6D6D6]"
                  : "border-[#0B0909] text-[#0B0909]"
                : "border-transparent text-[#8C8C8C] hover:text-inherit"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveSubTab("signers")}
            className={`pb-3 font-medium transition-colors cursor-pointer border-b-2 -mb-[1px] ${
              activeSubTab === "signers"
                ? isDark
                  ? "border-[#D6D6D6] text-[#D6D6D6]"
                  : "border-[#0B0909] text-[#0B0909]"
                : "border-transparent text-[#8C8C8C] hover:text-inherit"
            }`}
          >
            Signers ({signedCount}/{signers.length})
          </button>
          <button
            onClick={() => setActiveSubTab("audit")}
            className={`pb-3 font-medium transition-colors cursor-pointer border-b-2 -mb-[1px] ${
              activeSubTab === "audit"
                ? isDark
                  ? "border-[#D6D6D6] text-[#D6D6D6]"
                  : "border-[#0B0909] text-[#0B0909]"
                : "border-transparent text-[#8C8C8C] hover:text-inherit"
            }`}
          >
            Audit Trail ({auditEvents.length})
          </button>
        </div>

        {/* Sub-Tab Content */}
        <div className="pt-6">
          {activeSubTab === "overview" && (
            <div className="space-y-6">
              {/* Document Hash Box */}
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
                  <span className="select-all">{document.document_hash}</span>
                  <button
                    onClick={() => copyToClipboard(document.document_hash)}
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

              {/* Metadata Key-Value Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <div className="p-4 rounded-xl border border-inherit bg-inherit">
                  <p className="text-xs text-[#8C8C8C]">Status</p>
                  <p className="text-sm font-semibold mt-1">
                    {document.status === "COMPLETED" ? (
                      <span className="text-emerald-400">Completed</span>
                    ) : document.status === "REJECTED" ? (
                      <span className="text-rose-400">Rejected</span>
                    ) : (
                      <span className="text-amber-400">Pending Signatures</span>
                    )}
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-inherit bg-inherit">
                  <p className="text-xs text-[#8C8C8C]">Uploaded By</p>
                  <p className="text-sm font-semibold mt-1 truncate">
                    {document.owner_name} ({document.owner_email})
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-inherit bg-inherit">
                  <p className="text-xs text-[#8C8C8C]">Created At</p>
                  <p className="text-sm font-semibold mt-1">
                    {formatDate(document.created_at)}
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-inherit bg-inherit">
                  <p className="text-xs text-[#8C8C8C]">File Size</p>
                  <p className="text-sm font-semibold mt-1">
                    {formatFileSize(document.file_size)}
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-inherit bg-inherit">
                  <p className="text-xs text-[#8C8C8C]">Signers Required</p>
                  <p className="text-sm font-semibold mt-1">
                    {signers.length}
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-inherit bg-inherit">
                  <p className="text-xs text-[#8C8C8C]">Signers Completed</p>
                  <p className="text-sm font-semibold mt-1">
                    {signedCount} / {signers.length}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === "signers" && (
            <div className="space-y-4">
              {isLoading ? (
                <div className="p-8 text-center text-xs text-[#8C8C8C]">Loading signers...</div>
              ) : signers.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#8C8C8C]">No signers assigned</div>
              ) : (
                <div className="divide-y divide-inherit">
                  {signers.map((signer) => {
                    const isSelf = signer.user_id === currentUserId;
                    return (
                      <div
                        key={signer.id}
                        className="py-3.5 flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                              signer.status === "SIGNED"
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : signer.status === "REJECTED"
                                ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                : isDark
                                ? "bg-[#44444C] text-[#D6D6D6]"
                                : "bg-gray-200 text-gray-700"
                            }`}
                          >
                            {signer.user_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate flex items-center gap-2">
                              <span>{signer.user_name}</span>
                              {isSelf && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-inherit border border-[#8C8C8C]/40 text-[#8C8C8C]">
                                  You
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-[#8C8C8C] truncate">
                              {signer.user_email}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          {signer.status === "SIGNED" ? (
                            <div>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                SIGNED
                              </span>
                              {signer.signed_at && (
                                <p className="text-[10px] text-[#8C8C8C] mt-0.5">
                                  {formatDate(signer.signed_at)}
                                </p>
                              )}
                            </div>
                          ) : signer.status === "REJECTED" ? (
                            <div>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                REJECTED
                              </span>
                              {signer.rejection_reason && (
                                <p className="text-[10px] text-rose-400 mt-0.5">
                                  {signer.rejection_reason}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#44444C]/30 text-[#8C8C8C] border border-[#44444C]">
                              PENDING
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeSubTab === "audit" && (
            <div className="space-y-4">
              {isLoading ? (
                <div className="p-8 text-center text-xs text-[#8C8C8C]">Loading audit events...</div>
              ) : auditEvents.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#8C8C8C]">No audit events recorded yet</div>
              ) : (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#44444C]/50">
                  {auditEvents.map((evt) => (
                    <div key={evt.id} className="relative group">
                      <div className="absolute -left-6 top-1.5 w-4 h-4 rounded-full bg-[#0B0909] border-2 border-emerald-500 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      </div>
                      <div>
                        <div className="flex items-baseline justify-between gap-4">
                          <p className="text-sm font-semibold">
                            {evt.eventType.replace(/_/g, " ")}
                          </p>
                          <span className="text-[11px] text-[#8C8C8C]">
                            {formatDate(evt.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-[#8C8C8C] mt-0.5">
                          Actor: {evt.actor_name || "System"} • Event #{evt.sequenceNumber}
                        </p>
                        <div className="mt-2 p-2 rounded-lg bg-[#44444C]/15 border border-[#44444C]/40 font-mono text-[11px] text-[#8C8C8C] truncate">
                          Hash: {evt.currentHash}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
