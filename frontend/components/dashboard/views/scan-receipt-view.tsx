"use client";

import { ReceiptScanner } from "@/components/dashboard/receipt-scanner";
import { usePantry } from "@/contexts/pantry-provider";

export function ScanReceiptView() {
  const { handleAddScannedItems, router } = usePantry();

  return (
    <ReceiptScanner
      onAddItems={handleAddScannedItems}
      onCancel={() => router.push("/dashboard/")}
    />
  );
}