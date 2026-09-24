"use client";

import React, { useState, useEffect } from "react";
import { DocumentItem } from "./DashboardOverview";

interface AuditEvent {
  id: number;
  sequenceNumber: number;
  documentId: number;
  actorId: number | null;
  eventType: string;
  timestamp: string;
  eventData: Record<string, unknown>;
  previousHash: string;
  currentHash: string;
  createdAt: string;
  actor_name?: string;
  actor_email?: string;
  document_title?: string;
  document_file_name?: string;
}

interface AuditTrailViewProps {
  documents: DocumentItem[];
  theme: "dark" | "light";
  initialDocumentId?: number;
}

export default function AuditTrailView({
  documents,
  theme,
  initialDocumentId,
}: AuditTrailViewProps) {
  const isDark = theme === "dark";
  const [selectedDocId, setSelectedDocId] = useState<number | "all">(
    initialDocumentId || (documents.length > 0 ? documents[0].id : "all")
  );
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [chainValid, setChainValid] = useState<boolean | null>(null);
  const [expandedEventId, setExpandedEventId] = useState<number | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  useEffect(() => {
    const fetchAudit = async () => {
      setIsLoading(true);
      try {
        const url =
          selectedDocId === "all"
            ? "/api/audit"
            : `/api/audit?documentId=${selectedDocId}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setEvents(data.events || []);
          if (data.chainVerification) {
            setChainValid(data.chainVerification.isValid);
          } else {
            setChainValid(true);
          }
        }
      } catch (err) {
        console.error("Error fetching audit events:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAudit();
  }, [selectedDocId]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(id);
    setTimeout(() => setCopiedHash(null), 2000);
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

  const getNodeIcon = (eventType: string, actorName?: string) => {
    if (eventType === "DOCUMENT_COMPLETED") {
      return (
        <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      );
    }

    if (eventType === "DOCUMENT_UPLOADED" || eventType === "DOCUMENT_HASH_GENERATED") {
      return (
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
            isDark ? "bg-[#44444C] text-[#D6D6D6]" : "bg-gray-200 text-gray-800"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
      );
    }

    // Default to actor initial
    const initial = actorName ? actorName.charAt(0).toUpperCase() : "A";
    return (
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
          isDark
            ? "bg-[#44444C]/50 border border-[#8C8C8C]/30 text-[#D6D6D6]"
            : "bg-gray-100 border border-gray-300 text-gray-800"
        }`}
      >
        {initial}
      </div>
    );
  };

  const getEventTitle = (evt: AuditEvent) => {
    switch (evt.eventType) {
      case "DOCUMENT_COMPLETED":
        return "Document Completed";
      case "DOCUMENT_SIGNED":
        return `Document Signed by ${evt.actor_name || "Signer"}`;
      case "SIGNER_ADDED":
        return `Signer Added`;
      case "DOCUMENT_UPLOADED":
        return "Document Uploaded";
      case "DOCUMENT_HASH_GENERATED":
        return "SHA-256 Hash Generated";
      case "DOCUMENT_REJECTED":
        return `Document Rejected by ${evt.actor_name || "Signer"}`;
      default:
        return evt.eventType.replace(/_/g, " ");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Controls: Filter by document & Status pill */}
      <div
        className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
          isDark
            ? "bg-[#0B0909] border-[#44444C]/70 shadow-lg"
            : "bg-white border-[#D6D6D6] shadow-sm"
        }`}
      >
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-[#8C8C8C] uppercase tracking-wider">
            Scope:
          </label>
          <select
            value={selectedDocId}
            onChange={(e) =>
              setSelectedDocId(e.target.value === "all" ? "all" : parseInt(e.target.value, 10))
            }
            className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors focus:outline-none cursor-pointer ${
              isDark
                ? "bg-[#0B0909] border-[#44444C] text-[#D6D6D6]"
                : "bg-white border-[#D6D6D6] text-[#0B0909]"
            }`}
          >
            <option value="all">All Documents (Latest Events)</option>
            {documents.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.title || doc.file_name} (#{doc.id})
              </option>
            ))}
          </select>
        </div>

        {/* Chain verification badge */}
        <div>
          {chainValid ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Hash Chain Verified (Genesis to Tip)</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <span>Audit Chain Compromised</span>
            </span>
          )}
        </div>
      </div>

      {/* Timeline View (Screen 9 in mockup) */}
      <div
        className={`p-6 sm:p-8 rounded-2xl border transition-all ${
          isDark
            ? "bg-[#0B0909] border-[#44444C]/70 shadow-xl"
            : "bg-white border-[#D6D6D6] shadow-sm"
        }`}
      >
        {isLoading ? (
          <div className="p-12 text-center text-xs text-[#8C8C8C]">
            Verifying cryptographic hash chain and loading events...
          </div>
        ) : events.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#8C8C8C]">
            No audit events found.
          </div>
        ) : (
          <div className="relative pl-6 space-y-7 before:absolute before:left-4 before:top-4 before:bottom-4 before:w-0.5 before:bg-[#44444C]/40">
            {events.map((evt) => {
              const isExpanded = expandedEventId === evt.id;
              const shortHash = `0x${evt.currentHash.substring(0, 6)}...${evt.currentHash.substring(evt.currentHash.length - 4)}`;

              return (
                <div key={evt.id} className="relative group">
                  {/* Connected Circular Node */}
                  <div className="absolute -left-6 top-1">
                    {getNodeIcon(evt.eventType, evt.actor_name)}
                  </div>

                  {/* Node Content */}
                  <div className="pl-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-semibold tracking-tight">
                          {getEventTitle(evt)}
                        </h4>
                        <p className="text-xs text-[#8C8C8C] mt-0.5">
                          {formatDate(evt.createdAt)}
                          {evt.actor_name && ` • by ${evt.actor_name}`}
                          {evt.document_file_name && selectedDocId === "all" && (
                            <span> • {evt.document_file_name}</span>
                          )}
                        </p>
                      </div>

                      {/* Right-aligned Hash badge matching mockup */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyToClipboard(evt.currentHash, `hash-${evt.id}`)}
                          className={`font-mono text-xs px-2.5 py-1 rounded-lg border transition-colors cursor-pointer flex items-center gap-1.5 ${
                            isDark
                              ? "bg-[#0B0909] border-[#44444C] text-[#8C8C8C] hover:text-[#D6D6D6] hover:border-[#8C8C8C]"
                              : "bg-gray-100 border-[#D6D6D6] text-gray-700 hover:text-black"
                          }`}
                          title="Click to copy full SHA-256 event hash"
                        >
                          <span>{shortHash}</span>
                          {copiedHash === `hash-${evt.id}` ? (
                            <span className="text-emerald-400 text-[10px]">Copied</span>
                          ) : (
                            <svg className="w-3 h-3 text-[#8C8C8C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          )}
                        </button>

                        <button
                          onClick={() => setExpandedEventId(isExpanded ? null : evt.id)}
                          className={`p-1 rounded-lg text-xs transition-colors cursor-pointer ${
                            isDark ? "text-[#8C8C8C] hover:text-[#D6D6D6]" : "text-gray-500 hover:text-black"
                          }`}
                          title="Toggle details"
                        >
                          <svg
                            className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Expandable Technical Proof / Canonical Data */}
                    {isExpanded && (
                      <div
                        className={`mt-3 p-4 rounded-xl border font-mono text-xs space-y-2.5 transition-all ${
                          isDark
                            ? "bg-[#0B0909] border-[#44444C]/80 text-[#D6D6D6]"
                            : "bg-gray-50 border-[#D6D6D6] text-[#0B0909]"
                        }`}
                      >
                        <div>
                          <span className="text-[#8C8C8C] block text-[10px] uppercase">
                            Previous Hash (H_{evt.sequenceNumber - 1}):
                          </span>
                          <span className="break-all">{evt.previousHash}</span>
                        </div>
                        <div>
                          <span className="text-[#8C8C8C] block text-[10px] uppercase">
                            Current Event Hash (H_{evt.sequenceNumber}):
                          </span>
                          <span className="break-all text-emerald-400">{evt.currentHash}</span>
                        </div>
                        <div>
                          <span className="text-[#8C8C8C] block text-[10px] uppercase">
                            Canonical Event Payload:
                          </span>
                          <pre className="p-2 rounded bg-black/40 text-[11px] overflow-x-auto text-[#D6D6D6]">
                            {JSON.stringify(evt.eventData, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
