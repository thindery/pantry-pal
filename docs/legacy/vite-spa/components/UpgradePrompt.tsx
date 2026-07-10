import React from 'react';

interface UpgradePromptProps {
  title: string;
  message: string;
  feature: 'items' | 'receipts' | 'voice';
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
  const getFeatureIcon = () => {
    switch (feature) {
      case 'items':
        return '📦';
      case 'receipts':
        return '📄';
      case 'voice':
        return '🎙️';
      default:
        return '⭐';
    }
  };

  const getFeatureName = () => {
    switch (feature) {
      case 'items':
        return 'Unlimited Items';
      case 'receipts':
        return 'AI Receipt Scanning';
      case 'voice':
        return 'Voice Assistant';
      default:
        return 'Pro Features';
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 md:p-8 shadow-2xl animate-in zoom-in-95 duration-200">
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
            Unlock <span className="font-semibold">{getFeatureName()}</span> and more with PantryPal Pro
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
          🛡️ Secure checkout • Cancel anytime • 30-day guarantee
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
  const remaining = maxItems - currentItems;
  const isNearLimit = remaining <= 5 && remaining > 0;
  const percentage = (currentItems / maxItems) * 100;

  return (
    <div className={`rounded-xl p-4 mb-4 ${isNearLimit ? 'bg-amber-50 border border-amber-200' : 'hidden'}`}>
      <div className="flex items-start gap-3">
        <div className="text-2xl">⚠️</div>
        <div className="flex-1">
          <h3 className="font-semibold text-amber-800 mb-1">
            You're approaching your item limit
          </h3>
          <p className="text-sm text-amber-700 mb-3">
            You have <span className="font-bold">{remaining}</span> items remaining on the free plan ({currentItems}/{maxItems} used).
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

/**
 * Voice assistant lock screen
 */
export const VoiceAssistantLock: React.FC<{
  onUpgrade: () => void;
}> = ({ onUpgrade }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-300">
    <div className="bg-white rounded-3xl w-full max-w-sm p-8 flex flex-col items-center gap-6 shadow-2xl mx-4 text-center">
      <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center text-4xl shadow-lg">
        🎙️
      </div>

      <div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">Voice Assistant</h3>
        <p className="text-slate-600">
          Upgrade to <span className="font-semibold text-emerald-600">Pro</span> to control your pantry with your voice.
        </p>
      </div>

      <div className="bg-slate-50 rounded-xl p-4 w-full">
        <p className="text-sm text-slate-600 mb-2">Try saying:</p>
        <p className="text-slate-800 font-medium italic">"I used 3 eggs"</p>
        <p className="text-slate-800 font-medium italic">"Add milk to my list"</p>
      </div>

      <button
        onClick={onUpgrade}
        className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
      >
        <span>✨</span>
        Upgrade to Pro
      </button>

      <button
        onClick={() => window.history.back()}
        className="text-slate-500 hover:text-slate-700 text-sm"
      >
        Go Back
      </button>
    </div>
  </div>
);

export default UpgradePrompt;
