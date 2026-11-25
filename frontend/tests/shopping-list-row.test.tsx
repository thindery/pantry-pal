import { fireEvent, render, screen, within } from "@testing-library/react";
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
    expect(screen.getByText("You have 1 · alert at 2")).toBeInTheDocument();
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

  it("opens product info modal when clicking the name or picture area", () => {
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

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    const detailsButton = screen.getByRole("button", {
      name: `View details for ${baseItem.name}`,
    });
    fireEvent.click(detailsButton);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText("Item Details")).toBeInTheDocument();
    expect(screen.getByText("Why it's on your list")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Edit in pantry/i })).toBeInTheDocument();
  });

  it("does NOT open modal when clicking checkbox, stepper buttons, or menu", () => {
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

    const checkbox = screen.getByRole("button", { name: /Check item/i });
    fireEvent.click(checkbox);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    const plusBtn = screen.getByRole("button", { name: /Increase quantity/i });
    fireEvent.click(plusBtn);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    const minusBtn = screen.getByRole("button", { name: /Decrease quantity/i });
    fireEvent.click(minusBtn);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    const menuTrigger = screen.getByRole("button", {
      name: `Actions for ${baseItem.name}`,
    });
    fireEvent.click(menuTrigger);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders manual item variant with name, quantity, and 'Added manually' only", () => {
    const manualItem: ShoppingListItem = {
      id: "manual-1",
      name: "Organic Coffee Beans",
      category: "beverages",
      currentQuantity: 0,
      suggestedQuantity: 2,
      unit: "bags",
      isManual: true,
      isChecked: false,
      addedAt: "2026-01-01T00:00:00Z",
      reason: "manual",
    };

    render(
      <ShoppingListRow
        item={manualItem}
        onToggleChecked={vi.fn()}
        onUpdateQuantity={vi.fn()}
        onMarkBought={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    const detailsButton = screen.getByRole("button", {
      name: `View details for ${manualItem.name}`,
    });
    fireEvent.click(detailsButton);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText("Organic Coffee Beans")).toBeInTheDocument();
    expect(within(dialog).getByText("Added manually")).toBeInTheDocument();
    expect(within(dialog).getByText("2 bags")).toBeInTheDocument();

    // Should NOT have "Edit in pantry" or "Why it's on your list"
    expect(screen.queryByRole("button", { name: /Edit in pantry/i })).not.toBeInTheDocument();
    expect(screen.queryByText("Why it's on your list")).not.toBeInTheDocument();
  });

  it("closes modal on X button click, backdrop click, or Escape key", () => {
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

    const detailsButton = screen.getByRole("button", {
      name: `View details for ${baseItem.name}`,
    });

    // 1. Close via X button
    fireEvent.click(detailsButton);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    const closeX = screen.getByTestId("close-modal-x");
    fireEvent.click(closeX);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // 2. Close via backdrop click
    fireEvent.click(detailsButton);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    const backdrop = screen.getByTestId("shopping-item-info-modal-backdrop");
    fireEvent.click(backdrop);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // 3. Close via Escape key
    fireEvent.click(detailsButton);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("calls onEditPantryItem when 'Edit in pantry' is clicked", () => {
    const onEditPantryItem = vi.fn();

    render(
      <ShoppingListRow
        item={baseItem}
        pantryItem={basePantry}
        onToggleChecked={vi.fn()}
        onUpdateQuantity={vi.fn()}
        onMarkBought={vi.fn()}
        onRemove={vi.fn()}
        onEditPantryItem={onEditPantryItem}
      />
    );

    const detailsButton = screen.getByRole("button", {
      name: `View details for ${baseItem.name}`,
    });
    fireEvent.click(detailsButton);

    const editBtn = screen.getByRole("button", { name: /Edit in pantry/i });
    fireEvent.click(editBtn);

    expect(onEditPantryItem).toHaveBeenCalledWith(basePantry);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
