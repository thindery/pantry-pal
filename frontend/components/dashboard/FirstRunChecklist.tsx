"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Barcode, Camera, CheckCircle2, Circle, ListChecks, PencilLine, X } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

/** PP-246: first-run checklist, scan the first item fast. */
export const ONBOARDING_DISMISSED_KEY = "pp_onboarding_dismissed";
export const ONBOARDING_LIST_SEEN_KEY = "pp_onboarding_list_seen";
export const ONBOARDING_GOAL_ITEMS = 5;
/** Established pantries never see the checklist. */
export const ONBOARDING_HIDE_AT_ITEMS = 20;

function readFlag(key: string): boolean {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function setFlag(key: string): void {
  try {
    window.localStorage.setItem(key, "1");
  } catch {
    // storage blocked: the checklist just shows again next visit
  }
}

export interface FirstRunChecklistProps {
  itemCount: number;
  /** Receipt scan entry point (respects the free-plan receipt limit). */
  onScanReceipt: () => void;
}

export function FirstRunChecklist({ itemCount, onScanReceipt }: FirstRunChecklistProps) {
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [listSeen, setListSeen] = useState(false);

  useEffect(() => {
    // localStorage is client-only; read after mount to avoid a hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDismissed(readFlag(ONBOARDING_DISMISSED_KEY));
    setListSeen(readFlag(ONBOARDING_LIST_SEEN_KEY));
    setReady(true);
  }, []);

  const steps = [
    { id: "first_item", label: "Add your first item", done: itemCount >= 1 },
    { id: "five_items", label: `Add ${ONBOARDING_GOAL_ITEMS} items so low-stock alerts have something to watch`, done: itemCount >= ONBOARDING_GOAL_ITEMS },
    { id: "shopping_list", label: "Open your shopping list", done: listSeen },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;
  const visible = ready && !dismissed && !allDone && itemCount < ONBOARDING_HIDE_AT_ITEMS;

  useEffect(() => {
    if (visible) trackEvent("onboarding_view", { done: doneCount, items: Math.min(itemCount, ONBOARDING_GOAL_ITEMS) });
    // Only once per mount/visibility change, not on every item add.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!visible) return null;

  const step = (id: string) => trackEvent("onboarding_step_click", { step: id });

  return (
    <section
      data-testid="first-run-checklist"
      aria-label="Get started"
      className="relative rounded-2xl border border-[var(--primary)]/30 bg-[var(--primary)]/5 p-5"
    >
      <button
        type="button"
        aria-label="Dismiss getting started"
        onClick={() => {
          setFlag(ONBOARDING_DISMISSED_KEY);
          setDismissed(true);
          trackEvent("onboarding_dismiss", { done: doneCount });
        }}
        className="absolute right-3 top-3 rounded-full p-2 text-slate-500 hover:bg-white/60"
      >
        <X size={16} />
      </button>
      <h2 className="font-serif-heading text-lg font-semibold text-[var(--foreground)]">
        {itemCount === 0 ? "Scan your first item. It takes about 10 seconds." : "Nice start. Keep going."}
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        {doneCount} of {steps.length} done
      </p>
      <ol className="mt-3 space-y-2">
        {steps.map((s) => (
          <li key={s.id} className="flex items-start gap-2 text-sm">
            {s.done ? (
              <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0 text-[var(--primary)]" aria-label="done" />
            ) : (
              <Circle size={18} className="mt-0.5 flex-shrink-0 text-slate-400" aria-label="to do" />
            )}
            <span className={s.done ? "text-slate-500 line-through" : "text-slate-800"}>{s.label}</span>
          </li>
        ))}
      </ol>
      <div className="mt-4 flex flex-wrap gap-2">
        {itemCount < ONBOARDING_GOAL_ITEMS ? (
          <>
            <Link
              href="/dashboard/scan-barcode/"
              onClick={() => step("scan_barcode")}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-hover)]"
            >
              <Barcode size={16} /> Scan a barcode
            </Link>
            <button
              type="button"
              onClick={() => {
                step("scan_receipt");
                onScanReceipt();
              }}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              <Camera size={16} /> Scan a receipt
            </button>
            <Link
              href="/dashboard/add-item/"
              onClick={() => step("add_manual")}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              <PencilLine size={16} /> Add by hand
            </Link>
          </>
        ) : (
          <Link
            href="/dashboard/shopping-list/"
            onClick={() => {
              step("shopping_list");
              setFlag(ONBOARDING_LIST_SEEN_KEY);
              setListSeen(true);
            }}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-hover)]"
          >
            <ListChecks size={16} /> Open my shopping list
          </Link>
        )}
      </div>
    </section>
  );
}

export default FirstRunChecklist;
