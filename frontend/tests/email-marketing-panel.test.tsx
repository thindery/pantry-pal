import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import React from "react";
import { EmailMarketingPanel } from "@/components/admin/EmailMarketingPanel";
import * as adminService from "@/services/adminService";
import type { EmailMarketing, WeeklyIssue, WeeklyRecipes } from "@/services/adminService";

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

const issue = (over: Partial<WeeklyIssue> = {}): WeeklyIssue => ({
  id: "i1", issue_key: "2026-W48", status: "draft", subject: "This week: Green Bean Casserole, Leftover Turkey Soup and 1 more",
  recipes: [{ slug: "green-bean-casserole", title: "Green Bean Casserole" }, { slug: "leftover-turkey-soup", title: "Leftover Turkey Soup" }, { slug: "easy-vegetable-soup", title: "Easy Vegetable Soup" }],
  tip_title: "Rinse canned beans", test_sent_at: "2026-11-26T20:00:00Z", approved_at: null, approved_by: null, send_started_at: null, send_completed_at: null,
  created_at: "2026-11-26T20:00:00Z",
  stats: { sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, complained: 0, open_rate: null, click_rate: null },
  can_approve: true, can_skip: true, ...over,
});
const weekly = (issues: WeeklyIssue[], over: Partial<WeeklyRecipes> = {}): WeeklyRecipes => ({
  auto_send: false, auto_send_delay_hours: 24, test_recipient_set: true, audience: { subscribers: 3, app_users: 1, total: 4 }, issues, ...over,
});

describe("EmailMarketingPanel weekly recipe email (PP-235)", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("is absent on a server without weekly data", async () => {
    vi.spyOn(adminService, "getEmailMarketing").mockResolvedValue(base);
    render(<EmailMarketingPanel period="30d" />);
    await waitFor(() => expect(screen.getByTestId("email-marketing-panel")).toBeTruthy());
    expect(screen.queryByTestId("weekly-recipes")).toBeNull();
  });

  it("shows a draft with Approve & send, auto-send OFF and the real audience size", async () => {
    vi.spyOn(adminService, "getEmailMarketing").mockResolvedValue({ ...base, weekly: weekly([issue()]) });
    render(<EmailMarketingPanel period="30d" />);
    await waitFor(() => expect(screen.getByTestId("weekly-recipes")).toBeTruthy());
    expect(screen.getByTestId("weekly-auto-send").textContent).toContain("Auto-send OFF");
    expect(screen.getByTestId("weekly-audience").textContent).toContain("4 addresses");
    expect(screen.getByTestId("weekly-status-2026-W48").textContent).toContain("Draft");
    expect(screen.getByTestId("weekly-issue-2026-W48").textContent).toContain("Green Bean Casserole");
    expect(screen.getByRole("button", { name: /Approve & send/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Skip this week/ })).toBeTruthy();
    expect(screen.queryByTestId("weekly-stats-2026-W48")).toBeNull(); // nothing sent, so no fake zeros table
  });

  it("approves only after the confirm, then reloads", async () => {
    const get = vi.spyOn(adminService, "getEmailMarketing").mockResolvedValue({ ...base, weekly: weekly([issue()]) });
    const approve = vi.spyOn(adminService, "approveWeeklyIssue").mockResolvedValue({});
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(<EmailMarketingPanel period="30d" />);
    const btn = await screen.findByRole("button", { name: /Approve & send/ });
    fireEvent.click(btn);
    expect(approve).not.toHaveBeenCalled();
    expect(confirm.mock.calls[0][0]).toContain("to 4 people");
    expect(confirm.mock.calls[0][0]).toContain("Email is not live yet");
    fireEvent.click(await screen.findByRole("button", { name: /Approve & send/ }));
    await waitFor(() => expect(approve).toHaveBeenCalledWith("i1"));
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
  });

  it("skips a draft and shows an error when the server refuses", async () => {
    vi.spyOn(adminService, "getEmailMarketing").mockResolvedValue({ ...base, weekly: weekly([issue()]) });
    const skip = vi.spyOn(adminService, "skipWeeklyIssue").mockRejectedValue(new Error("API error: 409"));
    render(<EmailMarketingPanel period="30d" />);
    fireEvent.click(await screen.findByRole("button", { name: /Skip this week/ }));
    await waitFor(() => expect(skip).toHaveBeenCalledWith("i1"));
    expect((await screen.findByRole("alert")).textContent).toContain("409");
  });

  it("shows real stats for a sent issue, opens n/a until open tracking exists, and no buttons", async () => {
    const sent = issue({
      status: "sent", can_approve: false, can_skip: false, approved_at: "2026-11-26T21:00:00Z", approved_by: "auto",
      send_completed_at: "2026-11-26T21:05:00Z",
      stats: { sent: 10, delivered: 9, opened: 4, clicked: 2, bounced: 1, complained: 0, open_rate: 0.4, click_rate: 0.2 },
    });
    const get = vi.spyOn(adminService, "getEmailMarketing").mockResolvedValue({ ...base, weekly: weekly([sent], { auto_send: true }) });
    const view = render(<EmailMarketingPanel period="30d" />);
    await waitFor(() => expect(screen.getByTestId("weekly-stats-2026-W48")).toBeTruthy());
    const stats = screen.getByTestId("weekly-stats-2026-W48").textContent ?? "";
    expect(stats).toContain("10");
    expect(stats).toContain("n/a");
    expect(stats).toContain("20.0%");
    expect(screen.getByTestId("weekly-auto-send").textContent).toContain("Auto-send ON");
    expect(screen.getByTestId("weekly-issue-2026-W48").textContent).toContain("(auto-send)");
    expect(screen.queryByRole("button", { name: /Approve & send/ })).toBeNull();
    view.unmount();
    get.mockResolvedValue({ ...base, tracking: { ...base.tracking, open_tracking_seen: true }, weekly: weekly([sent]) });
    render(<EmailMarketingPanel period="30d" />);
    await waitFor(() => expect(screen.getByTestId("weekly-stats-2026-W48").textContent).toContain("4 (40.0%)"));
  });

  it("explains the empty state", async () => {
    vi.spyOn(adminService, "getEmailMarketing").mockResolvedValue({ ...base, weekly: weekly([]) });
    render(<EmailMarketingPanel period="30d" />);
    await waitFor(() => expect(screen.getByTestId("weekly-empty").textContent).toContain("Wednesday"));
  });
});
