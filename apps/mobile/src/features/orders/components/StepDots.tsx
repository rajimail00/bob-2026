import { XStack, YStack } from "tamagui";

interface StepDotsProps {
  total: number;
  current: number;
}

export function StepDots({ total, current }: StepDotsProps) {
  return (
    <XStack gap="$2" justifyContent="center">
      {Array.from({ length: total }).map((_, index) => (
        <YStack
          key={index}
          width={8}
          height={8}
          borderRadius={4}
          backgroundColor={index === current ? "$primary" : "$neutral200"}
        />
      ))}
    </XStack>
  );
}
