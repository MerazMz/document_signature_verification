"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { computeDocumentHash, arrayBufferToBase64 } from "@/lib/crypto";
import WorkflowStepper, { WorkflowStep } from "./WorkflowStepper";

interface UserOption {
  id: number;
  name: string;
  email: string;
  hasKey: boolean;
}

interface UploadDocumentViewProps {
  currentUserId: number;
  theme: "dark" | "light";
  onSuccess: (documentId: number) => void;
}

const UPLOAD_PROCESS_STEPS: WorkflowStep[] = [
  { id: "read", label: "Uploading Document", sublabel: "Reading binary stream" },
  { id: "hash", label: "Generating Hash", sublabel: "SHA-256 computation" },
  { id: "registry", label: "Registry Check", sublabel: "Duplicate detection" },
  { id: "ready", label: "Hash Verified", sublabel: "Ready for signing" },
];

const SUBMIT_PROCESS_STEPS: WorkflowStep[] = [
  { id: "payload", label: "Packaging Payload", sublabel: "Base64 encoding" },
  { id: "register", label: "Registering Document", sublabel: "Database transaction" },
  { id: "audit", label: "Genesis Audit Chain", sublabel: "Cryptographic hash block" },
  { id: "complete", label: "Document Created", sublabel: "Ready for signing" },
];

export default function UploadDocumentView({
  currentUserId,
  theme,
  onSuccess,
}: UploadDocumentViewProps) {
  const isDark = theme === "dark";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [docHash, setDocHash] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [existingDocId, setExistingDocId] = useState<number | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);

  // Workflow Checkpoint Animation State
  const [workflowState, setWorkflowState] = useState<{
    active: boolean;
    phase: "processing" | "submitting";
    currentStep: number;
    isComplete: boolean;
    isWarning: boolean;
    warningMessage?: string;
    isError: boolean;
    errorMessage?: string;
  }>({
    active: false,
    phase: "processing",
    currentStep: 0,
    isComplete: false,
    isWarning: false,
    isError: false,
  });

  // Signer management
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedSignerIds, setSelectedSignerIds] = useState<number[]>([currentUserId]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch("/api/users");
        if (res.ok) {
          const data = await res.json();
          setUsers(data.users || []);
        }
      } catch (err) {
        console.error("Error fetching users:", err);
      }
    };
    fetchUsers();
  }, []);

  const handleProcessFile = useCallback(async (selectedFile: File) => {
    setErrorMsg(null);
    setExistingDocId(null);
    const isPdf =
      selectedFile.type === "application/pdf" ||
      selectedFile.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      setErrorMsg("Please upload a valid PDF document (.pdf).");
      return;
    }

    setFile(selectedFile);
    setIsProcessing(true);
    setWorkflowState({
      active: true,
      phase: "processing",
      currentStep: 0,
      isComplete: false,
      isWarning: false,
      isError: false,
    });

    try {
      // Step 0: Uploading document / reading binary stream
      await new Promise((r) => setTimeout(r, 220));
      const buffer = await selectedFile.arrayBuffer();

      // Step 1: Generating Hash
      setWorkflowState((prev) => ({ ...prev, currentStep: 1 }));
      const hash = await computeDocumentHash(buffer);
      setDocHash(hash);
      if (!title) {
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, ""));
      }
      await new Promise((r) => setTimeout(r, 240));

      // Step 2: Registry Check
      setWorkflowState((prev) => ({ ...prev, currentStep: 2 }));
      let isDuplicate = false;
      let existingRecord: { id: number; title: string; file_name: string } | null = null;

      try {
        const docRes = await fetch("/api/documents");
        if (docRes.ok) {
          const docData = await docRes.json();
          const existing = (docData.documents || []).find(
            (d: { id: number; title: string; file_name: string; document_hash: string; is_owner: boolean }) =>
              d.is_owner && d.document_hash.toLowerCase() === hash.toLowerCase()
          );
          if (existing) {
            isDuplicate = true;
            existingRecord = existing;
            setExistingDocId(existing.id);
            setErrorMsg(
              `Document already there: A document with this identical SHA-256 hash has already been uploaded by your account ("${existing.title || existing.file_name}").`
            );
          }
        }
      } catch (checkErr) {
        console.warn("Could not pre-check duplicate hash:", checkErr);
      }

      await new Promise((r) => setTimeout(r, 200));

      // Step 3: Complete or Warning
      if (isDuplicate) {
        setWorkflowState((prev) => ({
          ...prev,
          currentStep: 2,
          isWarning: true,
          warningMessage: `Document already there: A document with this identical SHA-256 hash is already registered in your account.`,
        }));
      } else {
        setWorkflowState((prev) => ({
          ...prev,
          currentStep: 3,
          isComplete: true,
        }));
      }
    } catch (err) {
      console.error("Error computing hash:", err);
      setErrorMsg("Failed to compute SHA-256 hash.");
      setWorkflowState((prev) => ({
        ...prev,
        isError: true,
        errorMessage: "Failed to compute SHA-256 hash.",
      }));
    } finally {
      setIsProcessing(false);
    }
  }, [title]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleProcessFile(e.target.files[0]);
    }
  };

  const toggleSigner = (userId: number) => {
    if (selectedSignerIds.includes(userId)) {
      if (selectedSignerIds.length === 1) {
        setErrorMsg("At least one signer is required.");
        return;
      }
      setSelectedSignerIds(selectedSignerIds.filter((id) => id !== userId));
    } else {
      setSelectedSignerIds([...selectedSignerIds, userId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !docHash) {
      setErrorMsg("Please upload a PDF file first.");
      return;
    }
    if (selectedSignerIds.length === 0) {
      setErrorMsg("Please assign at least one signer.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setWorkflowState({
      active: true,
      phase: "submitting",
      currentStep: 0,
      isComplete: false,
      isWarning: false,
      isError: false,
    });

    try {
      // Step 0: Packaging Payload
      await new Promise((r) => setTimeout(r, 200));
      const buffer = await file.arrayBuffer();
      const fileData = arrayBufferToBase64(buffer);

      // Step 1: Registering Document
      setWorkflowState((prev) => ({ ...prev, currentStep: 1 }));
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || file.name,
          fileName: file.name,
          fileSize: file.size,
          fileData,
          documentHash: docHash,
          signerUserIds: selectedSignerIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.alreadyExists && data.existingDocument?.id) {
          setExistingDocId(data.existingDocument.id);
        }
        setWorkflowState((prev) => ({
          ...prev,
          isError: true,
          errorMessage: data.error || "Failed to create document",
        }));
        throw new Error(data.error || "Failed to create document");
      }

      // Step 2: Initializing Genesis Audit Chain
      setWorkflowState((prev) => ({ ...prev, currentStep: 2 }));
      await new Promise((r) => setTimeout(r, 220));

      // Step 3: Complete
      setWorkflowState((prev) => ({ ...prev, currentStep: 3, isComplete: true }));
      await new Promise((r) => setTimeout(r, 250));

      onSuccess(data.document.id);
    } catch (err: unknown) {
      console.error("Error creating document:", err);
      setErrorMsg(err instanceof Error ? err.message : "Failed to create document");
    } finally {
      setIsSubmitting(false);
    }
  };

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

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Workflow Checkpoint Stepper (shown above form once processed or while submitting) */}
      {workflowState.active && !isProcessing && (
        <WorkflowStepper
          steps={
            workflowState.phase === "processing"
              ? UPLOAD_PROCESS_STEPS
              : SUBMIT_PROCESS_STEPS
          }
          currentStepIndex={workflowState.currentStep}
          isComplete={workflowState.isComplete}
          isError={workflowState.isError}
          errorMessage={workflowState.errorMessage}
          isWarning={workflowState.isWarning}
          warningMessage={workflowState.warningMessage}
          theme={theme}
          title={
            workflowState.phase === "processing"
              ? "Document Intake & Hashing Pipeline"
              : "Document Registration Pipeline"
          }
          subtitle={
            workflowState.phase === "processing"
              ? "Uploading document, calculating SHA-256 digest, and checking registry"
              : "Securing payload, registering multi-party signers, and generating Genesis audit block"
          }
        />
      )}

      {errorMsg && !isProcessing && (
        <div
          className={`p-4 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            existingDocId
              ? isDark
                ? "border-amber-500/40 bg-amber-950/20 text-amber-300"
                : "border-amber-300 bg-amber-50 text-amber-900"
              : isDark
              ? "border-rose-500/40 bg-rose-950/20 text-rose-300"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="font-medium leading-relaxed">{errorMsg}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {existingDocId && (
              <button
                type="button"
                onClick={() => onSuccess(existingDocId)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  isDark
                    ? "bg-[#D6D6D6] text-[#0B0909] hover:bg-white shadow-xs"
                    : "bg-[#0B0909] text-white hover:bg-gray-800 shadow-xs"
                }`}
              >
                View Existing Document
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setErrorMsg(null);
                setExistingDocId(null);
              }}
              className="p-1 hover:opacity-75 cursor-pointer text-base leading-none"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Drag & Drop Upload Card (When no file selected) */}
      {!file ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
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
            onChange={handleFileInputChange}
            className="hidden"
          />

          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-5 ${
              isDark ? "bg-[#44444C]/30 text-[#D6D6D6]" : "bg-gray-100 text-gray-700"
            }`}
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>

          <h3 className="text-base sm:text-lg font-semibold tracking-tight">
            Drag &amp; drop your PDF here
          </h3>
          <p className="text-xs text-[#8C8C8C] mt-1">or click to browse from your device</p>

          <button
            type="button"
            className={`mt-6 px-5 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
              isDark
                ? "bg-[#D6D6D6] text-[#0B0909] hover:bg-white shadow-md"
                : "bg-[#0B0909] text-white hover:bg-gray-800"
            }`}
          >
            Select PDF
          </button>

          <p className="text-[11px] text-[#8C8C8C] mt-6">
            Only PDF files are supported. Max size 50MB.
          </p>
        </div>
      ) : isProcessing ? (
        /* Focused Ingestion & Checkpoint Pipeline Hero Card */
        <div
          className={`p-6 sm:p-8 rounded-2xl border transition-all space-y-6 ${
            isDark
              ? "bg-[#0B0909] border-[#44444C]/70 shadow-xl"
              : "bg-white border-[#D6D6D6] shadow-sm"
          }`}
        >
          <div className="flex items-center gap-3.5 pb-4 border-b border-inherit">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 flex items-center justify-center font-bold text-xs shrink-0">
              PDF
            </div>
            <div>
              <p className="font-semibold text-sm">{file.name}</p>
              <p className="text-xs text-[#8C8C8C] mt-0.5">
                {formatFileSize(file.size)} • Processing bytes...
              </p>
            </div>
          </div>

          <WorkflowStepper
            steps={UPLOAD_PROCESS_STEPS}
            currentStepIndex={workflowState.currentStep}
            isComplete={workflowState.isComplete}
            isError={workflowState.isError}
            errorMessage={workflowState.errorMessage}
            isWarning={workflowState.isWarning}
            warningMessage={workflowState.warningMessage}
            theme={theme}
            title="Document Intake & Hashing Pipeline"
            subtitle="Uploading document, calculating SHA-256 digest, and checking registry"
          />
        </div>
      ) : (
        /* Selected File & Multi-Party Configuration Card */
        <form
          onSubmit={handleSubmit}
          className={`p-6 sm:p-8 rounded-2xl border transition-all space-y-6 ${
            isDark
              ? "bg-[#0B0909] border-[#44444C]/70 shadow-xl"
              : "bg-white border-[#D6D6D6] shadow-sm"
          }`}
        >
          {/* File summary bar */}
          <div className="flex items-center justify-between pb-5 border-b border-inherit">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 flex items-center justify-center font-bold text-xs shrink-0">
                PDF
              </div>
              <div>
                <p className="font-semibold text-sm">{file.name}</p>
                <p className="text-xs text-[#8C8C8C] mt-0.5">
                  {formatFileSize(file.size)} • PDF Document
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setFile(null);
                setDocHash("");
                setErrorMsg(null);
                setExistingDocId(null);
                setWorkflowState({
                  active: false,
                  phase: "processing",
                  currentStep: 0,
                  isComplete: false,
                  isWarning: false,
                  isError: false,
                });
              }}
              className="text-xs text-[#8C8C8C] hover:text-[#D6D6D6] underline cursor-pointer"
            >
              Change File
            </button>
          </div>

          {/* Document Title */}
          <div>
            <label className="block text-xs font-medium text-[#8C8C8C] mb-2 uppercase tracking-wider">
              Document Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Master Services Agreement"
              className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-all focus:outline-none ${
                isDark
                  ? "bg-[#0B0909] border-[#44444C] text-[#D6D6D6] focus:border-[#8C8C8C]"
                  : "bg-white border-[#D6D6D6] text-[#0B0909] focus:border-[#8C8C8C]"
              }`}
            />
          </div>

          {/* SHA-256 Hash Display */}
          <div>
            <label className="block text-xs font-medium text-[#8C8C8C] mb-2 uppercase tracking-wider">
              Calculated SHA-256 Hash
            </label>
            {isProcessing ? (
              <div className="p-3 text-xs text-[#8C8C8C]">Calculating binary digest...</div>
            ) : (
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between font-mono text-xs sm:text-sm break-all ${
                  isDark
                    ? "bg-[#0B0909] border-[#44444C]/60 text-[#D6D6D6]"
                    : "bg-gray-50 border-[#D6D6D6] text-[#0B0909]"
                }`}
              >
                <span className="select-all">{docHash}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(docHash)}
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
            )}
          </div>

          {/* Required Multi-Party Signers */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-[#8C8C8C] uppercase tracking-wider">
                Required Signers ({selectedSignerIds.length} selected)
              </label>
              <span className="text-[11px] text-[#8C8C8C]">
                Each signer must cryptographically sign
              </span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {users.map((u) => {
                const isSelected = selectedSignerIds.includes(u.id);
                const isSelf = u.id === currentUserId;
                return (
                  <div
                    key={u.id}
                    onClick={() => toggleSigner(u.id)}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? isDark
                          ? "bg-[#44444C]/25 border-[#8C8C8C]"
                          : "bg-gray-100 border-[#0B0909]"
                        : isDark
                        ? "border-[#44444C]/40 hover:bg-[#44444C]/10"
                        : "border-[#D6D6D6] hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="w-4 h-4 rounded text-black focus:ring-0 cursor-pointer"
                      />
                      <div>
                        <p className="text-xs sm:text-sm font-semibold flex items-center gap-1.5">
                          <span>{u.name}</span>
                          {isSelf && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded border border-[#8C8C8C]/40 text-[#8C8C8C]">
                              You
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-[#8C8C8C]">{u.email}</p>
                      </div>
                    </div>

                    <span className="text-[10px] text-[#8C8C8C]">
                      {u.hasKey ? "ECDSA Key Active" : "No Key Registered"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || isProcessing || !!existingDocId}
              className={`w-full py-3 rounded-xl text-xs sm:text-sm font-semibold cursor-pointer transition-all flex items-center justify-center gap-2 ${
                existingDocId
                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/30 cursor-not-allowed"
                  : isDark
                  ? "bg-[#D6D6D6] text-[#0B0909] hover:bg-white shadow-lg disabled:opacity-50"
                  : "bg-[#0B0909] text-white hover:bg-gray-800 disabled:opacity-50"
              }`}
            >
              {isSubmitting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Initializing Cryptographic Workflow...</span>
                </>
              ) : existingDocId ? (
                <span>Document Already There (Upload Blocked)</span>
              ) : (
                <span>Upload &amp; Request Signatures</span>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
