import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getWeeklyAds = vi.fn();
vi.mock("@/services/weekly-ads", async () => {
  const actual = await vi.importActual<typeof import("@/services/weekly-ads")>("@/services/weekly-ads");
  return { ...actual, getWeeklyAds: (zip: string) => getWeeklyAds(zip) };
});
vi.mock("@/contexts/pantry-provider", () => ({
  usePantry: () => ({
    shoppingList: [
      { id: "1", name: "Milk", suggestedQuantity: 1, unit: "gal", isChecked: false },
      { id: "2", name: "Bread", suggestedQuantity: 1, unit: "", isChecked: true },
    ],
  }),
}));

import { WeeklyAdsView } from "@/components/dashboard/views/weekly-ads-view";

const store = new Map<string, string>();
const memoryStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => void store.set(k, String(v)),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
};
beforeEach(() => {
  store.clear();
  vi.stubGlobal("localStorage", memoryStorage);
  Object.defineProperty(window, "localStorage", { value: memoryStorage, configurable: true });
});
afterEach(() => {
  cleanup();
  getWeeklyAds.mockReset();
});

const KING = { id: "k", chain: "King Food Saver", name: "King Food Saver", address: "335 N Nolting Ave", city: "Springfield", state: "MO", zip: "65802", weeklyAdUrl: "https://www.kingfoodsaver.com/weekly-ad" };
const WALMART = { id: "w", chain: "Walmart", name: "Walmart", weeklyAdUrl: "https://www.walmart.com/store/weekly-ads" };

describe("WeeklyAdsView (PP-164)", () => {
  it("shows local stores linking out to their official ads, with the unchecked list alongside", async () => {
    getWeeklyAds.mockResolvedValue({ zip: "65804", covered: true, stores: [KING], fallback: [] });
    render(<WeeklyAdsView />);
    expect(screen.getByText("Milk")).toBeInTheDocument();
    expect(screen.queryByText("Bread")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("ZIP code"), { target: { value: "65804" } });
    fireEvent.click(screen.getByRole("button", { name: /find stores/i }));
    const link = await screen.findByRole("link", { name: /King Food Saver weekly ad/i });
    expect(link).toHaveAttribute("href", "https://www.kingfoodsaver.com/weekly-ad");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByText("Stores near 65804")).toBeInTheDocument();
    expect(localStorage.getItem("ph_weekly_ads_zip")).toBe("65804");
  });

  it("is honest when a ZIP has no local stores", async () => {
    getWeeklyAds.mockResolvedValue({ zip: "10001", covered: false, stores: [], fallback: [WALMART] });
    render(<WeeklyAdsView />);
    fireEvent.change(screen.getByLabelText("ZIP code"), { target: { value: "10001" } });
    fireEvent.click(screen.getByRole("button", { name: /find stores/i }));
    expect(await screen.findByText(/don.t have local stores for 10001 yet/i)).toBeInTheDocument();
    expect(screen.queryByText(/Stores near/)).not.toBeInTheDocument();
  });

  it("validates the ZIP before calling the API", () => {
    render(<WeeklyAdsView />);
    fireEvent.change(screen.getByLabelText("ZIP code"), { target: { value: "12" } });
    fireEvent.click(screen.getByRole("button", { name: /find stores/i }));
    expect(screen.getByRole("alert")).toHaveTextContent("5-digit");
    expect(getWeeklyAds).not.toHaveBeenCalled();
  });
});
