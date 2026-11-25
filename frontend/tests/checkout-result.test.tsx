import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const confirmCheckoutSession = vi.fn();
const trackPurchase = vi.fn();
let sessionId: string | null = "cs_test_abc12345";

vi.mock("@/services/subscription", () => ({
  confirmCheckoutSession: (id: string) => confirmCheckoutSession(id),
}));
vi.mock("@/lib/analytics", () => ({
  getCheckoutTransactionId: () => sessionId,
  trackPurchase: (opts: unknown) => trackPurchase(opts),
}));

import { CheckoutResult } from "@/components/CheckoutResult";

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("CheckoutResult success confirm (PP-168)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    confirmCheckoutSession.mockReset();
    trackPurchase.mockReset();
    sessionId = "cs_test_abc12345";
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows confirming, then active, and tracks the real amount once", async () => {
    confirmCheckoutSession.mockResolvedValue({
      confirmed: true, applied: true, tier: "pro", sessionStatus: "complete",
      paymentStatus: "paid", amountTotal: 100, currency: "usd",
    });
    const onClose = vi.fn();
    render(<CheckoutResult status="success" onClose={onClose} />);
    expect(screen.getByText(/Confirming your purchase/)).toBeTruthy();
    await flush();
    expect(confirmCheckoutSession).toHaveBeenCalledWith("cs_test_abc12345");
    expect(screen.getByText(/subscription is now active/)).toBeTruthy();
    expect(trackPurchase).toHaveBeenCalledTimes(1);
    expect(trackPurchase).toHaveBeenCalledWith({ transaction_id: "cs_test_abc12345", value: 1, currency: "USD" });
    expect(onClose).not.toHaveBeenCalled();
    await act(async () => { vi.advanceTimersByTime(5000); });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("retries while unconfirmed and never claims active or auto-redirects", async () => {
    confirmCheckoutSession.mockResolvedValue({
      confirmed: false, applied: false, tier: "free", sessionStatus: "open",
      paymentStatus: "unpaid", amountTotal: 499, currency: "usd",
    });
    const onClose = vi.fn();
    render(<CheckoutResult status="success" onClose={onClose} />);
    for (let i = 0; i < 4; i += 1) {
      await flush();
      await act(async () => { vi.advanceTimersByTime(1500); });
    }
    await flush();
    expect(confirmCheckoutSession).toHaveBeenCalledTimes(4);
    expect(screen.queryByText(/subscription is now active/)).toBeNull();
    expect(screen.getByText(/couldn’t confirm your payment yet/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Retry confirmation/ })).toBeTruthy();
    expect(trackPurchase).not.toHaveBeenCalled();
    await act(async () => { vi.advanceTimersByTime(10000); });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("does not call the API without a session id", async () => {
    sessionId = null;
    render(<CheckoutResult status="success" onClose={vi.fn()} />);
    await flush();
    expect(confirmCheckoutSession).not.toHaveBeenCalled();
    expect(trackPurchase).not.toHaveBeenCalled();
  });
});
