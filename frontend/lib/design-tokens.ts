/**
 * Pantry Hub design tokens — PP-042
 * Single source for designer handoff and component implementation.
 */

export const colors = {
  background: "#f8fafc",
  foreground: "#0f172a",
  primary: "#059669",
  primaryHover: "#047857",
  primaryLight: "#d1fae5",
  primaryMuted: "#ecfdf5",
  accent: "#f59e0b",
  accentHover: "#d97706",
  accentLight: "#fef3c7",
  muted: "#64748b",
  mutedLight: "#94a3b8",
  border: "#e2e8f0",
  surface: "#ffffff",
  surfaceMuted: "#f1f5f9",
  danger: "#f43f5e",
  dangerLight: "#ffe4e6",
} as const;

export const typography = {
  fontSans: "var(--font-sans)",
  fontSerif: "var(--font-serif)",
  sizes: {
    xs: "0.75rem",
    sm: "0.875rem",
    base: "1rem",
    lg: "1.125rem",
    xl: "1.25rem",
    "2xl": "1.5rem",
    "3xl": "1.875rem",
  },
  weights: {
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
} as const;

export const spacing = {
  pageX: "1rem",
  pageXSm: "1.5rem",
  section: "1rem",
  card: "1rem",
  navHeight: "4rem",
} as const;

export const radii = {
  md: "0.5rem",
  lg: "0.75rem",
  xl: "1rem",
  "2xl": "1.25rem",
  full: "9999px",
} as const;

export const shadows = {
  sm: "0 1px 2px 0 rgb(15 23 42 / 0.05)",
  card: "0 1px 3px 0 rgb(15 23 42 / 0.08)",
} as const;

/** Per-category low-stock defaults (matches lib/constants.ts) */
export const defaultThresholds = {
  produce: 3,
  pantry: 2,
  dairy: 2,
  frozen: 1,
  meat: 1,
  beverages: 2,
  snacks: 2,
  other: 2,
} as const;