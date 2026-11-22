"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { requestWelcomeEmail } from "@/services/subscription";
import { trackSignUp } from "@/lib/analytics";
import { usePathname } from "next/navigation";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ToastContainer } from "@/components/Toast";
import { DashboardNavbar } from "@/components/dashboard/navbar";
import { DashboardModals } from "@/components/dashboard/dashboard-modals";
import { ThresholdSettingsModal } from "@/components/dashboard/ThresholdSettingsModal";
import { PantryProvider, usePantry } from "@/contexts/pantry-provider";

function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isScanBarcode = pathname.replace(/\/+$/, "") === "/dashboard/scan-barcode";
  const { status } = useSession();
  const welcomeRequested = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || welcomeRequested.current) return;
    welcomeRequested.current = true;
    void (async () => {
      const res = await requestWelcomeEmail();
      if (res) {
        const isFirstAttempt =
          res.sent === true ||
          ["not_configured", "missing_recipient", "send_failed"].includes(
            res.reason
          );
        if (isFirstAttempt && res.reason !== "already_sent") {
          trackSignUp("Google");
        }
      }
    })();
  }, [status]);

  const {
    toasts,
    removeToast,
    toast,
    showThresholdSettings,
    setShowThresholdSettings,
    thresholdConfig,
    setThresholdConfig,
  } = usePantry();

  useEffect(() => {
    if (!isScanBarcode) return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlOverscroll = html.style.overscrollBehavior;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      html.style.overscrollBehavior = prevHtmlOverscroll;
    };
  }, [isScanBarcode]);

  return (
    <>
      <div
        className={
          isScanBarcode
            ? "relative z-0 h-[calc(100dvh-5rem-env(safe-area-inset-bottom,0px))] overflow-hidden overscroll-none md:h-[calc(100dvh-4rem)] md:pt-16 max-w-5xl mx-auto px-3 sm:px-6"
            : "relative z-0 min-h-[100dvh] md:min-h-screen pb-20 md:pb-0 md:pt-16 max-w-5xl mx-auto px-4 sm:px-6"
        }
      >
        <ToastContainer toasts={toasts} onRemove={removeToast} />

        {toast != null && toast.visible && (
          <div
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-lg font-medium transition-all animate-fade-in ${
              toast.type === "success"
                ? "bg-[var(--primary)] text-white"
                : "bg-rose-600 text-white"
            }`}
          >
            {toast.message}
          </div>
        )}

        <DashboardModals />
        <main className={isScanBarcode ? "h-full min-h-0 overflow-hidden py-0" : "py-6 md:py-8"}>{children}</main>
      </div>
      <DashboardNavbar />
      {showThresholdSettings && (
        <ThresholdSettingsModal
          thresholdConfig={thresholdConfig}
          onChange={setThresholdConfig}
          onClose={() => setShowThresholdSettings(false)}
        />
      )}
    </>
  );
}

export function DashboardClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ErrorBoundary>
      <PantryProvider>
        <DashboardShell>{children}</DashboardShell>
      </PantryProvider>
    </ErrorBoundary>
  );
}