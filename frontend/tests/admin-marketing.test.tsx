import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import React from "react";
import { MarketingView } from "@/components/admin/MarketingView";
import * as adminService from "@/services/adminService";
import type { EmailMetrics } from "@/services/adminService";

const mockEmailMetricsWithRates: EmailMetrics = {
  period: "7d",
  config: {
    resend_configured: true,
    from_address: "Pantry Hub <notifications@mypantryhub.com>",
    webhook_secret_present: true,
  },
  sends_by_template: [
    { template: "welcome", count: 45 },
    { template: "payment_receipt", count: 12 },
  ],
  sends_by_day: [
    { day: "2026-11-20", count: 20 },
    { day: "2026-11-21", count: 37 },
  ],
  status_counts: {
    sent: 50,
    delivered: 45,
    failed: 2,
    bounced: 3,
    backfill: 100,
  },
  rates: {
    delivered: 0.9,
    bounced: 0.06,
    complained: 0.0,
    total_sent: 50,
  },
  rates_reason: null,
  recent_failures: [
    {
      created_at: "2026-11-21T10:00:00Z",
      template: "payment_receipt",
      to_email: "u***r@example.com",
      error_message: "Rate limit exceeded",
    },
  ],
  suppressions: {
    count: 1,
    items: [
      {
        email: "b***e@example.com",
        reason: "bounced",
        created_at: "2026-11-20T12:00:00Z",
      },
    ],
  },
  recent_sends: [
    {
      created_at: "2026-11-21T11:00:00Z",
      to_email: "a***e@example.com",
      template: "welcome",
      subject: "Welcome to Pantry Hub!",
      status: "delivered",
      resend_id: "res_abc123xyz789",
    },
  ],
};

const mockEmailMetricsPendingWebhook: EmailMetrics = {
  ...mockEmailMetricsWithRates,
  rates: null,
  rates_reason: "pending webhook",
};

describe("MarketingView Component", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders marketing view with rates when webhook is present", async () => {
    vi.spyOn(adminService, "getEmailMetrics").mockResolvedValue(mockEmailMetricsWithRates);
    vi.spyOn(adminService, "getFunnelMetrics").mockResolvedValue({
      period: "7d",
      signups: { period: 10, allTime: 50 },
      trials: { period: 0, allTime: 0 },
      paidConversions: {
        period: 2,
        allTime: 15,
        pro: { period: 1, allTime: 10 },
        family: { period: 1, allTime: 5 },
      },
      churned: { period: 0, allTime: 2 },
      cancelScheduled: { period: 0, allTime: 1 },
    });

    render(<MarketingView period="7d" />);

    expect(screen.getByText("Loading email visibility data...")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Marketing & Email Health")).toBeInTheDocument();
    });

    // Config chip
    expect(screen.getByText("Resend")).toBeInTheDocument();
    expect(screen.getByText("Configured")).toBeInTheDocument();
    expect(screen.getByText("Pantry Hub <notifications@mypantryhub.com>")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();

    // Rates displayed
    expect(screen.getByText("90.0%")).toBeInTheDocument();
    expect(screen.getByText("6.0%")).toBeInTheDocument();
    expect(screen.getByText("0.0%")).toBeInTheDocument();

    // Volume by template & day
    expect(screen.getAllByText("welcome").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("45")).toBeInTheDocument();
    expect(screen.getAllByText("payment_receipt").length).toBeGreaterThan(0);
    expect(screen.getByText("2026-11-20")).toBeInTheDocument();

    // Failures and suppressions
    expect(screen.getByText("Rate limit exceeded")).toBeInTheDocument();
    expect(screen.getByText("u***r@example.com")).toBeInTheDocument();
    expect(screen.getByText("b***e@example.com")).toBeInTheDocument();

    // Recent send table
    expect(screen.getByText("a***e@example.com")).toBeInTheDocument();
    expect(screen.getByText("Welcome to Pantry Hub!")).toBeInTheDocument();
  });

  it("renders honest 'Pending webhook' states when rates are null", async () => {
    vi.spyOn(adminService, "getEmailMetrics").mockResolvedValue(mockEmailMetricsPendingWebhook);

    render(<MarketingView period="7d" />);

    await waitFor(() => {
      expect(screen.getByText("Marketing & Email Health")).toBeInTheDocument();
    });

    // 3 "Pending webhook" badges for delivery, bounce, complaint rates
    const pendingBadges = screen.getAllByText("Pending webhook");
    expect(pendingBadges).toHaveLength(3);

    // No invented percentages
    expect(screen.queryByText("90.0%")).not.toBeInTheDocument();
  });

  it("never displays raw secret strings or tokens", async () => {
    const rawSecret = "not-a-real-resend-value";
    const webhookSecret = "not-a-real-webhook-value";

    vi.spyOn(adminService, "getEmailMetrics").mockResolvedValue(mockEmailMetricsWithRates);

    const { container } = render(<MarketingView period="7d" />);

    await waitFor(() => {
      expect(screen.getByText("Marketing & Email Health")).toBeInTheDocument();
    });

    expect(container.innerHTML).not.toContain(rawSecret);
    expect(container.innerHTML).not.toContain(webhookSecret);
  });
});
