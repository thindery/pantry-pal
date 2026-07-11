"use client";

import BarcodeScanner from "@/components/BarcodeScanner";
import { usePantry } from "@/contexts/pantry-provider";

export function ScanBarcodeView() {
  const {
    setScannedProduct,
    setScanQuantity,
    setIsConfirmingScan,
    router,
  } = usePantry();

  return (
    <BarcodeScanner
      autoStart
      onBarcodeDetected={async (product) => {
        setScannedProduct(product);
        setScanQuantity(1);
        setIsConfirmingScan(true);
      }}
      onCancel={() => router.push("/dashboard/")}
    />
  );
}