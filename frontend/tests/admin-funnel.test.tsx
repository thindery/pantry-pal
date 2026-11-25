import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import React from "react";
import { FunnelTiles } from "@/components/admin/FunnelTiles";
import * as adminService from "@/services/adminService";
import type { FunnelMetrics } from "@/services/adminService";

const mockFunnelData: FunnelMetrics = {
  period: "7d",
  signups: { period: 42, allTime: 310 },
  trials: { period: 0, allTime: 0 },
  paidConversions: {
    period: 15,
    allTime: 85,
    pro: { period: 10, allTime: 60 },
    family: { period: 5, allTime: 25 },
  },
  churned: { period: 2, allTime: 12 },
  cancelScheduled: { period: 3, allTime: 3 },
};

describe("FunnelTiles Component", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders all 6 subscription funnel tiles with correct period values and all-time secondary text", async () => {
    render(<FunnelTiles period="7d" data={mockFunnelData} />);

    expect(screen.getByText("Subscription funnel")).toBeInTheDocument();
    expect(screen.getByText("7d window")).toBeInTheDocument();

    // 1. Signups
    expect(screen.getByText("Signups")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("All-time: 310")).toBeInTheDocument();

    // 2. Trials (honest zero)
    expect(screen.getByText("Trials")).toBeInTheDocument();
    expect(screen.getByText("All-time: 0")).toBeInTheDocument();

    // 3. Pro conversions
    expect(screen.getByText("Pro conversions")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("All-time: 60")).toBeInTheDocument();

    // 4. Family conversions
    expect(screen.getByText("Family conversions")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("All-time: 25")).toBeInTheDocument();

    // 5. Churned
    expect(screen.getByText("Churned")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("All-time: 12")).toBeInTheDocument();

    // 6. Cancel scheduled (with In term badge)
    expect(screen.getByText("Cancel scheduled")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("All-time: 3")).toBeInTheDocument();
    expect(screen.getByText("In term")).toBeInTheDocument();
  });

  it("renders honest loading state without placeholder numbers", async () => {
    // Hang promise to keep in loading state
    vi.spyOn(adminService, "getFunnelMetrics").mockImplementation(
      () => new Promise(() => {})
    );

    render(<FunnelTiles period="30d" />);

    expect(screen.getByText("Loading subscription funnel...")).toBeInTheDocument();
    expect(screen.queryByText("42")).not.toBeInTheDocument();
    expect(screen.queryByText("Signups")).not.toBeInTheDocument();
  });

  it("renders honest error state on fetch failure without placeholder numbers", async () => {
    vi.spyOn(adminService, "getFunnelMetrics").mockRejectedValue(
      new Error("Database connection timed out")
    );

    render(<FunnelTiles period="7d" />);

    await waitFor(() => {
      expect(screen.getByText("Database connection timed out")).toBeInTheDocument();
    });

    expect(screen.getByText("Retry")).toBeInTheDocument();
    expect(screen.queryByText("42")).not.toBeInTheDocument();
  });
});
