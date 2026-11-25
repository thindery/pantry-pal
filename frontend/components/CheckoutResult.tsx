import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Loader2, AlertCircle, ShoppingCart } from 'lucide-react';
import { BrandMark } from '@/components/BrandMark';
import { BRAND_NAME } from '@/lib/site-content';
import { getCheckoutTransactionId, trackPurchase } from '@/lib/analytics';
import { confirmCheckoutSession } from '@/services/subscription';

interface CheckoutResultProps {
  status: 'success' | 'cancel';
  onClose: () => void;
}

export const CheckoutResult: React.FC<CheckoutResultProps> = ({ status, onClose }) => {
  const [confirmed, setConfirmed] = useState(false);
  const [confirmError, setConfirmError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (status !== 'success') return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setConfirmed(false);
    setConfirmError(false);
    const sessionId = getCheckoutTransactionId();
    if (!sessionId) {
      setConfirmError(true);
      return;
    }
    const confirm = async (attempt: number) => {
      try {
        const result = await confirmCheckoutSession(sessionId);
        if (cancelled) return;
        if (result.confirmed) {
          setConfirmed(true);
          // GA4 purchase uses the amount Stripe actually charged (offers,
          // Family, yearly), not a fixed list price.
          trackPurchase({
            transaction_id: sessionId,
            ...(typeof result.amountTotal === 'number' ? { value: result.amountTotal / 100 } : {}),
            ...(result.currency ? { currency: result.currency.toUpperCase() } : {}),
          });
          // Let Settings fetch the now-confirmed tier. Never auto-redirect
          // while payment is still unconfirmed or Stripe is unavailable.
          timer = setTimeout(onClose, 5000);
          return;
        }
      } catch {
        // Stripe/webhook may still be finishing. Retry a few times before
        // offering an explicit retry button; do not claim the plan is active.
      }
      if (cancelled) return;
      if (attempt < 3) timer = setTimeout(() => { void confirm(attempt + 1); }, 1500);
      else setConfirmError(true);
    };
    void confirm(0);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [status, onClose, retry]);

  if (status === 'success') {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[var(--marketing-bg)] p-4 overflow-y-auto">
        <div className="w-full max-w-md rounded-2xl bg-white shadow-lg border border-slate-100 p-8 text-center">
          <div className="flex justify-center mb-6">
            <BrandMark />
          </div>

          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 ${
              confirmed
                ? 'bg-[var(--primary-light)] text-[var(--primary)]'
                : confirmError
                  ? 'bg-rose-50 text-[var(--danger)]'
                  : 'bg-[var(--primary-light)] text-[var(--primary)]'
            }`}
            aria-hidden="true"
          >
            {confirmed ? (
              <CheckCircle2 className="w-8 h-8" />
            ) : confirmError ? (
              <AlertCircle className="w-8 h-8" />
            ) : (
              <Loader2 className="w-8 h-8 animate-spin" />
            )}
          </div>

          <h1 className="font-serif-heading text-2xl font-bold text-slate-900 mb-3">
            {confirmed ? 'You’re all set!' : 'Confirming your purchase…'}
          </h1>

          <p role="status" aria-live="polite" className="text-slate-600 mb-2 text-base">
            {confirmed
              ? 'Your subscription is now active.'
              : confirmError
                ? 'We couldn’t confirm your payment yet. Please retry, or check Settings in a moment.'
                : 'We’re checking your payment with Stripe. This can take a moment.'}
          </p>

          <p className="text-sm text-slate-500 mb-6">
            {confirmed
              ? `Taking you back to ${BRAND_NAME} in a few seconds…`
              : 'Please don’t start another checkout.'}
          </p>

          {confirmError && (
            <button
              type="button"
              onClick={() => setRetry(value => value + 1)}
              className="w-full mb-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            >
              Retry confirmation
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full flex items-center justify-center rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[var(--primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2"
          >
            Continue to App
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[var(--marketing-bg)] p-4 overflow-y-auto">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-lg border border-slate-100 p-8 text-center">
        <div className="flex justify-center mb-6">
          <BrandMark />
        </div>

        <div
          className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-6 text-slate-600"
          aria-hidden="true"
        >
          <ShoppingCart className="w-8 h-8" />
        </div>

        <h1 className="font-serif-heading text-2xl font-bold text-slate-900 mb-3">
          Checkout cancelled
        </h1>

        <p className="text-sm text-slate-600 mb-6">
          You’re still on the Free plan. You can upgrade anytime from Settings or Pricing.
        </p>

        <button
          type="button"
          onClick={onClose}
          className="w-full flex items-center justify-center rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[var(--primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2"
        >
          Return to App
        </button>

        <div className="mt-4">
          <Link
            href="/pricing"
            className="text-sm font-medium text-slate-600 hover:text-slate-900 underline-offset-2 hover:underline"
          >
            View Pricing
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CheckoutResult;
