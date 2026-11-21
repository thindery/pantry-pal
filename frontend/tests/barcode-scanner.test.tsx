import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import BarcodeScanner from "@/components/BarcodeScanner";
import { lookupBarcode } from "@/services/barcodeService";

vi.mock("@zxing/browser", () => ({
  BrowserMultiFormatReader: class {
    decodeFromVideoElement() {}
  },
}));

vi.mock("@/services/barcodeService", () => ({
  lookupBarcode: vi.fn(),
  scanBarcodeFromImage: vi.fn(),
}));

const mockedLookup = lookupBarcode as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mockedLookup.mockResolvedValue({ success: false, product: null });
});

async function lookupUnknownBarcode() {
  fireEvent.click(screen.getByRole("button", { name: /Type Barcode/i }));
  fireEvent.change(screen.getByPlaceholderText("e.g., 012345678905"), {
    target: { value: "070038626039" },
  });
  fireEvent.click(screen.getByRole("button", { name: /Look Up Product/i }));
  return screen.findByPlaceholderText("Enter product name");
}

describe("BarcodeScanner unknown product naming", () => {
  it("lets the user type a full name without hiding the input after the first letter", async () => {
    const onBarcodeDetected = vi.fn();
    render(
      <BarcodeScanner
        onBarcodeDetected={onBarcodeDetected}
        onCancel={vi.fn()}
        autoStart={false}
      />
    );

    const input = await lookupUnknownBarcode();
    expect(screen.getByText("Unknown Product")).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "F" } });
    // Regression: binding the input to detectedProduct.name used to unmount
    // this field after the first character and show the title as "F".
    expect(screen.getByPlaceholderText("Enter product name")).toHaveValue("F");
    expect(screen.getByText("Unknown Product")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "F" })).not.toBeInTheDocument();
    expect(onBarcodeDetected).not.toHaveBeenCalled();

    fireEvent.change(screen.getByPlaceholderText("Enter product name"), {
      target: { value: "Flour" },
    });
    expect(screen.getByPlaceholderText("Enter product name")).toHaveValue("Flour");
    expect(onBarcodeDetected).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /Add to Inventory/i }));
    expect(onBarcodeDetected).toHaveBeenCalledTimes(1);
    expect(onBarcodeDetected).toHaveBeenCalledWith(
      expect.objectContaining({
        barcode: "070038626039",
        name: "Flour",
        category: "other",
      })
    );
  });

  it("commits the typed name on Enter, not earlier", async () => {
    const onBarcodeDetected = vi.fn();
    render(
      <BarcodeScanner
        onBarcodeDetected={onBarcodeDetected}
        onCancel={vi.fn()}
        autoStart={false}
      />
    );

    const input = await lookupUnknownBarcode();
    fireEvent.change(input, { target: { value: "Flour" } });
    expect(onBarcodeDetected).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: "Enter" });
    expect(onBarcodeDetected).toHaveBeenCalledTimes(1);
    expect(onBarcodeDetected).toHaveBeenCalledWith(
      expect.objectContaining({ barcode: "070038626039", name: "Flour" })
    );
  });

  it("does not commit an empty name", async () => {
    const onBarcodeDetected = vi.fn();
    render(
      <BarcodeScanner
        onBarcodeDetected={onBarcodeDetected}
        onCancel={vi.fn()}
        autoStart={false}
      />
    );

    await lookupUnknownBarcode();
    expect(screen.getByRole("button", { name: /Add to Inventory/i })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /Add to Inventory/i }));
    expect(onBarcodeDetected).not.toHaveBeenCalled();
  });
});

describe("BarcodeScanner known product", () => {
  it("shows the looked-up name and confirms without a custom-name field", async () => {
    mockedLookup.mockResolvedValue({
      success: true,
      product: {
        barcode: "012345678905",
        name: "Canned Beans",
        category: "pantry",
      },
    });

    const onBarcodeDetected = vi.fn();
    render(
      <BarcodeScanner
        onBarcodeDetected={onBarcodeDetected}
        onCancel={vi.fn()}
        autoStart={false}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Type Barcode/i }));
    fireEvent.change(screen.getByPlaceholderText("e.g., 012345678905"), {
      target: { value: "012345678905" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Look Up Product/i }));

    expect(await screen.findByText("Canned Beans")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Enter product name")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Add to Inventory/i }));
    expect(onBarcodeDetected).toHaveBeenCalledWith(
      expect.objectContaining({
        barcode: "012345678905",
        name: "Canned Beans",
        category: "pantry",
      })
    );
  });
});
