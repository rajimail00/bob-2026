import { XStack, YStack } from "tamagui";
import { Avatar } from "@/components/ui/Avatar";
import { Text } from "@/components/ui/Text";
import type { Conversation } from "../types/message.types";

interface ConversationRowProps {
  conversation: Conversation;
  onPress: () => void;
}

export function ConversationRow({ conversation, onPress }: ConversationRowProps) {
  const { worker } = conversation;
  const name = `${worker.firstName} ${worker.lastName}`.trim();
  const hasUnread = conversation.unreadCount > 0;

  return (
    <XStack
      alignItems="center"
      gap="$3"
      paddingVertical="$3"
      paddingHorizontal="$3"
      borderRadius="$md"
      backgroundColor={hasUnread ? "$primary" : "$backgroundStrong"}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open conversation with ${name}`}
    >
      <Avatar uri={worker.photoUrl} name={name} size={44} />
      <YStack flex={1} gap="$0.5">
        <Text variant="body" fontWeight="600" color={hasUnread ? "white" : "$color"}>
          {name}
        </Text>
        <Text variant="caption" numberOfLines={1} color={hasUnread ? "white" : "$colorMuted"}>
          {conversation.previewText ?? ""}
        </Text>
      </YStack>
      {hasUnread ? (
        <XStack minWidth={22} height={22} borderRadius={11} paddingHorizontal="$1.5" backgroundColor="white" alignItems="center" justifyContent="center">
          <Text variant="small" color="$primary" fontWeight="700">
            {conversation.unreadCount}
          </Text>
        </XStack>
      ) : null}
    </XStack>
  );
}
