import { Ionicons } from "@expo/vector-icons";
import { Linking } from "react-native";
import { XStack, YStack } from "tamagui";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import { Text } from "@/components/ui/Text";
import type { Application } from "../types/application.types";

interface ApplicantCardProps {
  application: Application;
  onSelect: () => void;
  onMessage: () => void;
  isSelecting: boolean;
  disabled: boolean;
}

export function ApplicantCard({ application, onSelect, onMessage, isSelecting, disabled }: ApplicantCardProps) {
  const worker = application.workerId;
  const name = `${worker.firstName ?? ""} ${worker.lastName ?? ""}`.trim();

  return (
    <Card gap="$3" alignItems="center">
      {application.status !== "pending" ? (
        <XStack alignSelf="flex-end">
          <StatusPill
            label={application.status === "selected" ? "Selected" : "Not selected"}
            tone={application.status === "selected" ? "brand" : "neutral"}
          />
        </XStack>
      ) : null}

      <Avatar uri={worker.photoUrl} name={name} size={72} />

      <YStack alignItems="center" gap="$1">
        <Text variant="h4">{name}</Text>
        <XStack alignItems="center" gap="$1">
          <Ionicons name="ribbon-outline" size={14} color="#9AA793" />
          <Text variant="caption">
            {(worker.rating?.average ?? 0).toFixed(1)}/5 · {worker.rating?.count ?? 0} reviews
          </Text>
        </XStack>
      </YStack>

      <Text variant="body" textAlign="center">
        {application.message}
      </Text>

      <XStack gap="$2" flexWrap="wrap" justifyContent="center">
        {application.voiceNoteUrl ? (
          <ActionPill icon="volume-high-outline" label="Listen" onPress={() => Linking.openURL(application.voiceNoteUrl as string)} />
        ) : null}
        <ActionPill icon="chatbubble-ellipses-outline" label="Reply" onPress={onMessage} />
      </XStack>

      {application.status === "pending" ? (
        <Button onPress={onSelect} loading={isSelecting} disabled={disabled} fullWidth>
          Select
        </Button>
      ) : null}
    </Card>
  );
}

function ActionPill({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <XStack
      alignItems="center"
      gap="$1"
      borderWidth={1.5}
      borderColor="$primary"
      borderRadius="$pill"
      paddingHorizontal="$3"
      height={36}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={14} color="#4F8266" />
      <Text variant="small" color="$primary">
        {label}
      </Text>
    </XStack>
  );
}
