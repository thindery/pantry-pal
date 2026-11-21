import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ScanBarcodeView } from "@/components/dashboard/views/scan-barcode-view";
import { usePantry } from "@/contexts/pantry-provider";
import type { BarcodeProduct } from "@/types";

vi.mock("@/components/BarcodeScanner", () => ({
  default: function BarcodeScannerMock({
    onBarcodeDetected,
  }: {
    onBarcodeDetected: (product: BarcodeProduct) => void;
  }) {
    return (
      <div data-testid="barcode-scanner">
        <button
          data-testid="simulate-scan"
          onClick={() =>
            onBarcodeDetected({
              barcode: "070038626039",
              name: "",
              category: "other",
            })
          }
        >
          Simulate unknown barcode
        </button>
        <button
          data-testid="simulate-known-scan"
          onClick={() =>
            onBarcodeDetected({
              barcode: "012345678905",
              name: "Canned Beans",
              category: "pantry",
            })
          }
        >
          Simulate known barcode
        </button>
      </div>
    );
  },
}));

vi.mock("@/contexts/pantry-provider", () => ({
  usePantry: vi.fn(),
}));

const mockHandleSaveScannedProduct = vi.fn();
const mockSuccess = vi.fn();
const mockError = vi.fn();
const mockRouterPush = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  (usePantry as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    handleSaveScannedProduct: mockHandleSaveScannedProduct,
    success: mockSuccess,
    error: mockError,
    router: { push: mockRouterPush },
    inventory: [],
  });
});

describe("ScanBarcodeView unknown product naming", () => {
  it("lets user type a full name without committing on each keystroke", async () => {
    render(<ScanBarcodeView />);

    fireEvent.click(screen.getByTestId("simulate-scan"));

    const input = await screen.findByPlaceholderText("Enter product name");
    expect(input).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "F" } });
    expect(input).toHaveValue("F");

    fireEvent.change(input, { target: { value: "Flour" } });
    expect(input).toHaveValue("Flour");

    expect(mockHandleSaveScannedProduct).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /Add Product/i }));

    await waitFor(() =>
      expect(mockHandleSaveScannedProduct).toHaveBeenCalledTimes(1)
    );

    expect(mockHandleSaveScannedProduct).toHaveBeenCalledWith(
      expect.objectContaining({
        barcode: "070038626039",
        name: "Flour",
        category: "other",
      }),
      1
    );
  });

  it("does not save when the name is empty", async () => {
    render(<ScanBarcodeView />);

    fireEvent.click(screen.getByTestId("simulate-scan"));
    await screen.findByPlaceholderText("Enter product name");

    const addButton = screen.getByRole("button", { name: /Add Product/i });
    expect(addButton).toBeDisabled();

    fireEvent.click(addButton);
    expect(mockHandleSaveScannedProduct).not.toHaveBeenCalled();
  });

  it("cancels naming and resets state", async () => {
    render(<ScanBarcodeView />);

    fireEvent.click(screen.getByTestId("simulate-scan"));
    const input = await screen.findByPlaceholderText("Enter product name");

    fireEvent.change(input, { target: { value: "Flour" } });
    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));

    await waitFor(() =>
      expect(screen.queryByPlaceholderText("Enter product name")).not.toBeInTheDocument()
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
      1
    );
    expect(screen.queryByPlaceholderText("Enter product name")).not.toBeInTheDocument();
  });
});
