"use client";

import React, { useState, useEffect } from "react";
import { computeDocumentHash, arrayBufferToBase64 } from "@/lib/crypto";

interface UserOption {
  id: number;
  name: string;
  email: string;
  has_key: boolean;
}

interface CreateDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  theme: "dark" | "light";
  currentUserId: number;
}

export default function CreateDocumentModal({
  isOpen,
  onClose,
  onCreated,
  theme,
  currentUserId,
}: CreateDocumentModalProps) {
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [computedHash, setComputedHash] = useState("");
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedSignerIds, setSelectedSignerIds] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDark = theme === "dark";

  // Fetch available users for multi-party signer selection
  useEffect(() => {
    if (!isOpen) return;

    const fetchUsers = async () => {
      try {
        const res = await fetch("/api/users");
        if (res.ok) {
          const data = await res.json();
          setUsers(data.users || []);
          // By default, select current user as one of the signers if not already
          setSelectedSignerIds([currentUserId]);
        }
      } catch (err) {
        console.error("Error fetching signers:", err);
      }
    };

    fetchUsers();
  }, [isOpen, currentUserId]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (!selected.name.toLowerCase().endsWith(".pdf")) {
        setError("Only PDF documents (.pdf) are supported.");
        return;
      }

      setFile(selected);
      if (!title) {
        setTitle(selected.name.replace(/\.[^/.]+$/, ""));
      }

      // Compute raw byte SHA-256 hash immediately
      const arrayBuffer = await selected.arrayBuffer();
      const hash = await computeDocumentHash(arrayBuffer);
      setComputedHash(hash);
    }
  };

  const handleToggleSigner = (userId: number) => {
    setSelectedSignerIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!file || !computedHash) {
      setError("Please select a PDF document to upload.");
      return;
    }

    if (selectedSignerIds.length === 0) {
      setError("Please select at least one authorized signer.");
      return;
    }

    setIsSubmitting(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const fileData = arrayBufferToBase64(arrayBuffer);

      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          fileName: file.name,
          fileSize: file.size,
          fileData,
          documentHash: computedHash,
          signerUserIds: selectedSignerIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create document");
      }

      onCreated();
      onClose();
    } catch (err: unknown) {
      console.error("Create document error:", err);
      setError(err instanceof Error ? err.message : "Failed to create document");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div
        className={`w-full max-w-xl rounded-2xl border p-6 sm:p-7 shadow-2xl transition-all max-h-[90vh] overflow-y-auto ${
          isDark
            ? "border-[#44444C] bg-[#0B0909] text-[#D6D6D6]"
            : "border-[#D6D6D6] bg-white text-[#0B0909]"
        }`}
      >
        <div className="flex items-center justify-between pb-4 border-b border-[#44444C]/40 mb-5">
          <h3 className="text-base font-semibold">New Multi-Party Document</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-[#8C8C8C] hover:text-[#D6D6D6] text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>

        {error && (
          <div
            className={`p-3 rounded-lg border text-xs mb-4 flex items-center gap-2 ${
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-xs font-medium mb-1 ${isDark ? "text-[#8C8C8C]" : "text-[#44444C]"}`}>
              Document Title
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Master Services Agreement"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`w-full px-3 py-2 text-xs rounded-lg border focus:outline-none ${
                isDark
                  ? "bg-[#0B0909] border-[#44444C] text-[#D6D6D6] focus:border-[#8C8C8C]"
                  : "bg-white border-gray-300 text-black focus:border-black"
              }`}
            />
          </div>

          <div>
            <label className={`block text-xs font-medium mb-1 ${isDark ? "text-[#8C8C8C]" : "text-[#44444C]"}`}>
              Upload PDF File
            </label>
            <input
              type="file"
              required
              accept="application/pdf,.pdf"
              onChange={handleFileChange}
              className={`w-full text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium p-1.5 rounded-lg border ${
                isDark
                  ? "border-[#44444C] bg-[#0B0909] text-[#D6D6D6] file:bg-[#44444C] file:text-[#D6D6D6]"
                  : "border-[#D6D6D6] bg-gray-50 text-black file:bg-[#0B0909] file:text-white"
              }`}
            />
          </div>

          {computedHash && (
            <div className={`p-3 rounded-lg border text-xs font-mono break-all ${
              isDark ? "border-[#44444C]/60 bg-[#0B0909]/60 text-[#8C8C8C]" : "border-gray-200 bg-gray-50 text-[#44444C]"
            }`}>
              <div className="text-[10px] uppercase font-semibold mb-1 text-[#D6D6D6]">
                Calculated Document Hash (SHA-256):
              </div>
              {computedHash}
            </div>
          )}

          {/* Signer Selection */}
          <div>
            <label className={`block text-xs font-medium mb-1.5 ${isDark ? "text-[#8C8C8C]" : "text-[#44444C]"}`}>
              Select Required Signers (Multi-Party)
            </label>
            <div className={`p-3 rounded-lg border max-h-40 overflow-y-auto space-y-2 ${
              isDark ? "border-[#44444C] bg-[#0B0909]" : "border-gray-300 bg-white"
            }`}>
              {users.map((u) => {
                const isSelected = selectedSignerIds.includes(u.id);
                const isSelf = u.id === currentUserId;

                return (
                  <label
                    key={u.id}
                    className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors text-xs ${
                      isSelected
                        ? isDark
                          ? "bg-[#44444C]/30 text-[#D6D6D6]"
                          : "bg-gray-100 text-black"
                        : "hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSigner(u.id)}
                        className="rounded accent-emerald-500 cursor-pointer"
                      />
                      <span className="font-medium">{u.name}</span>
                      <span className="text-[#8C8C8C]">({u.email})</span>
                      {isSelf && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          You
                        </span>
                      )}
                    </div>

                    <span className="text-[10px] text-[#8C8C8C]">
                      {u.has_key ? "ECDSA Ready" : "No key setup"}
                    </span>
                  </label>
                );
              })}
            </div>
            <p className="text-[11px] text-[#8C8C8C] mt-1">
              Document completes only when all selected signers provide their ECDSA signature.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#44444C]/30">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-[#8C8C8C] hover:text-[#D6D6D6] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !computedHash}
              className={`px-5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 ${
                isDark
                  ? "bg-[#D6D6D6] text-[#0B0909] hover:bg-white"
                  : "bg-[#0B0909] text-white hover:bg-black"
              }`}
            >
              {isSubmitting ? "Creating & Anchoring Genesis..." : "Register Document"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
