import { Ionicons } from "@expo/vector-icons";
import { XStack, YStack } from "tamagui";
import { Text } from "@/components/ui/Text";
import type { AppNotification, NotificationType } from "../types/notification.types";

const ICON_BY_TYPE: Record<NotificationType, keyof typeof Ionicons.glyphMap> = {
  new_application: "person-add-outline",
  offer_received: "gift-outline",
  offer_accepted: "checkmark-circle-outline",
  offer_declined: "close-circle-outline",
  application_rejected: "remove-circle-outline",
  job_cancelled: "ban-outline",
  job_completed: "checkmark-done-outline",
  new_message: "chatbubble-outline",
  job_updated: "create-outline",
  job_expired: "time-outline",
  job_reposted: "repeat-outline",
};

interface NotificationRowProps {
  notification: AppNotification;
  title: string;
  time: string;
  openLabel: string;
  onPress: () => void;
}

export function NotificationRow({ notification, title, time, openLabel, onPress }: NotificationRowProps) {
  const isUnread = !notification.readAt;

  return (
    <XStack
      padding="$4"
      gap="$3"
      alignItems="center"
      borderBottomWidth={1}
      borderBottomColor="$borderColor"
      backgroundColor={isUnread ? "$backgroundStrong" : "$background"}
      onPress={onPress}
      role="button"
      aria-label={openLabel}
    >
      <YStack
        width={42}
        height={42}
        borderRadius={21}
        alignItems="center"
        justifyContent="center"
        backgroundColor={isUnread ? "$primary" : "$borderColor"}
      >
        <Ionicons
          name={ICON_BY_TYPE[notification.type]}
          size={20}
          color={isUnread ? "white" : "#4F8266"}
        />
      </YStack>
      <YStack flex={1} gap="$1">
        <Text variant="body" fontWeight={isUnread ? "700" : "400"}>
          {title}
        </Text>
        <Text variant="caption">{time}</Text>
      </YStack>
      {isUnread ? <YStack width={8} height={8} borderRadius={4} backgroundColor="$primary" /> : null}
      <Ionicons name="chevron-forward" size={18} color="#9AA793" />
    </XStack>
  );
}
