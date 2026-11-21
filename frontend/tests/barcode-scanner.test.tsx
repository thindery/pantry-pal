import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import BarcodeScanner from "@/components/BarcodeScanner";
import { lookupBarcode } from "@/services/barcodeService";

const zxing = vi.hoisted(() => {
  const state: {
    callback: ((result: { getText: () => string } | null, err: unknown) => void) | null;
    emit: (text: string) => void;
  } = {
    callback: null,
    emit: (text: string) => {
      state.callback?.({ getText: () => text }, null);
    },
  };
  return state;
});

vi.mock("@zxing/browser", () => ({
  BrowserMultiFormatReader: class {
    decodeFromVideoElement(
      _el: unknown,
      cb: (result: { getText: () => string } | null, err: unknown) => void
    ) {
      zxing.callback = cb;
    }
  },
}));

vi.mock("@/services/barcodeService", () => ({
  lookupBarcode: vi.fn(),
  scanBarcodeFromImage: vi.fn(),
}));

const mockedLookup = lookupBarcode as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  zxing.callback = null;
  mockedLookup.mockResolvedValue({ success: false, product: null });
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: {
      getUserMedia: vi.fn().mockResolvedValue({
        getTracks: () => [{ stop: vi.fn() }],
        getVideoTracks: () => [
          { stop: vi.fn(), getCapabilities: () => ({}), applyConstraints: vi.fn() },
        ],
      }),
    },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
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
        quickScan={false}
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
        quickScan={false}
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
        quickScan={false}
      />
    );

    await lookupUnknownBarcode();
    expect(screen.getByRole("button", { name: /Add to Inventory/i })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /Add to Inventory/i }));
    expect(onBarcodeDetected).not.toHaveBeenCalled();
  });
});

describe("BarcodeScanner Quick Scan toggle", () => {
  function renderWithToggle() {
    const onQuickScanChange = vi.fn();
    const result = render(
      <BarcodeScanner
        onBarcodeDetected={vi.fn()}
        onCancel={vi.fn()}
        autoStart={false}
        quickScan={true}
        onQuickScanChange={onQuickScanChange}
      />
    );
    return { ...result, onQuickScanChange };
  }

  it("renders a Quick Scan toggle that defaults to on", () => {
    renderWithToggle();
    const toggle = screen.getByRole("checkbox", { name: /Toggle Quick Scan/i });
    expect(toggle).toBeChecked();
  });

  it("notifies the parent when the toggle is changed", () => {
    const { onQuickScanChange } = renderWithToggle();
    const toggle = screen.getByRole("checkbox", { name: /Toggle Quick Scan/i });

    fireEvent.click(toggle);
    expect(onQuickScanChange).toHaveBeenCalledWith(false);
  });

  it("hides Upload Image and Type Barcode when Quick Scan is on", () => {
    renderWithToggle();
    expect(screen.queryByRole("button", { name: /Upload Image/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Type Barcode/i })).not.toBeInTheDocument();
  });

  it("shows Upload Image and Type Barcode when Quick Scan is off", () => {
    render(
      <BarcodeScanner
        onBarcodeDetected={vi.fn()}
        onCancel={vi.fn()}
        autoStart={false}
        quickScan={false}
        onQuickScanChange={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: /Upload Image/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Type Barcode/i })).toBeInTheDocument();
  });
});

describe("BarcodeScanner manual entry in normal mode", () => {
  it("shows the confirm-card preview for manually typed known barcodes", async () => {
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
        quickScan={false}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Type Barcode/i }));
    fireEvent.change(screen.getByPlaceholderText("e.g., 012345678905"), {
      target: { value: "012345678905" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Look Up Product/i }));

    expect(await screen.findByText("Canned Beans")).toBeInTheDocument();
    expect(onBarcodeDetected).not.toHaveBeenCalled();

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
        quickScan={false}
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

describe("BarcodeScanner camera Quick Scan", () => {
  async function startCameraAndEmit(barcode: string, times = 2) {
    fireEvent.click(screen.getByRole("button", { name: /Start Scanning/i }));
    await waitFor(() => {
      expect(zxing.callback).not.toBeNull();
    });
    for (let i = 0; i < times; i++) {
      zxing.emit(barcode);
    }
  }

  it("auto-adds a recognized camera scan without an Add to Inventory card", async () => {
    mockedLookup.mockResolvedValue({
      success: true,
      product: {
        barcode: "012345678905",
        name: "French Style Green Beans",
        category: "pantry",
      },
    });

    const onBarcodeDetected = vi.fn();
    render(
      <BarcodeScanner
        onBarcodeDetected={onBarcodeDetected}
        onCancel={vi.fn()}
        autoStart={false}
        quickScan={true}
      />
    );

    await startCameraAndEmit("012345678905");

    await waitFor(() =>
      expect(onBarcodeDetected).toHaveBeenCalledWith(
        expect.objectContaining({
          barcode: "012345678905",
          name: "French Style Green Beans",
        })
      )
    );
    expect(screen.queryByRole("button", { name: /Add to Inventory/i })).not.toBeInTheDocument();
  });

  it("debounces the same camera barcode within 3 seconds", async () => {
    mockedLookup.mockResolvedValue({
      success: true,
      product: {
        barcode: "012345678905",
        name: "French Style Green Beans",
        category: "pantry",
      },
    });

    const onBarcodeDetected = vi.fn();
    render(
      <BarcodeScanner
        onBarcodeDetected={onBarcodeDetected}
        onCancel={vi.fn()}
        autoStart={false}
        quickScan={true}
      />
    );

    await startCameraAndEmit("012345678905");
    await waitFor(() => expect(onBarcodeDetected).toHaveBeenCalledTimes(1));

    // Camera resumes; emit the same code again immediately
    await waitFor(() => {
      expect(zxing.callback).not.toBeNull();
    });
    zxing.emit("012345678905");

    // Give the lookup a chance to run if debounce failed
    await new Promise((r) => setTimeout(r, 50));
    expect(onBarcodeDetected).toHaveBeenCalledTimes(1);
  });

  it("pauses for a full manual name when the camera hits an unknown barcode", async () => {
    const onBarcodeDetected = vi.fn();
    render(
      <BarcodeScanner
        onBarcodeDetected={onBarcodeDetected}
        onCancel={vi.fn()}
        autoStart={false}
        quickScan={true}
      />
    );

    await startCameraAndEmit("070038626039");

    const input = await screen.findByPlaceholderText("Enter product name");
    fireEvent.change(input, { target: { value: "F" } });
    expect(screen.getByPlaceholderText("Enter product name")).toHaveValue("F");
    fireEvent.change(screen.getByPlaceholderText("Enter product name"), {
      target: { value: "Flour" },
    });
    expect(onBarcodeDetected).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /Add to Inventory/i }));
    expect(onBarcodeDetected).toHaveBeenCalledWith(
      expect.objectContaining({ barcode: "070038626039", name: "Flour" })
    );
  });

  it("ignores a partial camera read without looking up or showing an error", async () => {
    const onBarcodeDetected = vi.fn();
    render(
      <BarcodeScanner
        onBarcodeDetected={onBarcodeDetected}
        onCancel={vi.fn()}
        autoStart={false}
        quickScan={true}
      />
    );

    await startCameraAndEmit("0123456789", 3);

    await new Promise((r) => setTimeout(r, 50));
    expect(mockedLookup).not.toHaveBeenCalled();
    expect(onBarcodeDetected).not.toHaveBeenCalled();
    expect(screen.queryByText(/Failed to look up|Invalid barcode|error/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Add to Inventory/i })).not.toBeInTheDocument();
  });

  it("does not accept a valid camera barcode until the same code is seen twice", async () => {
    mockedLookup.mockResolvedValue({
      success: true,
      product: {
        barcode: "012345678905",
        name: "French Style Green Beans",
        category: "pantry",
      },
    });

    const onBarcodeDetected = vi.fn();
    render(
      <BarcodeScanner
        onBarcodeDetected={onBarcodeDetected}
        onCancel={vi.fn()}
        autoStart={false}
        quickScan={true}
      />
    );

    await startCameraAndEmit("012345678905", 1);
    await new Promise((r) => setTimeout(r, 50));
    expect(mockedLookup).not.toHaveBeenCalled();
    expect(onBarcodeDetected).not.toHaveBeenCalled();

    zxing.emit("012345678905");
    await waitFor(() =>
      expect(onBarcodeDetected).toHaveBeenCalledWith(
        expect.objectContaining({
          barcode: "012345678905",
          name: "French Style Green Beans",
        })
      )
    );
  });
});

