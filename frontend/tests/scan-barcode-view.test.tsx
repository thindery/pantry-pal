import { describe, expect, it, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { ScanBarcodeView } from "@/components/dashboard/views/scan-barcode-view";
import { usePantry } from "@/contexts/pantry-provider";
import type { BarcodeProduct } from "@/types";

const knownProduct: BarcodeProduct = {
  barcode: "012345678905",
  name: "Canned Beans",
  category: "pantry",
};

const otherProduct: BarcodeProduct = {
  barcode: "5901234123457",
  name: "Sparkling Water",
  category: "beverages",
};

const cannedBeansItem = {
  id: "item-beans",
  name: "Canned Beans",
  quantity: 1,
  unit: "units",
  category: "pantry",
  lastUpdated: "2026-11-21",
  barcode: "012345678905",
};

const sparklingWaterItem = {
  id: "item-water",
  name: "Sparkling Water",
  quantity: 1,
  unit: "units",
  category: "beverages",
  lastUpdated: "2026-11-21",
  barcode: "5901234123457",
};

const unknownProduct: BarcodeProduct = {
  barcode: "070038626039",
  name: "",
  category: "other",
};

vi.mock("@/components/BarcodeScanner", () => ({
  default: function BarcodeScannerMock({
    onBarcodeDetected,
    quickScan = true,
    onQuickScanChange,
    onCancel,
    collapsed = false,
    onCollapsedChange,
  }: {
    onBarcodeDetected: (product: BarcodeProduct) => void;
    quickScan?: boolean;
    onQuickScanChange?: (enabled: boolean) => void;
    onCancel?: () => void;
    collapsed?: boolean;
    onCollapsedChange?: (collapsed: boolean) => void;
  }) {
    const [pendingKnown, setPendingKnown] = React.useState<BarcodeProduct | null>(null);
    const [showUnknownInput, setShowUnknownInput] = React.useState(false);
    const [unknownName, setUnknownName] = React.useState("");

    return (
      <div data-testid="barcode-scanner">
        {collapsed ? (
          <button
            type="button"
            data-testid="scan-camera-collapsed-bar"
            onClick={() => onCollapsedChange?.(false)}
          >
            Camera paused · Tap to show
          </button>
        ) : (
          <div data-testid="scan-camera-box">Camera</div>
        )}
        {onCancel && (
          <button data-testid="cancel-scan" onClick={onCancel}>
            Cancel
          </button>
        )}

        <label>
          <input
            type="checkbox"
            data-testid="quick-scan-toggle"
            checked={quickScan}
            onChange={(e) => onQuickScanChange?.(e.target.checked)}
          />
          Quick Scan
        </label>

        {!pendingKnown && !showUnknownInput && (
          <>
            <button
              data-testid="simulate-known-scan"
              onClick={() => {
                if (quickScan) {
                  onBarcodeDetected(knownProduct);
                } else {
                  setPendingKnown(knownProduct);
                }
              }}
            >
              Simulate known barcode
            </button>
            <button
              data-testid="simulate-other-scan"
              onClick={() => {
                if (quickScan) {
                  onBarcodeDetected(otherProduct);
                } else {
                  setPendingKnown(otherProduct);
                }
              }}
            >
              Simulate other barcode
            </button>
            <button
              data-testid="simulate-scan"
              onClick={() => setShowUnknownInput(true)}
            >
              Simulate unknown barcode
            </button>
          </>
        )}

        {pendingKnown && (
          <div data-testid="confirm-card">
            <p>{pendingKnown.name}</p>
            <button
              data-testid="confirm-add"
              onClick={() => {
                onBarcodeDetected(pendingKnown);
                setPendingKnown(null);
              }}
            >
              Add to Inventory
            </button>
            <button
              data-testid="rescan"
              onClick={() => setPendingKnown(null)}
            >
              Scan Again
            </button>
          </div>
        )}

        {showUnknownInput && (
          <div data-testid="unknown-name-card">
            <input
              data-testid="unknown-name-input"
              value={unknownName}
              onChange={(e) => setUnknownName(e.target.value)}
              placeholder="Enter product name"
            />
            <div className="flex gap-2">
              <button
                data-testid="add-unknown"
                disabled={!unknownName.trim()}
                onClick={() => {
                  onBarcodeDetected({
                    ...unknownProduct,
                    name: unknownName.trim(),
                  });
                  setShowUnknownInput(false);
                  setUnknownName("");
                }}
              >
                Add to Inventory
              </button>
              <button
                data-testid="unknown-rescan"
                onClick={() => {
                  setShowUnknownInput(false);
                  setUnknownName("");
                }}
              >
                Scan Again
              </button>
            </div>
          </div>
        )}
      </div>
    );
  },
}));

vi.mock("@/contexts/pantry-provider", () => ({
  usePantry: vi.fn(),
}));

const mockHandleSaveScannedProduct = vi.fn();
const mockHandleAdjustQuantity = vi.fn();
const mockSuccess = vi.fn();
const mockError = vi.fn();
const mockRouterPush = vi.fn();

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
  writable: true,
});

beforeEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
  mockHandleSaveScannedProduct.mockImplementation(async (product: BarcodeProduct) => {
    if (product.barcode === otherProduct.barcode) return { ...sparklingWaterItem };
    return { ...cannedBeansItem };
  });
  mockHandleAdjustQuantity.mockResolvedValue(undefined);
  (usePantry as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    handleSaveScannedProduct: mockHandleSaveScannedProduct,
    handleAdjustQuantity: mockHandleAdjustQuantity,
    success: mockSuccess,
    error: mockError,
    router: { push: mockRouterPush },
    inventory: [],
  });
  localStorage.clear();
});

describe("ScanBarcodeView Quick Scan persistence", () => {
  it("defaults Quick Scan to ON for first-time visitors", () => {
    render(<ScanBarcodeView />);
    expect(screen.getByTestId("quick-scan-toggle")).toBeChecked();
  });

  it("restores the saved Quick Scan preference from localStorage", () => {
    localStorage.setItem("pantry-quick-scan", "false");
    render(<ScanBarcodeView />);
    expect(screen.getByTestId("quick-scan-toggle")).not.toBeChecked();
  });

  it("persists Quick Scan changes to localStorage", () => {
    render(<ScanBarcodeView />);
    const toggle = screen.getByTestId("quick-scan-toggle");
    expect(toggle).toBeChecked();

    fireEvent.click(toggle);
    expect(localStorage.getItem("pantry-quick-scan")).toBe("false");

    fireEvent.click(toggle);
    expect(localStorage.getItem("pantry-quick-scan")).toBe("true");
  });
});

describe("ScanBarcodeView Quick Scan on", () => {
  it("auto-adds a known product and shows a toast", async () => {
    render(<ScanBarcodeView />);

    fireEvent.click(screen.getByTestId("simulate-known-scan"));

    await waitFor(() =>
      expect(mockHandleSaveScannedProduct).toHaveBeenCalledTimes(1)
    );

    expect(mockHandleSaveScannedProduct).toHaveBeenCalledWith(
      expect.objectContaining({
        barcode: "012345678905",
        name: "Canned Beans",
        category: "pantry",
      }),
      1,
      { silent: true }
    );

    const toast = screen.getByTestId("quick-scan-image-toast");
    expect(toast).toBeInTheDocument();
    expect(toast).toHaveTextContent("Added Canned Beans");
    expect(toast).toHaveTextContent(/1 unit/i);
    expect(screen.getByTestId("quick-scan-toast-region")).toBeInTheDocument();
    expect(screen.getByTestId("quick-scan-ledger")).toBeInTheDocument();
    expect(screen.getByTestId("session-row-012345678905")).toBeInTheDocument();
    expect(screen.getByTestId("session-qty-012345678905")).toHaveTextContent("1");
    expect(screen.getByText("Canned Beans").className).toContain("line-clamp-2");
    expect(screen.getByRole("button", { name: /Increase Canned Beans/i })).toHaveClass("w-8", "h-8");
    expect(screen.getByTestId("session-row-012345678905")).toHaveAttribute(
      "data-highlighted",
      "true"
    );
  });

  it("does not add the same barcode twice within the debounce window", async () => {
    render(<ScanBarcodeView />);

    fireEvent.click(screen.getByTestId("simulate-known-scan"));
    fireEvent.click(screen.getByTestId("simulate-known-scan"));

    await waitFor(() =>
      expect(mockHandleSaveScannedProduct).toHaveBeenCalledTimes(1)
    );

    // Second click should have been ignored by the 3-second debounce
    expect(mockHandleSaveScannedProduct).toHaveBeenCalledTimes(1);
  });
});

describe("ScanBarcodeView session ledger", () => {
  it("bumps the existing row instead of adding a duplicate after the debounce window", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<ScanBarcodeView />);

    fireEvent.click(screen.getByTestId("simulate-known-scan"));
    await waitFor(() =>
      expect(mockHandleSaveScannedProduct).toHaveBeenCalledTimes(1)
    );
    expect(screen.getByTestId("session-qty-012345678905")).toHaveTextContent("1");

    await vi.advanceTimersByTimeAsync(3000);
    fireEvent.click(screen.getByTestId("simulate-known-scan"));
    await waitFor(() =>
      expect(mockHandleSaveScannedProduct).toHaveBeenCalledTimes(2)
    );

    expect(screen.getAllByTestId("session-row-012345678905")).toHaveLength(1);
    expect(screen.getByTestId("session-qty-012345678905")).toHaveTextContent("2");
    vi.useRealTimers();
  });

  it("puts the newest scan at the top of the list", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<ScanBarcodeView />);

    fireEvent.click(screen.getByTestId("simulate-known-scan"));
    await waitFor(() =>
      expect(screen.getByTestId("session-row-012345678905")).toBeInTheDocument()
    );

    await vi.advanceTimersByTimeAsync(3000);
    fireEvent.click(screen.getByTestId("simulate-other-scan"));
    await waitFor(() =>
      expect(screen.getByTestId("session-row-5901234123457")).toBeInTheDocument()
    );

    const rows = screen.getAllByTestId(/session-row-/);
    expect(rows[0]).toHaveAttribute("data-testid", "session-row-5901234123457");
    expect(rows[1]).toHaveAttribute("data-testid", "session-row-012345678905");
    vi.useRealTimers();
  });

  it("updates the count instantly and saves the net delta after a short pause", async () => {
    render(<ScanBarcodeView />);
    fireEvent.click(screen.getByTestId("simulate-known-scan"));
    await waitFor(() =>
      expect(screen.getByTestId("session-qty-012345678905")).toHaveTextContent("1")
    );

    vi.useFakeTimers();
    const plus = screen.getByRole("button", { name: /Increase Canned Beans/i });
    fireEvent.click(plus);
    fireEvent.click(plus);
    fireEvent.click(plus);
    fireEvent.click(plus);
    expect(screen.getByTestId("session-qty-012345678905")).toHaveTextContent("5");
    expect(screen.getByTestId("quick-scan-image-toast")).toHaveTextContent(/5 units/i);
    expect(mockHandleSaveScannedProduct).toHaveBeenCalledTimes(1);
    expect(mockHandleAdjustQuantity).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });
    expect(mockHandleAdjustQuantity).toHaveBeenCalledTimes(1);
    expect(mockHandleAdjustQuantity).toHaveBeenCalledWith("item-beans", 4, {
      silent: true,
      source: "BARCODE_SCAN",
    });
    vi.useRealTimers();
  });

  it("decrements immediately and removes the row when − reaches zero", async () => {
    render(<ScanBarcodeView />);
    fireEvent.click(screen.getByTestId("simulate-known-scan"));
    await waitFor(() =>
      expect(screen.getByTestId("session-row-012345678905")).toBeInTheDocument()
    );

    vi.useFakeTimers();
    fireEvent.click(screen.getByRole("button", { name: /Decrease Canned Beans/i }));
    expect(screen.queryByTestId("session-row-012345678905")).not.toBeInTheDocument();
    expect(screen.getByTestId("quick-scan-ledger")).toBeInTheDocument();
    expect(screen.getByTestId("session-ledger-empty")).toHaveTextContent(
      "Scanned items appear here"
    );
    expect(mockHandleAdjustQuantity).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });
    expect(mockHandleAdjustQuantity).toHaveBeenCalledWith("item-beans", -1, {
      silent: true,
      source: "BARCODE_SCAN",
    });
    vi.useRealTimers();
  });

  it("reverts the count and shows an error if the delayed save fails", async () => {
    mockHandleAdjustQuantity.mockRejectedValueOnce(new Error("nope"));
    render(<ScanBarcodeView />);
    fireEvent.click(screen.getByTestId("simulate-known-scan"));
    await waitFor(() =>
      expect(screen.getByTestId("session-qty-012345678905")).toHaveTextContent("1")
    );

    vi.useFakeTimers();
    fireEvent.click(screen.getByRole("button", { name: /Increase Canned Beans/i }));
    expect(screen.getByTestId("session-qty-012345678905")).toHaveTextContent("2");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });
    expect(mockError).toHaveBeenCalledWith("Failed to update quantity");
    expect(screen.getByTestId("session-qty-012345678905")).toHaveTextContent("1");
    vi.useRealTimers();
  });

  it("clears the session list without changing inventory", async () => {
    render(<ScanBarcodeView />);
    fireEvent.click(screen.getByTestId("simulate-known-scan"));
    // PP-171: the ledger panel is always rendered (empty state), so wait for the
    // scanned row itself before clearing; waiting on the panel raced the scan.
    await waitFor(() =>
      expect(screen.getByTestId("session-row-012345678905")).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId("clear-session-ledger"));
    expect(screen.getByTestId("quick-scan-ledger")).toBeInTheDocument();
    expect(screen.queryByTestId("session-row-012345678905")).not.toBeInTheDocument();
    expect(screen.getByTestId("session-ledger-empty")).toHaveTextContent(
      "Scanned items appear here"
    );
    expect(mockHandleAdjustQuantity).not.toHaveBeenCalled();
  });

  it("keeps the empty session panel visible under the camera", () => {
    render(<ScanBarcodeView />);
    const ledger = screen.getByTestId("quick-scan-ledger");
    expect(ledger).toBeInTheDocument();
    expect(ledger.className).toContain("flex-1");
    expect(ledger.className).toContain("min-h-0");
    expect(screen.getByTestId("session-ledger-empty")).toHaveTextContent(
      "Scanned items appear here"
    );
    expect(screen.queryByTestId("clear-session-ledger")).not.toBeInTheDocument();
    expect(screen.getByTestId("scan-camera-box")).toBeInTheDocument();
  });

  it("expands the session list and collapses the camera, then restores it", async () => {
    render(<ScanBarcodeView />);
    fireEvent.click(screen.getByTestId("simulate-known-scan"));
    await waitFor(() =>
      expect(screen.getByTestId("session-row-012345678905")).toBeInTheDocument()
    );

    expect(screen.getByTestId("scan-camera-box")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("toggle-ledger-expand"));
    expect(screen.queryByTestId("scan-camera-box")).not.toBeInTheDocument();
    expect(screen.getByTestId("scan-camera-collapsed-bar")).toBeInTheDocument();
    expect(screen.getByTestId("session-row-012345678905")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("scan-camera-collapsed-bar"));
    expect(screen.getByTestId("scan-camera-box")).toBeInTheDocument();
    expect(screen.queryByTestId("scan-camera-collapsed-bar")).not.toBeInTheDocument();
  });
});

describe("ScanBarcodeView Quick Scan off", () => {
  it("shows a confirm card for known products instead of auto-adding", async () => {
    localStorage.setItem("pantry-quick-scan", "false");
    render(<ScanBarcodeView />);

    fireEvent.click(screen.getByTestId("simulate-known-scan"));

    expect(await screen.findByTestId("confirm-card")).toBeInTheDocument();
    expect(mockHandleSaveScannedProduct).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("confirm-add"));

    await waitFor(() =>
      expect(mockHandleSaveScannedProduct).toHaveBeenCalledTimes(1)
    );
    expect(mockHandleSaveScannedProduct).toHaveBeenCalledWith(
      expect.objectContaining({
        barcode: "012345678905",
        name: "Canned Beans",
        category: "pantry",
      }),
      1
    );
    expect(screen.queryByTestId("quick-scan-ledger")).not.toBeInTheDocument();
    expect(screen.queryByTestId("quick-scan-image-toast")).not.toBeInTheDocument();
  });
});

describe("ScanBarcodeView unknown product naming", () => {
  it("lets user type a full name without committing on each keystroke", async () => {
    render(<ScanBarcodeView />);

    fireEvent.click(screen.getByTestId("simulate-scan"));

    const input = await screen.findByTestId("unknown-name-input");
    expect(input).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "F" } });
    expect(input).toHaveValue("F");

    fireEvent.change(input, { target: { value: "Flour" } });
    expect(input).toHaveValue("Flour");

    expect(mockHandleSaveScannedProduct).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("add-unknown"));

    await waitFor(() =>
      expect(mockHandleSaveScannedProduct).toHaveBeenCalledTimes(1)
    );

    expect(mockHandleSaveScannedProduct).toHaveBeenCalledWith(
      expect.objectContaining({
        barcode: "070038626039",
        name: "Flour",
        category: "other",
      }),
      1,
      { silent: true }
    );
  });

  it("does not save when the name is empty", async () => {
    render(<ScanBarcodeView />);

    fireEvent.click(screen.getByTestId("simulate-scan"));
    await screen.findByTestId("unknown-name-input");

    const addButton = screen.getByTestId("add-unknown");
    expect(addButton).toBeDisabled();

    fireEvent.click(addButton);
    expect(mockHandleSaveScannedProduct).not.toHaveBeenCalled();
  });

  it("cancels naming and resets state", async () => {
    render(<ScanBarcodeView />);

    fireEvent.click(screen.getByTestId("simulate-scan"));
    const input = await screen.findByTestId("unknown-name-input");

    fireEvent.change(input, { target: { value: "Flour" } });
    fireEvent.click(screen.getByTestId("unknown-rescan"));

    await waitFor(() =>
      expect(screen.queryByTestId("unknown-name-card")).not.toBeInTheDocument()
    );

    expect(mockHandleSaveScannedProduct).not.toHaveBeenCalled();
  });

  it("auto-saves known products without showing the name modal", async () => {
    render(<ScanBarcodeView />);

    fireEvent.click(screen.getByTestId("simulate-known-scan"));

    await waitFor(() =>
      expect(mockHandleSaveScannedProduct).toHaveBeenCalledTimes(1)
    );
    expect(mockHandleSaveScannedProduct).toHaveBeenCalledWith(
      expect.objectContaining({
        barcode: "012345678905",
        name: "Canned Beans",
        category: "pantry",
      }),
      1,
      { silent: true }
    );
    expect(screen.queryByTestId("unknown-name-card")).not.toBeInTheDocument();
  });
});
