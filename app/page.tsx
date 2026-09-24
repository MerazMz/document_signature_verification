"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Sidebar, { NavigationTab } from "@/components/Sidebar";
import TopHeader from "@/components/TopHeader";
import DashboardOverview, { DocumentItem } from "@/components/DashboardOverview";
import MyDocumentsView from "@/components/MyDocumentsView";
import DocumentDetailView from "@/components/DocumentDetailView";
import UploadDocumentView from "@/components/UploadDocumentView";
import SignDocumentView from "@/components/SignDocumentView";
import VerifyDocumentView from "@/components/VerifyDocumentView";
import AuditTrailView from "@/components/AuditTrailView";
import KeyManagementCard from "@/components/KeyManagementCard";

interface UserProfile {
  id: number;
  name: string;
  email: string;
}

export default function AppMainPage() {
  const router = useRouter();
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<NavigationTab>("dashboard");
  const [selectedDocForDetails, setSelectedDocForDetails] = useState<DocumentItem | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Global documents state
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [, setIsDocsLoading] = useState(true);
  const [verifyInitialDocId, setVerifyInitialDocId] = useState<number | undefined>(undefined);

  // Load saved theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem("docsign_theme") as "dark" | "light" | null;
    if (savedTheme === "dark" || savedTheme === "light") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTheme(savedTheme);
    }

    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        setUser(null);
      } finally {
        setIsAuthLoading(false);
      }
    };

    checkAuth();
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("docsign_theme", next);
  };

  const fetchDocuments = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/documents");
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (err) {
      console.error("Error fetching documents:", err);
    } finally {
      setIsDocsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchDocuments();
    }
  }, [user, fetchDocuments]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      router.push("/login");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const handleSelectDocument = (doc: DocumentItem) => {
    setSelectedDocForDetails(doc);
  };

  const handleSignDocument = () => {
    setSelectedDocForDetails(null);
    setActiveTab("sign");
  };

  const handleVerifyDocument = (docId: number) => {
    setSelectedDocForDetails(null);
    setVerifyInitialDocId(docId);
    setActiveTab("verify");
  };

  const handleUploadSuccess = () => {
    fetchDocuments();
    setActiveTab("documents");
  };

  const handleSignComplete = () => {
    fetchDocuments();
  };

  const isDark = theme === "dark";

  // Loading state
  if (isAuthLoading) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${
          isDark ? "bg-[#0B0909] text-[#D6D6D6]" : "bg-white text-[#0B0909]"
        }`}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-inherit border-t-transparent animate-spin" />
          <p className="text-xs text-[#8C8C8C]">Initializing SignVault...</p>
        </div>
      </div>
    );
  }

  // If NOT logged in, show Hero Landing Page (Screen 1 in mockup)
  if (!user) {
    return (
      <div
        className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
          isDark
            ? "bg-[#0B0909] text-[#D6D6D6] selection:bg-[#44444C] selection:text-white"
            : "bg-white text-[#0B0909] selection:bg-gray-200"
        }`}
      >
        {/* Navbar */}
        <header className="h-20 max-w-7xl w-full mx-auto px-6 sm:px-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shadow-md ${
                isDark ? "bg-[#44444C]/50 border border-[#8C8C8C]/40 text-[#D6D6D6]" : "bg-[#0B0909] text-white"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <span className="font-bold text-lg tracking-tight">SignVault</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-xl border text-xs cursor-pointer ${
                isDark ? "border-[#44444C] hover:bg-[#44444C]/30" : "border-[#D6D6D6] hover:bg-gray-100"
              }`}
            >
              {isDark ? "Light" : "Dark"}
            </button>
            <Link
              href="/login"
              className={`text-xs font-semibold px-4 py-2 rounded-xl transition-colors ${
                isDark ? "text-[#D6D6D6] hover:text-white" : "text-[#0B0909] hover:text-gray-600"
              }`}
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className={`text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-md ${
                isDark ? "bg-[#D6D6D6] text-[#0B0909] hover:bg-white" : "bg-[#0B0909] text-white hover:bg-gray-800"
              }`}
            >
              Get Started
            </Link>
          </div>
        </header>

        {/* Hero Section */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-6 sm:px-10 py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#44444C]/50 bg-[#44444C]/20 text-[11px] font-medium text-[#8C8C8C]">
              <span>Secure</span>
              <span>•</span>
              <span>Private</span>
              <span>•</span>
              <span>Tamper-Evident</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.1]">
              Sign. Verify. <br />
              <span className={isDark ? "text-white" : "text-[#0B0909]"}>Trust Always.</span>
            </h1>

            <p className="text-sm sm:text-base text-[#8C8C8C] max-w-md leading-relaxed">
              A zero-knowledge document signing platform with ECDSA P-256 cryptographic verification, multi-party signing workflows, and immutable hash-chained audit trails.
            </p>

            <div className="flex items-center gap-4 pt-2">
              <Link
                href="/signup"
                className={`px-6 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-lg ${
                  isDark ? "bg-[#D6D6D6] text-[#0B0909] hover:bg-white" : "bg-[#0B0909] text-white hover:bg-gray-800"
                }`}
              >
                Get Started
              </Link>
              <Link
                href="/login"
                className={`px-6 py-3 rounded-xl text-xs sm:text-sm font-semibold border transition-colors ${
                  isDark ? "border-[#44444C] text-[#D6D6D6] hover:bg-[#44444C]/30" : "border-[#D6D6D6] text-[#0B0909] hover:bg-gray-100"
                }`}
              >
                Sign In
              </Link>
            </div>
          </div>

          {/* Right Hero Graphic: Stacked Cryptographic Cards */}
          <div className="relative flex items-center justify-center">
            <div
              className={`w-full max-w-md p-8 rounded-3xl border shadow-2xl relative transition-transform hover:scale-[1.02] ${
                isDark
                  ? "bg-[#0B0909] border-[#44444C] shadow-black"
                  : "bg-white border-[#D6D6D6] shadow-xl"
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20 flex items-center justify-center font-bold text-sm mb-6">
                PDF
              </div>
              <h3 className="font-bold text-lg">Project Agreement.pdf</h3>
              <p className="text-xs text-[#8C8C8C] mt-1">
                SHA-256: 9e0e51f728b762da9a8e588c649732b45ea4...
              </p>

              <div className="mt-6 pt-6 border-t border-inherit flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-semibold text-emerald-400">Cryptographically Signed</span>
                </div>
                <span className="text-[11px] font-mono text-[#8C8C8C]">ECDSA P-256</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Authenticated Dashboard Layout
  const pendingCount = documents.filter((d) => d.user_signing_status === "PENDING").length;

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
        isDark
          ? "bg-[#0B0909] text-[#D6D6D6] selection:bg-[#44444C] selection:text-white"
          : "bg-white text-[#0B0909] selection:bg-gray-200"
      }`}
    >
      {/* Persistent Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setSelectedDocForDetails(null);
          setActiveTab(tab);
        }}
        pendingSignaturesCount={pendingCount}
        theme={theme}
        isOpenOnMobile={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        user={user}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div className="md:pl-64 flex flex-col min-h-screen">
        {/* Sticky Top Header */}
        <TopHeader
          activeTab={selectedDocForDetails ? "documents" : activeTab}
          user={user}
          theme={theme}
          onToggleTheme={toggleTheme}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          onActionClick={(tab) => {
            setSelectedDocForDetails(null);
            setActiveTab(tab);
          }}
        />

        {/* Dynamic View Container */}
        <main className="flex-1 p-6 sm:p-8 lg:p-10 max-w-7xl w-full mx-auto">
          {/* If a document detail is open */}
          {selectedDocForDetails ? (
            <DocumentDetailView
              document={selectedDocForDetails}
              currentUserId={user.id}
              theme={theme}
              onBack={() => setSelectedDocForDetails(null)}
              onSign={handleSignDocument}
              onVerify={handleVerifyDocument}
            />
          ) : activeTab === "dashboard" ? (
            <DashboardOverview
              documents={documents}
              currentUserId={user.id}
              theme={theme}
              onNavigate={(tab) => {
                setSelectedDocForDetails(null);
                setActiveTab(tab);
              }}
              onSelectDocument={handleSelectDocument}
              onSignDocument={handleSignDocument}
            />
          ) : activeTab === "documents" ? (
            <MyDocumentsView
              documents={documents}
              theme={theme}
              onSelectDocument={handleSelectDocument}
              onSignDocument={handleSignDocument}
              onNavigateToUpload={() => setActiveTab("upload")}
            />
          ) : activeTab === "upload" ? (
            <UploadDocumentView
              currentUserId={user.id}
              theme={theme}
              onSuccess={handleUploadSuccess}
            />
          ) : activeTab === "sign" ? (
            <SignDocumentView
              documents={documents}
              currentUserId={user.id}
              theme={theme}
              onSignComplete={handleSignComplete}
              onNavigateToSettings={() => setActiveTab("settings")}
            />
          ) : activeTab === "verify" ? (
            <VerifyDocumentView
              theme={theme}
              initialDocumentId={verifyInitialDocId}
            />
          ) : activeTab === "audit" ? (
            <AuditTrailView
              documents={documents}
              theme={theme}
            />
          ) : activeTab === "settings" ? (
            <div className="max-w-2xl mx-auto">
              <KeyManagementCard
                userId={user.id}
                userName={user.name}
                theme={theme}
              />
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
