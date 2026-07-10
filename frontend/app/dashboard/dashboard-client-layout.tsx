"use client";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ToastContainer } from "@/components/Toast";
import { DashboardNavbar } from "@/components/dashboard/navbar";
import { DashboardModals } from "@/components/dashboard/dashboard-modals";
import { PantryProvider, usePantry } from "@/contexts/pantry-provider";

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { toasts, removeToast, toast, isPaid } = usePantry();

  return (
    <>
      <DashboardNavbar isPaid={isPaid} />
      <div className="min-h-[100dvh] md:min-h-screen pb-20 md:pb-0 md:pt-16 max-w-5xl mx-auto px-4 sm:px-6">
        <ToastContainer toasts={toasts} onRemove={removeToast} />

        {toast != null && toast.visible && (
          <div
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-lg font-medium transition-all animate-fade-in ${
              toast.type === "success"
                ? "bg-emerald-600 text-white"
                : "bg-rose-600 text-white"
            }`}
          >
            {toast.message}
          </div>
        )}

        <DashboardModals />
        <main className="py-8">{children}</main>
      </div>
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