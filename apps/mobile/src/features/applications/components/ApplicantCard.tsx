import { Ionicons } from "@expo/vector-icons";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { XStack, YStack } from "tamagui";
import { useTranslation } from "react-i18next";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import { Text } from "@/components/ui/Text";
import type { Application } from "../types/application.types";


const STATUS_TONE: Record<Application["status"], "brand" | "neutral" | "danger"> = {
  pending: "neutral",
  offered: "brand",
  accepted: "brand",
  declined: "neutral",
  rejected: "neutral",
};

interface ApplicantCardProps {
  application: Application;
  onOffer: () => void;
  onMessage: () => void;
  isOffering: boolean;
  disabled: boolean;
}

export function ApplicantCard({ application, onOffer, onMessage, isOffering, disabled }: ApplicantCardProps) {
  const { t } = useTranslation();
  const worker = application.workerId;
  const name = `${worker.firstName ?? ""} ${worker.lastName ?? ""}`.trim();
  const voicePlayer = useAudioPlayer(application.voiceNoteUrl ?? null);
  const voiceStatus = useAudioPlayerStatus(voicePlayer);

  const toggleVoiceNote = async () => {
    if (!application.voiceNoteUrl) return;

    if (voiceStatus.playing) {
      voicePlayer.pause();
      return;
    }

    if (voiceStatus.didJustFinish || voiceStatus.currentTime > 0) {
      await voicePlayer.seekTo(0);
    }

    voicePlayer.play();
  };

  return (
    <Card gap="$3" alignItems="center">
      {application.status !== "pending" ? (
        <XStack alignSelf="flex-end">
          <StatusPill label={application.status === "offered" ? t("applicant.awaiting") : t(`applications.status.${application.status}`)} tone={STATUS_TONE[application.status]} />
        </XStack>
      ) : null}

      <Avatar uri={worker.photoUrl} name={name} size={72} />

      <YStack alignItems="center" gap="$1">
        <Text variant="h4">{name}</Text>
        <XStack alignItems="center" gap="$1">
          <Ionicons name="ribbon-outline" size={14} color="#9AA793" />
          <Text variant="caption">
            {t("applicant.rating", { average: (worker.rating?.average ?? 0).toFixed(1), count: worker.rating?.count ?? 0 })}
          </Text>
        </XStack>
      </YStack>

      <Text variant="body" textAlign="center">
        {application.message}
      </Text>

      <XStack gap="$2" flexWrap="wrap" justifyContent="center">
        {application.voiceNoteUrl ? (
          <ActionPill
            icon={voiceStatus.playing ? "pause-outline" : "volume-high-outline"}
            label={voiceStatus.playing ? t("applicant.playing") : t("applicant.listen")}
            onPress={toggleVoiceNote}
          />
        ) : null}
        <ActionPill icon="chatbubble-ellipses-outline" label={t("applicant.reply")} onPress={onMessage} />
      </XStack>

      {application.status === "pending" ? (
        <Button onPress={onOffer} loading={isOffering} disabled={disabled} fullWidth>
          {t("applicant.offer")}
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
      role="button"
      aria-label={label}
    >
      <Ionicons name={icon} size={14} color="#4F8266" />
      <Text variant="small" color="$primary">
        {label}
      </Text>
    </XStack>
  );
}
