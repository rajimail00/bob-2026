/**
 * Design tokens for BOB, derived from the delivered mobile/admin mockups:
 * sage-green brand, warm off-white surfaces, pill-shaped controls, tan/gray status pills.
 * This is the single source of truth for color/spacing/radius/type — components must
 * reference these tokens (via tamagui.config.ts) rather than hardcoding values.
 */

export const color = {
  brand50: "#EAF2ED",
  brand100: "#D3E5DB",
  brand200: "#B6D3C3",
  brand300: "#8FBBA2",
  brand400: "#6BA688",
  brand500: "#4F8266", // primary — buttons, active tab, brand mark
  brand600: "#3F6B53",
  brand700: "#325445",
  brand800: "#26402F",

  neutral0: "#FFFFFF",
  neutral50: "#F8F9F6",
  neutral100: "#F1F0EA",
  neutral200: "#E2E6DD",
  neutral300: "#CBD2C4",
  neutral400: "#9AA793",
  neutral500: "#78826F",
  neutral600: "#5B6358",
  neutral700: "#42473B",
  neutral800: "#2C312A",
  neutral900: "#1B211A",

  tan100: "#FBEBDA",
  tan500: "#E8A971", // "Active" status pill
  tan700: "#8A5A25",

  danger100: "#F6E4E2",
  danger500: "#C1554B",
  danger700: "#8A342C",

  info100: "#E4E9F5",
  info500: "#3A5AA1",
} as const;

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 32,
  8: 40,
  9: 48,
  10: 64,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  pill: 999,
} as const;

export const fontSize = {
  caption: 12,
  small: 13,
  body: 15,
  bodyLg: 17,
  h4: 19,
  h3: 22,
  h2: 26,
  h1: 32,
  display: 40,
} as const;

export const fontWeight = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
} as const;
