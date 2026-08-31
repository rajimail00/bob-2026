import { Ionicons } from "@expo/vector-icons";
import { XStack, YStack } from "tamagui";
import { Text } from "@/components/ui/Text";
import { useUnreadNotificationCount } from "../hooks/useNotifications";

interface NotificationBellProps {
  onPress: () => void;
  label: (count: number) => string;
}

export function NotificationBell({ onPress, label }: NotificationBellProps) {
  const { unreadCount } = useUnreadNotificationCount();

  return (
    <XStack
      width={44}
      height={44}
      borderRadius={22}
      borderWidth={1.5}
      borderColor="$borderColor"
      backgroundColor="$backgroundStrong"
      alignItems="center"
      justifyContent="center"
      onPress={onPress}
      role="button"
      aria-label={label(unreadCount)}
    >
      <Ionicons name="notifications-outline" size={21} color="#4F8266" />
      {unreadCount > 0 ? (
        <YStack
          position="absolute"
          top={-4}
          right={-5}
          minWidth={20}
          height={20}
          paddingHorizontal={unreadCount > 9 ? "$1" : "$0"}
          borderRadius={10}
          backgroundColor="$danger"
          alignItems="center"
          justifyContent="center"
        >
          <Text color="white" fontSize={10} fontWeight="700">
            {unreadCount > 99 ? "99+" : unreadCount}
          </Text>
        </YStack>
      ) : null}
    </XStack>
  );
}
