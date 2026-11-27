// PP-237: render /admin with payloads captured from the live backend (ids anonymised).
// Regression: the dashboard threw "Cannot read properties of undefined (reading 'failedPayments')"
// as soon as the API call started succeeding, because the backend shape differs from the UI types.
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import fs from "node:fs";
import path from "node:path";

vi.mock("@/lib/get-bearer-token", () => ({
  getBearerToken: vi.fn(async () => "tok"),
  clearCachedBearerToken: vi.fn(),
}));
import AdminDashboard from "@/components/AdminDashboard";
import { normalizeDashboardMetrics } from "@/services/adminService";

const fixture = (n: string) =>
  fs.readFileSync(path.resolve(__dirname, `fixtures/admin-prod-shape/${n}.json`), "utf8");

describe("admin dashboard with live backend payloads (PP-237)", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        const u = String(url);
        const pick = u.includes("/dashboard")
          ? "dashboard"
          : u.includes("/funnel")
            ? "funnel"
            : u.includes("ai-provider")
              ? "provider"
              : u.includes("email-metrics")
                ? "emailmetrics"
                : u.includes("email-marketing")
                  ? "email"
                  : null;
        if (!pick) return new Response("{}", { status: 404 });
        return new Response(fixture(pick), { status: 200, headers: { "Content-Type": "application/json" } });
      }),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it("renders the dashboard and the Marketing tab without throwing", async () => {
    render(<AdminDashboard onBack={() => {}} />);
    await waitFor(() => expect(screen.getByText("Recent Transactions")).toBeTruthy());
    expect(screen.queryByText(/Failed to Load/i)).toBeNull();
    fireEvent.click(screen.getAllByText("Marketing")[0]);
    await waitFor(() => expect(document.body.textContent).toMatch(/sent|Sent/));
  });

  it("other tabs render without throwing", async () => {
    render(<AdminDashboard onBack={() => {}} />);
    await waitFor(() => expect(screen.getByText("Recent Transactions")).toBeTruthy());
    for (const label of ["Errors", "Users", "Products", "Stripe", "Feature Flags"]) {
      fireEvent.click(screen.getAllByText(label)[0]);
      await new Promise((r) => setTimeout(r, 150));
    }
    expect(screen.queryByText(/Failed to Load/i)).toBeNull();
  });

  it("normalises cents, statuses and missing fields", () => {
    const m = normalizeDashboardMetrics(JSON.parse(fixture("dashboard")).data);
    expect(m.revenue.lifetime).toBe(4.99);
    expect(m.alerts.failedPayments).toBe(0);
    expect(m.logins.data).toEqual([]);
    expect(m.products.sparkline).toEqual([]);
    expect(m.transactions[0].status).toBe("success");
    expect(m.transactions[0].amount).toBe(0);
    expect(m.transactions[1].status).toBe("pending"); // refunded
    expect(Number.isNaN(new Date(m.transactions[0].timestamp).getTime())).toBe(false);
  });

  it("tolerates an empty payload", () => {
    const m = normalizeDashboardMetrics({});
    expect(m.transactions).toEqual([]);
    expect(m.alerts.failedPayments).toBe(0);
  });
});
