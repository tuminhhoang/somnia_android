/** Somnia design tokens — dark-first sleep-friendly palette. */
export const colors = {
  // Backgrounds
  bg: {
    primary: "#0B1120",
    secondary: "#111827",
    card: "#1A2332",
    elevated: "#1F2A3D",
  },

  // Text
  text: {
    primary: "#F1F5F9",
    secondary: "#94A3B8",
    muted: "#64748B",
    inverse: "#0B1120",
  },

  // Accent — calming indigo/blue
  accent: {
    primary: "#818CF8",
    secondary: "#6366F1",
    muted: "rgba(129, 140, 248, 0.15)",
  },

  // Threshold zones
  zone: {
    green: "#34D399",
    greenMuted: "rgba(52, 211, 153, 0.15)",
    amber: "#FBBF24",
    amberMuted: "rgba(251, 191, 36, 0.15)",
    red: "#F87171",
    redMuted: "rgba(248, 113, 113, 0.15)",
  },

  // Sleep stages
  stage: {
    deep: "#6366F1",
    rem: "#818CF8",
    light: "#A5B4FC",
    awake: "#F87171",
  },

  // Misc
  border: "#1E293B",
  divider: "#1E293B",
  overlay: "rgba(0, 0, 0, 0.6)",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const font = {
  size: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 22,
    xxl: 28,
    hero: 34,
  },
  weight: {
    regular: "400" as const,
    medium: "500" as const,
    semibold: "600" as const,
    bold: "700" as const,
  },
} as const;
