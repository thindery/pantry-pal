"use client";

import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

export interface ConfirmDialogProps {
  options: ConfirmOptions;
  onResolve: (result: boolean) => void;
}

export function ConfirmDialog({ options, onResolve }: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previousActiveElementRef.current = document.activeElement as HTMLElement | null;

    // Focus cancel button for destructive actions, otherwise confirm or cancel
    const timer = setTimeout(() => {
      if (options.danger) {
        cancelButtonRef.current?.focus();
      } else {
        if (confirmButtonRef.current) {
          confirmButtonRef.current.focus();
        } else {
          cancelButtonRef.current?.focus();
        }
      }
    }, 0);

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onResolve(false);
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", handleGlobalKeyDown);
      previousActiveElementRef.current?.focus?.();
    };
  }, [options.danger, onResolve]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Tab") {
      const dialog = dialogRef.current;
      if (!dialog) return;

      const focusableElements = dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );

      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (!dialog.contains(document.activeElement)) {
        e.preventDefault();
        firstElement.focus();
        return;
      }

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onResolve(false);
        }
      }}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        className="bg-[var(--surface)] rounded-2xl w-full max-w-md p-6 shadow-2xl"
      >
        <div className="flex justify-between items-start mb-3">
          <h2
            id="confirm-dialog-title"
            className="text-xl font-bold text-[var(--foreground)]"
          >
            {options.title}
          </h2>
          <button
            type="button"
            onClick={() => onResolve(false)}
            className="flex items-center justify-center w-11 h-11 -mr-2 -mt-2 text-[var(--muted)] hover:text-[var(--foreground)] rounded-lg transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <p
          id="confirm-dialog-message"
          className="text-[var(--muted)] text-sm mb-6 leading-relaxed"
        >
          {options.message}
        </p>

        <div className="flex gap-3 justify-end">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={() => onResolve(false)}
            className="flex-1 sm:flex-initial px-4 py-3 min-h-[44px] border border-[var(--border)] text-[var(--foreground)] rounded-xl font-semibold hover:bg-[var(--surface-muted)] transition-colors text-center"
          >
            {options.cancelLabel ?? "Cancel"}
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            onClick={() => onResolve(true)}
            className={`flex-1 sm:flex-initial px-4 py-3 min-h-[44px] text-white rounded-xl font-semibold transition-colors text-center ${
              options.danger
                ? "bg-rose-600 hover:bg-rose-700"
                : "bg-[var(--primary)] hover:bg-[var(--primary-hover)]"
            }`}
          >
            {options.confirmLabel ?? "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
