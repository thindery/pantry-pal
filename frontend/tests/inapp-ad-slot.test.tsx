import "@testing-library/jest-dom/vitest";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/subscription", () => ({
  useSubscription: () => ({ tierInfo: { tier: "free" } }),
}));

import { INAPP_ADS_ENABLED, InAppAdSlot, shouldShowInAppAd } from "@/components/InAppAdSlot";

afterEach(cleanup);

const base = { enabled: true, slot: "123", surface: "shopping-list-footer" };

describe("PP-140 in-app ads", () => {
  it("ships switched off", () => {
    expect(INAPP_ADS_ENABLED).toBe(false);
    const { container } = render(<InAppAdSlot surface="shopping-list-footer" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows only to Free on calm surfaces", () => {
    expect(shouldShowInAppAd({ ...base, tier: "free" })).toBe(true);
    expect(shouldShowInAppAd({ ...base, tier: "pro" })).toBe(false);
    expect(shouldShowInAppAd({ ...base, tier: "family" })).toBe(false);
    expect(shouldShowInAppAd({ ...base, tier: null })).toBe(false);
    expect(shouldShowInAppAd({ ...base, tier: undefined })).toBe(false);
  });

  it("never shows on critical surfaces, without a slot, or when off", () => {
    for (const surface of ["scan-barcode", "scan-receipt", "checkout", "paywall", "delete-item"]) {
      expect(shouldShowInAppAd({ ...base, tier: "free", surface })).toBe(false);
    }
    expect(shouldShowInAppAd({ ...base, tier: "free", slot: null })).toBe(false);
    expect(shouldShowInAppAd({ ...base, tier: "free", enabled: false })).toBe(false);
  });
});
