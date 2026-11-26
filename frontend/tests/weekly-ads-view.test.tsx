import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getWeeklyAds = vi.fn();
const favoriteStore = vi.fn();
const unfavoriteStore = vi.fn();

vi.mock("@/services/weekly-ads", async () => {
  const actual = await vi.importActual<typeof import("@/services/weekly-ads")>("@/services/weekly-ads");
  return {
    ...actual,
    getWeeklyAds: (zip: string) => getWeeklyAds(zip),
    favoriteStore: (zip: string, storeId: string) => favoriteStore(zip, storeId),
    unfavoriteStore: (zip: string, storeId: string) => unfavoriteStore(zip, storeId),
  };
});

const trackEvent = vi.fn();
vi.mock("@/lib/analytics", () => ({
  trackEvent: (name: string, params?: Record<string, unknown>) => trackEvent(name, params),
}));

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
  favoriteStore.mockReset();
  unfavoriteStore.mockReset();
  trackEvent.mockReset();
});

const KING = {
  id: "k",
  chain: "King Food Saver",
  name: "King Food Saver",
  address: "335 N Nolting Ave",
  city: "Springfield",
  state: "MO",
  zip: "65802",
  weeklyAdUrl: "https://www.kingfoodsaver.com/weekly-ad",
  isFavorite: false,
};

const ALDI = {
  id: "a",
  chain: "ALDI",
  name: "ALDI",
  address: "Springfield",
  city: "Springfield",
  state: "MO",
  zip: "65804",
  weeklyAdUrl: "https://www.aldi.us/weekly-specials/our-weekly-ads/",
  isFavorite: true,
};

const WALMART = {
  id: "w",
  chain: "Walmart",
  name: "Walmart",
  weeklyAdUrl: "https://www.walmart.com/store/weekly-ads",
  isFavorite: false,
};

describe("WeeklyAdsView (PP-164 & PP-179)", () => {
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

  it("renders the toggle pressed state and separates favorites under Your stores", async () => {
    getWeeklyAds.mockResolvedValue({ zip: "65804", covered: true, stores: [KING, ALDI], fallback: [] });
    render(<WeeklyAdsView />);
    fireEvent.change(screen.getByLabelText("ZIP code"), { target: { value: "65804" } });
    fireEvent.click(screen.getByRole("button", { name: /find stores/i }));

    expect(await screen.findByText("Your stores")).toBeInTheDocument();
    expect(screen.getByText("Other stores nearby")).toBeInTheDocument();

    const aldiBtn = screen.getByRole("button", { name: /remove aldi from favorites/i });
    expect(aldiBtn).toHaveAttribute("aria-pressed", "true");

    const kingBtn = screen.getByRole("button", { name: /add king food saver to favorites/i });
    expect(kingBtn).toHaveAttribute("aria-pressed", "false");
  });

  it("optimistically toggles favorite, calls API and fires GA4 event", async () => {
    getWeeklyAds.mockResolvedValue({ zip: "65804", covered: true, stores: [KING], fallback: [] });
    favoriteStore.mockResolvedValue(undefined);

    render(<WeeklyAdsView />);
    fireEvent.change(screen.getByLabelText("ZIP code"), { target: { value: "65804" } });
    fireEvent.click(screen.getByRole("button", { name: /find stores/i }));

    const starBtn = await screen.findByRole("button", { name: /add king food saver to favorites/i });
    expect(starBtn).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(starBtn);

    // Optimistically pressed
    expect(screen.getByRole("button", { name: /remove king food saver from favorites/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await waitFor(() => {
      expect(favoriteStore).toHaveBeenCalledWith("65804", "k");
      expect(trackEvent).toHaveBeenCalledWith("weekly_ad_favorite", { action: "add", zip3: "658" });
    });
  });

  it("rolls back toggle and displays error when favorite API fails", async () => {
    getWeeklyAds.mockResolvedValue({ zip: "65804", covered: true, stores: [KING], fallback: [] });
    favoriteStore.mockRejectedValue(new Error("Network failed"));

    render(<WeeklyAdsView />);
    fireEvent.change(screen.getByLabelText("ZIP code"), { target: { value: "65804" } });
    fireEvent.click(screen.getByRole("button", { name: /find stores/i }));

    const starBtn = await screen.findByRole("button", { name: /add king food saver to favorites/i });
    fireEvent.click(starBtn);

    // After failure, rolls back to unpressed
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /add king food saver to favorites/i })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
    });

    expect(screen.getByRole("alert")).toHaveTextContent("Network failed");
  });

  it("unstarring calls unfavoriteStore and fires remove GA4 event", async () => {
    getWeeklyAds.mockResolvedValue({ zip: "65804", covered: true, stores: [ALDI], fallback: [] });
    unfavoriteStore.mockResolvedValue(undefined);

    render(<WeeklyAdsView />);
    fireEvent.change(screen.getByLabelText("ZIP code"), { target: { value: "65804" } });
    fireEvent.click(screen.getByRole("button", { name: /find stores/i }));

    const starBtn = await screen.findByRole("button", { name: /remove aldi from favorites/i });
    expect(starBtn).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(starBtn);

    await waitFor(() => {
      expect(unfavoriteStore).toHaveBeenCalledWith("65804", "a");
      expect(trackEvent).toHaveBeenCalledWith("weekly_ad_favorite", { action: "remove", zip3: "658" });
    });
  });
});
