import { ChefHat } from "lucide-react";
import { BRAND_NAME } from "@/lib/site-content";

interface BrandMarkProps {
  className?: string;
  nameClassName?: string;
  iconClassName?: string;
}

export function BrandMark({
  className = "",
  nameClassName = "font-bold text-xl text-slate-800",
  iconClassName = "w-8 h-8 bg-[#7CB342] rounded-lg flex items-center justify-center",
}: BrandMarkProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={iconClassName}>
        <ChefHat className="w-5 h-5 text-white" />
      </div>
      <span className={nameClassName}>{BRAND_NAME}</span>
    </div>
  );
}