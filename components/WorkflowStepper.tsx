"use client";

import React from "react";

export interface WorkflowStep {
  id: string;
  label: string;
  sublabel?: string;
}

interface WorkflowStepperProps {
  steps: WorkflowStep[];
  currentStepIndex: number;
  isComplete?: boolean;
  isError?: boolean;
  errorMessage?: string;
  isWarning?: boolean;
  warningMessage?: string;
  theme: "dark" | "light";
  title?: string;
  subtitle?: string;
}

export default function WorkflowStepper({
  steps,
  currentStepIndex,
  isComplete = false,
  isError = false,
  errorMessage,
  isWarning = false,
  warningMessage,
  theme,
  title,
  subtitle,
}: WorkflowStepperProps) {
  const isDark = theme === "dark";

  return (
    <div
      className={`w-full p-5 sm:p-6 rounded-2xl border transition-all duration-300 ${
        isDark
          ? "bg-[#0B0909]/90 border-[#44444C]/80 shadow-2xl backdrop-blur-md"
          : "bg-white/95 border-[#D6D6D6] shadow-lg backdrop-blur-md"
      }`}
    >
      {/* Header if provided */}
      {(title || subtitle) && (
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-inherit">
          <div>
            {title && (
              <h4 className="text-sm font-semibold tracking-tight flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#8C8C8C] animate-ping" />
                {title}
              </h4>
            )}
            {subtitle && (
              <p className="text-xs text-[#8C8C8C] mt-0.5">{subtitle}</p>
            )}
          </div>
          <div className="text-[11px] font-mono px-2.5 py-1 rounded-full border border-inherit text-[#8C8C8C]">
            {isComplete
              ? "Completed"
              : isError
              ? "Failed"
              : isWarning
              ? "Notice"
              : `Step ${Math.min(currentStepIndex + 1, steps.length)} of ${steps.length}`}
          </div>
        </div>
      )}

      {/* Stepper Pipeline */}
      <div className="relative">
        <div className="flex items-center justify-between relative z-10">
          {steps.map((step, idx) => {
            const isFinished = isComplete || idx < currentStepIndex;
            const isActive = !isComplete && idx === currentStepIndex && !isError && !isWarning;
            const isStepError = isError && idx === currentStepIndex;
            const isStepWarning = isWarning && idx === currentStepIndex;
            const isPending = idx > currentStepIndex;

            return (
              <React.Fragment key={step.id}>
                {/* Checkpoint Node */}
                <div className="flex flex-col items-center group relative min-w-[70px] sm:min-w-[100px]">
                  <div
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 relative z-20 ${
                      isFinished
                        ? isDark
                          ? "bg-[#D6D6D6] text-[#0B0909] shadow-md shadow-white/10 ring-2 ring-[#D6D6D6]/40 scale-100 animate-checkpoint-pop"
                          : "bg-[#0B0909] text-white shadow-md shadow-black/10 ring-2 ring-[#0B0909]/30 scale-100 animate-checkpoint-pop"
                        : isActive
                        ? isDark
                          ? "bg-[#44444C] text-white ring-4 ring-[#8C8C8C]/30 border-2 border-[#D6D6D6] scale-105"
                          : "bg-gray-100 text-[#0B0909] ring-4 ring-gray-300/60 border-2 border-[#0B0909] scale-105"
                        : isStepError
                        ? "bg-rose-500 text-white ring-4 ring-rose-500/20"
                        : isStepWarning
                        ? "bg-amber-500 text-white ring-4 ring-amber-500/20"
                        : isDark
                        ? "bg-[#18181A] border border-[#44444C] text-[#8C8C8C]"
                        : "bg-gray-100 border border-gray-300 text-gray-400"
                    }`}
                  >
                    {isFinished ? (
                      <svg
                        className="w-4 h-4 stroke-[2.5]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : isActive ? (
                      <div className="relative flex items-center justify-center">
                        <svg
                          className="w-4 h-4 animate-spin text-current"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="3"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                      </div>
                    ) : isStepError ? (
                      <svg
                        className="w-4 h-4 stroke-[2.5]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    ) : isStepWarning ? (
                      <svg
                        className="w-4 h-4 stroke-[2.5]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                      </svg>
                    ) : (
                      <span className="text-[11px] font-mono">{idx + 1}</span>
                    )}
                  </div>

                  {/* Step Label */}
                  <div className="mt-2.5 text-center">
                    <p
                      className={`text-xs font-semibold tracking-tight transition-colors duration-200 ${
                        isFinished || isActive
                          ? isDark
                            ? "text-[#D6D6D6]"
                            : "text-[#0B0909]"
                          : "text-[#8C8C8C]"
                      }`}
                    >
                      {step.label}
                    </p>
                    {step.sublabel && (
                      <p className="text-[10px] text-[#8C8C8C] mt-0.5 hidden sm:block max-w-[120px] truncate">
                        {step.sublabel}
                      </p>
                    )}
                  </div>
                </div>

                {/* Connector Line (between checkpoints) */}
                {idx < steps.length - 1 && (
                  <div className="flex-1 px-1 sm:px-2 relative -mt-6 sm:-mt-7 z-0">
                    <div
                      className={`h-[3px] rounded-full transition-all duration-300 relative overflow-hidden ${
                        idx < currentStepIndex || isComplete
                          ? isDark
                            ? "bg-[#D6D6D6]"
                            : "bg-[#0B0909]"
                          : idx === currentStepIndex
                          ? isDark
                            ? "bg-[#44444C]"
                            : "bg-gray-300"
                          : isDark
                          ? "bg-[#252528]"
                          : "bg-gray-200"
                      }`}
                    >
                      {/* Active traveling pulse if in progress */}
                      {idx === currentStepIndex && !isComplete && (
                        <div
                          className={`absolute inset-0 w-full h-full animate-pipeline-flow ${
                            isDark
                              ? "bg-gradient-to-r from-transparent via-[#D6D6D6] to-transparent"
                              : "bg-gradient-to-r from-transparent via-[#0B0909] to-transparent"
                          }`}
                        />
                      )}
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Dynamic Status / Feedback ticker */}
      {(errorMessage || warningMessage) && (
        <div
          className={`mt-5 p-3 rounded-xl border text-xs flex items-center gap-2.5 transition-all ${
            errorMessage
              ? isDark
                ? "bg-rose-950/20 border-rose-500/40 text-rose-300"
                : "bg-rose-50 border-rose-200 text-rose-800"
              : isDark
              ? "bg-amber-950/20 border-amber-500/40 text-amber-300"
              : "bg-amber-50 border-amber-300 text-amber-900"
          }`}
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="font-medium leading-relaxed">
            {errorMessage || warningMessage}
          </span>
        </div>
      )}
    </div>
  );
}
