import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingNav } from "@/components/marketing/MarketingNav";

/** Public page chrome for /recipes. No AdSense and no sign-in wall. */
export function RecipePageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="marketing-page min-h-screen flex flex-col print:[&_footer]:hidden print:[&_nav]:hidden">
      <MarketingNav />
      <main className="flex-1 pb-16">{children}</main>
      <MarketingFooter />
    </div>
  );
}
