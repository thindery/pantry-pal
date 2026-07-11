import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";

export function MarketingNav() {
  return (
    <nav className="sticky top-0 z-40 bg-[#FEFDF9]/90 backdrop-blur-md border-b border-[#F5F0E6]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/">
          <BrandMark />
        </Link>
        <div className="flex items-center gap-6">
          <Link
            href="/pricing/"
            className="text-sm text-slate-600 hover:text-slate-900 transition-colors hidden sm:inline"
          >
            Pricing
          </Link>
          <Link
            href="/auth/signin/"
            className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/auth/signin/"
            className="text-sm font-semibold bg-[#7CB342] hover:bg-[#689F38] text-white px-4 py-2 rounded-xl transition-colors"
          >
            Get started
          </Link>
        </div>
      </div>
    </nav>
  );
}