import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import type { GestureResponderEvent } from "react-native";
import { XStack, YStack } from "tamagui";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import { Text } from "@/components/ui/Text";
import type { Conversation } from "@/features/messages/types/message.types";
import type { Application } from "../types/application.types";

const STATUS_TONE: Record<
  Application["status"],
  "brand" | "neutral" | "danger"
> = {
  pending: "neutral",
  offered: "brand",
  accepted: "brand",
  declined: "neutral",
  rejected: "danger",
};

interface ApplicantListRowProps {
  application: Application;
  conversation?: Conversation;
  onPress: () => void;
  onMessage?: () => void;
}

export function ApplicantListRow({
  application,
  conversation,
  onPress,
  onMessage,
}: ApplicantListRowProps) {
  const { t } = useTranslation();
  const worker = application.workerId;

  const name = `${worker.firstName ?? ""} ${worker.lastName ?? ""
    }`.trim();

  const previewText =
  conversation?.previewText ??
  application.message ??
  t("applications.noMessage");

  const hasUnread = (conversation?.unreadCount ?? 0) > 0;

  const handleMessagePress = (event: GestureResponderEvent) => {
    event.stopPropagation();
    onMessage?.();
  };

  return (
    <Card
      onPress={onPress}
      role="button"
      aria-label={t("applications.messageApplicant", { name })}
    >
      <XStack alignItems="center" gap="$3">
        <Avatar uri={worker.photoUrl} name={name} size={56} />

        <YStack flex={1} gap="$1">
          <XStack
            alignItems="center"
            justifyContent="space-between"
            gap="$2"
          >
            <Text variant="body" fontWeight="600" flex={1}>
              {name}
            </Text>

            {hasUnread ? (
              <XStack
                minWidth={22}
                height={22}
                borderRadius={11}
                paddingHorizontal="$1.5"
                backgroundColor="$primary"
                alignItems="center"
                justifyContent="center"
              >
                <Text variant="small" color="white" fontWeight="700">
                  {conversation?.unreadCount}
                </Text>
              </XStack>
            ) : null}
          </XStack>

          <XStack alignItems="center" gap="$1">
            <Ionicons name="star-outline" size={14} color="#4F8266" />

            <Text variant="caption" muted>
              {t("applications.rating", {
                average: (worker.rating?.average ?? 0).toFixed(1),
                count: worker.rating?.count ?? 0,
              })}
            </Text>
          </XStack>

          <Text variant="caption" muted numberOfLines={2}>
            {previewText}
          </Text>

          <StatusPill
            label={t(`applications.status.${application.status}`)}
            tone={STATUS_TONE[application.status]}
          />
        </YStack>

        <YStack alignItems="center" gap="$3">
          {onMessage ? (
            <XStack
              width={38}
              height={38}
              borderRadius={19}
              borderWidth={1.5}
              borderColor="$primary"
              alignItems="center"
              justifyContent="center"
              onPress={handleMessagePress}
              accessibilityRole="button"
              accessibilityLabel={t("applications.messageApplicant", { name })}
            >
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={19}
                color="#4F8266"
              />
            </XStack>
          ) : null}

          <Ionicons
            name="chevron-forward"
            size={20}
            color="#4F8266"
          />
        </YStack>
      </XStack>
    </Card>
  );
}