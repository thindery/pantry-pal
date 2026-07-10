"use client";

import { analyzeUsage } from "@/services/geminiService";
import { usePantry } from "@/contexts/pantry-provider";

export function ScanUsageView() {
  const { isProcessing, setIsProcessing, adjustStock, router } = usePantry();

  return (
    <div className="max-w-md mx-auto space-y-8 text-center animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-2">
        <button
          onClick={() => router.push("/dashboard/")}
          className="text-slate-400 hover:text-slate-600 text-sm flex items-center gap-1"
        >
          ← Back to Dashboard
        </button>
      </div>
      <h2 className="text-2xl font-bold">Scan Usage</h2>
      <div
        className={`border-2 border-dashed border-slate-300 rounded-3xl p-12 ${
          isProcessing ? "bg-slate-50" : "bg-white"
        }`}
      >
        {isProcessing ? (
          <div className="animate-pulse space-y-4">
            <div className="text-4xl">🌀</div>
            <p className="text-amber-600 font-bold">AI Analyzing...</p>
          </div>
        ) : (
          <label className="cursor-pointer">
            <div className="text-6xl mb-4">🥕</div>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file == null) return;
                setIsProcessing(true);
                const reader = new FileReader();
                reader.onload = async () => {
                  const base64 = (reader.result as string).split(",")[1];
                  try {
                    const results = await analyzeUsage(base64);
                    for (const r of results) {
                      await adjustStock(r.name, -r.quantityUsed);
                    }
                    router.push("/dashboard/inventory/");
                  } catch {
                    alert("Error processing image.");
                  } finally {
                    setIsProcessing(false);
                  }
                };
                reader.readAsDataURL(file);
              }}
              className="hidden"
            />
            <span className="bg-amber-500 text-white px-6 py-2 rounded-full font-bold">
              Take Photo
            </span>
          </label>
        )}
      </div>
    </div>
  );
}