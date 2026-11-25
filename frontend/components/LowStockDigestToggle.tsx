"use client";

import { useEffect, useState } from "react";
import type { ThresholdConfig } from "@/types";
import {
  getEmailPreferences,
  updateEmailPreferences,
  type EmailPreferences,
} from "@/services/email-preferences";

interface Props {
  thresholdConfig: ThresholdConfig;
  itemThresholdOverrides: Record<string, number>;
}

/**
 * PP-137: opt-in weekly low-stock email. Renders nothing until the server says
 * the digest is available, so users never opt in to a mail that is switched off.
 * While opted in, the user's low-stock levels are synced so the email matches the app.
 */
export function LowStockDigestToggle({ thresholdConfig, itemThresholdOverrides }: Props) {
  const [prefs, setPrefs] = useState<EmailPreferences | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getEmailPreferences()
      .then((p) => {
        if (!cancelled) setPrefs(p);
      })
      .catch(() => {
        if (!cancelled) setPrefs(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const optedIn = prefs?.available === true && prefs.lowStockDigest;
  useEffect(() => {
    if (!optedIn) return;
    void updateEmailPreferences({ thresholdConfig, itemThresholdOverrides }).catch(() => undefined);
  }, [optedIn, thresholdConfig, itemThresholdOverrides]);

  if (!prefs?.available) return null;

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const next = !prefs.lowStockDigest;
      setPrefs(
        await updateEmailPreferences(
          next
            ? { lowStockDigest: true, thresholdConfig, itemThresholdOverrides }
            : { lowStockDigest: false },
        ),
      );
    } catch {
      setError("Couldn't save. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-[var(--foreground)]">Weekly low-stock email</p>
          <p className="text-sm text-[var(--muted)] mt-1">
            Once a week, we email you the items at or below the low-stock levels you set. Nothing is sent
            when nothing is low. Unsubscribe anytime.
          </p>
          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={prefs.lowStockDigest}
          aria-label="Weekly low-stock email"
          disabled={busy}
          onClick={() => void toggle()}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
            prefs.lowStockDigest ? "bg-[var(--primary)]" : "bg-slate-300"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
              prefs.lowStockDigest ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>
    </div>
  );
}

export default LowStockDigestToggle;
