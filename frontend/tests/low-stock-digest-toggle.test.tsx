import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const getEmailPreferences = vi.fn();
const updateEmailPreferences = vi.fn();
vi.mock("@/services/email-preferences", () => ({
  getEmailPreferences: () => getEmailPreferences(),
  updateEmailPreferences: (u: unknown) => updateEmailPreferences(u),
}));

import { LowStockDigestToggle } from "@/components/LowStockDigestToggle";

const T = { pantry: 2 };
const O = { item1: 3 };

afterEach(() => {
  cleanup();
  getEmailPreferences.mockReset();
  updateEmailPreferences.mockReset();
});

describe("LowStockDigestToggle (PP-137)", () => {
  it("renders nothing while the server flag is off", async () => {
    getEmailPreferences.mockResolvedValue({ available: false, lowStockDigest: false });
    const { container } = render(<LowStockDigestToggle thresholdConfig={T} itemThresholdOverrides={O} />);
    await waitFor(() => expect(getEmailPreferences).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("is off by default and opting in sends the user's thresholds", async () => {
    getEmailPreferences.mockResolvedValue({ available: true, lowStockDigest: false });
    updateEmailPreferences.mockResolvedValue({ available: true, lowStockDigest: true });
    render(<LowStockDigestToggle thresholdConfig={T} itemThresholdOverrides={O} />);
    const sw = await screen.findByRole("switch", { name: "Weekly low-stock email" });
    expect(sw).toHaveAttribute("aria-checked", "false");
    expect(updateEmailPreferences).not.toHaveBeenCalled();
    fireEvent.click(sw);
    await waitFor(() => expect(sw).toHaveAttribute("aria-checked", "true"));
    expect(updateEmailPreferences).toHaveBeenCalledWith({ lowStockDigest: true, thresholdConfig: T, itemThresholdOverrides: O });
  });

  it("opting out sends only the switch", async () => {
    getEmailPreferences.mockResolvedValue({ available: true, lowStockDigest: true });
    updateEmailPreferences.mockResolvedValue({ available: true, lowStockDigest: false });
    render(<LowStockDigestToggle thresholdConfig={T} itemThresholdOverrides={O} />);
    const sw = await screen.findByRole("switch");
    await waitFor(() => expect(updateEmailPreferences).toHaveBeenCalledWith({ thresholdConfig: T, itemThresholdOverrides: O }));
    fireEvent.click(sw);
    await waitFor(() => expect(updateEmailPreferences).toHaveBeenLastCalledWith({ lowStockDigest: false }));
  });
});
