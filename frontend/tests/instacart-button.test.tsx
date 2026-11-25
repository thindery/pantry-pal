import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PantryItem, ShoppingListItem } from "@/types";

const getInstacartEnabled = vi.fn();
const createInstacartLink = vi.fn();
const trackEvent = vi.fn();

vi.mock("@/services/instacart", async () => {
  const actual = await vi.importActual<typeof import("@/services/instacart")>("@/services/instacart");
  return {
    ...actual,
    getInstacartEnabled: (...a: unknown[]) => getInstacartEnabled(...a),
    createInstacartLink: (...a: unknown[]) => createInstacartLink(...a),
  };
});
vi.mock("@/lib/analytics", () => ({ trackEvent: (...a: unknown[]) => trackEvent(...a) }));

import { InstacartButton } from "@/components/dashboard/InstacartButton";
import { buildInstacartItems } from "@/services/instacart";

function row(over: Partial<ShoppingListItem>): ShoppingListItem {
  return {
    id: "s1",
    name: "Milk",
    category: "dairy",
    currentQuantity: 0,
    suggestedQuantity: 2,
    unit: "units",
    isManual: false,
    isChecked: false,
    addedAt: "2026-11-25T00:00:00Z",
    reason: "low_stock",
    ...over,
  };
}

const pantry = [
  { id: "p1", name: "Milk", quantity: 0, unit: "units", category: "dairy", lastUpdated: "", barcode: "036000291452" },
] as PantryItem[];

describe("buildInstacartItems", () => {
  it("skips checked and archived rows and attaches the pantry barcode as upc", () => {
    const items = buildInstacartItems(
      [
        row({ id: "a", pantryItemId: "p1" }),
        row({ id: "b", name: "Eggs", isChecked: true }),
        row({ id: "c", name: "Rice", isArchived: true }),
        row({ id: "d", name: "Flour", suggestedQuantity: 0, unit: "lbs" }),
      ],
      pantry,
    );
    expect(items).toEqual([
      { name: "Milk", quantity: 2, unit: "units", upc: "036000291452" },
      { name: "Flour", quantity: 1, unit: "lbs" },
    ]);
  });
});

describe("InstacartButton", () => {
  let openSpy: ReturnType<typeof vi.spyOn>;
  const fakeTab = { opener: "x", location: { href: "" }, close: vi.fn() };

  beforeEach(() => {
    getInstacartEnabled.mockResolvedValue(true);
    createInstacartLink.mockResolvedValue({ url: "https://customer.instacart.test/list/1", itemCount: 1 });
    fakeTab.location.href = "";
    fakeTab.close.mockClear();
    openSpy = vi.spyOn(window, "open").mockReturnValue(fakeTab as unknown as Window);
  });
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    openSpy.mockRestore();
  });

  it("renders nothing when the server flag is off", async () => {
    getInstacartEnabled.mockResolvedValue(false);
    const { container } = render(<InstacartButton shoppingList={[row({})]} inventory={pantry} />);
    await waitFor(() => expect(getInstacartEnabled).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the button with a Beta badge when on", async () => {
    render(<InstacartButton shoppingList={[row({})]} inventory={pantry} />);
    expect(await screen.findByTestId("instacart-button")).toHaveTextContent("Send to Instacart");
    expect(screen.getByTestId("instacart-button")).toHaveTextContent("Beta");
  });

  it("is disabled when nothing is left to buy", async () => {
    render(<InstacartButton shoppingList={[row({ isChecked: true })]} inventory={pantry} />);
    expect(await screen.findByTestId("instacart-button")).toBeDisabled();
  });

  it("opens the returned link in a new tab and fires instacart_handoff", async () => {
    render(<InstacartButton shoppingList={[row({ pantryItemId: "p1" })]} inventory={pantry} />);
    fireEvent.click(await screen.findByTestId("instacart-button"));
    await waitFor(() => expect(fakeTab.location.href).toBe("https://customer.instacart.test/list/1"));
    expect(openSpy).toHaveBeenCalledWith("about:blank", "_blank");
    expect(fakeTab.opener).toBeNull();
    expect(createInstacartLink).toHaveBeenCalledWith([
      { name: "Milk", quantity: 2, unit: "units", upc: "036000291452" },
    ]);
    expect(trackEvent).toHaveBeenCalledWith("instacart_handoff", { status: "success", item_count: 1 });
  });

  it("shows the loading state while the request is in flight", async () => {
    let resolve: (v: { url: string; itemCount: number }) => void = () => {};
    createInstacartLink.mockReturnValue(new Promise((r) => (resolve = r)));
    render(<InstacartButton shoppingList={[row({})]} inventory={pantry} />);
    fireEvent.click(await screen.findByTestId("instacart-button"));
    await waitFor(() => expect(screen.getByTestId("instacart-button")).toBeDisabled());
    expect(screen.getByTestId("instacart-button")).toHaveTextContent("Sending");
    resolve({ url: "https://customer.instacart.test/list/2", itemCount: 1 });
    await waitFor(() => expect(screen.getByTestId("instacart-button")).not.toBeDisabled());
  });

  it("shows an error, closes the blank tab and tracks the failure", async () => {
    createInstacartLink.mockRejectedValue(new Error("Instacart did not respond. Try again in a moment."));
    render(<InstacartButton shoppingList={[row({})]} inventory={pantry} />);
    fireEvent.click(await screen.findByTestId("instacart-button"));
    expect(await screen.findByTestId("instacart-error")).toHaveTextContent("Instacart did not respond");
    expect(fakeTab.close).toHaveBeenCalled();
    expect(trackEvent).toHaveBeenCalledWith("instacart_handoff", { status: "error", item_count: 1 });
  });
});
