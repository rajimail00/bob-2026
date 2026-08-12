import { styled, Text as TamaguiText, XStack } from "tamagui";

export type StatusTone = "active" | "neutral" | "danger" | "brand";

const PillFrame = styled(XStack, {
  alignSelf: "flex-start",
  borderRadius: "$pill",
  paddingHorizontal: "$3",
  paddingVertical: 4,

  variants: {
    tone: {
      active: { backgroundColor: "$warningBg" },
      neutral: { backgroundColor: "$neutral200" },
      danger: { backgroundColor: "$dangerBg" },
      brand: { backgroundColor: "$brand100" },
    },
  } as const,

  defaultVariants: { tone: "neutral" },
});

const toneTextColor: Record<StatusTone, string> = {
  active: "$warningText",
  neutral: "$neutral600",
  danger: "$danger",
  brand: "$brand700",
};

interface StatusPillProps {
  label: string;
  tone?: StatusTone;
}

/** The status badges used across job/ticket/user lists — "Active", "In active", "Solved", etc. */
export function StatusPill({ label, tone = "neutral" }: StatusPillProps) {
  return (
    <PillFrame tone={tone}>
      <TamaguiText fontSize="$1" fontWeight="600" color={toneTextColor[tone]}>
        {label}
      </TamaguiText>
    </PillFrame>
  );
}
