import { styled, YStack } from "tamagui";

export const Card = styled(YStack, {
  backgroundColor: "$backgroundStrong",
  borderRadius: "$lg",
  borderWidth: 1,
  borderColor: "$borderColor",
  padding: "$4",
  gap: "$2",

  variants: {
    elevated: {
      true: {
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      },
    },
  } as const,
});
