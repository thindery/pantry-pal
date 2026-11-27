import React from 'react';
import { PRO_PLAN_NAME } from '@/lib/site-content';
import { useFirstMonthOffer } from '@/components/OfferBanner';
import { PLAN_PRICES_CENTS, formatUsd, yearlySavingsPercent } from '@/lib/pricing';

/** PP-243: one honest price line for the in-app paywall. Exported for tests. */
export function upgradePriceLine(offerPriceCents?: number | null): string {
  const month = formatUsd(PLAN_PRICES_CENTS.pro.month);
  const year = formatUsd(PLAN_PRICES_CENTS.pro.year);
  const save = yearlySavingsPercent('pro');
  if (typeof offerPriceCents === 'number') {
    return `${formatUsd(offerPriceCents)} your first month, then ${month}/mo. Or ${year}/yr (save ${save}%).`;
  }
  return `${month}/mo, or ${year}/yr (save ${save}%).`;
}

interface UpgradePromptProps {
  title: string;
  message: string;
  feature: 'items' | 'receipts';
  onClose: () => void;
  onUpgrade: () => void;
}

const UpgradePrompt: React.FC<UpgradePromptProps> = ({
  title,
  message,
  feature,
  onClose,
  onUpgrade,
}) => {
  const offer = useFirstMonthOffer();
  const getFeatureIcon = () => {
    switch (feature) {
      case 'items':
        return '📦';
      case 'receipts':
        return '📄';
      default:
        return '⭐';
    }
  };

  const getFeatureName = () => {
    switch (feature) {
      case 'items':
        return 'Unlimited Items';
      case 'receipts':
        return 'Unlimited AI Receipt Scans';
      default:
        return 'Pro Features';
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-testid={`upgrade-prompt-${feature}`}
        className="bg-white rounded-2xl w-full max-w-md p-6 md:p-8 shadow-2xl animate-in zoom-in-95 duration-200"
      >
        {/* Icon */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg">
            {getFeatureIcon()}
          </div>
          <h2 className="text-xl font-bold text-slate-800">{title}</h2>
        </div>

        {/* Message */}
        <p className="text-slate-600 text-center mb-6">{message}</p>

        {/* Feature Highlight */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-emerald-800 text-center">
            Unlock <span className="font-semibold">{getFeatureName()}</span> and more with {PRO_PLAN_NAME}
          </p>
          <p className="text-sm text-emerald-900 text-center font-semibold mt-2" data-testid="upgrade-price-line">
            {upgradePriceLine(offer?.offerPriceCents)}
          </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={onUpgrade}
            className="w-full bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-emerald-700 active:bg-emerald-800 transition-colors flex items-center justify-center gap-2"
          >
            <span>✨</span>
            Upgrade to Pro
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 border border-slate-300 text-slate-600 rounded-xl font-medium hover:bg-slate-50 transition-colors"
          >
            Maybe Later
          </button>
        </div>

        {/* Trust Signal */}
        <p className="text-center text-xs text-slate-400 mt-4">
          🛡️ Secure checkout by Stripe • Cancel anytime
        </p>
      </div>
    </div>
  );
};

/**
 * Inline upgrade CTA to show at 45 items (warning before limit)
 */
export const ItemLimitWarning: React.FC<{
  currentItems: number;
  maxItems: number;
  onUpgrade: () => void;
}> = ({ currentItems, maxItems, onUpgrade }) => {
  const remaining = Math.max(0, maxItems - currentItems);
  const atLimit = remaining === 0;
  const isNearLimit = remaining <= 5;
  const percentage = Math.min(100, (currentItems / maxItems) * 100);

  return (
    <div
      data-testid="item-limit-warning"
      className={`rounded-xl p-4 mb-4 ${isNearLimit ? 'bg-amber-50 border border-amber-200' : 'hidden'}`}
    >
      <div className="flex items-start gap-3">
        <div className="text-2xl">⚠️</div>
        <div className="flex-1">
          <h3 className="font-semibold text-amber-800 mb-1">
            {atLimit ? `You've reached the ${maxItems}-item free limit` : "You're approaching your item limit"}
          </h3>
          <p className="text-sm text-amber-700 mb-3">
            {atLimit ? (
              <>New items won&apos;t be added on the free plan ({currentItems}/{maxItems} used). You can still update the ones you have.</>
            ) : (
              <>You have <span className="font-bold">{remaining}</span> item{remaining === 1 ? '' : 's'} remaining on the free plan ({currentItems}/{maxItems} used).</>
            )}
          </p>

          {/* Progress Bar */}
          <div className="w-full bg-amber-200 rounded-full h-2 mb-3">
            <div
              className="bg-amber-500 h-2 rounded-full transition-all"
              style={{ width: `${percentage}%` }}
            />
          </div>

          <button
            onClick={onUpgrade}
            className="text-sm font-semibold text-amber-700 hover:text-amber-800 underline underline-offset-2"
          >
            Upgrade to Pro for unlimited items →
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Receipt scan limit warning
 */
export const ReceiptScanLimit: React.FC<{
  used: number;
  limit: number;
  onUpgrade: () => void;
}> = ({ used, limit, onUpgrade }) => {
  const remaining = limit - used;

  if (remaining <= 0) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 mb-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl">🚫</div>
          <div className="flex-1">
            <h3 className="font-semibold text-rose-800 mb-1">
              Monthly receipt scan limit reached
            </h3>
            <p className="text-sm text-rose-700 mb-3">
              You've used all {limit} receipt scans this month. Upgrade to Pro for unlimited scans.
            </p>
            <button
              onClick={onUpgrade}
              className="bg-rose-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-rose-700 transition-colors"
            >
              Upgrade to Pro
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (remaining <= 2) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl">⚠️</div>
          <div className="flex-1">
            <h3 className="font-semibold text-amber-800 mb-1">
              Only {remaining} receipt scan{remaining !== 1 ? 's' : ''} left this month
            </h3>
            <p className="text-sm text-amber-700 mb-3">
              You've used {used} of {limit} scans. Upgrade for unlimited AI receipt scanning.
            </p>
            <button
              onClick={onUpgrade}
              className="text-sm font-semibold text-amber-700 hover:text-amber-800 underline underline-offset-2"
            >
              Upgrade to Pro →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

/**
 * Pro badge for UI elements
 */
export const ProBadge: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span
    className={`inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-amber-400 to-amber-500 text-white text-xs font-bold rounded-full shadow-sm ${className}`}
  >
    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
    PRO
  </span>
);

export default UpgradePrompt;
