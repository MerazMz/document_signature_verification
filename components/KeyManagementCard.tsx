"use client";

import React, { useState } from "react";
import { useKeyManagement } from "@/hooks/useKeyManagement";

interface KeyManagementCardProps {
  userId: number;
  userName: string;
  theme: "dark" | "light";
}

export default function KeyManagementCard({
  userId,
  theme,
}: KeyManagementCardProps) {
  const {
    isLoading,
    hasBackupOnServer,
    isUnlockedOnDevice,
    publicKey,
    fingerprint,
    keyAlgorithm,
    createdAt,
    error,
    initializeKeySetup,
    restorePrivateKey,
  } = useKeyManagement(userId);

  const [passwordInput, setPasswordInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedFingerprint, setCopiedFingerprint] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showFullPublicKey, setShowFullPublicKey] = useState(false);

  const isDark = theme === "dark";

  const handleCopy = (text: string, type: "key" | "fp") => {
    navigator.clipboard.writeText(text);
    if (type === "key") {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } else {
      setCopiedFingerprint(true);
      setTimeout(() => setCopiedFingerprint(false), 2000);
    }
  };

  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setIsSubmitting(true);

    try {
      await initializeKeySetup(passwordInput);
      setPasswordInput("");
      setShowSetupModal(false);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Key setup failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRestoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setIsSubmitting(true);

    try {
      await restorePrivateKey(passwordInput);
      setPasswordInput("");
      setShowRestoreModal(false);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to decrypt key");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadPublicKey = () => {
    if (!publicKey) return;
    const pem = `-----BEGIN PUBLIC KEY-----\n${publicKey.match(/.{1,64}/g)?.join("\n")}\n-----END PUBLIC KEY-----\n`;
    const blob = new Blob([pem], { type: "application/x-pem-file" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `user-${userId}-public-key.pem`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className={`w-full rounded-2xl border p-6 sm:p-7 transition-all ${
        isDark
          ? "border-[#44444C] bg-[#0B0909] text-[#D6D6D6] shadow-xl"
          : "border-[#D6D6D6] bg-white text-[#0B0909] shadow-sm"
      }`}
    >
      {/* Header section with status pill */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-[#44444C]/40">
        <div>
          <div className="flex items-center gap-2">
            <h2
              className={`text-base sm:text-lg font-semibold tracking-tight ${
                isDark ? "text-[#D6D6D6]" : "text-[#0B0909]"
              }`}
            >
              Cryptographic Key Management
            </h2>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase tracking-wider ${
                isDark
                  ? "border-[#44444C] bg-[#44444C]/30 text-[#8C8C8C]"
                  : "border-gray-200 bg-gray-100 text-[#44444C]"
              }`}
            >
              {keyAlgorithm}
            </span>
          </div>
          <p
            className={`text-xs mt-1 ${
              isDark ? "text-[#8C8C8C]" : "text-[#44444C]"
            }`}
          >
            One permanent ECDSA key pair per user. Private keys remain strictly client-side.
          </p>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          {isLoading ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border border-[#44444C] text-[#8C8C8C]">
              <span className="w-2 h-2 rounded-full bg-gray-400 animate-pulse"></span>
              Checking Keys...
            </span>
          ) : isUnlockedOnDevice ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border border-emerald-500/40 bg-emerald-950/20 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Key Active on Device
            </span>
          ) : hasBackupOnServer ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border border-amber-500/40 bg-amber-950/20 text-amber-300">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              Encrypted Backup Available
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border border-[#44444C] text-[#8C8C8C]">
              <span className="w-2 h-2 rounded-full bg-[#8C8C8C]"></span>
              No Key Pair Yet
            </span>
          )}
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div
          className={`mt-4 p-3 rounded-lg border text-xs flex items-center gap-2 ${
            isDark
              ? "border-red-500/40 bg-red-950/20 text-red-300"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Case 1: Active Key on Device */}
      {isUnlockedOnDevice && publicKey && (
        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Fingerprint Card */}
            <div
              className={`p-4 rounded-xl border ${
                isDark
                  ? "border-[#44444C]/60 bg-[#0B0909]/60"
                  : "border-gray-200 bg-gray-50/60"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={`text-[11px] font-semibold uppercase tracking-wider ${
                    isDark ? "text-[#8C8C8C]" : "text-[#44444C]"
                  }`}
                >
                  Key Fingerprint (SHA-256)
                </span>
                <button
                  type="button"
                  onClick={() => fingerprint && handleCopy(fingerprint, "fp")}
                  className={`text-[11px] underline underline-offset-2 transition-colors cursor-pointer ${
                    isDark ? "text-[#D6D6D6] hover:text-white" : "text-[#0B0909] hover:underline"
                  }`}
                >
                  {copiedFingerprint ? "Copied!" : "Copy"}
                </button>
              </div>
              <p className="font-mono text-xs break-all leading-relaxed tracking-wide text-[#D6D6D6]">
                {fingerprint
                  ? fingerprint.match(/.{1,4}/g)?.join(" ")
                  : "Computing..."}
              </p>
            </div>

            {/* Storage & Backup Details */}
            <div
              className={`p-4 rounded-xl border ${
                isDark
                  ? "border-[#44444C]/60 bg-[#0B0909]/60"
                  : "border-gray-200 bg-gray-50/60"
              }`}
            >
              <span
                className={`text-[11px] font-semibold uppercase tracking-wider block mb-1.5 ${
                  isDark ? "text-[#8C8C8C]" : "text-[#44444C]"
                }`}
              >
                Security & Backup State
              </span>
              <ul className="text-xs space-y-1 text-[#8C8C8C]">
                <li className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Private key loaded in browser IndexedDB</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Encrypted backup saved in PostgreSQL</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Ready for document signing & verification</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Public Key Display Area */}
          <div
            className={`p-4 rounded-xl border ${
              isDark
                ? "border-[#44444C]/60 bg-[#0B0909]/40"
                : "border-gray-200 bg-white"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className={`text-[11px] font-semibold uppercase tracking-wider ${
                  isDark ? "text-[#8C8C8C]" : "text-[#44444C]"
                }`}
              >
                Public Key (SPKI Base64)
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowFullPublicKey(!showFullPublicKey)}
                  className={`text-[11px] underline underline-offset-2 transition-colors cursor-pointer ${
                    isDark ? "text-[#8C8C8C] hover:text-[#D6D6D6]" : "text-[#44444C] hover:text-[#0B0909]"
                  }`}
                >
                  {showFullPublicKey ? "Collapse" : "Expand"}
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy(publicKey, "key")}
                  className={`text-[11px] font-medium underline underline-offset-2 transition-colors cursor-pointer ${
                    isDark ? "text-[#D6D6D6] hover:text-white" : "text-[#0B0909] hover:underline"
                  }`}
                >
                  {copiedKey ? "Copied!" : "Copy Key"}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPublicKey}
                  className={`text-[11px] underline underline-offset-2 transition-colors cursor-pointer ${
                    isDark ? "text-[#8C8C8C] hover:text-[#D6D6D6]" : "text-[#44444C] hover:text-[#0B0909]"
                  }`}
                >
                  Download .PEM
                </button>
              </div>
            </div>

            <div
              className={`p-3 rounded-lg border font-mono text-xs break-all leading-relaxed select-all transition-all ${
                isDark
                  ? "bg-[#0B0909] border-[#44444C] text-[#8C8C8C]"
                  : "bg-gray-50 border-gray-200 text-[#44444C]"
              } ${showFullPublicKey ? "max-h-96" : "max-h-16 overflow-hidden relative"}`}
            >
              {publicKey}
              {!showFullPublicKey && (
                <div
                  className={`absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t pointer-events-none ${
                    isDark
                      ? "from-[#0B0909] to-transparent"
                      : "from-gray-50 to-transparent"
                  }`}
                ></div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Case 2: Key exists on server, but not restored on this device (New Device Scenario) */}
      {!isUnlockedOnDevice && hasBackupOnServer && (
        <div className="mt-5 p-5 rounded-xl border border-amber-500/40 bg-amber-950/10 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-amber-300">
                New Device Detected: Private Key Locked
              </h3>
              <p className="text-xs text-amber-200/80 mt-1 leading-relaxed">
                Your encrypted ECDSA signing key backup is stored in the database, but your private key is not on this device yet. Enter your account password to decrypt and restore it locally.
              </p>
            </div>
          </div>

          {!showRestoreModal ? (
            <button
              type="button"
              onClick={() => setShowRestoreModal(true)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                isDark
                  ? "bg-[#D6D6D6] text-[#0B0909] hover:bg-white"
                  : "bg-[#0B0909] text-white hover:bg-black"
              }`}
            >
              Restore Private Key on This Device
            </button>
          ) : (
            <form onSubmit={handleRestoreSubmit} className="space-y-3 pt-2">
              {actionError && (
                <div className="p-2.5 rounded-lg border border-red-500/40 bg-red-950/20 text-red-300 text-xs">
                  {actionError}
                </div>
              )}
              <div>
                <label className="block text-xs font-medium mb-1 text-amber-200">
                  Account Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter your account password..."
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg text-xs font-mono border focus:outline-none ${
                    isDark
                      ? "bg-[#0B0909] border-[#44444C] text-[#D6D6D6] focus:border-amber-400"
                      : "bg-white border-gray-300 text-black focus:border-black"
                  }`}
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 ${
                    isDark
                      ? "bg-[#D6D6D6] text-[#0B0909] hover:bg-white"
                      : "bg-[#0B0909] text-white hover:bg-black"
                  }`}
                >
                  {isSubmitting ? "Decrypting & Restoring..." : "Decrypt & Unlock Key"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowRestoreModal(false);
                    setActionError(null);
                  }}
                  className="px-3 py-2 rounded-lg text-xs text-[#8C8C8C] hover:text-[#D6D6D6] cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Case 3: First-Time Setup (No key on server, no key on device) */}
      {!isUnlockedOnDevice && !hasBackupOnServer && !isLoading && (
        <div className="mt-5 p-5 rounded-xl border border-[#44444C]/60 bg-[#0B0909]/40 space-y-4">
          <div>
            <h3
              className={`text-sm font-semibold mb-1 ${
                isDark ? "text-[#D6D6D6]" : "text-[#0B0909]"
              }`}
            >
              First-Time Key Setup Required
            </h3>
            <p
              className={`text-xs leading-relaxed ${
                isDark ? "text-[#8C8C8C]" : "text-[#44444C]"
              }`}
            >
              Generate your permanent cryptographic ECDSA P-256 key pair. The private key will be encrypted client-side using your account password before an encrypted backup is saved to the database.
            </p>
          </div>

          {!showSetupModal ? (
            <button
              type="button"
              onClick={() => setShowSetupModal(true)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                isDark
                  ? "bg-[#D6D6D6] text-[#0B0909] hover:bg-white"
                  : "bg-[#0B0909] text-white hover:bg-black"
              }`}
            >
              Initialize ECDSA Key Pair
            </button>
          ) : (
            <form onSubmit={handleSetupSubmit} className="space-y-3 pt-2">
              {actionError && (
                <div className="p-2.5 rounded-lg border border-red-500/40 bg-red-950/20 text-red-300 text-xs">
                  {actionError}
                </div>
              )}
              <div>
                <label
                  className={`block text-xs font-medium mb-1 ${
                    isDark ? "text-[#8C8C8C]" : "text-[#44444C]"
                  }`}
                >
                  Confirm Account Password (to derive AES-GCM encryption key)
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter your account password..."
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg text-xs font-mono border focus:outline-none ${
                    isDark
                      ? "bg-[#0B0909] border-[#44444C] text-[#D6D6D6] focus:border-[#8C8C8C]"
                      : "bg-white border-gray-300 text-black focus:border-black"
                  }`}
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 ${
                    isDark
                      ? "bg-[#D6D6D6] text-[#0B0909] hover:bg-white"
                      : "bg-[#0B0909] text-white hover:bg-black"
                  }`}
                >
                  {isSubmitting ? "Generating & Encrypting..." : "Generate & Store Backup"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSetupModal(false);
                    setActionError(null);
                  }}
                  className="px-3 py-2 rounded-lg text-xs text-[#8C8C8C] hover:text-[#D6D6D6] cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Footer info notice */}
      <div className="mt-5 pt-4 border-t border-[#44444C]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] text-[#8C8C8C] gap-2">
        <div className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>PBKDF2-HMAC-SHA256 (100k iters) + AES-GCM-256 Client-Side Encryption</span>
        </div>
        {createdAt && (
          <div>
            Registered: {new Date(createdAt).toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  );
}
