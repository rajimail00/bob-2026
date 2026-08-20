import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Image } from "react-native";
import { XStack, YStack } from "tamagui";
import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { color } from "@/design/tokens";
import type { SupportedLocale } from "@/lib/i18n";
import { getCategoryIcon } from "../constants/categoryIcons";
import type { Job } from "../types/job.types";

function formatDay(iso: string, locale: string) {
  const date = new Date(iso);
  const isToday = date.toDateString() === new Date().toDateString();
  if (isToday) return "Heute";
  return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short" }).format(date);
}

function formatTime(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

function formatBudget(amount: number) {
  return `${amount}€`;
}

interface JobCardBadge {
  icon: keyof typeof Ionicons.glyphMap;
  count: number;
  showZero?: boolean;
  accessibilityLabel?: string;
}

interface JobCardProps {
  job: Job;
  onPress?: () => void;
  distance?: string;
  onDelete?: () => void;
  isDeleting?: boolean;
  /** Small notification badge over the thumbnail's top-left corner — new applicants (bell) on
   * posted jobs, or unread messages (chat bubble) on jobs the viewer applied to. */
  badge?: JobCardBadge;
}

/** The compact, icon-row job card used in every list/map/grid context. Full detail lives on
 * the job detail screen — this card is deliberately minimal. */
export function JobCard({ job, onPress, distance, onDelete, isDeleting, badge }: JobCardProps) {
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

      {badge && (badge.count > 0 || badge.showZero) ? (
        <XStack
          position="absolute"
          top="$3"
          left="$3"
          minWidth={44}
          height={32}
          borderRadius="$pill"
          paddingHorizontal="$2"
          backgroundColor="$brand50"
          borderWidth={1}
          borderColor="$brand200"
          alignItems="center"
          justifyContent="center"
          gap="$1"
          shadowColor="#000"
          shadowOpacity={0.1}
          shadowRadius={4}
          accessibilityRole="text"
          accessibilityLabel={badge.accessibilityLabel}
        >
          <Ionicons name={badge.icon} size={15} color={color.brand600} />
          <Text variant="small" fontWeight="700" color="$brand800">
            {badge.count}
          </Text>
        </XStack>
      ) : null}

      {onDelete ? (
        <XStack
          position="absolute"
          top="$2"
          right="$2"
          width={28}
          height={28}
          borderRadius={14}
          backgroundColor="$backgroundStrong"
          alignItems="center"
          justifyContent="center"
          onPress={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          accessibilityRole="button"
          accessibilityLabel="Delete job"
        >
          {isDeleting ? null : <Ionicons name="trash-outline" size={14} color="#C1554B" />}
        </XStack>
      ) : null}

      <YStack padding="$3" gap="$2">
        <XStack flexWrap="wrap" gap="$3" alignItems="center">
          <IconLabel icon={getCategoryIcon(job.categoryId.slug)} label={undefined} />
          <IconLabel icon="calendar-outline" label={formatDay(job.date, locale)} />
          <IconLabel icon="time-outline" label={formatTime(job.date, locale)} />
          {distance ? <IconLabel icon="location-outline" label={distance} /> : null}
          <IconLabel icon="pricetag-outline" label={formatBudget(job.budget)} />
          <IconLabel icon="person-outline" label={String(job.peopleNeeded)} />
        </XStack>

        <Text variant="body" muted numberOfLines={2}>
          {job.description}
        </Text>
      </YStack>
    </Card>
  );
}

function IconLabel({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label?: string }) {
  return (
    <XStack alignItems="center" gap="$1">
      <Ionicons name={icon} size={14} color="#4F8266" />
      {label ? (
        <Text variant="caption" fontWeight="600">
          {label}
        </Text>
      ) : null}
    </XStack>
  );
}
