import { YStack } from "tamagui";
import { Button } from "../Button";
import { Text } from "../Text";

interface EmptyStateProps {
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, body, actionLabel, onAction }: EmptyStateProps) {
  return (
    <YStack flex={1} alignItems="center" justifyContent="center" gap="$3" paddingVertical="$8" paddingHorizontal="$5">
      <Text variant="h4" textAlign="center">
        {title}
      </Text>
      {body ? (
        <Text variant="body" muted textAlign="center">
          {body}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button variant="outline" onPress={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </YStack>
  );
}
