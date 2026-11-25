"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import {
  buildInstacartItems,
  createInstacartLink,
  getInstacartEnabled,
} from "@/services/instacart";
import type { PantryItem, ShoppingListItem } from "@/types";

interface InstacartButtonProps {
  shoppingList: ShoppingListItem[];
  inventory: PantryItem[];
}

/** "Send to Instacart (Beta)". Renders nothing until the server says the feature is on. */
export function InstacartButton({ shoppingList, inventory }: InstacartButtonProps) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getInstacartEnabled().then((on) => {
      if (active) setEnabled(on);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!enabled) return null;

  const items = buildInstacartItems(shoppingList, inventory);

  const handleClick = async () => {
    if (loading || items.length === 0) return;
    setError(null);
    setLoading(true);
    // Open the tab inside the click so popup blockers allow it, then point it at the link.
    const tab = window.open("about:blank", "_blank");
    if (tab) tab.opener = null;
    try {
      const { url, itemCount } = await createInstacartLink(items);
      if (tab) {
        tab.location.href = url;
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
      trackEvent("instacart_handoff", { status: "success", item_count: itemCount });
    } catch (err) {
      tab?.close();
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Could not reach Instacart. Try again in a moment.",
      );
      trackEvent("instacart_handoff", { status: "error", item_count: items.length });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading || items.length === 0}
        data-testid="instacart-button"
        className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface-muted)] disabled:opacity-50 transition-colors"
      >
        {loading ? <Loader2 size={13} className="animate-spin" /> : <ExternalLink size={13} />}
        <span>{loading ? "Sending…" : "Send to Instacart"}</span>
        <span className="rounded-full bg-[var(--primary-light)] px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-[var(--primary)]">
          Beta
        </span>
      </button>
      {error && (
        <p role="alert" className="text-xs text-[var(--danger)]" data-testid="instacart-error">
          {error}
        </p>
      )}
    </div>
  );
}
