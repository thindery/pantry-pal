"use client";

import type { ComponentProps } from "react";
import { useRouter } from "next/navigation";

type DashboardLinkProps = ComponentProps<"a"> & {
  href: string;
};

function prefersNativeNavigation(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(pointer: coarse)").matches;
}

/**
 * Dashboard navigation link that uses full page loads on touch devices.
 * Client-side router.push can fail silently on mobile after deploys (stale RSC).
 */
export function DashboardLink({
  href,
  onClick,
  ...props
}: DashboardLinkProps) {
  const router = useRouter();

  return (
    <a
      href={href}
      {...props}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented) return;

        if (prefersNativeNavigation()) {
          return;
        }

        e.preventDefault();
        router.push(href);
      }}
    />
  );
}