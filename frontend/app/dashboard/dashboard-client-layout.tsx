"use client";

import { usePathname } from "next/navigation";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ToastContainer } from "@/components/Toast";
import { DashboardNavbar } from "@/components/dashboard/navbar";
import { DashboardModals } from "@/components/dashboard/dashboard-modals";
import { ThresholdSettingsModal } from "@/components/dashboard/ThresholdSettingsModal";
import { PantryProvider, usePantry } from "@/contexts/pantry-provider";

function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isScanBarcode = pathname === "/dashboard/scan-barcode";
  const {
    toasts,
    removeToast,
    toast,
    showThresholdSettings,
    setShowThresholdSettings,
    thresholdConfig,
    setThresholdConfig,
  } = usePantry();

  return (
    <>
      <div
        className={
          isScanBarcode
            ? "relative z-0 h-[100dvh] overflow-hidden pb-20 md:h-auto md:min-h-screen md:overflow-visible md:pb-0 md:pt-16 max-w-5xl mx-auto px-3 sm:px-6"
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
        <main className={isScanBarcode ? "h-full overflow-hidden py-0 md:py-8" : "py-6 md:py-8"}>{children}</main>
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