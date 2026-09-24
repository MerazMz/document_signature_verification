"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Load saved theme from localStorage on initial client mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("docsign_theme") as "dark" | "light" | null;
    if (savedTheme === "dark" || savedTheme === "light") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTheme(savedTheme);
    }
  }, []);

  // Toggle theme and persist
  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("docsign_theme", nextTheme);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to login");
      }

      // Route to home on success
      router.push("/");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || "An unexpected error occurred");
      } else {
        setError("An unexpected error occurred");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isDark = theme === "dark";

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-200 ${
        isDark
          ? "bg-[#0B0909] text-[#D6D6D6] selection:bg-[#44444C] selection:text-white"
          : "bg-[#F8F9FA] text-[#0B0909] selection:bg-[#D6D6D6] selection:text-black"
      }`}
    >
      {/* Top Header */}
      <header
        className={`sticky top-0 z-30 border-b backdrop-blur-md transition-colors duration-200 ${
          isDark
            ? "border-[#44444C]/50 bg-[#0B0909]/90"
            : "border-[#D6D6D6]/80 bg-white/90 shadow-xs"
        }`}
      >
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo & System Badge */}
          <Link href="/" className="flex items-center space-x-3 cursor-pointer">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center font-semibold text-sm shadow-sm transition-colors ${
                isDark
                  ? "bg-[#44444C]/40 border border-[#8C8C8C]/40 text-[#D6D6D6]"
                  : "bg-[#0B0909] text-white border border-[#0B0909]"
              }`}
            >
              §
            </div>
            <div>
              <span
                className={`font-semibold text-base tracking-wide ${
                  isDark ? "text-[#D6D6D6]" : "text-[#0B0909]"
                }`}
              >
                DocSign
              </span>
            </div>
          </Link>

          {/* Right Header items: Theme toggle + status */}
          <div className="flex items-center space-x-3 sm:space-x-4 text-xs">
            {/* Dark / Light Mode Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle dark and light mode"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                isDark
                  ? "border-[#44444C] bg-[#0B0909] text-[#D6D6D6] hover:border-[#8C8C8C] hover:bg-[#44444C]/30"
                  : "border-[#D6D6D6] bg-white text-[#0B0909] hover:border-[#8C8C8C] hover:bg-gray-100 shadow-xs"
              }`}
            >
              {isDark ? (
                <>
                  <svg className="w-4 h-4 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 9h1m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 text-[#0B0909]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                  <span>Dark Mode</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full mx-auto px-6 py-10 flex flex-col justify-center items-center">
        <div className={`w-full max-w-md p-8 sm:p-10 rounded-2xl border transition-all shadow-2xl ${
          isDark
            ? "border-[#44444C] bg-[#0B0909] shadow-black/50"
            : "border-[#D6D6D6] bg-white shadow-gray-200/50"
        }`}>
          <div className="text-center mb-8">
            <h1 className={`text-2xl font-semibold tracking-tight mb-2 transition-colors ${
              isDark ? "text-[#D6D6D6]" : "text-[#0B0909]"
            }`}>
              Welcome back
            </h1>
            <p className={`text-sm transition-colors ${
              isDark ? "text-[#8C8C8C]" : "text-[#44444C]"
            }`}>
              Sign in to your DocSign account
            </p>
          </div>

          {error && (
            <div className={`mb-6 p-3 rounded-lg border text-xs flex items-center gap-2 ${
              isDark
                ? "border-red-500/40 bg-red-950/20 text-red-300"
                : "border-red-200 bg-red-50 text-red-700"
            }`}>
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label htmlFor="email" className={`block text-xs font-medium mb-1.5 ${
                isDark ? "text-[#8C8C8C]" : "text-[#44444C]"
              }`}>
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full px-4 py-2.5 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 ${
                  isDark
                    ? "bg-[#0B0909] border-[#44444C] text-[#D6D6D6] focus:border-[#8C8C8C] focus:ring-[#8C8C8C]/20 placeholder-[#44444C]"
                    : "bg-white border-[#D6D6D6] text-[#0B0909] focus:border-[#8C8C8C] focus:ring-gray-200 placeholder-gray-400"
                }`}
                placeholder="you@example.com"
              />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className={`block text-xs font-medium ${
                  isDark ? "text-[#8C8C8C]" : "text-[#44444C]"
                }`}>
                  Password
                </label>
                <a href="#" className={`text-xs hover:underline transition-colors ${
                  isDark ? "text-[#8C8C8C] hover:text-[#D6D6D6]" : "text-[#44444C] hover:text-[#0B0909]"
                }`}>
                  Forgot password?
                </a>
              </div>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full px-4 py-2.5 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 ${
                  isDark
                    ? "bg-[#0B0909] border-[#44444C] text-[#D6D6D6] focus:border-[#8C8C8C] focus:ring-[#8C8C8C]/20 placeholder-[#44444C]"
                    : "bg-white border-[#D6D6D6] text-[#0B0909] focus:border-[#8C8C8C] focus:ring-gray-200 placeholder-gray-400"
                }`}
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed ${
                isDark
                  ? "bg-[#D6D6D6] text-[#0B0909] hover:bg-white focus:ring-[#D6D6D6] focus:ring-offset-[#0B0909]"
                  : "bg-[#0B0909] text-white hover:bg-black focus:ring-[#0B0909] focus:ring-offset-white"
              }`}
            >
              {isLoading ? (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : "Sign in"}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className={`text-xs transition-colors ${
              isDark ? "text-[#8C8C8C]" : "text-[#44444C]"
            }`}>
              Don&apos;t have an account?{" "}
              <Link href="/signup" className={`font-medium hover:underline transition-colors ${
                isDark ? "text-[#D6D6D6]" : "text-[#0B0909]"
              }`}>
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
