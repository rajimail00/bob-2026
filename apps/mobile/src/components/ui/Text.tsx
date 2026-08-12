import { styled, Text as TamaguiText } from "tamagui";

/** Typography scale — always use a variant instead of ad-hoc fontSize/fontWeight props. */
export const Text = styled(TamaguiText, {
  color: "$color",
  fontFamily: "$body",

  variants: {
    variant: {
      display: { fontSize: "$9", fontWeight: "700", fontFamily: "$heading" },
      h1: { fontSize: "$8", fontWeight: "700", fontFamily: "$heading" },
      h2: { fontSize: "$7", fontWeight: "700", fontFamily: "$heading" },
      h3: { fontSize: "$6", fontWeight: "600", fontFamily: "$heading" },
      h4: { fontSize: "$5", fontWeight: "600", fontFamily: "$heading" },
      bodyLg: { fontSize: "$4" },
      body: { fontSize: "$3" },
      small: { fontSize: "$2" },
      caption: { fontSize: "$1", color: "$colorMuted" },
      label: { fontSize: "$1", fontWeight: "600", letterSpacing: 0.6, textTransform: "uppercase", color: "$colorMuted" },
    },
    muted: {
      true: { color: "$colorMuted" },
    },
  } as const,

  defaultVariants: {
    variant: "body",
  },
});
