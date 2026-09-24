"use client";

import React, { useState, useRef, useCallback, useTransition, useEffect } from "react";

interface FileDetails {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  magicHeader: string;
  byteCount: number;
  processingTimeMs: number;
}

export default function DocumentSignaturePage() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [file, setFile] = useState<File | null>(null);
  const [fileDetails, setFileDetails] = useState<FileDetails | null>(null);
  const [hash, setHash] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [compareHash, setCompareHash] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState<boolean>(false);
  const [byteSnippet, setByteSnippet] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [, startTransition] = useTransition();

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

  // Function to compute SHA-256 from ArrayBuffer using native Web Crypto API
  const computeSHA256 = async (buffer: ArrayBuffer): Promise<string> => {
    const digest = await window.crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(digest));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  // Process the selected file
  const processFile = useCallback(async (selectedFile: File) => {
    setErrorMsg(null);

    // Validate PDF
    const isPdf =
      selectedFile.type === "application/pdf" ||
      selectedFile.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      setErrorMsg("Please upload a valid PDF document (.pdf).");
      return;
    }

    setFile(selectedFile);
    setIsProcessing(true);
    setCopied(false);
    setCompareHash("");

    const startTime = performance.now();

    try {
      // 1. Read binary bytes
      const arrayBuffer = await selectedFile.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);

      // 2. Extract first 32 bytes for magic header and hex inspection
      const firstBytesCount = Math.min(32, uint8.length);
      const snippetBytes = Array.from(uint8.slice(0, firstBytesCount));
      const hexSnippet = snippetBytes
        .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
        .join(" ");

      // ASCII representation
      const asciiSnippet = snippetBytes
        .map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : "."))
        .join("");

      // Magic header test (PDF files typically start with %PDF)
      const headerString = asciiSnippet.slice(0, 8);

      // 3. Generate SHA-256 Hash
      const generatedHash = await computeSHA256(arrayBuffer);
      const endTime = performance.now();

      startTransition(() => {
        setHash(generatedHash);
        setByteSnippet(`${hexSnippet}  |  ${asciiSnippet}`);
        setFileDetails({
          name: selectedFile.name,
          size: selectedFile.size,
          type: selectedFile.type || "application/pdf",
          lastModified: selectedFile.lastModified,
          magicHeader: headerString,
          byteCount: arrayBuffer.byteLength,
          processingTimeMs: Math.round((endTime - startTime) * 10) / 10,
        });
        setIsProcessing(false);
      });
    } catch (err) {
      console.error("Error processing PDF:", err);
      setErrorMsg("Failed to read file bytes or calculate SHA-256 hash.");
      setIsProcessing(false);
    }
  }, []);

  // Handle Drag & Drop
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  // Generate a sample PDF dynamically if the user wants to test right away
  const handleLoadSamplePdf = () => {
    const samplePdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 53 >>
stream
BT
/F1 24 Tf
100 700 Td
(Document Signature Sample) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000206 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
310
%%EOF`;

    const blob = new Blob([samplePdfContent], { type: "application/pdf" });
    const sampleFile = new File([blob], "sample-contract-v1.pdf", {
      type: "application/pdf",
      lastModified: Date.now(),
    });
    processFile(sampleFile);
  };

  // Copy hash to clipboard
  const handleCopyHash = () => {
    if (!hash) return;
    navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  // Download hash file
  const handleDownloadHash = () => {
    if (!hash || !fileDetails) return;
    const content = `# SHA-256 Digest for ${fileDetails.name}
# Generated: ${new Date().toISOString()}
# Total Bytes: ${fileDetails.byteCount}

${hash}  ${fileDetails.name}
`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileDetails.name}.sha256`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Reset
  const handleReset = () => {
    setFile(null);
    setFileDetails(null);
    setHash("");
    setErrorMsg(null);
    setCompareHash("");
    setByteSnippet("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  // Verification matching
  const cleanedCompare = compareHash.trim().toLowerCase();
  const isMatch = cleanedCompare.length > 0 && cleanedCompare === hash.toLowerCase();
  const isMismatch = cleanedCompare.length > 0 && cleanedCompare !== hash.toLowerCase();

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
          <div className="flex items-center space-x-3">
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
              <span
                className={`ml-2 text-xs font-medium px-2 py-0.5 rounded border transition-colors ${
                  isDark
                    ? "border-[#44444C] text-[#8C8C8C] bg-[#0B0909]"
                    : "border-[#D6D6D6] text-[#44444C] bg-[#F1F2F4]"
                }`}
              >
                SHA-256 Engine
              </span>
            </div>
          </div>

          {/* Right Header items: Theme toggle + status */}
          <div className="flex items-center space-x-3 sm:space-x-4 text-xs">
            {/* Status indicator */}
            <div
              className={`hidden md:flex items-center space-x-2 ${
                isDark ? "text-[#8C8C8C]" : "text-[#44444C]"
              }`}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#8C8C8C] opacity-60"></span>
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    isDark ? "bg-[#D6D6D6]" : "bg-emerald-500"
                  }`}
                ></span>
              </span>
              <span>Client-side Isolated</span>
            </div>

            <span className={isDark ? "text-[#44444C]" : "text-[#D6D6D6]"}>|</span>

            {/* Dark / Light Mode Toggle Button */}
            <button
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
                  {/* Sun Icon for Dark -> Light */}
                  <svg
                    className="w-4 h-4 text-amber-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 3v1m0 16v1m9-9h-1M4 9h1m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  {/* Moon Icon for Light -> Dark */}
                  <svg
                    className="w-4 h-4 text-[#0B0909]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                    />
                  </svg>
                  <span>Dark Mode</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-10 flex flex-col justify-center">
        {/* Title & Introduction */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs mb-4 transition-colors ${
              isDark
                ? "border-[#44444C] bg-[#0B0909] text-[#8C8C8C]"
                : "border-[#D6D6D6] bg-white text-[#44444C] shadow-xs"
            }`}
          >
            <svg
              className={`w-3.5 h-3.5 ${isDark ? "text-[#D6D6D6]" : "text-[#0B0909]"}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            Cryptographic Document Signature Process
          </div>

          <h1
            className={`text-3xl sm:text-4xl font-semibold tracking-tight mb-3 transition-colors ${
              isDark ? "text-[#D6D6D6]" : "text-[#0B0909]"
            }`}
          >
            Document Hash Generator
          </h1>
          <p
            className={`text-sm sm:text-base leading-relaxed transition-colors ${
              isDark ? "text-[#8C8C8C]" : "text-[#44444C]"
            }`}
          >
            Upload any PDF to extract its raw binary payload, compute its immutable
            SHA-256 cryptographic digest, and prepare it for electronic signature.
          </p>
        </div>

        {/* 4-Step Process Pipeline Indicator */}
        <div className="w-full max-w-3xl mx-auto mb-8">
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            {/* Step 1 */}
            <div
              className={`p-2.5 rounded-lg border transition-all ${
                !file
                  ? isDark
                    ? "border-[#D6D6D6]/70 bg-[#44444C]/30 text-[#D6D6D6]"
                    : "border-[#0B0909] bg-white text-[#0B0909] font-medium shadow-xs"
                  : isDark
                  ? "border-[#44444C] bg-[#0B0909] text-[#8C8C8C]"
                  : "border-[#D6D6D6] bg-white text-[#8C8C8C]"
              }`}
            >
              <div
                className={`font-mono text-[10px] mb-1 ${
                  isDark ? "text-[#8C8C8C]" : "text-[#44444C]"
                }`}
              >
                01 / STAGE
              </div>
              <div className="font-medium truncate">Upload PDF</div>
            </div>

            {/* Step 2 */}
            <div
              className={`p-2.5 rounded-lg border transition-all ${
                isProcessing
                  ? isDark
                    ? "border-[#D6D6D6] bg-[#44444C]/40 text-[#D6D6D6] animate-pulse"
                    : "border-[#0B0909] bg-gray-100 text-[#0B0909] animate-pulse"
                  : file
                  ? isDark
                    ? "border-[#44444C] bg-[#0B0909] text-[#8C8C8C]"
                    : "border-[#D6D6D6] bg-white text-[#8C8C8C]"
                  : isDark
                  ? "border-[#44444C]/40 bg-[#0B0909]/40 text-[#44444C]"
                  : "border-gray-200 bg-gray-50 text-gray-400"
              }`}
            >
              <div
                className={`font-mono text-[10px] mb-1 ${
                  isDark ? "text-[#8C8C8C]" : "text-[#44444C]"
                }`}
              >
                02 / STAGE
              </div>
              <div className="font-medium truncate">Read Bytes</div>
            </div>

            {/* Step 3 */}
            <div
              className={`p-2.5 rounded-lg border transition-all ${
                hash
                  ? isDark
                    ? "border-[#D6D6D6]/80 bg-[#44444C]/30 text-[#D6D6D6]"
                    : "border-[#0B0909] bg-white text-[#0B0909] font-medium shadow-xs"
                  : isDark
                  ? "border-[#44444C]/40 bg-[#0B0909]/40 text-[#44444C]"
                  : "border-gray-200 bg-gray-50 text-gray-400"
              }`}
            >
              <div
                className={`font-mono text-[10px] mb-1 ${
                  isDark ? "text-[#8C8C8C]" : "text-[#44444C]"
                }`}
              >
                03 / STAGE
              </div>
              <div className="font-medium truncate">SHA-256 Digest</div>
            </div>

            {/* Step 4 */}
            <div
              className={`p-2.5 rounded-lg border transition-all ${
                hash
                  ? isDark
                    ? "border-[#8C8C8C] bg-[#44444C]/20 text-[#D6D6D6]"
                    : "border-[#44444C] bg-white text-[#0B0909] shadow-xs"
                  : isDark
                  ? "border-[#44444C]/40 bg-[#0B0909]/40 text-[#44444C]"
                  : "border-gray-200 bg-gray-50 text-gray-400"
              }`}
            >
              <div
                className={`font-mono text-[10px] mb-1 ${
                  isDark ? "text-[#8C8C8C]" : "text-[#44444C]"
                }`}
              >
                04 / STAGE
              </div>
              <div className="font-medium truncate">Signature Ready</div>
            </div>
          </div>
        </div>

        {/* Error notification */}
        {errorMsg && (
          <div
            className={`max-w-2xl mx-auto w-full mb-6 p-3 rounded-lg border text-xs flex items-center justify-between ${
              isDark
                ? "border-red-500/40 bg-red-950/20 text-red-300"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{errorMsg}</span>
            </div>
            <button
              onClick={() => setErrorMsg(null)}
              className="text-red-400 hover:text-red-200 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Upload Drop Zone Card (when no file or when resetting) */}
        {!hash && (
          <div className="max-w-2xl mx-auto w-full">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative group cursor-pointer rounded-2xl border-2 border-dashed p-10 sm:p-14 text-center transition-all duration-200 ${
                isDragging
                  ? isDark
                    ? "border-[#D6D6D6] bg-[#44444C]/30 shadow-lg scale-[1.01]"
                    : "border-[#0B0909] bg-gray-100 shadow-md scale-[1.01]"
                  : isDark
                  ? "border-[#44444C] bg-[#0B0909] hover:border-[#8C8C8C] hover:bg-[#44444C]/10"
                  : "border-[#D6D6D6] bg-white hover:border-[#8C8C8C] hover:bg-gray-50/80 shadow-xs"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={handleFileInputChange}
              />

              {/* Upload Icon */}
              <div
                className={`mx-auto w-16 h-16 mb-5 rounded-2xl border flex items-center justify-center transition-transform group-hover:scale-105 ${
                  isDark
                    ? "bg-[#44444C]/30 border-[#8C8C8C]/30 text-[#D6D6D6] group-hover:border-[#D6D6D6]/60"
                    : "bg-gray-100 border-[#D6D6D6] text-[#0B0909] group-hover:border-[#0B0909]"
                }`}
              >
                <svg
                  className="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </div>

              <h2
                className={`text-lg font-medium mb-1 transition-colors ${
                  isDark ? "text-[#D6D6D6]" : "text-[#0B0909]"
                }`}
              >
                Drop your PDF document here
              </h2>
              <p
                className={`text-sm mb-6 transition-colors ${
                  isDark ? "text-[#8C8C8C]" : "text-[#44444C]"
                }`}
              >
                or{" "}
                <span
                  className={`underline underline-offset-4 ${
                    isDark
                      ? "text-[#D6D6D6] decoration-[#8C8C8C]"
                      : "text-[#0B0909] decoration-[#44444C]"
                  }`}
                >
                  browse files
                </span>{" "}
                from your computer
              </p>

              <div
                className={`inline-flex items-center gap-4 text-xs ${
                  isDark ? "text-[#8C8C8C]" : "text-[#44444C]"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#8C8C8C]"></span>
                  PDF format
                </span>
                <span className={isDark ? "text-[#44444C]" : "text-[#D6D6D6]"}>•</span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#8C8C8C]"></span>
                  Any file size
                </span>
                <span className={isDark ? "text-[#44444C]" : "text-[#D6D6D6]"}>•</span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#8C8C8C]"></span>
                  Zero server upload
                </span>
              </div>
            </div>

            {/* Quick demo sample trigger */}
            <div
              className={`mt-4 flex items-center justify-center gap-2 text-xs ${
                isDark ? "text-[#8C8C8C]" : "text-[#44444C]"
              }`}
            >
              <span>Don&apos;t have a PDF ready?</span>
              <button
                type="button"
                onClick={handleLoadSamplePdf}
                className={`underline underline-offset-2 transition-colors cursor-pointer font-medium ${
                  isDark
                    ? "text-[#D6D6D6] hover:text-white"
                    : "text-[#0B0909] hover:underline"
                }`}
              >
                Use test sample PDF
              </button>
            </div>
          </div>
        )}

        {/* Processing State Indicator */}
        {isProcessing && (
          <div
            className={`max-w-2xl mx-auto w-full p-8 rounded-2xl border text-center my-6 transition-colors ${
              isDark
                ? "border-[#44444C] bg-[#0B0909]"
                : "border-[#D6D6D6] bg-white shadow-sm"
            }`}
          >
            <div
              className={`inline-block animate-spin rounded-full h-8 w-8 border-2 mb-4 ${
                isDark
                  ? "border-[#44444C] border-t-[#D6D6D6]"
                  : "border-[#D6D6D6] border-t-[#0B0909]"
              }`}
            ></div>
            <h3
              className={`text-sm font-medium ${
                isDark ? "text-[#D6D6D6]" : "text-[#0B0909]"
              }`}
            >
              Reading Document Bytes...
            </h3>
            <p
              className={`text-xs mt-1 ${
                isDark ? "text-[#8C8C8C]" : "text-[#44444C]"
              }`}
            >
              Extracting binary data stream & calculating SHA-256 digest
            </p>
          </div>
        )}

        {/* Generated Hash & Document Inspection Results */}
        {hash && fileDetails && (
          <div className="max-w-3xl mx-auto w-full space-y-5 animate-fadeIn">
            {/* Document Details Strip */}
            <div
              className={`rounded-xl border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                isDark
                  ? "border-[#44444C] bg-[#0B0909]"
                  : "border-[#D6D6D6] bg-white shadow-sm"
              }`}
            >
              <div className="flex items-center space-x-3.5 min-w-0">
                <div
                  className={`w-10 h-10 rounded-lg border flex items-center justify-center shrink-0 ${
                    isDark
                      ? "bg-[#44444C]/30 border-[#8C8C8C]/30 text-[#D6D6D6]"
                      : "bg-gray-100 border-[#D6D6D6] text-[#0B0909]"
                  }`}
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.8}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3
                      className={`text-sm font-medium truncate ${
                        isDark ? "text-[#D6D6D6]" : "text-[#0B0909]"
                      }`}
                    >
                      {fileDetails.name}
                    </h3>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded uppercase ${
                        isDark
                          ? "bg-[#44444C]/50 text-[#8C8C8C]"
                          : "bg-gray-100 text-[#44444C] border border-gray-200"
                      }`}
                    >
                      PDF
                    </span>
                  </div>
                  <div
                    className={`text-xs flex items-center gap-3 mt-0.5 ${
                      isDark ? "text-[#8C8C8C]" : "text-[#44444C]"
                    }`}
                  >
                    <span>{formatFileSize(fileDetails.size)}</span>
                    <span className={isDark ? "text-[#44444C]" : "text-[#D6D6D6]"}>•</span>
                    <span>{fileDetails.byteCount.toLocaleString()} bytes</span>
                    <span className={isDark ? "text-[#44444C]" : "text-[#D6D6D6]"}>•</span>
                    <span>Processed in {fileDetails.processingTimeMs}ms</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  onClick={handleReset}
                  className={`px-3 py-1.5 rounded-lg border text-xs transition-colors flex items-center gap-1.5 cursor-pointer ${
                    isDark
                      ? "border-[#44444C] text-[#8C8C8C] hover:text-[#D6D6D6] hover:border-[#8C8C8C]"
                      : "border-[#D6D6D6] text-[#44444C] hover:text-[#0B0909] hover:border-[#44444C] bg-white"
                  }`}
                  title="Upload another document"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  New Document
                </button>
              </div>
            </div>

            {/* Primary Cryptographic Hash Card */}
            <div
              className={`rounded-2xl border p-6 relative overflow-hidden transition-colors ${
                isDark
                  ? "border-[#44444C] bg-[#0B0909] shadow-xl"
                  : "border-[#D6D6D6] bg-white shadow-sm"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${
                      isDark ? "bg-[#D6D6D6]" : "bg-[#0B0909]"
                    }`}
                  ></div>
                  <span
                    className={`text-xs font-semibold uppercase tracking-wider ${
                      isDark ? "text-[#D6D6D6]" : "text-[#0B0909]"
                    }`}
                  >
                    SHA-256 Digest (Raw Bytes Fingerprint)
                  </span>
                </div>
                <span
                  className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
                    isDark
                      ? "text-[#8C8C8C] bg-[#44444C]/30 border-[#44444C]"
                      : "text-[#44444C] bg-gray-100 border-[#D6D6D6]"
                  }`}
                >
                  256-bit Hex / 64 Chars
                </span>
              </div>

              {/* Hash Display Area */}
              <div className="relative group">
                <div
                  className={`font-mono text-xs sm:text-sm tracking-wider rounded-xl p-4 sm:p-5 break-all select-all leading-relaxed transition-colors border ${
                    isDark
                      ? "text-[#D6D6D6] bg-[#0B0909] border-[#44444C] shadow-inner"
                      : "text-[#0B0909] bg-[#F6F7F9] border-[#D6D6D6]"
                  }`}
                >
                  {hash}
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleCopyHash}
                      className={`px-4 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 cursor-pointer ${
                        copied
                          ? isDark
                            ? "bg-[#D6D6D6] text-[#0B0909] font-semibold"
                            : "bg-emerald-600 text-white font-semibold"
                          : isDark
                          ? "bg-[#44444C] hover:bg-[#8C8C8C] hover:text-[#0B0909] text-[#D6D6D6]"
                          : "bg-[#0B0909] hover:bg-[#44444C] text-white shadow-xs"
                      }`}
                    >
                      {copied ? (
                        <>
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2.5}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          Copied to Clipboard!
                        </>
                      ) : (
                        <>
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                            />
                          </svg>
                          Copy Hash
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleDownloadHash}
                      className={`px-3.5 py-2 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                        isDark
                          ? "border-[#44444C] hover:border-[#8C8C8C] text-[#8C8C8C] hover:text-[#D6D6D6]"
                          : "border-[#D6D6D6] hover:border-[#44444C] text-[#44444C] hover:text-[#0B0909] bg-white shadow-xs"
                      }`}
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                      Download .sha256
                    </button>
                  </div>

                  <button
                    onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                    className={`text-xs flex items-center gap-1 cursor-pointer transition-colors ${
                      isDark
                        ? "text-[#8C8C8C] hover:text-[#D6D6D6]"
                        : "text-[#44444C] hover:text-[#0B0909]"
                    }`}
                  >
                    <span>{showTechnicalDetails ? "Hide" : "Inspect"} Binary Bytes</span>
                    <svg
                      className={`w-3.5 h-3.5 transition-transform ${
                        showTechnicalDetails ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Technical Binary Header Inspection Drawer */}
              {showTechnicalDetails && (
                <div
                  className={`mt-5 pt-4 border-t text-xs transition-colors ${
                    isDark ? "border-[#44444C]/60" : "border-[#D6D6D6]"
                  }`}
                >
                  <div
                    className={`flex items-center justify-between mb-2 font-mono text-[11px] ${
                      isDark ? "text-[#8C8C8C]" : "text-[#44444C]"
                    }`}
                  >
                    <span>BINARY STREAM HEADER (FIRST 32 BYTES)</span>
                    <span>MAGIC: {fileDetails.magicHeader}</span>
                  </div>
                  <pre
                    className={`p-3 rounded-lg border font-mono text-[11px] overflow-x-auto whitespace-pre-wrap leading-relaxed ${
                      isDark
                        ? "bg-[#0B0909] border-[#44444C] text-[#8C8C8C]"
                        : "bg-[#F6F7F9] border-[#D6D6D6] text-[#44444C]"
                    }`}
                  >
                    {byteSnippet}
                  </pre>
                  <p
                    className={`mt-2 text-[11px] leading-normal ${
                      isDark ? "text-[#8C8C8C]" : "text-[#44444C]"
                    }`}
                  >
                    The SHA-256 algorithm processes every byte in this raw stream. Any alteration—even a single byte difference—will produce a completely different 256-bit hash.
                  </p>
                </div>
              )}
            </div>

            {/* Signature Readiness & Verification Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Ready for Signature Status */}
              <div
                className={`rounded-xl border p-5 flex flex-col justify-between transition-colors ${
                  isDark
                    ? "border-[#44444C] bg-[#0B0909]"
                    : "border-[#D6D6D6] bg-white shadow-sm"
                }`}
              >
                <div>
                  <div
                    className={`flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider mb-2 ${
                      isDark ? "text-[#D6D6D6]" : "text-[#0B0909]"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>Ready for Signature</span>
                  </div>
                  <p
                    className={`text-xs leading-relaxed mb-4 ${
                      isDark ? "text-[#8C8C8C]" : "text-[#44444C]"
                    }`}
                  >
                    This SHA-256 hash forms the immutable representation of the document. Digital signatures (RSA / ECDSA / Ed25519) sign this 32-byte digest rather than the full multi-megabyte PDF payload.
                  </p>
                </div>

                <div
                  className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                    isDark
                      ? "bg-[#44444C]/20 border-[#44444C]/40 text-[#D6D6D6]"
                      : "bg-[#F6F7F9] border-[#D6D6D6] text-[#0B0909]"
                  }`}
                >
                  <span className={isDark ? "text-[#8C8C8C]" : "text-[#44444C]"}>
                    Digest Integrity:
                  </span>
                  <span className="font-mono font-medium">Verified (SHA-256)</span>
                </div>
              </div>

              {/* Hash Verification / Comparison Tool */}
              <div
                className={`rounded-xl border p-5 transition-colors ${
                  isDark
                    ? "border-[#44444C] bg-[#0B0909]"
                    : "border-[#D6D6D6] bg-white shadow-sm"
                }`}
              >
                <div
                  className={`text-xs font-semibold uppercase tracking-wider mb-1 ${
                    isDark ? "text-[#D6D6D6]" : "text-[#0B0909]"
                  }`}
                >
                  Integrity Verification
                </div>
                <p
                  className={`text-xs mb-3 ${
                    isDark ? "text-[#8C8C8C]" : "text-[#44444C]"
                  }`}
                >
                  Paste a reference hash to confirm this PDF has not been altered:
                </p>

                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Paste reference SHA-256 hash..."
                    value={compareHash}
                    onChange={(e) => setCompareHash(e.target.value)}
                    className={`w-full rounded-lg px-3 py-2 text-xs font-mono focus:outline-none transition-colors border ${
                      isDark
                        ? "bg-[#0B0909] border-[#44444C] text-[#D6D6D6] placeholder-[#8C8C8C]/50 focus:border-[#8C8C8C]"
                        : "bg-[#F6F7F9] border-[#D6D6D6] text-[#0B0909] placeholder-gray-400 focus:border-[#0B0909]"
                    }`}
                  />

                  {isMatch && (
                    <div
                      className={`p-2.5 rounded-lg border text-xs flex items-center gap-2 ${
                        isDark
                          ? "border-emerald-500/40 bg-emerald-950/20 text-emerald-300"
                          : "border-emerald-300 bg-emerald-50 text-emerald-800"
                      }`}
                    >
                      <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>Authenticity Confirmed: Hash matches perfectly.</span>
                    </div>
                  )}

                  {isMismatch && (
                    <div
                      className={`p-2.5 rounded-lg border text-xs flex items-center gap-2 ${
                        isDark
                          ? "border-amber-500/40 bg-amber-950/20 text-amber-300"
                          : "border-amber-300 bg-amber-50 text-amber-800"
                      }`}
                    >
                      <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>Mismatch: The entered hash does not match this PDF.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer
        className={`border-t py-6 text-center text-xs transition-colors ${
          isDark
            ? "border-[#44444C]/40 text-[#8C8C8C]"
            : "border-[#D6D6D6] text-[#44444C] bg-white/50"
        }`}
      >
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>Document Signature Protocol &middot; SHA-256 Hashing Workflow</div>
          <div
            className={`flex items-center space-x-3 text-[11px] ${
              isDark ? "text-[#8C8C8C]" : "text-[#44444C]"
            }`}
          >
            <span>#0B0909 Ebony</span>
            <span>&middot;</span>
            <span>#44444C Gray</span>
            <span>&middot;</span>
            <span>#8C8C8C Pewter</span>
            <span>&middot;</span>
            <span>#D6D6D6 Highlight</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
