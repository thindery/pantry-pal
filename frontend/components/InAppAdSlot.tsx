"use client";

import { useEffect, useRef } from "react";
import { ADSENSE_CLIENT } from "@/components/marketing/AdSense";
import { useSubscription, type UserTier } from "@/services/subscription";

/**
 * PP-140: in-app display ads for the Free plan only, on calm surfaces only.
 *
 * OFF by default. To turn on: create a display ad unit in AdSense, put its slot id in
 * INAPP_AD_SLOT, set INAPP_ADS_ENABLED = true, ship. Pro and Family never see these.
 * Never place this on scan, checkout, the paywall, auth, or destructive flows.
 * Requests non-personalized ads (Bragle launch rule).
 */
export const INAPP_ADS_ENABLED = false;
export const INAPP_AD_SLOT: string | null = null;

export const CALM_SURFACES = ["shopping-list-footer", "pantry-footer"] as const;
export type CalmSurface = (typeof CALM_SURFACES)[number];

export function shouldShowInAppAd(opts: {
  enabled: boolean;
  slot: string | null;
  tier: UserTier | null | undefined;
  surface: string;
}): boolean {
  if (!opts.enabled || !opts.slot) return false;
  if (opts.tier !== "free") return false; // unknown tier (loading/error) shows nothing
  return (CALM_SURFACES as readonly string[]).includes(opts.surface);
}

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>> & { requestNonPersonalizedAds?: number };
  }
}

function InAppAdSlotInner({ surface }: { surface: CalmSurface }) {
  const { tierInfo } = useSubscription();
  const show = shouldShowInAppAd({
    enabled: INAPP_ADS_ENABLED,
    slot: INAPP_AD_SLOT,
    tier: tierInfo?.tier,
    surface,
  });
  const pushed = useRef(false);

  useEffect(() => {
    if (!show || pushed.current) return;
    pushed.current = true;
    if (!document.querySelector('script[src*="adsbygoogle.js"]')) {
      const s = document.createElement("script");
      s.async = true;
      s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
      s.crossOrigin = "anonymous";
      document.head.appendChild(s);
    }
    try {
      const queue = (window.adsbygoogle = window.adsbygoogle || []);
      queue.requestNonPersonalizedAds = 1;
      queue.push({});
    } catch {}
  }, [show]);

  if (!show) return null;
  return (
    <aside aria-label="Advertisement" className="mt-6 text-center">
      <p className="text-[10px] uppercase tracking-wide text-[var(--muted)] mb-1">Advertisement · Free plan</p>
      <ins
        className="adsbygoogle block"
        style={{ display: "block" }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={INAPP_AD_SLOT ?? undefined}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}

/** Renders nothing (and loads nothing) while in-app ads are switched off. */
export function InAppAdSlot({ surface }: { surface: CalmSurface }) {
  if (!INAPP_ADS_ENABLED || !INAPP_AD_SLOT) return null;
  return <InAppAdSlotInner surface={surface} />;
}

export default InAppAdSlot;
