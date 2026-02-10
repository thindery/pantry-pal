import React, { useState } from 'react';
import { 
  ChefHat, 
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
    description: 'Just say "I used 3 eggs" and PantryPal updates your stock. Hands-free management while you cook.',
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
    description: 'Use receipt scanning, barcode scanning, or voice commands to quickly add items to your pantry.',
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
      '5 AI receipt scans/month',
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
      'Unlimited AI receipt scans',
      'Voice assistant with Gemini',
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
    quote: 'PantryPal has completely changed how we manage our kitchen. No more duplicate purchases or running out of essentials!',
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
    answer: 'Our AI analyzes your receipt photo and extracts item names, quantities, and categories automatically. It\'s powered by Google\'s Gemini AI for high accuracy.',
  },
  {
    question: 'Can I use PantryPal with multiple devices?',
    answer: 'Yes! With a Pro or Family plan, your inventory syncs across all your devices in real-time. Free plan is limited to single device use.',
  },
  {
    question: 'Is there a limit on how many items I can track?',
    answer: 'Free plans can track up to 50 items. Pro and Family plans offer unlimited item tracking.',
  },
  {
    question: 'How does the voice assistant work?',
    answer: 'Just tap the microphone and talk naturally. Say things like "I used 3 eggs" or "Add 2 gallons of milk" and PantryPal handles the rest.',
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

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onLogin }) => {
  const [showFullPricing, setShowFullPricing] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (showFullPricing) {
    return (
      <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🥗</span>
            <span className="font-bold text-xl text-slate-800">PantryPal</span>
          </div>
          <button
            onClick={() => setShowFullPricing(false)}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-slate-500" />
          </button>
        </div>
        <PricingPreview 
          onSelectPlan={(plan) => {
            if (plan === 'free') onGetStarted();
          }} 
          showFullPricing={true}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FEFDF9]">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-[#FEFDF9]/80 backdrop-blur-md border-b border-[#F5F0E6]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#7CB342] rounded-lg flex items-center justify-center">
                <ChefHat className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl text-slate-800">PantryPal</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <button onClick={() => scrollToSection('features')} className="text-slate-600 hover:text-slate-800 transition-colors">Features</button>
              <button onClick={() => scrollToSection('how-it-works')} className="text-slate-600 hover:text-slate-800 transition-colors">How It Works</button>
              <button onClick={() => scrollToSection('pricing')} className="text-slate-600 hover:text-slate-800 transition-colors">Pricing</button>
              <button onClick={() => scrollToSection('faq')} className="text-slate-600 hover:text-slate-800 transition-colors">FAQ</button>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={onLogin}
                className="text-slate-600 hover:text-slate-800 font-medium transition-colors"
              >
                Log In
              </button>
              <button 
                onClick={onGetStarted}
                className="bg-[#7CB342] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#689F38] transition-colors"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-[#F5F0E6] px-4 py-2 rounded-full mb-6">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span className="text-sm font-medium text-slate-700">Trusted by 50,000+ households</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-slate-800 mb-6 leading-tight">
              Smart Inventory & Ledger for Your{' '}
              <span className="text-[#7CB342]">Home</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
              Never run out of essentials again. Track your pantry with AI-powered receipt scanning, voice commands, and smart shopping lists.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <button 
                onClick={onGetStarted}
                className="bg-[#7CB342] text-white px-8 py-4 rounded-xl font-semibold hover:bg-[#689F38] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#7CB342]/20"
              >
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </button>
              <button 
                onClick={() => scrollToSection('how-it-works')}
                className="bg-white text-slate-700 border-2 border-slate-200 px-8 py-4 rounded-xl font-semibold hover:border-[#7CB342] hover:text-[#7CB342] transition-all"
              >
                See How It Works
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 max-w-3xl mx-auto">
              {STATS.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-2xl md:text-3xl font-bold text-[#7CB342]">{stat.value}</div>
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
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">
              Everything You Need to Manage Your Pantry
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              From AI-powered scanning to household sharing, PantryPal has all the tools you need.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURES.map((feature, index) => (
              <div 
                key={index} 
                className="bg-[#FEFDF9] rounded-2xl p-6 border border-[#F5F0E6] hover:shadow-lg transition-shadow"
              >
                <div className="w-12 h-12 bg-[#7CB342]/10 rounded-xl flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-[#7CB342]" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">{feature.title}</h3>
                <p className="text-slate-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-[#F5F0E6]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">
              How It Works
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Getting started is easy. Three simple steps to pantry management bliss.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map((step, index) => (
              <div key={index} className="text-center">
                <div className="text-6xl font-bold text-[#7CB342]/20 mb-4">{step.number}</div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">{step.title}</h3>
                <p className="text-slate-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Start free and upgrade when you need more power. No hidden fees.
            </p>
          </div>
          <PricingPreview onSelectPlan={(plan) => {
            if (plan === 'free') onGetStarted();
            else setShowFullPricing(true);
          }} />
          <div className="text-center mt-8">
            <button 
              onClick={() => setShowFullPricing(true)}
              className="text-[#7CB342] font-medium hover:underline inline-flex items-center gap-2"
            >
              View full pricing details <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-[#FEFDF9]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">
              Loved by Home Managers Everywhere
            </h2>
            <p className="text-lg text-slate-600">
              See what our users are saying about PantryPal.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {TESTIMONIALS.map((testimonial, index) => (
              <div key={index} className="bg-white rounded-2xl p-6 shadow-sm border border-[#F5F0E6]">
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-slate-700 mb-4 italic">"{testimonial.quote}"</p>
                <div>
                  <p className="font-semibold text-slate-800">{testimonial.author}</p>
                  <p className="text-sm text-slate-500">{testimonial.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">
              Frequently Asked Questions
            </h2>
          </div>
          <div className="space-y-4">
            {FAQS.map((faq, index) => (
              <div 
                key={index} 
                className="border border-[#F5F0E6] rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                  className="w-full flex justify-between items-center p-4 text-left bg-[#FEFDF9] hover:bg-[#F5F0E6] transition-colors"
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
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-[#7CB342]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Transform Your Pantry?
          </h2>
          <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
            Join thousands of households who've simplified their kitchen management. Start free today.
          </p>
          <button 
            onClick={onGetStarted}
            className="bg-white text-[#7CB342] px-8 py-4 rounded-xl font-bold hover:bg-slate-100 transition-colors shadow-lg"
          >
            Get Started Free
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-800 text-slate-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-[#7CB342] rounded-lg flex items-center justify-center">
                  <ChefHat className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-xl text-white">PantryPal</span>
              </div>
              <p className="text-sm text-slate-400">
                Smart inventory & ledger for your home. Never run out of essentials again.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><button onClick={() => scrollToSection('features')} className="hover:text-white transition-colors">Features</button></li>
                <li><button onClick={() => scrollToSection('pricing')} className="hover:text-white transition-colors">Pricing</button></li>
                <li><button onClick={() => scrollToSection('faq')} className="hover:text-white transition-colors">FAQ</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Connect</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Twitter</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Instagram</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Support</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-700 pt-8 text-center text-sm text-slate-400">
            © {new Date().getFullYear()} PantryPal. All rights reserved.
          </div>
        </div>
      </footer>
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
          className={`relative rounded-2xl border-2 p-6 transition-all ${
            tier.popular 
              ? 'border-[#7CB342] shadow-lg' 
              : 'border-[#F5F0E6] hover:border-[#7CB342]/50'
          }`}
        >
          {tier.popular && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-[#7CB342] text-white text-xs font-bold px-3 py-1 rounded-full">
                Most Popular
              </span>
            </div>
          )}
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-slate-800 mb-1">{tier.name}</h3>
            <div className="mb-2">
              <span className="text-4xl font-bold text-slate-800">{tier.price}</span>
              <span className="text-slate-500 text-sm ml-1">{tier.period}</span>
            </div>
          </div>
          <ul className="space-y-3 mb-6">
            {tier.features.map((feature, index) => (
              <li key={index} className="flex items-start gap-3 text-sm">
                <CheckCircle2 className="w-5 h-5 text-[#7CB342] flex-shrink-0" />
                <span className="text-slate-700">{feature}</span>
              </li>
            ))}
          </ul>
          <button
            onClick={() => onSelectPlan(tier.id as 'free' | 'pro' | 'family')}
            className={`w-full py-3 rounded-xl font-semibold transition-all ${
              tier.popular
                ? 'bg-[#7CB342] text-white hover:bg-[#689F38]'
                : 'bg-[#F5F0E6] text-slate-800 hover:bg-[#E8E0D0]'
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
