import { describe, expect, it, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { InventoryView } from "@/components/dashboard/views/inventory-view";
import { ShoppingListView } from "@/components/dashboard/views/shopping-list-view";
import { AddItemView } from "@/components/dashboard/views/add-item-view";
import { ThresholdSettingsModal } from "@/components/dashboard/ThresholdSettingsModal";
import { usePantry } from "@/contexts/pantry-provider";

vi.mock("@/contexts/pantry-provider", () => ({
  usePantry: vi.fn(),
}));

const mockUsePantry = vi.mocked(usePantry);

describe("PP-145: Desktop Pantry layout and 44px icon targets", () => {
  it("renders desktop title text and 44px settings button on InventoryView", () => {
    mockUsePantry.mockReturnValue({
      inventory: [],
      itemGroups: [],
      renameGroup: vi.fn(),
      setGroupTarget: vi.fn(),
      deleteGroup: vi.fn(),
      pantryFilter: "all",
      setPantryFilter: vi.fn(),
      sortBy: "name",
      setSortBy: vi.fn(),
      filteredInventory: [],
      itemIsLowStock: vi.fn().mockReturnValue(false),
      inventoryError: null,
      isLoadingInventory: false,
      loadInventory: vi.fn(),
      handleAdjustQuantity: vi.fn(),
      setEditingItem: vi.fn(),
      updatingItemIds: new Set(),
      setShowThresholdSettings: vi.fn(),
    } as unknown as ReturnType<typeof usePantry>);

    render(<InventoryView />);

    // Desktop title text
    const desktopTitle = screen.getByText("Pantry");
    expect(desktopTitle).toBeInTheDocument();
    expect(desktopTitle).toHaveClass("hidden", "md:inline");

    // Mobile title text
    const mobileTitle = screen.getByText("Pantry Hub");
    expect(mobileTitle).toBeInTheDocument();
    expect(mobileTitle).toHaveClass("md:hidden");

    // Settings button has 44x44 classes and aria-label
    const settingsBtn = screen.getByRole("button", {
      name: "Low stock threshold settings",
    });
    expect(settingsBtn).toBeInTheDocument();
    expect(settingsBtn).toHaveClass("h-11", "w-11");
    expect(settingsBtn).toHaveClass("min-h-11", "min-w-11");

    // Scan item & Add manually buttons are compact button group on desktop (md:flex md:w-auto)
    const scanLink = screen.getByRole("link", { name: /scan item/i });
    const addLink = screen.getByRole("link", { name: /add manually/i });
    expect(scanLink).toBeInTheDocument();
    expect(addLink).toBeInTheDocument();

    const buttonGroup = scanLink.closest("div");
    expect(buttonGroup).toHaveClass("grid", "grid-cols-2", "md:flex", "md:w-auto");
  });

  it("renders 44px settings button on ShoppingListView", () => {
    mockUsePantry.mockReturnValue({
      shoppingList: [],
      itemGroups: [],
      shoppingListBoughtQuantities: {},
      toggleItemChecked: vi.fn(),
      updateShoppingItemQuantity: vi.fn(),
      markItemAsBought: vi.fn(),
      removeShoppingItem: vi.fn(),
      addManualShoppingItem: vi.fn(),
      copyToClipboard: vi.fn(),
      shareShoppingList: vi.fn(),
      clearShoppingList: vi.fn(),
      setShowThresholdSettings: vi.fn(),
      thresholdConfig: {},
      setThresholdConfig: vi.fn(),
      activeShoppingSession: null,
      startingSession: false,
      handleStartSessionInline: vi.fn(),
    } as unknown as ReturnType<typeof usePantry>);

    render(<ShoppingListView />);

    const settingsBtn = screen.getByRole("button", {
      name: "Low stock threshold settings",
    });
    expect(settingsBtn).toBeInTheDocument();
    expect(settingsBtn).toHaveClass("h-11", "w-11");
    expect(settingsBtn).toHaveClass("min-h-11", "min-w-11");
  });

  it("renders 44px close button on ThresholdSettingsModal", () => {
    render(
      <ThresholdSettingsModal
        thresholdConfig={{}}
        onChange={vi.fn()}
        onClose={vi.fn()}
      />
    );

    const closeBtn = screen.getByRole("button", { name: "Close" });
    expect(closeBtn).toBeInTheDocument();
    expect(closeBtn).toHaveClass("h-11", "w-11");
    expect(closeBtn).toHaveClass("min-h-11", "min-w-11");
  });

  it("renders AddItemView back link with tokenized color instead of text-slate-400", () => {
    mockUsePantry.mockReturnValue({
      router: { push: vi.fn() },
      handleCreateItem: vi.fn(),
      isAddingItem: false,
    } as unknown as ReturnType<typeof usePantry>);

    render(<AddItemView />);

    const backBtn = screen.getByRole("button", { name: /← back to inventory/i });
    expect(backBtn).toBeInTheDocument();
    expect(backBtn).toHaveClass("text-[var(--muted)]");
    expect(backBtn).not.toHaveClass("text-slate-400");
  });
});
