"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type RevealVariant = "fade-up" | "fade-in" | "fade-left" | "fade-right" | "scale";

interface RevealOnScrollProps {
  children: ReactNode;
  className?: string;
  variant?: RevealVariant;
  /** Stagger delay in milliseconds */
  delay?: number;
  /** Intersection threshold 0–1 */
  threshold?: number;
}

export function RevealOnScroll({
  children,
  className = "",
  variant = "fade-up",
  delay = 0,
  threshold = 0.12,
}: RevealOnScrollProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (el == null) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px -48px 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return (
    <div
      ref={ref}
      className={`reveal reveal-${variant} ${visible ? "reveal-visible" : ""} ${className}`.trim()}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}