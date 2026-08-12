import { YStack } from "tamagui";
import { Button } from "../Button";
import { Text } from "../Text";

interface ErrorStateProps {
  title: string;
  message?: string;
  retryLabel: string;
  onRetry: () => void;
}

export function ErrorState({ title, message, retryLabel, onRetry }: ErrorStateProps) {
  return (
    <YStack flex={1} alignItems="center" justifyContent="center" gap="$3" paddingVertical="$8" paddingHorizontal="$5">
      <Text variant="h4" textAlign="center">
        {title}
      </Text>
      {message ? (
        <Text variant="body" muted textAlign="center">
          {message}
        </Text>
      ) : null}
      <Button variant="outline" onPress={onRetry}>
        {retryLabel}
      </Button>
    </YStack>
  );
}
