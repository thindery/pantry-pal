import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ShoppingListRow } from "@/components/dashboard/ShoppingListRow";
import type { PantryItem, ShoppingListItem } from "@/types";

const baseItem: ShoppingListItem = {
  id: "item-1",
  name: "Grated Cheese Blend",
  category: "dairy",
  currentQuantity: 1,
  suggestedQuantity: 3,
  unit: "bags",
  isManual: false,
  isChecked: false,
  addedAt: "2026-01-01T00:00:00Z",
  reason: "low_stock",
  lowStockThreshold: 2,
};

const basePantry: PantryItem = {
  id: "pantry-1",
  name: "Grated Cheese Blend",
  quantity: 1,
  unit: "bags",
  category: "dairy",
  lastUpdated: "2026-01-01T00:00:00Z",
};

describe("ShoppingListRow", () => {
  it("renders compact row with two-line name, short subline, and w-8 stepper", () => {
    render(
      <ShoppingListRow
        item={baseItem}
        pantryItem={basePantry}
        onToggleChecked={vi.fn()}
        onUpdateQuantity={vi.fn()}
        onMarkBought={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    const name = screen.getByText(baseItem.name);
    expect(name.className).toContain("line-clamp-2");
    expect(screen.getByText("Have 1 · need 3")).toBeInTheDocument();
    expect(screen.queryByText(/warn at or below/)).not.toBeInTheDocument();

    const minusBtn = screen.getByRole("button", { name: /Decrease quantity/i });
    const plusBtn = screen.getByRole("button", { name: /Increase quantity/i });
    expect(minusBtn).toHaveClass("w-8", "h-8");
    expect(plusBtn).toHaveClass("w-8", "h-8");
  });

  it("does not render always-visible mark bought or trash buttons", () => {
    render(
      <ShoppingListRow
        item={baseItem}
        pantryItem={basePantry}
        onToggleChecked={vi.fn()}
        onUpdateQuantity={vi.fn()}
        onMarkBought={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    // There should be NO visible "Mark bought" or "Remove" buttons before opening menu
    expect(screen.queryByText("Mark bought")).not.toBeInTheDocument();
    expect(screen.queryByText("Remove")).not.toBeInTheDocument();
  });

  it("opens overflow menu with Mark bought and Remove actions", () => {
    const onMarkBought = vi.fn();
    const onRemove = vi.fn();

    render(
      <ShoppingListRow
        item={baseItem}
        pantryItem={basePantry}
        onToggleChecked={vi.fn()}
        onUpdateQuantity={vi.fn()}
        onMarkBought={onMarkBought}
        onRemove={onRemove}
      />
    );

    const menuTrigger = screen.getByRole("button", {
      name: `Actions for ${baseItem.name}`,
    });
    fireEvent.click(menuTrigger);

    const markBoughtBtn = screen.getByRole("menuitem", { name: /Mark bought/i });
    const removeBtn = screen.getByRole("menuitem", { name: /Remove/i });
    expect(markBoughtBtn).toBeInTheDocument();
    expect(removeBtn).toBeInTheDocument();

    fireEvent.click(markBoughtBtn);
    expect(onMarkBought).toHaveBeenCalledWith(baseItem);
  });

  it("toggles item checked via checkbox and updates quantity via stepper", () => {
    const onToggleChecked = vi.fn();
    const onUpdateQuantity = vi.fn();

    render(
      <ShoppingListRow
        item={baseItem}
        pantryItem={basePantry}
        onToggleChecked={onToggleChecked}
        onUpdateQuantity={onUpdateQuantity}
        onMarkBought={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    const checkbox = screen.getByRole("button", { name: /Check item/i });
    fireEvent.click(checkbox);
    expect(onToggleChecked).toHaveBeenCalledWith(baseItem.id);

    const plusBtn = screen.getByRole("button", { name: /Increase quantity/i });
    fireEvent.click(plusBtn);
    expect(onUpdateQuantity).toHaveBeenCalledWith(baseItem.id, 4);

    const minusBtn = screen.getByRole("button", { name: /Decrease quantity/i });
    fireEvent.click(minusBtn);
    expect(onUpdateQuantity).toHaveBeenCalledWith(baseItem.id, 2);
  });

  it("renders product image when imageUrl is present on matching pantry item", () => {
    render(
      <ShoppingListRow
        item={baseItem}
        pantryItem={{ ...basePantry, imageUrl: "https://example.com/cheese.jpg" }}
        onToggleChecked={vi.fn()}
        onUpdateQuantity={vi.fn()}
        onMarkBought={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    const img = document.querySelector("img");
    expect(img?.getAttribute("src")).toBe("https://example.com/cheese.jpg");
  });
});
