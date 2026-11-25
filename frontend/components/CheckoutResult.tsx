import React, { useEffect, useState } from 'react';
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
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-emerald-600">
        <div className="text-center text-white p-8">
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-5xl mx-auto mb-6 animate-in zoom-in duration-500">
            🎉
          </div>
          <h1 className="text-3xl font-bold mb-4">{confirmed ? 'You’re all set!' : 'Confirming your purchase…'}</h1>
          <p role="status" aria-live="polite" className="text-emerald-100 text-lg mb-2">
            {confirmed
              ? 'Your subscription is now active.'
              : confirmError
                ? 'We couldn’t confirm your payment yet. Please retry, or check Settings in a moment.'
                : 'We’re checking your payment with Stripe. This can take a moment.'}
          </p>
          <p className="text-emerald-200">
            {confirmed ? `Redirecting you back to ${BRAND_NAME}…` : 'Please don’t start another checkout.'}
          </p>
          {confirmError && (
            <button
              onClick={() => setRetry(value => value + 1)}
              className="mt-6 mr-3 px-6 py-3 bg-white text-emerald-600 rounded-xl font-bold hover:bg-emerald-50 transition-colors"
            >
              Retry confirmation
            </button>
          )}
          <button
            onClick={onClose}
            className="mt-8 px-6 py-3 bg-white text-emerald-600 rounded-xl font-bold hover:bg-emerald-50 transition-colors"
          >
            Continue to App
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900">
      <div className="text-center text-white p-8 max-w-md">
        <div className="w-24 h-24 bg-slate-700 rounded-full flex items-center justify-center text-5xl mx-auto mb-6">
          😔
        </div>
        <h1 className="text-2xl font-bold mb-4">Checkout Cancelled</h1>
        <p className="text-slate-400 mb-8">
          No worries! You can upgrade anytime from the settings. You're still on the free plan.
        </p>
        <button
          onClick={onClose}
          className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors"
        >
          Return to App
        </button>
      </div>
    </div>
  );
};

export default CheckoutResult;
