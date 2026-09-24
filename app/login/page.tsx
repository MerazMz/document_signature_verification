"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getLocalKeyPair,
  saveLocalKeyPair,
  generateECDSAKeyPair,
  encryptPrivateKey,
  decryptPrivateKey,
  importPublicKeySpki,
  computeKeyFingerprint,
} from "@/lib/crypto";

export default function LoginPage() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const savedTheme = localStorage.getItem("docsign_theme") as "dark" | "light" | null;
    if (savedTheme === "dark" || savedTheme === "light") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTheme(savedTheme);
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("docsign_theme", nextTheme);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    setLoadingStep("Authenticating credentials...");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to log in");
      }

      // Auto-unlock or initialize ECDSA P-256 key pair
      const userId = data.userId;
      if (userId) {
        try {
          setLoadingStep("Synchronizing cryptographic keys...");
          const localRecord = await getLocalKeyPair(userId);
          const keyRes = await fetch("/api/keys");
          const keyData = await keyRes.json();

          if (keyData.hasKey) {
            // Restore from encrypted backup if not already unlocked
            if (!localRecord?.privateKey) {
              setLoadingStep("Decrypting ECDSA private key with account password...");
              const backup = {
                publicKey: keyData.publicKey,
                encryptedPrivateKey: keyData.encryptedPrivateKey,
                kdfSalt: keyData.kdfSalt,
                kdfIterations: keyData.kdfIterations,
                iv: keyData.iv,
                keyAlgorithm: keyData.keyAlgorithm,
                createdAt: keyData.createdAt,
              };
              const decryptedPrivateKey = await decryptPrivateKey(backup, password);
              const importedPublicKey = await importPublicKeySpki(backup.publicKey);
              const fp = await computeKeyFingerprint(backup.publicKey);
              await saveLocalKeyPair(
                userId,
                decryptedPrivateKey,
                importedPublicKey,
                backup.publicKey,
                fp
              );
            }
          } else {
            // First time setup for this user: generate and register key
            setLoadingStep("Generating first-time ECDSA P-256 key pair...");
            const keyPair = await generateECDSAKeyPair();
            const encryptedBackup = await encryptPrivateKey(
              keyPair.privateKey,
              password,
              keyPair.publicKeySpki
            );
            await fetch("/api/keys", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(encryptedBackup),
            });
            await saveLocalKeyPair(
              userId,
              keyPair.privateKey,
              keyPair.publicKey,
              keyPair.publicKeySpki,
              keyPair.fingerprint
            );
          }
        } catch (keyErr) {
          console.warn("Auto key sync notice:", keyErr);
        }
      }

      router.push("/");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || "An unexpected error occurred");
      } else {
        setError("An unexpected error occurred");
      }
    } finally {
      setIsLoading(false);
      setLoadingStep("");
    }
  };

  const isDark = theme === "dark";

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
        isDark
          ? "bg-[#0B0909] text-[#D6D6D6] selection:bg-[#44444C] selection:text-white"
          : "bg-white text-[#0B0909] selection:bg-gray-200"
      }`}
    >
      {/* Top Header */}
      <header className="h-16 px-6 sm:px-10 flex items-center justify-between border-b border-inherit">
        <Link href="/" className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm shadow-md ${
              isDark ? "bg-[#44444C]/50 border border-[#8C8C8C]/40 text-[#D6D6D6]" : "bg-[#0B0909] text-white"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <span className="font-bold text-base tracking-tight">SignVault</span>
        </Link>

        <button
          onClick={toggleTheme}
          className={`p-2 rounded-xl border text-xs cursor-pointer ${
            isDark ? "border-[#44444C] hover:bg-[#44444C]/30" : "border-[#D6D6D6] hover:bg-gray-100"
          }`}
        >
          {isDark ? "Light Mode" : "Dark Mode"}
        </button>
      </header>

      {/* Main Split Layout */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 sm:px-10 py-12 flex items-center">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 w-full items-center">
          {/* Left Form Column */}
          <div className="max-w-md w-full mx-auto lg:mx-0 space-y-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Welcome back
              </h1>
              <p className="text-xs sm:text-sm text-[#8C8C8C] mt-1">
                Enter your credentials to access your secure cryptographic vault.
              </p>
            </div>

            {error && (
              <div
                className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
                  isDark
                    ? "border-rose-500/40 bg-rose-950/20 text-rose-300"
                    : "border-rose-200 bg-rose-50 text-rose-700"
                }`}
              >
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#8C8C8C] mb-1.5 uppercase tracking-wider">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alice@example.com"
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-all focus:outline-none ${
                    isDark
                      ? "bg-[#0B0909] border-[#44444C] text-[#D6D6D6] focus:border-[#8C8C8C]"
                      : "bg-white border-[#D6D6D6] text-[#0B0909] focus:border-[#8C8C8C]"
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8C8C8C] mb-1.5 uppercase tracking-wider">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-all focus:outline-none ${
                    isDark
                      ? "bg-[#0B0909] border-[#44444C] text-[#D6D6D6] focus:border-[#8C8C8C]"
                      : "bg-white border-[#D6D6D6] text-[#0B0909] focus:border-[#8C8C8C]"
                  }`}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-3 rounded-xl text-xs sm:text-sm font-semibold cursor-pointer transition-all flex items-center justify-center gap-2 ${
                  isDark
                    ? "bg-[#D6D6D6] text-[#0B0909] hover:bg-white shadow-lg disabled:opacity-50"
                    : "bg-[#0B0909] text-white hover:bg-gray-800 disabled:opacity-50"
                }`}
              >
                {isLoading ? loadingStep || "Signing in..." : "Sign In"}
              </button>
            </form>

            <p className="text-center text-xs text-[#8C8C8C]">
              Don&apos;t have an account yet?{" "}
              <Link href="/signup" className="font-semibold text-inherit underline">
                Create an account
              </Link>
            </p>
          </div>

          {/* Right Features Column */}
          <div className="hidden lg:flex flex-col gap-6 pl-8 border-l border-inherit">
            <div className="flex items-start gap-4">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                  isDark ? "bg-[#44444C]/30 text-[#D6D6D6]" : "bg-gray-100 text-gray-800"
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-sm">End-to-End Security</h4>
                <p className="text-xs text-[#8C8C8C] mt-0.5">
                  Your private keys stay strictly within your browser. Only encrypted backups are retained.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                  isDark ? "bg-[#44444C]/30 text-[#D6D6D6]" : "bg-gray-100 text-gray-800"
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-sm">Cryptographic Signatures</h4>
                <p className="text-xs text-[#8C8C8C] mt-0.5">
                  Industry standard ECDSA P-256 signatures with SHA-256 digest hashing.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                  isDark ? "bg-[#44444C]/30 text-[#D6D6D6]" : "bg-gray-100 text-gray-800"
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-sm">Tamper-Evident Audit Trail</h4>
                <p className="text-xs text-[#8C8C8C] mt-0.5">
                  Every upload, signature, and verification is anchored into an immutable hash chain.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
