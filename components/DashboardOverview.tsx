"use client";

import React from "react";
import { NavigationTab } from "./Sidebar";

export interface DocumentItem {
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

export interface DocumentDetail {
  id: number;
  title: string;
  file_name: string;
  file_size: number;
  document_hash: string;
  status: "PENDING" | "COMPLETED" | "REJECTED";
  created_at: string;
  owner_name: string;
  owner_email: string;
  signers?: Array<{
    id: number;
    user_id: number;
    user_name: string;
    user_email: string;
    status: "PENDING" | "SIGNED" | "REJECTED";
    signed_at?: string;
  }>;
}

interface DashboardOverviewProps {
  documents: DocumentItem[];
  currentUserId: number;
  theme: "dark" | "light";
  onNavigate: (tab: NavigationTab) => void;
  onSelectDocument: (doc: DocumentItem) => void;
  onSignDocument: (doc: DocumentItem) => void;
}

export default function DashboardOverview({
  documents,
  theme,
  onNavigate,
  onSelectDocument,
  onSignDocument,
}: DashboardOverviewProps) {
  const isDark = theme === "dark";

  // Calculate statistics
  const totalDocs = documents.length;
  const signedByYou = documents.filter((d) => d.user_signing_status === "SIGNED").length;
  const pendingByYou = documents.filter((d) => d.user_signing_status === "PENDING").length;
  const verifiedDocs = documents.filter((d) => d.status === "COMPLETED").length;

  const recentDocs = documents.slice(0, 5);

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
    <div className="space-y-8">
      {/* 4 Stat Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Total Documents */}
        <div
          className={`p-5 rounded-2xl border transition-all ${
            isDark
              ? "bg-[#0B0909] border-[#44444C]/70 shadow-lg"
              : "bg-white border-[#D6D6D6] shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#8C8C8C] uppercase tracking-wider">
              Total Documents
            </span>
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                isDark ? "bg-[#44444C]/30 text-[#D6D6D6]" : "bg-gray-100 text-gray-700"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold tracking-tight">
              {totalDocs}
            </span>
          </div>
        </div>

        {/* Signed by You */}
        <div
          className={`p-5 rounded-2xl border transition-all ${
            isDark
              ? "bg-[#0B0909] border-[#44444C]/70 shadow-lg"
              : "bg-white border-[#D6D6D6] shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#8C8C8C] uppercase tracking-wider">
              Signed by You
            </span>
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                isDark ? "bg-[#44444C]/30 text-[#D6D6D6]" : "bg-gray-100 text-gray-700"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold tracking-tight">
              {signedByYou}
            </span>
          </div>
        </div>

        {/* Pending Signatures */}
        <div
          className={`p-5 rounded-2xl border transition-all ${
            isDark
              ? "bg-[#0B0909] border-[#44444C]/70 shadow-lg"
              : "bg-white border-[#D6D6D6] shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#8C8C8C] uppercase tracking-wider">
              Pending Signatures
            </span>
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                pendingByYou > 0
                  ? "bg-amber-500/20 text-amber-400"
                  : isDark
                  ? "bg-[#44444C]/30 text-[#D6D6D6]"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight">
              {pendingByYou}
            </span>
            {pendingByYou > 0 && (
              <span className="text-xs text-amber-400 font-medium">Requires action</span>
            )}
          </div>
        </div>

        {/* Verified / Completed */}
        <div
          className={`p-5 rounded-2xl border transition-all ${
            isDark
              ? "bg-[#0B0909] border-[#44444C]/70 shadow-lg"
              : "bg-white border-[#D6D6D6] shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#8C8C8C] uppercase tracking-wider">
              Verified
            </span>
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                isDark ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-100 text-emerald-700"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold tracking-tight">
              {verifiedDocs}
            </span>
          </div>
        </div>
      </div>

      {/* Recent Documents Table Section */}
      <div
        className={`rounded-2xl border transition-all ${
          isDark
            ? "bg-[#0B0909] border-[#44444C]/70 shadow-xl"
            : "bg-white border-[#D6D6D6] shadow-sm"
        }`}
      >
        {/* Header */}
        <div className="p-6 flex items-center justify-between border-b border-inherit">
          <div>
            <h2 className="text-base sm:text-lg font-semibold tracking-tight">
              Recent Documents
            </h2>
            <p className="text-xs text-[#8C8C8C] mt-0.5">
              Latest documents in your cryptographic pipeline
            </p>
          </div>
          <button
            onClick={() => onNavigate("documents")}
            className={`text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              isDark ? "text-[#D6D6D6] hover:text-white" : "text-[#0B0909] hover:underline"
            }`}
          >
            <span>View All</span>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Table / List */}
        {recentDocs.length === 0 ? (
          <div className="p-12 text-center">
            <div
              className={`w-12 h-12 mx-auto rounded-2xl flex items-center justify-center mb-3 ${
                isDark ? "bg-[#44444C]/30 text-[#8C8C8C]" : "bg-gray-100 text-gray-500"
              }`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-sm font-medium">No documents yet</p>
            <p className="text-xs text-[#8C8C8C] mt-1">
              Upload your first PDF document to initiate cryptographic signing
            </p>
            <button
              onClick={() => onNavigate("upload")}
              className={`mt-4 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                isDark
                  ? "bg-[#D6D6D6] text-[#0B0909] hover:bg-white shadow-md"
                  : "bg-[#0B0909] text-white hover:bg-gray-800"
              }`}
            >
              Upload PDF Now
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
                  <th className="py-3 px-4">Updated</th>
                  <th className="py-3 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-inherit">
                {recentDocs.map((doc) => {
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

      {/* Quick Action Cards (Bottom) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div
          onClick={() => onNavigate("upload")}
          className={`p-6 rounded-2xl border cursor-pointer transition-all hover:scale-[1.01] ${
            isDark
              ? "bg-[#0B0909] border-[#44444C]/70 hover:border-[#8C8C8C]"
              : "bg-white border-[#D6D6D6] hover:border-[#8C8C8C]"
          }`}
        >
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                isDark ? "bg-[#44444C]/30 text-[#D6D6D6]" : "bg-gray-100 text-gray-800"
              }`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-sm">Upload New Document</h3>
              <p className="text-xs text-[#8C8C8C] mt-0.5">
                Hash PDF with SHA-256 and initiate multi-party signing
              </p>
            </div>
          </div>
        </div>

        <div
          onClick={() => onNavigate("verify")}
          className={`p-6 rounded-2xl border cursor-pointer transition-all hover:scale-[1.01] ${
            isDark
              ? "bg-[#0B0909] border-[#44444C]/70 hover:border-[#8C8C8C]"
              : "bg-white border-[#D6D6D6] hover:border-[#8C8C8C]"
          }`}
        >
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                isDark ? "bg-[#44444C]/30 text-[#D6D6D6]" : "bg-gray-100 text-gray-800"
              }`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-sm">Verify Signatures & Audit</h3>
              <p className="text-xs text-[#8C8C8C] mt-0.5">
                Verify PDF integrity, ECDSA signatures, and cryptographic chain
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
