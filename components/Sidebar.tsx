"use client";

import React from "react";

export type NavigationTab =
  | "dashboard"
  | "documents"
  | "upload"
  | "sign"
  | "verify"
  | "audit"
  | "settings";

interface SidebarProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  pendingSignaturesCount: number;
  theme: "dark" | "light";
  isOpenOnMobile: boolean;
  onCloseMobile: () => void;
  user: {
    id: number;
    name: string;
    email: string;
  } | null;
  onLogout: () => void;
}

export default function Sidebar({
  activeTab,
  onSelectTab,
  pendingSignaturesCount,
  theme,
  isOpenOnMobile,
  onCloseMobile,
  user,
  onLogout,
}: SidebarProps) {
  const isDark = theme === "dark";

  const navItems: {
    id: NavigationTab;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }[] = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
    },
    {
      id: "documents",
      label: "My Documents",
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      ),
    },
    {
      id: "upload",
      label: "Upload Document",
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      ),
    },
    {
      id: "sign",
      label: "Sign Document",
      badge: pendingSignaturesCount > 0 ? pendingSignaturesCount : undefined,
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      ),
    },
    {
      id: "verify",
      label: "Verify Document",
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
    {
      id: "audit",
      label: "Audit Trail",
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenOnMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 flex flex-col border-r transition-transform duration-300 md:translate-x-0 ${
          isOpenOnMobile ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        } ${
          isDark
            ? "bg-[#0B0909] border-[#44444C]/60 text-[#D6D6D6]"
            : "bg-white border-[#D6D6D6] text-[#0B0909]"
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-inherit">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shadow-md transition-transform hover:scale-105 ${
                isDark
                  ? "bg-[#44444C]/50 border border-[#8C8C8C]/40 text-[#D6D6D6]"
                  : "bg-[#0B0909] text-white"
              }`}
            >
              {/* Vault / Shield icon */}
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <div>
              <span className="font-semibold text-lg tracking-tight block leading-none">
                SignVault
              </span>
              <span className="text-[10px] tracking-wider uppercase text-[#8C8C8C] font-medium">
                Cryptographic Suite
              </span>
            </div>
          </div>

          {/* Close button for mobile */}
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 rounded-lg text-[#8C8C8C] hover:text-[#D6D6D6] hover:bg-[#44444C]/30"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-5 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                  isActive
                    ? isDark
                      ? "bg-[#44444C]/40 text-[#D6D6D6] border border-[#8C8C8C]/30 shadow-xs"
                      : "bg-[#0B0909] text-white shadow-sm"
                    : isDark
                    ? "text-[#8C8C8C] hover:text-[#D6D6D6] hover:bg-[#44444C]/20 border border-transparent"
                    : "text-[#44444C] hover:text-[#0B0909] hover:bg-gray-100 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={isActive ? (isDark ? "text-[#D6D6D6]" : "text-white") : "text-inherit"}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && (
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      isActive
                        ? isDark
                          ? "bg-[#D6D6D6] text-[#0B0909]"
                          : "bg-white text-[#0B0909]"
                        : isDark
                        ? "bg-[#44444C] text-[#D6D6D6]"
                        : "bg-gray-200 text-[#0B0909]"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer: Settings & User Profile */}
        <div className="p-3 border-t border-inherit space-y-2">
          {/* Settings Tab */}
          <button
            onClick={() => {
              onSelectTab("settings");
              onCloseMobile();
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${
              activeTab === "settings"
                ? isDark
                  ? "bg-[#44444C]/40 text-[#D6D6D6] border border-[#8C8C8C]/30"
                  : "bg-[#0B0909] text-white"
                : isDark
                ? "text-[#8C8C8C] hover:text-[#D6D6D6] hover:bg-[#44444C]/20 border border-transparent"
                : "text-[#44444C] hover:text-[#0B0909] hover:bg-gray-100 border border-transparent"
            }`}
          >
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Settings / Keys</span>
          </button>

          {/* User Profile Mini Bar */}
          {user && (
            <div
              className={`p-2.5 rounded-xl border flex items-center justify-between ${
                isDark
                  ? "bg-[#0B0909] border-[#44444C]/40"
                  : "bg-gray-50 border-[#D6D6D6]"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-xs shrink-0 ${
                    isDark
                      ? "bg-[#44444C] text-[#D6D6D6]"
                      : "bg-[#0B0909] text-white"
                  }`}
                >
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate leading-tight">
                    {user.name}
                  </p>
                  <p className="text-[11px] text-[#8C8C8C] truncate leading-tight mt-0.5">
                    {user.email}
                  </p>
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={onLogout}
                title="Log out"
                className={`p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
                  isDark
                    ? "text-[#8C8C8C] hover:text-red-400 hover:bg-[#44444C]/30"
                    : "text-gray-500 hover:text-red-600 hover:bg-gray-200"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
