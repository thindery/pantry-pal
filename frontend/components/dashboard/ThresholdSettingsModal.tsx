"use client";

import { X } from "lucide-react";
import { CATEGORIES, DEFAULT_THRESHOLDS } from "@/lib/constants";
import type { ThresholdConfig } from "@/types";

interface ThresholdSettingsModalProps {
  thresholdConfig: ThresholdConfig;
  onChange: (config: ThresholdConfig) => void;
  onClose: () => void;
}

export function ThresholdSettingsModal({
  thresholdConfig,
  onChange,
  onClose,
}: ThresholdSettingsModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-[var(--surface)] rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-[var(--foreground)]">
            Low stock thresholds
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[var(--muted)] hover:text-[var(--foreground)] rounded-lg"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        <p className="text-[var(--muted)] text-sm mb-4">
          Items at or below these levels appear on your shopping list.
        </p>
        <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
          {CATEGORIES.map((category) => (
            <div key={category} className="flex items-center justify-between gap-3">
              <label className="capitalize text-[var(--foreground)] font-medium">
                {category}
              </label>
              <input
                type="number"
                min={0}
                step={1}
                value={thresholdConfig[category] ?? DEFAULT_THRESHOLDS[category]}
                onChange={(e) => {
                  onChange({
                    ...thresholdConfig,
                    [category]: parseInt(e.target.value, 10) || 0,
                  });
                }}
                className="w-20 px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--primary)] outline-none text-center"
              />
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => onChange({ ...DEFAULT_THRESHOLDS })}
            className="px-4 py-3 border border-[var(--border)] text-[var(--muted)] rounded-xl font-semibold hover:bg-[var(--surface-muted)] transition-colors"
          >
            Reset defaults
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-[var(--primary)] text-white py-3 rounded-xl font-semibold hover:bg-[var(--primary-hover)] transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}