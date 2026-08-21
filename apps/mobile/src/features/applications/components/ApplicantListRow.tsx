import { Ionicons } from "@expo/vector-icons";
import { XStack, YStack } from "tamagui";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import { Text } from "@/components/ui/Text";
import type { Application } from "../types/application.types";

const STATUS_LABEL: Record<Application["status"], string> = {
  pending: "Pending",
  offered: "Offer sent",
  accepted: "Accepted",
  declined: "Declined",
  rejected: "Not selected",
};

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
  onPress: () => void;
}

export function ApplicantListRow({
  application,
  onPress,
}: ApplicantListRowProps) {
  const worker = application.workerId;
  const name = `${worker.firstName ?? ""} ${
    worker.lastName ?? ""
  }`.trim();

  return (
    <Card
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open ${name}'s profile`}
    >
      <XStack alignItems="center" gap="$3">
        <Avatar uri={worker.photoUrl} name={name} size={56} />

        <YStack flex={1} gap="$1">
          <Text variant="body" fontWeight="600">
            {name}
          </Text>

          <XStack alignItems="center" gap="$1">
            <Ionicons name="star-outline" size={14} color="#4F8266" />

            <Text variant="caption" muted>
              {(worker.rating?.average ?? 0).toFixed(1)} / 5 ·{" "}
              {worker.rating?.count ?? 0} reviews
            </Text>
          </XStack>

          <StatusPill
            label={STATUS_LABEL[application.status]}
            tone={STATUS_TONE[application.status]}
          />
        </YStack>

        <Ionicons name="chevron-forward" size={22} color="#4F8266" />
      </XStack>
    </Card>
  );
}