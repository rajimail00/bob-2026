import { ActivityIndicator } from "react-native";
import { YStack } from "tamagui";
import { Text } from "../Text";

export function LoadingState({ label }: { label?: string }) {
  return (
    <YStack flex={1} alignItems="center" justifyContent="center" gap="$3" paddingVertical="$8">
      <ActivityIndicator color="#4F8266" />
      {label ? <Text variant="caption">{label}</Text> : null}
    </YStack>
  );
}
