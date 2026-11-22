import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PantryListRow } from "@/components/dashboard/PantryListRow";
import type { PantryItem } from "@/types";

const base: PantryItem = {
  id: "1",
  name: "American Pasteurized process cheese product",
  quantity: 1,
  unit: "units",
  category: "dairy",
  lastUpdated: "2026-01-01T00:00:00Z",
};

describe("PantryListRow", () => {
  it("shows a two-line name, singular unit, thumbnail fallback, and no info pill", () => {
    render(
      <PantryListRow
        item={base}
        isLowStock={false}
        onAdjustQuantity={vi.fn()}
        onEdit={vi.fn()}
        isUpdating={false}
      />
    );

    const name = screen.getByText(base.name);
    expect(name.className).toContain("line-clamp-2");
    expect(name.className).not.toContain("truncate");
    expect(screen.getByText(/1 unit/)).toBeInTheDocument();
    expect(screen.queryByText("Low")).not.toBeInTheDocument();
    expect(screen.queryByText("Out")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Item details")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Decrease quantity/i })).toHaveClass("w-8", "h-8");
  });

  it("uses a left border for low and out instead of a pill", () => {
    const { rerender } = render(
      <PantryListRow
        item={{ ...base, quantity: 1 }}
        isLowStock
        onAdjustQuantity={vi.fn()}
        onEdit={vi.fn()}
        isUpdating={false}
      />
    );
    expect(screen.getByTestId("pantry-row-1").className).toContain("border-l-[var(--accent)]");
    expect(screen.queryByText("Low")).not.toBeInTheDocument();

    rerender(
      <PantryListRow
        item={{ ...base, quantity: 0 }}
        isLowStock={false}
        onAdjustQuantity={vi.fn()}
        onEdit={vi.fn()}
        isUpdating={false}
      />
    );
    expect(screen.getByTestId("pantry-row-1").className).toContain("border-l-[var(--danger)]");
    expect(screen.queryByText("Out")).not.toBeInTheDocument();
  });

  it("renders a product image when one is available", () => {
    render(
      <PantryListRow
        item={{ ...base, imageUrl: "https://example.com/cheese.jpg" }}
        isLowStock={false}
        onAdjustQuantity={vi.fn()}
        onEdit={vi.fn()}
        isUpdating={false}
      />
    );
    expect(document.querySelector("img")?.getAttribute("src")).toBe("https://example.com/cheese.jpg");
  });
});
