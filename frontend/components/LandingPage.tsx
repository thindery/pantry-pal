"use client";

import React, { useState } from 'react';
import { BrandMark } from '@/components/BrandMark';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { RevealOnScroll } from '@/components/marketing/RevealOnScroll';
import { BRAND_NAME } from '@/lib/site-content';
import { 
  ShoppingCart,
  Mic, 
  Smartphone, 
  BarChart3, 
  Users, 
  Receipt, 
  CheckCircle2, 
  ArrowRight,
  Star,
  X
} from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
  isLoggedIn?: boolean;
  onGoToDashboard?: () => void;
}

// Stats data
const STATS = [
  { value: '50K+', label: 'Active Users' },
  { value: '2M+', label: 'Items Tracked' },
  { value: '99.9%', label: 'Uptime' },
  { value: '4.8★', label: 'App Store Rating' },
];

// Features data
const FEATURES = [
  {
    icon: Receipt,
    title: 'AI Receipt Scanning',
    description: 'Snap a photo of your receipt and our AI automatically adds items to your inventory. No manual entry needed.',
  },
  {
    icon: Mic,
    title: 'Voice Assistant',
    description: `Just say "I used 3 eggs" and ${BRAND_NAME} updates your stock. Hands-free management while you cook.`,
  },
  {
    icon: Smartphone,
    title: 'Barcode Scanner',
    description: 'Quickly add items by scanning barcodes. Perfect for restocking as you unload groceries.',
  },
  {
    icon: BarChart3,
    title: 'Smart Analytics',
    description: 'Track usage patterns, identify waste, and get insights on your household consumption.',
  },
  {
    icon: ShoppingCart,
    title: 'Shopping Lists',
    description: 'Auto-generated shopping lists based on what you\'re running low on. Never forget essentials again.',
  },
  {
    icon: Users,
    title: 'Household Sharing',
    description: 'Keep everyone in sync. Family members can update inventory and see what\'s needed in real-time.',
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

// Testimonials
const TESTIMONIALS = [
  {
    quote: `${BRAND_NAME} has completely changed how we manage our kitchen. No more duplicate purchases or running out of essentials!`,
    author: 'Sarah M.',
    role: 'Home Cook & Mom of 3',
    rating: 5,
  },
  {
    quote: 'The receipt scanning is magic. I just take a photo after grocery shopping and everything is organized instantly.',
    author: 'James K.',
    role: 'Busy Professional',
    rating: 5,
  },
  {
    quote: 'Finally convinced my roommates to use this. Now we all know what\'s in the fridge and who ate the last yogurt!',
    author: 'Alex T.',
    role: 'College Student',
    rating: 5,
  },
];

// FAQ data
const FAQS = [
  {
    question: 'How does the receipt scanning work?',
    answer: 'Take a photo of your grocery receipt and our OCR engine extracts item names, quantities, and categories automatically.',
  },
  {
    question: `Can I use ${BRAND_NAME} with multiple devices?`,
    answer: 'Yes! With a Pro or Family plan, your inventory syncs across all your devices in real-time. Free plan is limited to single device use.',
  },
  {
    question: 'Is there a limit on how many items I can track?',
    answer: 'Free plans can track up to 50 items. Pro and Family plans offer unlimited item tracking.',
  },

  {
    question: 'Can I share my pantry with family members?',
    answer: 'Absolutely! The Family plan supports up to 5 household members with shared inventory and individual shopping lists.',
  },
  {
    question: 'What happens to my data if I cancel?',
    answer: 'Your data remains accessible in read-only mode. You can export your inventory anytime, and if you re-subscribe, everything picks up where you left off.',
  },
];

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
          >
            <X className="w-6 h-6 text-slate-500" />
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
    <div className="marketing-page min-h-screen">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-[var(--marketing-bg)]/80 backdrop-blur-md border-b border-[var(--marketing-border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
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
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="text-center max-w-4xl mx-auto">
            <div className="hero-enter inline-flex items-center gap-2 bg-[var(--marketing-surface)] px-4 py-2 rounded-full mb-6 animate-gentle-float">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span className="text-sm font-medium text-slate-700">Trusted by 50,000+ households</span>
            </div>
            <h1 className="hero-enter hero-enter-delay-1 text-4xl md:text-6xl font-serif-heading font-bold text-slate-800 mb-6 leading-tight">
              Smart Inventory & Ledger for Your{' '}
              <span className="text-[var(--primary)]">Home</span>
            </h1>
            <p className="hero-enter hero-enter-delay-2 text-lg md:text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
              Never run out of essentials again. Track your pantry with receipt scanning, barcode lookup, and smart shopping lists.
            </p>
            <div className="hero-enter hero-enter-delay-3 flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <button
                onClick={goToApp}
                className="bg-[var(--primary)] text-white px-8 py-4 rounded-xl font-semibold hover:bg-[var(--primary-hover)] transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
              >
                {isLoggedIn ? "Go to Dashboard" : "Get Started Free"}
                <ArrowRight className="w-5 h-5" />
              </button>
              <button 
                onClick={() => scrollToSection('how-it-works')}
                className="bg-white text-slate-700 border-2 border-slate-200 px-8 py-4 rounded-xl font-semibold hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all"
              >
                See How It Works
              </button>
            </div>

            {/* Stats */}
            <div className="hero-enter hero-enter-delay-4 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 max-w-3xl mx-auto">
              {STATS.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-2xl md:text-3xl font-serif-heading font-bold text-[var(--primary)]">{stat.value}</div>
                  <div className="text-sm text-slate-500">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealOnScroll className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif-heading font-bold text-slate-800 mb-4">
              Everything You Need to Manage Your Pantry
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              From AI-powered scanning to household sharing, {BRAND_NAME} has all the tools you need.
            </p>
          </RevealOnScroll>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURES.map((feature, index) => (
              <RevealOnScroll key={index} delay={index * 80}>
                <div className="bg-[var(--marketing-bg)] rounded-2xl p-6 border border-[var(--marketing-border)] hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 h-full">
                  <div className="w-12 h-12 bg-[var(--primary)]/10 rounded-xl flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-[var(--primary)]" />
                  </div>
                  <h3 className="text-xl font-serif-heading font-bold text-slate-800 mb-2">{feature.title}</h3>
                  <p className="text-slate-600">{feature.description}</p>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-[var(--marketing-surface)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealOnScroll className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif-heading font-bold text-slate-800 mb-4">
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
                  <div className="text-6xl font-serif-heading font-bold text-[var(--primary)]/20 mb-4">{step.number}</div>
                  <h3 className="text-xl font-serif-heading font-bold text-slate-800 mb-2">{step.title}</h3>
                  <p className="text-slate-600">{step.description}</p>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealOnScroll className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-serif-heading font-bold text-slate-800 mb-4">
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
              View full pricing details <ArrowRight className="w-4 h-4" />
            </button>
          </RevealOnScroll>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-[var(--marketing-bg)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealOnScroll className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif-heading font-bold text-slate-800 mb-4">
              Loved by Home Managers Everywhere
            </h2>
            <p className="text-lg text-slate-600">
              See what our users are saying about {BRAND_NAME}.
            </p>
          </RevealOnScroll>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {TESTIMONIALS.map((testimonial, index) => (
              <RevealOnScroll key={index} variant="scale" delay={index * 100}>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-[var(--marketing-border)] h-full">
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-slate-700 mb-4 italic">&ldquo;{testimonial.quote}&rdquo;</p>
                  <div>
                    <p className="font-semibold text-slate-800">{testimonial.author}</p>
                    <p className="text-sm text-slate-500">{testimonial.role}</p>
                  </div>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealOnScroll className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-serif-heading font-bold text-slate-800 mb-4">
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
                  >
                    <span className="font-semibold text-slate-800">{faq.question}</span>
                    <span className="text-2xl text-slate-400">
                      {openFaqIndex === index ? '−' : '+'}
                    </span>
                  </button>
                  {openFaqIndex === index && (
                    <div className="p-4 bg-white">
                      <p className="text-slate-600">{faq.answer}</p>
                    </div>
                  )}
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-[var(--primary)]">
        <RevealOnScroll className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-serif-heading font-bold text-white mb-4">
            Ready to Transform Your Pantry?
          </h2>
          <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
            Join thousands of households who&apos;ve simplified their kitchen management. Start free today.
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
        >
          {tier.popular && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-[var(--primary)] text-white text-xs font-bold px-3 py-1 rounded-full">
                Most Popular
              </span>
            </div>
          )}
          <div className="text-center mb-6">
            <h3 className="text-xl font-serif-heading font-bold text-slate-800 mb-1">{tier.name}</h3>
            <div className="mb-2">
              <span className="text-4xl font-bold text-slate-800">{tier.price}</span>
              <span className="text-slate-500 text-sm ml-1">{tier.period}</span>
            </div>
          </div>
          <ul className="space-y-3 mb-6">
            {tier.features.map((feature, index) => (
              <li key={index} className="flex items-start gap-3 text-sm">
                <CheckCircle2 className="w-5 h-5 text-[var(--primary)] flex-shrink-0" />
                <span className="text-slate-700">{feature}</span>
              </li>
            ))}
          </ul>
          <button
            onClick={() => onSelectPlan(tier.id as 'free' | 'pro' | 'family')}
            className={`w-full py-3 rounded-xl font-semibold transition-all ${
              tier.popular
                ? 'bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]'
                : 'bg-[var(--marketing-surface)] text-slate-800 hover:bg-[var(--marketing-surface-hover)]'
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
