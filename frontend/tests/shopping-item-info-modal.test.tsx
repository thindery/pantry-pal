import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ShoppingItemInfoModal } from "@/components/dashboard/ShoppingItemInfoModal";
import type { PantryItem, ShoppingListItem } from "@/types";

const mockItem: ShoppingListItem = {
  id: "item-1",
  name: "Whole Milk",
  category: "dairy",
  currentQuantity: 0,
  suggestedQuantity: 2,
  unit: "gallons",
  isManual: false,
  isChecked: false,
  addedAt: "2026-01-01T00:00:00Z",
  reason: "low_stock",
  lowStockThreshold: 1,
};

const mockPantryItem: PantryItem = {
  id: "pantry-1",
  name: "Whole Milk",
  quantity: 0,
  unit: "gallons",
  category: "dairy",
  barcode: "012345678901",
  lastUpdated: "2026-01-01T00:00:00Z",
  productInfo: {
    barcode: "012345678901",
    name: "Whole Milk",
    brand: "Organic Valley",
    category: "dairy",
    source: "upc_database",
    infoLastSynced: "2026-01-01T00:00:00Z",
    nutrition: {
      servingSize: "1 cup (240ml)",
      calories: 150,
      protein: 8,
      carbs: 12,
      fat: 8,
      sodium: 120,
    },
    ingredients: ["Grade A Organic Whole Milk", "Vitamin D3"],
  },
};

describe("ShoppingItemInfoModal", () => {
  it("renders linked pantry item details with nutrition and ingredients tabs", () => {
    const onClose = vi.fn();
    const onEditInPantry = vi.fn();

    render(
      <ShoppingItemInfoModal
        item={mockItem}
        pantryItem={mockPantryItem}
        isOpen={true}
        onClose={onClose}
        onEditInPantry={onEditInPantry}
      />
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Item Details")).toBeInTheDocument();
    expect(screen.getAllByText("Organic Valley").length).toBeGreaterThan(0);
    expect(screen.getByText("UPC: 012345678901")).toBeInTheDocument();
    expect(screen.getByText("Why it's on your list")).toBeInTheDocument();

    // Verify tabs
    const overviewTab = screen.getByRole("button", { name: "overview" });
    const nutritionTab = screen.getByRole("button", { name: "nutrition" });
    const ingredientsTab = screen.getByRole("button", { name: "ingredients" });
    expect(overviewTab).toBeInTheDocument();
    expect(nutritionTab).toBeInTheDocument();
    expect(ingredientsTab).toBeInTheDocument();

    // In Overview tab
    expect(screen.getByText("Quantity in Stock")).toBeInTheDocument();
    expect(screen.getByText("0 gallons")).toBeInTheDocument();
    expect(screen.getByText("Low-stock Alert Level")).toBeInTheDocument();

    // Switch to Nutrition tab
    fireEvent.click(nutritionTab);
    expect(screen.getByText("1 cup (240ml)")).toBeInTheDocument();
    expect(screen.getByText("150")).toBeInTheDocument();
    expect(screen.getByText("Calories")).toBeInTheDocument();
    expect(screen.getByText("Protein (g)")).toBeInTheDocument();

    // Switch to Ingredients tab
    fireEvent.click(ingredientsTab);
    expect(screen.getByText("Grade A Organic Whole Milk")).toBeInTheDocument();
    expect(screen.getByText("Vitamin D3")).toBeInTheDocument();

    // Click "Edit in pantry"
    const editBtn = screen.getByRole("button", { name: /Edit in pantry/i });
    fireEvent.click(editBtn);
    expect(onEditInPantry).toHaveBeenCalledWith(mockPantryItem);
    expect(onClose).toHaveBeenCalled();
  });

  it("renders minimal view for manual items without linked pantry item", () => {
    const manualItem: ShoppingListItem = {
      id: "manual-2",
      name: "Apples",
      category: "produce",
      currentQuantity: 0,
      suggestedQuantity: 5,
      unit: "lbs",
      isManual: true,
      isChecked: false,
      addedAt: "2026-01-01T00:00:00Z",
      reason: "manual",
    };

    render(
      <ShoppingItemInfoModal
        item={manualItem}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText("Apples")).toBeInTheDocument();
    expect(screen.getByText("Added manually")).toBeInTheDocument();
    expect(screen.getByText("5 lbs")).toBeInTheDocument();
    expect(screen.queryByText("Overview")).not.toBeInTheDocument();
    expect(screen.queryByText("Why it's on your list")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Edit in pantry/i })).not.toBeInTheDocument();
  });
});
