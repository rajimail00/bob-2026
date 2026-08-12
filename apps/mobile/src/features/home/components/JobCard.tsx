import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Image } from "react-native";
import { XStack, YStack } from "tamagui";
import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import type { Job } from "../types/job.types";
import type { SupportedLocale } from "@/lib/i18n";

function formatDate(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short" }).format(new Date(iso));
}

function formatBudget(amount: number, locale: string) {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(amount);
}

interface JobCardProps {
  job: Job;
  onPress?: () => void;
}

export function JobCard({ job, onPress }: JobCardProps) {
  const { i18n } = useTranslation();
  const locale = (i18n.language?.slice(0, 2) as SupportedLocale) || "en";

  const thumbnail = job.media?.[0];

  return (
    <Card elevated pressStyle={{ opacity: 0.9 }} onPress={onPress} accessibilityRole="button" padding={0} overflow="hidden">
      {thumbnail ? (
        <YStack position="relative">
          <Image source={{ uri: thumbnail.url }} style={{ width: "100%", height: 140 }} />
          {thumbnail.type === "video" ? (
            <XStack
              position="absolute"
              top={0}
              left={0}
              right={0}
              bottom={0}
              alignItems="center"
              justifyContent="center"
              backgroundColor="rgba(0,0,0,0.15)"
            >
              <Ionicons name="play-circle" size={40} color="white" />
            </XStack>
          ) : null}
        </YStack>
      ) : null}

      <YStack padding="$4" gap="$2">
        <XStack justifyContent="space-between" alignItems="center">
          <Text variant="label" color="$brand600">
            {job.categoryId?.name?.[locale] ?? job.categoryId?.name?.en}
          </Text>
          <Text variant="h4">{formatBudget(job.budget, locale)}</Text>
        </XStack>

        <Text variant="h4" numberOfLines={1}>
          {job.title}
        </Text>
        <Text variant="body" muted numberOfLines={2}>
          {job.description}
        </Text>

        <XStack gap="$4" marginTop="$1">
          <YStack>
            <Text variant="caption">{formatDate(job.date, locale)}</Text>
          </YStack>
          <YStack>
            <Text variant="caption">{job.address}</Text>
          </YStack>
        </XStack>
      </YStack>
    </Card>
  );
}
