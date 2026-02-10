import React, { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { createCheckoutSession, useSubscription } from '../services/subscription';

interface PricingPageProps {
  onClose: () => void;
}

interface PricingTier {
  id: 'free' | 'pro' | 'family';
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  monthlyDisplay: string;
  yearlyDisplay: string;
  savings: string;
  features: string[];
  disabledFeatures: string[];
  popular?: boolean;
  cta: string;
}

const TIERS: PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Get started with basic pantry tracking',
    monthlyPrice: 0,
    yearlyPrice: 0,
    monthlyDisplay: '$0',
    yearlyDisplay: '$0',
    savings: '',
    cta: 'Current Plan',
    features: [
      'Up to 50 pantry items',
      '5 AI receipt scans/month',
      'Manual item entry',
      'Basic categories',
      'Single device',
      'Shopping list',
    ],
    disabledFeatures: [
      'Voice assistant',
      'Multi-device sync',
      'Household sharing',
      'Advanced analytics',
      'Priority support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Perfect for serious home cooks',
    monthlyPrice: 499,
    yearlyPrice: 3999,
    monthlyDisplay: '$4.99',
    yearlyDisplay: '$39.99',
    savings: 'Save 33%',
    cta: 'Upgrade to Pro',
    popular: true,
    features: [
      'Unlimited pantry items',
      'Unlimited AI receipt scans',
      'Voice assistant with Gemini',
      'Cloud sync across devices',
      'Advanced analytics',
      'Push notifications',
      'CSV export',
      'Priority support',
    ],
    disabledFeatures: ['Household sharing'],
  },
  {
    id: 'family',
    name: 'Family',
    description: 'For households managing together',
    monthlyPrice: 799,
    yearlyPrice: 5999,
    monthlyDisplay: '$7.99',
    yearlyDisplay: '$59.99',
    savings: 'Save 37%',
    cta: 'Upgrade to Family',
    features: [
      'Everything in Pro',
      'Up to 5 household members',
      'Shared household inventory',
      'Personal + shared lists',
      'Activity feed (who used what)',
      'Admin controls',
      'Family meal planning',
    ],
    disabledFeatures: [],
  },
];

const PricingPage: React.FC<PricingPageProps> = ({ onClose }) => {
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isSignedIn } = useAuth();
  const { tierInfo, isFree, isPro, isFamily } = useSubscription();

  const handleUpgrade = async (tier: 'pro' | 'family') => {
    if (!isSignedIn) {
      setError('Please sign in to upgrade');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const successUrl = `${window.location.origin}/checkout/success`;
      const cancelUrl = `${window.location.origin}/checkout/cancel`;

      const checkout = await createCheckoutSession(
        tier,
        billingInterval === 'monthly' ? 'month' : 'year',
        successUrl,
        cancelUrl
      );

      // Redirect to Stripe checkout
      window.location.href = checkout.url;
    } catch (err) {
      console.error('Checkout failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to start checkout');
      setIsLoading(false);
    }
  };

  const getCtaText = (tier: PricingTier): string => {
    if (tier.id === 'free') {
      if (isFree) return 'Current Plan';
      return 'Downgrade';
    }
    if (tier.id === 'pro' && isPro) return 'Current Plan';
    if (tier.id === 'family' && isFamily) return 'Current Plan';
    return tier.cta;
  };

  const isCurrentPlan = (tier: PricingTier): boolean => {
    if (tier.id === 'free' && isFree) return true;
    if (tier.id === 'pro' && isPro) return true;
    if (tier.id === 'family' && isFamily) return true;
    return false;
  };

  const isDisabled = (tier: PricingTier): boolean => {
    return isLoading || isCurrentPlan(tier);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-white overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🥗</span>
          <span className="font-bold text-xl text-slate-800">PantryPal</span>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          aria-label="Close"
        >
          <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
        {/* Title */}
        <div className="text-center mb-10 md:mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">
            Upgrade Your Pantry Experience
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Choose the plan that fits your household. Start free and upgrade when you need more power.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-10">
          <div className="bg-slate-100 p-1 rounded-xl inline-flex">
            <button
              onClick={() => setBillingInterval('monthly')}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                billingInterval === 'monthly'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingInterval('yearly')}
              className={`px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                billingInterval === 'yearly'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Yearly
              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                Save up to 37%
              </span>
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="max-w-md mx-auto mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-sm text-center">
            {error}
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {TIERS.map((tier) => (
            <div
              key={tier.id}
              className={`relative rounded-2xl border-2 p-6 md:p-8 transition-all ${
                isCurrentPlan(tier)
                  ? 'border-emerald-500 bg-emerald-50/30'
                  : tier.popular
                  ? 'border-emerald-500 shadow-xl'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Popular Badge */}
              {tier.popular && !isCurrentPlan(tier) && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              {/* Current Plan Badge */}
              {isCurrentPlan(tier) && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-slate-800 text-white text-xs font-bold px-3 py-1 rounded-full">
                    Current Plan
                  </span>
                </div>
              )}

              {/* Tier Info */}
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-slate-800 mb-1">{tier.name}</h3>
                <p className="text-sm text-slate-500 mb-4">{tier.description}</p>

                <div className="mb-2">
                  <span className="text-4xl font-bold text-slate-800">
                    {billingInterval === 'monthly' ? tier.monthlyDisplay : tier.yearlyDisplay}
                  </span>
                  <span className="text-slate-500 text-sm ml-1">/{billingInterval === 'monthly' ? 'mo' : 'yr'}</span>
                </div>

                {billingInterval === 'yearly' && tier.savings && (
                  <p className="text-sm text-emerald-600 font-medium">{tier.savings}</p>
                )}
              </div>

              {/* Features */}
              <div className="space-y-3 mb-8">
                {/* Enabled Features */}
                {tier.features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-slate-700 text-sm">{feature}</span>
                  </div>
                ))}

                {/* Disabled Features */}
                {tier.disabledFeatures.map((feature, index) => (
                  <div key={`disabled-${index}`} className="flex items-start gap-3 opacity-50">
                    <svg className="w-5 h-5 text-slate-300 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    <span className="text-slate-400 text-sm line-through">{feature}</span>
                  </div>
                ))}
              </div>

              {/* CTA Button */}
              <button
                onClick={() => tier.id !== 'free' && handleUpgrade(tier.id)}
                disabled={isDisabled(tier)}
                className={`w-full py-3 rounded-xl font-semibold transition-all ${
                  isCurrentPlan(tier)
                    ? 'bg-slate-200 text-slate-500 cursor-default'
                    : tier.popular
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800'
                    : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                } disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
              >
                {isLoading && tier.id !== 'free' ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processing...
                  </>
                ) : (
                  getCtaText(tier)
                )}
              </button>
            </div>
          ))}
        </div>

        {/* Money Back Guarantee */}
        <div className="text-center mt-10 text-slate-500 text-sm">
          <p className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            30-day money-back guarantee • Cancel anytime
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Secure payment processing by Stripe. No credit card required for free plan.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
