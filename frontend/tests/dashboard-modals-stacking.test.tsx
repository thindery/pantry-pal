import { describe, expect, it, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { DashboardClientLayout } from "@/app/dashboard/dashboard-client-layout";

vi.mock("next-auth/react", () => ({
  useSession: () => ({ status: "authenticated", data: null }),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}));

vi.mock("@/services/subscription", () => ({
  requestWelcomeEmail: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/analytics", () => ({
  trackSignUp: vi.fn(),
}));

vi.mock("@/components/ErrorBoundary", () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/Toast", () => ({
  ToastContainer: () => <div data-testid="toast-container" />,
}));

vi.mock("@/components/dashboard/navbar", () => ({
  DashboardNavbar: () => <nav data-testid="dashboard-navbar" />,
}));

vi.mock("@/components/dashboard/dashboard-modals", () => ({
  DashboardModals: () => <div data-testid="dashboard-modals" />,
}));

vi.mock("@/components/dashboard/ThresholdSettingsModal", () => ({
  ThresholdSettingsModal: () => <div data-testid="threshold-settings-modal" />,
}));

vi.mock("@/contexts/confirm-provider", () => ({
  ConfirmProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/contexts/pantry-provider", () => ({
  PantryProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  usePantry: () => ({
    toasts: [],
    removeToast: vi.fn(),
    toast: null,
    showThresholdSettings: false,
    setShowThresholdSettings: vi.fn(),
    thresholdConfig: {},
    setThresholdConfig: vi.fn(),
  }),
}));

describe("PP-180: Dashboard modals stacking context", () => {
  it("renders DashboardModals outside of relative z-0 wrapper div and after DashboardNavbar", () => {
    const { container } = render(
      <DashboardClientLayout>
        <div data-testid="page-content">Pantry Page Content</div>
      </DashboardClientLayout>
    );

    const z0Wrapper = container.querySelector(".relative.z-0");
    const modals = screen.getByTestId("dashboard-modals");
    const navbar = screen.getByTestId("dashboard-navbar");
    const content = screen.getByTestId("page-content");

    // Wrapper exists and contains page content
    expect(z0Wrapper).toBeInTheDocument();
    expect(z0Wrapper?.contains(content)).toBe(true);

    // DashboardModals must NOT be inside the z-0 stacking context wrapper
    expect(z0Wrapper?.contains(modals)).toBe(false);

    // Navbar must NOT be inside the z-0 wrapper
    expect(z0Wrapper?.contains(navbar)).toBe(false);

    // Modals should render after navbar in DOM order to ensure correct layering
    expect(
      navbar.compareDocumentPosition(modals) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });
});
