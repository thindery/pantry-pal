import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import React from "react";
import { EmailMarketingPanel } from "@/components/admin/EmailMarketingPanel";
import * as adminService from "@/services/adminService";
import type { EmailMarketing } from "@/services/adminService";

const base: EmailMarketing = {
  period: "30d",
  config: { journeys_mode: "off", test_recipient_count: 0, mailing_address_set: false, webhook_secret_present: false, onboarding_enrollment_on: false },
  subscribers: { total: 5, pending: 4, confirmed: 1, unsubscribed: 0, new_in_period: 5, unsubscribed_in_period: 0, by_day: [], by_source: [], top_recipes: [] },
  journeys: [
    {
      journey: "recipe_welcome", list: "recipes", enrolled: 1, active: 1, completed: 0, stopped: 0, overdue: 0, stop_reasons: {}, unsubscribed_in_period: 0,
      steps: [{ step: "welcome", delay_days: 0, sent: 1, delivered: 1, opened: 0, clicked: 1, bounced: 0, click_rate: 1 }],
    },
  ],
  templates: [],
  top_links: [],
  bot_clicks_ignored: 0,
  tracking: { webhook_events_seen: false, open_tracking_seen: false, click_source: "x" },
  recent_events: [],
};

describe("EmailMarketingPanel", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("shows real counts, the OFF state and honest empty states", async () => {
    vi.spyOn(adminService, "getEmailMarketing").mockResolvedValue(base);
    render(<EmailMarketingPanel period="30d" />);
    await waitFor(() => expect(screen.getByTestId("email-marketing-panel")).toBeTruthy());
    expect(screen.getByTestId("journeys-mode").textContent).toContain("OFF");
    expect(screen.getByTestId("stat-total").textContent).toContain("5");
    expect(screen.getByTestId("stat-pending").textContent).toContain("Held: journeys not live");
    expect(screen.getByTestId("journey-recipe_welcome").textContent).toContain("welcome");
    expect(screen.getByTestId("email-top-links").textContent).toContain("No link clicks yet.");
    expect(screen.getByTestId("email-recent-events").textContent).toContain("No Resend webhook events yet");
    // Opens are n/a, not 0%, until open events exist.
    expect(screen.getByTestId("journey-recipe_welcome").textContent).toContain("n/a");
  });

  it("shows LIVE mode and recent events when present", async () => {
    vi.spyOn(adminService, "getEmailMarketing").mockResolvedValue({
      ...base,
      config: { ...base.config, journeys_mode: "on" },
      tracking: { ...base.tracking, webhook_events_seen: true, open_tracking_seen: true },
      recent_events: [{ occurred_at: "2026-11-26T12:00:00Z", event_type: "email.clicked", template: "recipe_welcome", journey: "recipe_welcome", to_email: "a***e@example.com" }],
    });
    render(<EmailMarketingPanel period="7d" />);
    await waitFor(() => expect(screen.getByTestId("journeys-mode").textContent).toContain("LIVE"));
    expect(screen.getByTestId("email-recent-events").textContent).toContain("clicked");
  });

  it("shows an error with retry when the API fails", async () => {
    vi.spyOn(adminService, "getEmailMarketing").mockRejectedValue(new Error("boom"));
    render(<EmailMarketingPanel period="7d" />);
    await waitFor(() => expect(screen.getByTestId("email-marketing-error").textContent).toContain("boom"));
  });
});
