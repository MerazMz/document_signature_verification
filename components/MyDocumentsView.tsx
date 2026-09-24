"use client";

import React, { useState } from "react";
import { DocumentItem } from "./DashboardOverview";

interface MyDocumentsViewProps {
  documents: DocumentItem[];
  theme: "dark" | "light";
  onSelectDocument: (doc: DocumentItem) => void;
  onSignDocument: (doc: DocumentItem) => void;
  onNavigateToUpload: () => void;
}

export default function MyDocumentsView({
  documents,
  theme,
  onSelectDocument,
  onSignDocument,
  onNavigateToUpload,
}: MyDocumentsViewProps) {
  const isDark = theme === "dark";
  const [filter, setFilter] = useState<"all" | "pending" | "completed" | "rejected">("all");
  const [search, setSearch] = useState("");

  const filteredDocs = documents.filter((doc) => {
    // Filter by tab
    if (filter === "pending" && doc.status !== "PENDING") return false;
    if (filter === "completed" && doc.status !== "COMPLETED") return false;
    if (filter === "rejected" && doc.status !== "REJECTED") return false;

    // Filter by search
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = doc.title?.toLowerCase().includes(q);
      const matchFile = doc.file_name?.toLowerCase().includes(q);
      const matchHash = doc.document_hash.toLowerCase().includes(q);
      return matchTitle || matchFile || matchHash;
    }
    return true;
  });

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Completed
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#44444C]/30 text-[#D6D6D6] border border-[#44444C]">
            Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Filter Tabs */}
        <div
          className={`flex p-1 rounded-xl border text-xs font-medium self-start ${
            isDark ? "bg-[#0B0909] border-[#44444C]/60" : "bg-gray-100 border-[#D6D6D6]"
          }`}
        >
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              filter === "all"
                ? isDark
                  ? "bg-[#44444C] text-[#D6D6D6]"
                  : "bg-white text-[#0B0909] shadow-xs"
                : "text-[#8C8C8C] hover:text-inherit"
            }`}
          >
            All ({documents.length})
          </button>
          <button
            onClick={() => setFilter("pending")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              filter === "pending"
                ? isDark
                  ? "bg-[#44444C] text-[#D6D6D6]"
                  : "bg-white text-[#0B0909] shadow-xs"
                : "text-[#8C8C8C] hover:text-inherit"
            }`}
          >
            Pending ({documents.filter((d) => d.status === "PENDING").length})
          </button>
          <button
            onClick={() => setFilter("completed")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              filter === "completed"
                ? isDark
                  ? "bg-[#44444C] text-[#D6D6D6]"
                  : "bg-white text-[#0B0909] shadow-xs"
                : "text-[#8C8C8C] hover:text-inherit"
            }`}
          >
            Completed ({documents.filter((d) => d.status === "COMPLETED").length})
          </button>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, file, hash..."
            className={`w-full pl-9 pr-4 py-2 rounded-xl border text-xs transition-colors focus:outline-none ${
              isDark
                ? "bg-[#0B0909] border-[#44444C] text-[#D6D6D6] focus:border-[#8C8C8C]"
                : "bg-white border-[#D6D6D6] text-[#0B0909] focus:border-[#8C8C8C]"
            }`}
          />
          <svg
            className="w-4 h-4 absolute left-3 top-2.5 text-[#8C8C8C]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Documents Table */}
      <div
        className={`rounded-2xl border transition-all ${
          isDark
            ? "bg-[#0B0909] border-[#44444C]/70 shadow-xl"
            : "bg-white border-[#D6D6D6] shadow-sm"
        }`}
      >
        {filteredDocs.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-medium">No documents match your filter.</p>
            <p className="text-xs text-[#8C8C8C] mt-1">
              Try adjusting your search or upload a new PDF.
            </p>
            <button
              onClick={onNavigateToUpload}
              className={`mt-4 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                isDark
                  ? "bg-[#D6D6D6] text-[#0B0909] hover:bg-white"
                  : "bg-[#0B0909] text-white hover:bg-gray-800"
              }`}
            >
              Upload Document
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr
                  className={`text-[11px] uppercase tracking-wider border-b border-inherit font-medium ${
                    isDark ? "text-[#8C8C8C] bg-[#0B0909]" : "text-[#44444C] bg-gray-50/50"
                  }`}
                >
                  <th className="py-3 px-6">Name</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Owner</th>
                  <th className="py-3 px-4">Updated</th>
                  <th className="py-3 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-inherit">
                {filteredDocs.map((doc) => {
                  const isPendingForMe = doc.user_signing_status === "PENDING";
                  return (
                    <tr
                      key={doc.id}
                      className={`group transition-colors ${
                        isDark ? "hover:bg-[#44444C]/15" : "hover:bg-gray-50"
                      }`}
                    >
                      {/* Name & PDF Icon */}
                      <td className="py-3.5 px-6">
                        <div
                          onClick={() => onSelectDocument(doc)}
                          className="flex items-center gap-3 cursor-pointer"
                        >
                          <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20 flex items-center justify-center font-bold text-[10px] shrink-0">
                            PDF
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate group-hover:underline">
                              {doc.title || doc.file_name}
                            </p>
                            <p className="text-[11px] text-[#8C8C8C] truncate">
                              {doc.file_name} • {formatFileSize(doc.file_size)}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getStatusBadge(doc.status)}
                      </td>

                      {/* Owner */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-xs text-[#8C8C8C]">
                        {doc.owner_name}
                      </td>

                      {/* Updated Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-xs text-[#8C8C8C]">
                        {formatDate(doc.created_at)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-6 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isPendingForMe && (
                            <button
                              onClick={() => onSignDocument(doc)}
                              className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                                isDark
                                  ? "bg-[#D6D6D6] text-[#0B0909] hover:bg-white"
                                  : "bg-[#0B0909] text-white hover:bg-gray-800"
                              }`}
                            >
                              Sign Now
                            </button>
                          )}
                          <button
                            onClick={() => onSelectDocument(doc)}
                            className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                              isDark
                                ? "text-[#8C8C8C] hover:text-[#D6D6D6] hover:bg-[#44444C]/30"
                                : "text-[#44444C] hover:text-[#0B0909] hover:bg-gray-100"
                            }`}
                            title="View Details"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
