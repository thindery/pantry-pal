import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { BRAND_NAME, CONTACT_EMAIL, LEGAL_LINE } from "@/lib/site-content";

export function MarketingFooter() {
  return (
    <footer className="bg-slate-800 text-slate-300 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <BrandMark className="mb-4" nameClassName="font-bold text-xl text-white" />
            <p className="text-sm text-slate-400">
              Smart inventory and shopping lists for your home. Never run out of essentials again.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-4">Product</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/#features" className="hover:text-white transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/pricing/" className="hover:text-white transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/#faq" className="hover:text-white transition-colors">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-4">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/privacy/" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms/" className="hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-4">Contact</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="hover:text-white transition-colors"
                >
                  {CONTACT_EMAIL}
                </a>
              </li>
              <li>
                <Link href="/auth/signin/" className="hover:text-white transition-colors">
                  Sign in to {BRAND_NAME}
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-700 pt-8 text-center text-sm text-slate-400">
          © {new Date().getFullYear()} {LEGAL_LINE}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}