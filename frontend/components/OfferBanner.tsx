"use client";

import React, { useEffect, useState } from 'react';
import { getFirstMonthOffer, type FirstMonthOffer } from '../services/subscription';

function dollars(cents: number): string {
  const value = cents / 100;
  return Number.isInteger(value) ? `$${value}` : `$${value.toFixed(2)}`;
}

/** Banner copy, or null when the offer is off or incomplete. Exported for tests. */
export function offerBannerText(offer: FirstMonthOffer | null | undefined): string | null {
  if (
    !offer?.enabled ||
    typeof offer.offerPriceCents !== 'number' ||
    typeof offer.listPriceCents !== 'number'
  ) {
    return null;
  }
  return `${dollars(offer.offerPriceCents)} for your first month of Pro, then ${dollars(offer.listPriceCents)}/mo`;
}

export function useFirstMonthOffer(): FirstMonthOffer | null {
  const [offer, setOffer] = useState<FirstMonthOffer | null>(null);
  useEffect(() => {
    let active = true;
    getFirstMonthOffer().then((result) => {
      if (active) setOffer(result.enabled ? result : null);
    });
    return () => {
      active = false;
    };
  }, []);
  return offer;
}

interface OfferBannerProps {
  variant?: 'pricing' | 'hero';
  /** Optional: skip the fetch and use this value (tests, storybook). */
  offer?: FirstMonthOffer | null;
}

export function OfferBanner({ variant = 'pricing', offer: offerProp }: OfferBannerProps) {
  const fetched = useFirstMonthOffer();
  const offer = offerProp === undefined ? fetched : offerProp;
  const text = offerBannerText(offer);
  if (!text) return null;

  if (variant === 'hero') {
    return (
      <p
        data-testid="offer-banner-hero"
        className="hero-enter hero-enter-delay-3 -mt-8 mb-10 text-sm font-medium text-[var(--primary)]"
      >
        New: {text}. First-time Pro monthly subscribers.
      </p>
    );
  }

  return (
    <div
      data-testid="offer-banner-pricing"
      role="status"
      className="mx-auto mb-8 max-w-2xl rounded-2xl border border-[var(--primary)]/30 bg-[var(--primary)]/5 px-5 py-3 text-center"
    >
      <p className="font-semibold text-slate-800">{text}</p>
      <p className="mt-1 text-xs text-slate-500">
        Pro monthly, first-time subscribers only. Applied automatically at checkout. Cancel anytime.
      </p>
    </div>
  );
}

export default OfferBanner;
