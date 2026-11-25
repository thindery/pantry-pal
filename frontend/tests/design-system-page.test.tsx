import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DesignSystemPage, { metadata } from "@/app/design-system/page";

vi.mock("@/components/marketing/MarketingNav", () => ({ MarketingNav: () => null }));
vi.mock("@/components/marketing/MarketingFooter", () => ({ MarketingFooter: () => null }));

describe("PP-146 shipped design-system reference", () => {
  it("stays noindex, nofollow", () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it("renders the split primary tokens and real compact row components", () => {
    render(<DesignSystemPage />);
    expect(screen.getByText("--primary", { exact: true })).toBeInTheDocument();
    expect(screen.getByText("--primary-bright", { exact: true })).toBeInTheDocument();
    expect(screen.getByTestId("pantry-row-ds-milk")).toBeInTheDocument();
    expect(screen.getByText("Coffee filters")).toBeInTheDocument();
    expect(screen.getByText("Recipes", { exact: true })).toBeInTheDocument();
    expect(screen.queryByText(/proposed/i)).not.toBeInTheDocument();
  });
});
