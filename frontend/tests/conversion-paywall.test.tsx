import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const trackEvent = vi.fn();
vi.mock("@/lib/analytics", () => ({
  trackEvent: (...args: unknown[]) => trackEvent(...args),
  stashCheckoutSessionId: vi.fn(),
}));

const offerState: { value: Record<string, unknown> } = { value: { enabled: false } };
const createCheckoutSession = vi.fn();
vi.mock("@/services/subscription", () => ({
  getFirstMonthOffer: () => Promise.resolve(offerState.value),
  createCheckoutSession: (...args: unknown[]) => createCheckoutSession(...args),
  useSubscription: () => ({
    tierInfo: null,
    isFree: true,
    isPro: false,
    isFamily: false,
    loading: false,
  }),
}));

vi.mock("next-auth/react", () => ({
  useSession: () => ({ status: "authenticated", data: null }),
}));

import {
  formatUsd,
  maxYearlySavingsPercent,
  yearlyPerMonthCents,
  yearlySavingsCents,
  yearlySavingsPercent,
} from "@/lib/pricing";
import UpgradePrompt, { ItemLimitWarning, upgradePriceLine } from "@/components/UpgradePrompt";
import { PlanLimitPrompt } from "@/components/dashboard/dashboard-modals";
import PricingPage from "@/components/PricingPage";
import { ApiError } from "@/lib/api-error";
import { isTierLimitError } from "@/lib/paywall";

afterEach(() => {
  cleanup();
  trackEvent.mockReset();
  createCheckoutSession.mockReset();
  offerState.value = { enabled: false };
});

describe("PP-243 pricing math (real computed savings)", () => {
  it("matches the live Stripe prices", () => {
    expect(yearlySavingsCents("pro")).toBe(1989);
    expect(yearlySavingsPercent("pro")).toBe(33);
    expect(yearlyPerMonthCents("pro")).toBe(333);
    expect(yearlySavingsCents("family")).toBe(3589);
    expect(yearlySavingsPercent("family")).toBe(37);
    expect(maxYearlySavingsPercent()).toBe(37);
    expect(formatUsd(1989)).toBe("$19.89");
    expect(formatUsd(100)).toBe("$1");
  });

  it("paywall price line shows the $1 offer only when it is on", () => {
    expect(upgradePriceLine(undefined)).toBe("$4.99/mo, or $39.99/yr (save 33%).");
    expect(upgradePriceLine(100)).toBe("$1 your first month, then $4.99/mo. Or $39.99/yr (save 33%).");
  });
});

describe("PP-242 in-app paywall", () => {
  it("detects the backend plan-limit error", () => {
    expect(isTierLimitError(new ApiError("x", 403, "TIER_LIMIT_EXCEEDED"))).toBe(true);
    expect(isTierLimitError(new ApiError("x", 403, "FORBIDDEN"))).toBe(false);
    expect(isTierLimitError(new Error("x"))).toBe(false);
  });

  it("renders nothing when no limit is hit", () => {
    const { container } = render(<PlanLimitPrompt feature={null} onClose={vi.fn()} onUpgrade={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
    expect(trackEvent).not.toHaveBeenCalled();
  });

  it("shows the item-limit prompt, tracks view and upgrade", () => {
    const onUpgrade = vi.fn();
    render(<PlanLimitPrompt feature="items" onClose={vi.fn()} onUpgrade={onUpgrade} />);
    expect(screen.getByRole("dialog")).toHaveTextContent("Free accounts hold up to 50 items");
    expect(trackEvent).toHaveBeenCalledWith("paywall_view", { feature: "items" });
    fireEvent.click(screen.getByRole("button", { name: /Upgrade to Pro/ }));
    expect(onUpgrade).toHaveBeenCalled();
    expect(trackEvent).toHaveBeenCalledWith("upgrade_click", { source: "paywall", feature: "items" });
  });

  it("no longer promises a 30-day guarantee the Terms do not offer", () => {
    render(<UpgradePrompt feature="receipts" title="t" message="m" onClose={vi.fn()} onUpgrade={vi.fn()} />);
    expect(document.body).not.toHaveTextContent(/30-day/);
    expect(screen.getByTestId("upgrade-price-line")).toHaveTextContent("$4.99/mo");
  });

  it("item meter covers near-limit and at-limit", () => {
    const { rerender } = render(<ItemLimitWarning currentItems={47} maxItems={50} onUpgrade={vi.fn()} />);
    expect(screen.getByTestId("item-limit-warning")).toHaveTextContent("3 items remaining");
    rerender(<ItemLimitWarning currentItems={50} maxItems={50} onUpgrade={vi.fn()} />);
    expect(screen.getByTestId("item-limit-warning")).toHaveTextContent("reached the 50-item free limit");
  });
});

describe("PP-243 /pricing", () => {
  it("shows the yearly per-month price and real savings, and no money-back claim", () => {
    render(<PricingPage onClose={vi.fn()} />);
    expect(document.body).not.toHaveTextContent(/money-back/i);
    fireEvent.click(screen.getByRole("button", { name: /Yearly/ }));
    expect(screen.getByTestId("yearly-savings-pro")).toHaveTextContent("$3.33/mo billed yearly · Save 33% ($19.89/yr)");
    expect(screen.getByTestId("yearly-savings-family")).toHaveTextContent("Save 37% ($35.89/yr)");
  });

  it("Pro monthly card mentions the $1 first month only when the offer is on", async () => {
    offerState.value = { enabled: true, tier: "pro", interval: "month", listPriceCents: 499, offerPriceCents: 100 };
    render(<PricingPage onClose={vi.fn()} />);
    await waitFor(() =>
      expect(screen.getByTestId("monthly-note-pro")).toHaveTextContent("$1 your first month for new subscribers"),
    );
    expect(screen.getByTestId("monthly-note-family")).toHaveTextContent("or $59.99/yr, save 37%");
  });

  it("Upgrade still starts Stripe Checkout for the chosen plan and interval (no charge in tests)", async () => {
    createCheckoutSession.mockResolvedValue({ sessionId: "cs_test_1", url: "about:blank" });
    render(<PricingPage onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Yearly/ }));
    fireEvent.click(screen.getByRole("button", { name: "Upgrade to Pro" }));
    await waitFor(() => expect(createCheckoutSession).toHaveBeenCalled());
    expect(createCheckoutSession.mock.calls[0][0]).toBe("pro");
    expect(createCheckoutSession.mock.calls[0][1]).toBe("year");
    expect(trackEvent).toHaveBeenCalledWith("upgrade_click", { source: "pricing", tier: "pro", interval: "yearly" });
    expect(trackEvent).toHaveBeenCalledWith("begin_checkout", { tier: "pro", interval: "yearly" });
  });
});
