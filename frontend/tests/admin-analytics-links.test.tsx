import React from "react";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AnalyticsLinksCard, ANALYTICS_TOOLS } from "@/components/admin/AnalyticsLinksCard";

describe("PP-127 analytics links", () => {
  it("links live tools out in a new tab and marks Bing not set up", () => {
    render(<AnalyticsLinksCard />);
    const card = screen.getByTestId("analytics-links");
    const links = within(card).getAllByRole("link");
    expect(links).toHaveLength(ANALYTICS_TOOLS.filter((t) => t.status === "live").length);
    for (const link of links) {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link.getAttribute("rel")).toContain("noopener");
      expect(link.getAttribute("href")).toMatch(/^https:\/\//);
    }
    expect(screen.getByTestId("analytics-not-set-up-bing")).toHaveTextContent("Not set up — see PP-119");
  });

  it("shows no invented numbers", () => {
    const { container } = render(<AnalyticsLinksCard />);
    // Ticket numbers and the GA4 product name are the only digits allowed.
    const text = (container.textContent ?? "").replace(/PP-\d+/g, "").replace(/Google Analytics 4|GA4/g, "");
    expect(text).not.toMatch(/\d/);
  });
});
