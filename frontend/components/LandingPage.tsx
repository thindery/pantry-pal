"use client";

import React, { useState } from 'react';
import { BrandMark } from '@/components/BrandMark';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { RevealOnScroll } from '@/components/marketing/RevealOnScroll';
import { BRAND_NAME } from '@/lib/site-content';
import { 
  ShoppingCart,
  ClipboardList, 
  Smartphone, 
  BarChart3, 
  Users, 
  Receipt, 
  CheckCircle2, 
  ArrowRight,
  Home,
  ScanLine,
  CreditCard,
  Shield,
  X
} from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
  isLoggedIn?: boolean;
  onGoToDashboard?: () => void;
}

// Honest proof points — no invented user counts, ratings, or quotes (PP-101).
// "Used by households across the country" and "Hundreds of items tracked" are
// Tylor's approved lines (2026-11-22; 206 pantry_items rows counted). If a fresh
// count drops under ~200, swap the second line for "Tracking pantry items for
// households across the country". Never a more precise public number.
const PROOF_POINTS = [
  { icon: Home, title: 'Used by households across the country', detail: 'An independent app built by a home cook for real pantries.' },
  { icon: ClipboardList, title: 'Hundreds of items tracked', detail: 'Every add and use goes into one running pantry list.' },
  { icon: ScanLine, title: 'Scan a barcode, done in seconds', detail: 'Quick Scan updates your counts as you put groceries away.' },
  { icon: CreditCard, title: 'Free to start', detail: 'No credit card required to create an account.' },
];

// Features data
const FEATURES = [
  {
    icon: Receipt,
    title: 'Receipt Scanning',
    description: 'Snap a photo of your grocery receipt. Pantry Hub reads it, lists the items it found, and adds them all when you confirm.',
  },
  {
    icon: ClipboardList,
    title: 'Pantry List',
    description: 'Every add and use is recorded in one running list, so you always know what is on the shelf.',
  },
  {
    icon: Smartphone,
    title: 'Barcode Scanning with Quick Scan',
    description: 'Scan a barcode and the item is added, then keep scanning. No tap needed between items as you unload groceries.',
  },
  {
    icon: BarChart3,
    title: 'Usage History',
    description: 'See what your household used and when, so restocking starts from what is running low.',
  },
  {
    icon: ShoppingCart,
    title: 'Shopping Lists',
    description: 'Auto-generated shopping lists based on what you\'re running low on. Never forget essentials again.',
  },
  {
    icon: Users,
    title: 'Household Sharing',
    description: 'On the Family plan, up to 5 household members share one pantry and see what is needed.',
  },
];

// How It Works steps
const STEPS = [
  {
    number: '01',
    title: 'Scan or Add Items',
    description: 'Use receipt scanning, barcode scanning, or manual entry to quickly add items to your pantry.',
  },
  {
    number: '02',
    title: 'Track Usage',
    description: 'Update quantities as you cook and consume. Track what you use and when you use it.',
  },
  {
    number: '03',
    title: 'Get Smart Alerts',
    description: 'Receive notifications when items are running low. Auto-generate shopping lists based on your habits.',
  },
];

// Pricing preview tiers
const PRICING_TIERS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    features: [
      'Up to 50 pantry items',
      '5 receipt scans/month',
      'Manual item entry',
      'Basic categories',
      'Single device',
    ],
    cta: 'Get Started Free',
    popular: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$4.99',
    period: '/month',
    features: [
      'Unlimited pantry items',
      'Unlimited receipt scans',
      'Cloud sync across devices',
      'Advanced analytics',
      'Push notifications',
      'Priority support',
    ],
    cta: 'Upgrade to Pro',
    popular: true,
  },
  {
    id: 'family',
    name: 'Family',
    price: '$7.99',
    period: '/month',
    features: [
      'Everything in Pro',
      'Up to 5 household members',
      'Shared household inventory',
      'Personal + shared lists',
      'Activity feed',
      'Admin controls',
    ],
    cta: 'Upgrade to Family',
    popular: false,
  },
];

// Feature and benefit proof — no invented testimonials or ratings (PP-101)
const PROOF_CARDS = [
  {
    icon: Home,
    title: 'Built for real pantries',
    body: 'Pantry Hub is an independently built kitchen inventory app, made by a home cook who needed a faster way to keep stock.',
  },
  {
    icon: Shield,
    title: 'Your data stays yours',
    body: 'You can export your inventory anytime. If you cancel, your data stays accessible, and it is still there if you come back.',
  },
  {
    icon: ScanLine,
    title: 'Scan, track, and shop',
    body: 'Look up barcodes in seconds, add items from a receipt photo, and build a shopping list from what is running low.',
  },
];

// FAQ data with schema markup support
export const FAQS = [
  {
    question: 'How does the receipt scanning work?',
    answer: 'Take a photo of your grocery receipt. Pantry Hub reads the text with OCR, suggests the items it finds, and lets you review and fix them before anything is added to your pantry. The Free plan includes 5 receipt scans a month; Pro and Family plans are unlimited.',
  },
  {
    question: `Can I use ${BRAND_NAME} with multiple devices?`,
    answer: `${BRAND_NAME} runs in your web browser on a phone, tablet, or computer. Pro and Family plans include use across multiple devices. The Free plan is for a single device.`,
  },
  {
    question: 'Is there a limit on how many items I can track?',
    answer: 'The Free plan tracks up to 50 items. Pro and Family plans have no item limit.',
  },
  {
    question: 'Can I share my pantry with family members?',
    answer: 'Yes. The Family plan lets up to 5 household members share one pantry inventory.',
  },
  {
    question: `Is there a ${BRAND_NAME} app for iPhone or Android?`,
    answer: `Not in the App Store or Google Play. ${BRAND_NAME} runs in the web browser on your phone, tablet, or computer, including the camera for barcode and receipt scanning.`,
  },
  {
    question: 'What if a barcode is not found?',
    answer: `${BRAND_NAME} checks products it has already looked up, then Open Food Facts, then UPCitemdb. If none of them knows the barcode, you type a name once and keep scanning.`,
  },
  {
    question: 'What happens to my data if I cancel?',
    answer: 'If you cancel a paid plan, your account moves to the Free plan and your pantry items stay in your account. Free plan limits apply after that, and you can upgrade again at any time.',
  },
];

// FAQPage Schema Component
function FAQPageSchema({ faqs }: { faqs: typeof FAQS }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

const LandingPage: React.FC<LandingPageProps> = ({
  onGetStarted,
  onLogin,
  isLoggedIn = false,
  onGoToDashboard,
}) => {
  const [showFullPricing, setShowFullPricing] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const goToApp = isLoggedIn && onGoToDashboard ? onGoToDashboard : onGetStarted;

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element != null) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (showFullPricing) {
    return (
      <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-4 flex justify-between items-center">
          <BrandMark />
          <button
            onClick={() => setShowFullPricing(false)}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            aria-label="Close pricing"
          >
            <X className="w-6 h-6 text-slate-500" aria-hidden="true" />
          </button>
        </div>
        <PricingPreview 
          onSelectPlan={(plan) => {
            if (plan === 'free') goToApp();
          }} 
          showFullPricing={true}
        />
      </div>
    );
  }

  return (
    <div className="marketing-page min-h-screen" itemScope itemType="https://schema.org/WebPage">
      {/* FAQ Schema */}
      <FAQPageSchema faqs={FAQS} />
      
      {/* Navbar */}
      <header className="sticky top-0 z-40 bg-[var(--marketing-bg)]/80 backdrop-blur-md border-b border-[var(--marketing-border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex justify-between items-center h-16" aria-label="Main navigation">
            <BrandMark />
            <div className="hidden md:flex items-center gap-8">
              <button onClick={() => scrollToSection('features')} className="text-slate-600 hover:text-slate-800 transition-colors">Features</button>
              <button onClick={() => scrollToSection('how-it-works')} className="text-slate-600 hover:text-slate-800 transition-colors">How It Works</button>
              <button onClick={() => scrollToSection('pricing')} className="text-slate-600 hover:text-slate-800 transition-colors">Pricing</button>
              <button onClick={() => scrollToSection('faq')} className="text-slate-600 hover:text-slate-800 transition-colors">FAQ</button>
            </div>
            <div className="flex items-center gap-4">
              {isLoggedIn ? (
                <button
                  onClick={onGoToDashboard}
                  className="bg-[var(--primary)] text-white px-4 py-2 rounded-lg font-medium hover:bg-[var(--primary-hover)] transition-colors"
                >
                  Dashboard
                </button>
              ) : (
                <>
                  <button
                    onClick={onLogin}
                    className="text-slate-600 hover:text-slate-800 font-medium transition-colors"
                  >
                    Log In
                  </button>
                  <button
                    onClick={onGetStarted}
                    className="bg-[var(--primary)] text-white px-4 py-2 rounded-lg font-medium hover:bg-[var(--primary-hover)] transition-colors"
                  >
                    Get Started
                  </button>
                </>
              )}
            </div>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden" aria-labelledby="hero-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="text-center max-w-4xl mx-auto">
            <div className="hero-enter inline-flex items-center gap-2 bg-[var(--marketing-surface)] px-4 py-2 rounded-full mb-6 animate-gentle-float">
              <Home className="w-4 h-4 text-[var(--primary)]" aria-hidden="true" />
              <span className="text-sm font-medium text-slate-700">Built by a home cook for real pantries</span>
            </div>
            <h1 id="hero-heading" className="hero-enter hero-enter-delay-1 text-4xl md:text-6xl font-serif-heading font-bold text-slate-800 mb-6 leading-tight">
              Scan Groceries Into Your{' '}
              <span className="text-[var(--primary)]">Pantry</span>
            </h1>
            <p className="hero-enter hero-enter-delay-2 text-lg md:text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
              Scan barcodes with Quick Scan or snap a receipt to add a whole grocery trip, then build your shopping list from what is running low.
            </p>
            <div className="hero-enter hero-enter-delay-3 flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <button
                onClick={goToApp}
                className="bg-[var(--primary)] text-white px-8 py-4 rounded-xl font-semibold hover:bg-[var(--primary-hover)] transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
              >
                {isLoggedIn ? "Go to Dashboard" : "Get Started Free"}
                <ArrowRight className="w-5 h-5" aria-hidden="true" />
              </button>
              <button 
                onClick={() => scrollToSection('how-it-works')}
                className="bg-white text-slate-700 border-2 border-slate-200 px-8 py-4 rounded-xl font-semibold hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all"
              >
                See How It Works
              </button>
            </div>

            {/* Honest proof points */}
            <div className="hero-enter hero-enter-delay-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-5 max-w-4xl mx-auto text-left">
              {PROOF_POINTS.map((point, index) => (
                <div key={index} className="bg-white/80 border border-[var(--marketing-border)] rounded-2xl p-4">
                  <div className="w-10 h-10 bg-[var(--primary)]/10 rounded-xl flex items-center justify-center mb-3">
                    <point.icon className="w-5 h-5 text-[var(--primary)]" aria-hidden="true" />
                  </div>
                  <div className="text-sm font-semibold text-slate-800 mb-1">{point.title}</div>
                  <div className="text-sm text-slate-500">{point.detail}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="scroll-mt-24 py-20 bg-white" aria-labelledby="features-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealOnScroll className="text-center mb-16">
            <h2 id="features-heading" className="text-3xl md:text-4xl font-serif-heading font-bold text-slate-800 mb-4">
              Everything You Need to Manage Your Pantry
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              From barcode and receipt scanning to shopping lists, {BRAND_NAME} has the tools you need.
            </p>
          </RevealOnScroll>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURES.map((feature, index) => (
              <RevealOnScroll key={index} delay={index * 80}>
                <article className="bg-[var(--marketing-bg)] rounded-2xl p-6 border border-[var(--marketing-border)] hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 h-full" itemScope itemType="https://schema.org/SoftwareApplication">
                  <div className="w-12 h-12 bg-[var(--primary)]/10 rounded-xl flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-[var(--primary)]" aria-hidden="true" />
                  </div>
                  <h3 className="text-xl font-serif-heading font-bold text-slate-800 mb-2" itemProp="name">{feature.title}</h3>
                  <p className="text-slate-600" itemProp="description">{feature.description}</p>
                </article>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="scroll-mt-24 py-20 bg-[var(--marketing-surface)]" aria-labelledby="how-it-works-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealOnScroll className="text-center mb-16">
            <h2 id="how-it-works-heading" className="text-3xl md:text-4xl font-serif-heading font-bold text-slate-800 mb-4">
              How It Works
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Getting started is easy. Three simple steps to pantry management bliss.
            </p>
          </RevealOnScroll>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map((step, index) => (
              <RevealOnScroll key={index} variant="fade-up" delay={index * 120}>
                <div className="text-center">
                  <div className="text-6xl font-serif-heading font-bold text-[var(--primary)]/35 mb-4" aria-hidden="true">{step.number}</div>
                  <h3 className="text-xl font-serif-heading font-bold text-slate-800 mb-2">{step.title}</h3>
                  <p className="text-slate-600">{step.description}</p>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="scroll-mt-24 py-20 bg-white" aria-labelledby="pricing-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealOnScroll className="text-center mb-12">
            <h2 id="pricing-heading" className="text-3xl md:text-4xl font-serif-heading font-bold text-slate-800 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Start free and upgrade when you need more power. No hidden fees.
            </p>
          </RevealOnScroll>
          <RevealOnScroll delay={100}>
            <PricingPreview onSelectPlan={(plan) => {
              if (plan === 'free') goToApp();
              else setShowFullPricing(true);
            }} />
          </RevealOnScroll>
          <RevealOnScroll className="text-center mt-8" delay={200}>
            <button 
              onClick={() => setShowFullPricing(true)}
              className="text-[var(--primary)] font-medium hover:underline inline-flex items-center gap-2"
            >
              View full pricing details <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </RevealOnScroll>
        </div>
      </section>

      {/* Honest proof section — no reviews or ratings markup (PP-101) */}
      <section className="py-20 bg-[var(--marketing-bg)]" aria-labelledby="proof-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealOnScroll className="text-center mb-16">
            <h2 id="proof-heading" className="text-3xl md:text-4xl font-serif-heading font-bold text-slate-800 mb-4">
              Built honestly, for real kitchens
            </h2>
            <p className="text-lg text-slate-600">
              An independent pantry app with useful tools and a free way to start.
            </p>
          </RevealOnScroll>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {PROOF_CARDS.map((card, index) => (
              <RevealOnScroll key={index} variant="scale" delay={index * 100}>
                <article className="bg-white rounded-2xl p-6 shadow-sm border border-[var(--marketing-border)] h-full">
                  <div className="w-12 h-12 bg-[var(--primary)]/10 rounded-xl flex items-center justify-center mb-4">
                    <card.icon className="w-6 h-6 text-[var(--primary)]" aria-hidden="true" />
                  </div>
                  <h3 className="font-semibold text-slate-800 mb-2">{card.title}</h3>
                  <p className="text-slate-700">{card.body}</p>
                </article>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="scroll-mt-24 py-20 bg-white" aria-labelledby="faq-heading">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealOnScroll className="text-center mb-12">
            <h2 id="faq-heading" className="text-3xl md:text-4xl font-serif-heading font-bold text-slate-800 mb-4">
              Frequently Asked Questions
            </h2>
          </RevealOnScroll>
          <div className="space-y-4">
            {FAQS.map((faq, index) => (
              <RevealOnScroll key={index} delay={index * 60}>
                <div className="border border-[var(--marketing-border)] rounded-xl overflow-hidden">
                  <button
                    onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                    className="w-full flex justify-between items-center p-4 text-left bg-[var(--marketing-bg)] hover:bg-[var(--marketing-surface)] transition-colors"
                    aria-expanded={openFaqIndex === index}
                    aria-controls={`faq-answer-${index}`}
                  >
                    <span className="font-semibold text-slate-800">{faq.question}</span>
                    <span className="text-2xl text-slate-400" aria-hidden="true">
                      {openFaqIndex === index ? '−' : '+'}
                    </span>
                  </button>
                  {/* PP-106: every answer stays in the HTML (FAQPage JSON-LD must match visible text); closed answers are only hidden. */}
                  <div
                    id={`faq-answer-${index}`}
                    className="p-4 bg-white"
                    hidden={openFaqIndex !== index}
                  >
                    <p className="text-slate-600">{faq.answer}</p>
                  </div>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-[var(--primary)]" aria-labelledby="cta-heading">
        <RevealOnScroll className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 id="cta-heading" className="text-3xl md:text-4xl font-serif-heading font-bold text-white mb-4">
            Ready to get your pantry in order?
          </h2>
          <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
            Start free today — no credit card required.
          </p>
          <button
            onClick={goToApp}
            className="bg-white text-[var(--primary)] px-8 py-4 rounded-xl font-bold hover:bg-slate-100 transition-colors shadow-lg hover:scale-[1.02] active:scale-[0.98]"
          >
            {isLoggedIn ? "Go to Dashboard" : "Get Started Free"}
          </button>
        </RevealOnScroll>
      </section>

      <MarketingFooter />
    </div>
  );
};

// Pricing Preview Component
const PricingPreview: React.FC<{ 
  onSelectPlan: (plan: 'free' | 'pro' | 'family') => void;
  showFullPricing?: boolean;
}> = ({ onSelectPlan, showFullPricing = false }) => {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 ${showFullPricing ? 'max-w-6xl mx-auto px-4 py-8' : ''}`}>
      {PRICING_TIERS.map((tier) => (
        <div 
          key={tier.id}
          className={`relative rounded-2xl border-2 p-6 transition-all h-full ${
            tier.popular 
              ? 'border-[var(--primary)] shadow-lg' 
              : 'border-[var(--marketing-border)] hover:border-[var(--primary)]/50'
          }`}
          itemScope itemType="https://schema.org/Offer"
        >
          {tier.popular && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-[var(--primary)] text-white text-xs font-bold px-3 py-1 rounded-full">
                Most Popular
              </span>
            </div>
          )}
          <div className="text-center mb-6">
            <h3 className="text-xl font-serif-heading font-bold text-slate-800 mb-1" itemProp="name">{tier.name}</h3>
            <div className="mb-2">
              <span className="text-4xl font-bold text-slate-800" itemProp="price" content={tier.price.replace('$', '')}>{tier.price}</span>
              <span className="text-slate-500 text-sm ml-1">{tier.period}</span>
            </div>
          </div>
          <ul className="space-y-3 mb-6">
            {tier.features.map((feature, index) => (
              <li key={index} className="flex items-start gap-3 text-sm">
                <CheckCircle2 className="w-5 h-5 text-[var(--primary)] flex-shrink-0" aria-hidden="true" />
                <span className="text-slate-700">{feature}</span>
              </li>
            ))}
          </ul>
          <button
            onClick={() => onSelectPlan(tier.id as 'free' | 'pro' | 'family')}
            className={`w-full py-3 rounded-xl font-semibold transition-all ${
              tier.popular
                ? 'bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]'
                : tier.id === 'free'
                ? 'bg-white text-slate-800 border-2 border-slate-300 hover:border-[var(--primary)]'
                : 'bg-white text-slate-800 border-2 border-slate-200 hover:border-[var(--primary)]'
            }`}
          >
            {tier.cta}
          </button>
        </div>
      ))}
    </div>
  );
};

export default LandingPage;
