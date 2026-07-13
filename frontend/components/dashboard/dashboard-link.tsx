"use client";

import type { ComponentProps } from "react";

type DashboardLinkProps = ComponentProps<"a"> & {
  href: string;
};

/**
 * Dashboard navigation link using native anchor navigation.
 * Client-side router.push/Link can fail silently after deploys (stale RSC).
 */
export function DashboardLink({ href, ...props }: DashboardLinkProps) {
  return <a href={href} {...props} />;
}