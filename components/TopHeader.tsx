"use client";

import React from "react";
import { NavigationTab } from "./Sidebar";

interface TopHeaderProps {
  activeTab: NavigationTab;
  user: {
    id: number;
    name: string;
    email: string;
  } | null;
  theme: "dark" | "light";
  onToggleTheme: () => void;
  onOpenMobileSidebar: () => void;
  onActionClick?: (tab: NavigationTab) => void;
}

export default function TopHeader({
  activeTab,
  user,
  theme,
  onToggleTheme,
  onOpenMobileSidebar,
  onActionClick,
}: TopHeaderProps) {
  const isDark = theme === "dark";

  const getTitles = () => {
    switch (activeTab) {
      case "dashboard":
        return {
          title: "Dashboard",
          subtitle: user ? `Welcome back, ${user.name}.` : "Welcome back.",
        };
      case "documents":
        return {
          title: "My Documents",
          subtitle: "Browse, track, and inspect all cryptographic documents.",
        };
      case "upload":
        return {
          title: "Upload Document",
          subtitle: "Upload a PDF document to get started.",
        };
      case "sign":
        return {
          title: "Sign Document",
          subtitle: "Review document details and sign using your secure key.",
        };
      case "verify":
        return {
          title: "Verify Document",
          subtitle: "Upload a document or provide details to verify signatures.",
        };
      case "audit":
        return {
          title: "Audit Trail",
          subtitle: "Complete tamper-evident history of all activities.",
        };
      case "settings":
        return {
          title: "Settings & Keys",
          subtitle: "Manage your ECDSA P-256 cryptographic identity and local keys.",
        };
    }
  };

  const { title, subtitle } = getTitles();

  return (
    <header
      className={`h-20 px-6 sm:px-8 flex items-center justify-between border-b transition-colors sticky top-0 z-30 ${
        isDark
          ? "bg-[#0B0909]/90 border-[#44444C]/60 backdrop-blur-md text-[#D6D6D6]"
          : "bg-white/90 border-[#D6D6D6] backdrop-blur-md text-[#0B0909]"
      }`}
    >
      <div className="flex items-center gap-4">
        {/* Mobile Hamburger */}
        <button
          onClick={onOpenMobileSidebar}
          className="md:hidden p-2 rounded-lg text-[#8C8C8C] hover:text-[#D6D6D6] hover:bg-[#44444C]/30"
          aria-label="Open navigation menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Page Title & Subtitle */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight leading-tight">
            {title}
          </h1>
          <p className="text-xs sm:text-sm text-[#8C8C8C] font-normal leading-tight mt-0.5">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Quick Upload action shortcut if not on upload page */}
        {activeTab !== "upload" && onActionClick && (
          <button
            onClick={() => onActionClick("upload")}
            className={`hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              isDark
                ? "bg-[#D6D6D6] text-[#0B0909] hover:bg-white hover:shadow-md"
                : "bg-[#0B0909] text-white hover:bg-gray-800"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Upload Document</span>
          </button>
        )}

        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label="Toggle dark and light mode"
          className={`flex items-center justify-center w-9 h-9 rounded-xl border transition-all cursor-pointer ${
            isDark
              ? "border-[#44444C] bg-[#0B0909] text-[#D6D6D6] hover:border-[#8C8C8C] hover:bg-[#44444C]/30"
              : "border-[#D6D6D6] bg-white text-[#0B0909] hover:border-[#8C8C8C] hover:bg-gray-100 shadow-xs"
          }`}
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDark ? (
            <svg className="w-4 h-4 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 9h1m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-[#0B0909]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>

        {/* User Pill Display */}
        {user && (
          <div
            className={`hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-full border ${
              isDark
                ? "bg-[#0B0909] border-[#44444C]/80 text-[#D6D6D6]"
                : "bg-gray-50 border-[#D6D6D6] text-[#0B0909]"
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] ${
                isDark ? "bg-[#44444C] text-white" : "bg-[#0B0909] text-white"
              }`}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs font-medium tracking-tight">
              {user.name}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
