import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OfferBanner, offerBannerText } from "@/components/OfferBanner";
import { getFirstMonthOffer } from "@/services/subscription";

const ON = {
  enabled: true,
  tier: "pro" as const,
  interval: "month" as const,
  listPriceCents: 499,
  offerPriceCents: 100,
  discountCents: 399,
  months: 1,
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("offerBannerText", () => {
  it("is null when the offer is off or incomplete", () => {
    expect(offerBannerText(null)).toBeNull();
    expect(offerBannerText(undefined)).toBeNull();
    expect(offerBannerText({ enabled: false })).toBeNull();
    expect(offerBannerText({ enabled: true })).toBeNull();
  });

  it("states $1 first month then the unchanged $4.99 list price", () => {
    expect(offerBannerText(ON)).toBe("$1 for your first month of Pro, then $4.99/mo");
  });
});

describe("OfferBanner", () => {
  it("renders nothing when disabled", () => {
    const { container } = render(<OfferBanner offer={{ enabled: false }} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the pricing and hero variants when enabled", () => {
    render(
      <>
        <OfferBanner variant="pricing" offer={ON} />
        <OfferBanner variant="hero" offer={ON} />
      </>,
    );
    expect(screen.getByTestId("offer-banner-pricing")).toHaveTextContent("$1 for your first month of Pro");
    expect(screen.getByTestId("offer-banner-pricing")).toHaveTextContent("first-time subscribers only");
    expect(screen.getByTestId("offer-banner-hero")).toHaveTextContent("$4.99/mo");
  });

  it("fetches the public offer and shows nothing when the API says disabled", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { enabled: false } }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const { container } = render(<OfferBanner />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0][0]).toContain("/api/public/offer");
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the banner when the API says enabled", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, data: ON }) }),
    );
    render(<OfferBanner />);
    expect(await screen.findByTestId("offer-banner-pricing")).toBeInTheDocument();
  });
});

describe("getFirstMonthOffer", () => {
  it("fails closed on network errors and bad payloads", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    expect(await getFirstMonthOffer()).toEqual({ enabled: false });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }));
    expect(await getFirstMonthOffer()).toEqual({ enabled: false });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { enabled: true } }) }),
    );
    expect(await getFirstMonthOffer()).toEqual({ enabled: false });
  });
});
