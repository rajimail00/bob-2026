import { Ionicons } from "@expo/vector-icons";
import type { NavigationProp } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ActivityIndicator, Image, Pressable, ScrollView } from "react-native";
import { useTranslation } from "react-i18next";
import { XStack, YStack } from "tamagui";
import { Button } from "@/components/ui/Button";
import { CustomerHeader } from "@/components/layout/CustomerHeader";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { StatusPill } from "@/components/ui/StatusPill";
import { Text } from "@/components/ui/Text";
import { useAuthStore } from "@/features/auth/store/authStore";
import { getCategoryIcon } from "@/features/home/constants/categoryIcons";
import { useCategories, useMyAssignedJobs, useMyPostedJobs } from "@/features/home/hooks/useJobs";
import type { Job } from "@/features/home/types/job.types";
import type { SupportedLocale } from "@/lib/i18n";
import type { MainTabParamList, ProfileStackParamList } from "@/navigation/types";
import { ProfilePortrait } from "../components/ProfilePortrait";

type Props = NativeStackScreenProps<ProfileStackParamList, "ProfileOverview">;

const STATUS_TONE = {
  draft: "neutral",
  active: "active",
  offer_pending: "brand",
  assigned: "brand",
  completed: "neutral",
  cancelled: "danger",
  expired: "neutral",
} as const;

export function ProfileScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const categoriesQuery = useCategories();
  const postedQuery = useMyPostedJobs();
  const assignedQuery = useMyAssignedJobs();
  const locale = (i18n.language?.slice(0, 2) as SupportedLocale) || "en";
  const selectedCategoryIds = user?.workerProfile?.categories ?? [];
  const categories = (categoriesQuery.data ?? []).filter(
    (category) => selectedCategoryIds.includes(category._id) || selectedCategoryIds.includes(category.slug)
  );
  const jobsById = new Map<string, Job>();
  for (const job of [...(postedQuery.data ?? []), ...(assignedQuery.data ?? [])]) jobsById.set(job._id, job);
  const allJobs = Array.from(jobsById.values());
  const recentJobs = [...allJobs]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 2);
  const dateFormatter = new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium" });

  const openJob = (jobId: string) => {
    navigation.getParent<NavigationProp<MainTabParamList>>()?.navigate("Orders", {
      screen: "JobDetail",
      params: { jobId },
    });
  };

  return (
    <Screen padded={false}>
      <CustomerHeader title={t("navigation.profile")} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <YStack gap="$5">
        <XStack justifyContent="flex-end">
          <Pressable
            onPress={() => navigation.navigate("ProfileSettings")}
            role="button"
            aria-label={t("accessibility.profileSettings")}
            hitSlop={10}
            style={{ width: 48, height: 48, alignItems: "center", justifyContent: "center" }}
          >
            <Ionicons name="settings-outline" size={30} color="#4F8266" />
          </Pressable>
        </XStack>

        <YStack alignItems="center">
          <ProfilePortrait uri={user?.photoUrl} name={user?.firstName} size={100} />
        </YStack>

        <XStack gap="$4" alignItems="stretch">
          <YStack flex={1} gap="$3">
            <Text variant="h4">{user?.firstName} {user?.lastName}</Text>
            <YStack gap="$2">
              <Text variant="small" fontWeight="600">{t("profileFlow.categories")}</Text>
              {categoriesQuery.isLoading ? <ActivityIndicator color="#4F8266" /> : categories.length ? (
                <XStack flexWrap="wrap" gap="$2">
                  {categories.map((category) => (
                    <YStack
                      key={category._id}
                      width={34}
                      height={34}
                      borderRadius="$sm"
                      borderWidth={1}
                      borderColor="$primary"
                      alignItems="center"
                      justifyContent="center"
                      accessibilityLabel={category.name[locale] || category.name.en}
                    >
                      {category.imageUrl ? (
                        <Image source={{ uri: category.imageUrl }} style={{ width: 28, height: 28, borderRadius: 4 }} />
                      ) : (
                        <Ionicons name={getCategoryIcon(category.slug)} size={18} color="#4F8266" />
                      )}
                    </YStack>
                  ))}
                </XStack>
              ) : <Text variant="caption">{t("profileFlow.noCategories")}</Text>}
            </YStack>
          </YStack>

          <YStack width={1} backgroundColor="$borderColor" />

          <YStack flex={1} gap="$2">
            <XStack alignItems="center" gap="$2">
              <Ionicons name="ribbon-outline" size={24} color="#4F8266" />
              <Text variant="h4">{(user?.rating.average ?? 0).toFixed(1)}/5</Text>
            </XStack>
            <Text variant="body">{t("profile.reviewCount", { count: user?.rating.count ?? 0 })}</Text>
            <Text variant="body">{t("profileFlow.jobCount", { count: allJobs.length })}</Text>
            <Text variant="body">
              {t("profileFlow.memberSince", {
                date: user?.createdAt ? dateFormatter.format(new Date(user.createdAt)) : t("profileFlow.notAvailable"),
              })}
            </Text>
          </YStack>
        </XStack>

        <YStack height={1} backgroundColor="$borderColor" />
        <Text variant="label" textAlign="center">{t("profileFlow.recentActivity")}</Text>

        {postedQuery.isLoading || assignedQuery.isLoading ? (
          <ActivityIndicator color="#4F8266" />
        ) : postedQuery.isError || assignedQuery.isError ? (
          <YStack alignItems="center" gap="$2">
            <Text muted textAlign="center">{t("profileFlow.activityError")}</Text>
            <Button size="sm" variant="outline" onPress={() => { void postedQuery.refetch(); void assignedQuery.refetch(); }}>
              {t("common.retry")}
            </Button>
          </YStack>
        ) : recentJobs.length ? (
          <YStack gap="$3">
            {recentJobs.map((job) => (
              <RecentJobCard key={job._id} job={job} locale={locale} onPress={() => openJob(job._id)} />
            ))}
          </YStack>
        ) : (
          <Text muted textAlign="center">{t("profileFlow.noActivity")}</Text>
        )}
      </YStack>
      </ScrollView>
    </Screen>
  );
}

function RecentJobCard({ job, locale, onPress }: { job: Job; locale: SupportedLocale; onPress: () => void }) {
  const { t, i18n } = useTranslation();
  const scheduledDate = new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium" }).format(new Date(job.date));

  return (
    <Pressable onPress={onPress} role="button" aria-label={t("profileFlow.openJob", { title: job.title })}>
      <Card elevated padding="$0" overflow="hidden">
        {job.media[0]?.type === "photo" ? (
          <Image source={{ uri: job.media[0].url }} style={{ width: "100%", height: 104 }} resizeMode="cover" />
        ) : null}
        <XStack padding="$3" alignItems="center" gap="$3">
          <YStack flex={1} gap="$1">
            <Text variant="h4" numberOfLines={1}>{job.title}</Text>
            <Text variant="caption">{job.categoryId.name[locale] || job.categoryId.name.en}</Text>
            <Text variant="caption">{t("profileFlow.scheduled", { date: scheduledDate })}</Text>
          </YStack>
          <StatusPill label={t(`jobs.status.${job.status}`)} tone={STATUS_TONE[job.status]} />
          <Ionicons name="chevron-forward" size={20} color="#4F8266" />
        </XStack>
      </Card>
    </Pressable>
  );
}
