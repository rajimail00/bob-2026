import { createFont, createTamagui, createTokens } from "tamagui";
import { createInterFont } from "@tamagui/font-inter";
import { color, fontSize, radius, spacing } from "./src/design/tokens";

const headingFont = createInterFont({
  size: {
    1: fontSize.caption,
    2: fontSize.small,
    3: fontSize.body,
    4: fontSize.bodyLg,
    5: fontSize.h4,
    6: fontSize.h3,
    7: fontSize.h2,
    8: fontSize.h1,
    9: fontSize.display,
    true: fontSize.body,
  },
  weight: { 4: "500", 6: "600", 8: "700", true: "500" },
});

const bodyFont = createInterFont({
  size: {
    1: fontSize.caption,
    2: fontSize.small,
    3: fontSize.body,
    4: fontSize.bodyLg,
    5: fontSize.h4,
    6: fontSize.h3,
    true: fontSize.body,
  },
});

const monoFont: ReturnType<typeof createFont> = createFont({
  family: "SFMono-Regular, Menlo, monospace",
  size: { 1: 12, 2: 13, 3: 14, true: 13 },
  lineHeight: { 1: 16, 2: 18, 3: 20, true: 18 },
  weight: { 4: "400", 6: "600", true: "400" },
});

const tokens = createTokens({
  color: {
    brand50: color.brand50,
    brand100: color.brand100,
    brand200: color.brand200,
    brand300: color.brand300,
    brand400: color.brand400,
    brand500: color.brand500,
    brand600: color.brand600,
    brand700: color.brand700,
    brand800: color.brand800,
    neutral0: color.neutral0,
    neutral50: color.neutral50,
    neutral100: color.neutral100,
    neutral200: color.neutral200,
    neutral300: color.neutral300,
    neutral400: color.neutral400,
    neutral500: color.neutral500,
    neutral600: color.neutral600,
    neutral700: color.neutral700,
    neutral800: color.neutral800,
    neutral900: color.neutral900,
    tan100: color.tan100,
    tan500: color.tan500,
    tan700: color.tan700,
    danger100: color.danger100,
    danger500: color.danger500,
    danger700: color.danger700,
    info100: color.info100,
    info500: color.info500,
  },
  space: { ...spacing, true: spacing[4] },
  size: { ...spacing, true: spacing[4] },
  radius: { ...radius, true: radius.md },
  zIndex: { 0: 0, 1: 100, 2: 200, 3: 300 },
});

const lightTheme = {
  background: tokens.color.neutral50,
  backgroundStrong: tokens.color.neutral0,
  backgroundHover: tokens.color.neutral100,
  color: tokens.color.neutral900,
  colorMuted: tokens.color.neutral600,
  borderColor: tokens.color.neutral200,
  primary: tokens.color.brand500,
  primaryHover: tokens.color.brand600,
  primaryText: tokens.color.neutral0,
  danger: tokens.color.danger500,
  dangerBg: tokens.color.danger100,
  warningBg: tokens.color.tan100,
  warningText: tokens.color.tan700,
};

const darkTheme = {
  background: tokens.color.neutral900,
  backgroundStrong: tokens.color.neutral800,
  backgroundHover: tokens.color.neutral700,
  color: tokens.color.neutral50,
  colorMuted: tokens.color.neutral400,
  borderColor: tokens.color.neutral700,
  primary: tokens.color.brand400,
  primaryHover: tokens.color.brand300,
  primaryText: tokens.color.neutral900,
  danger: tokens.color.danger500,
  dangerBg: tokens.color.danger700,
  warningBg: tokens.color.tan700,
  warningText: tokens.color.tan100,
};

export const config = createTamagui({
  defaultFont: "body",
  fonts: { heading: headingFont, body: bodyFont, mono: monoFont },
  tokens,
  themes: { light: lightTheme, dark: darkTheme },
  media: {
    sm: { maxWidth: 480 },
    md: { maxWidth: 768 },
    lg: { maxWidth: 1024 },
  },
});

export type AppConfig = typeof config;

declare module "tamagui" {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface TamaguiCustomConfig extends AppConfig {}
}

export default config;
