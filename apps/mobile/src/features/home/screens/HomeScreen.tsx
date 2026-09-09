import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import Slider from "@react-native-community/slider";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, type ViewToken } from "react-native";
import { XStack, YStack } from "tamagui";
import { Input } from "@/components/ui/Input";
import { PillTabs } from "@/components/ui/PillTabs";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { EmptyState } from "@/components/ui/states/EmptyState";
import { ErrorState } from "@/components/ui/states/ErrorState";
import { LoadingState } from "@/components/ui/states/LoadingState";
import { getApiErrorMessage } from "@/lib/apiClient";
import { distanceKm, formatDistanceKm } from "@/lib/geo";
import { useCurrentLocation } from "@/lib/useCurrentLocation";
import type { HomeStackParamList } from "@/navigation/types";
import { JobCard } from "../components/JobCard";
import { JobFilterModal, type JobFilters } from "../components/JobFilterModal";
import { JobMapView } from "../components/JobMapView";
import { isGloballyVisibleJob, useCategories, useJobs } from "../hooks/useJobs";
import { NotificationBell } from "@/features/notifications/components/NotificationBell";
import { AdvertisementCard } from "@/features/advertisements/components/AdvertisementCard";
import { useAdvertisements } from "@/features/advertisements/hooks/useAdvertisements";
import { insertAdvertisements } from "@/features/advertisements/utils/insertAdvertisements";

type Props = NativeStackScreenProps<HomeStackParamList, "HomeList">;
type ViewMode = "map" | "list";

const MIN_RADIUS_KM = 1;
const MAX_RADIUS_KM = 50;
const DEFAULT_FILTERS: JobFilters = { categoryIds: [], minBudget: 0, maxBudget: 1000, peopleNeeded: null };

export function HomeScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("map");
  const [radiusKm, setRadiusKm] = useState(18);
  const [filters, setFilters] = useState<JobFilters>(DEFAULT_FILTERS);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [playingAdvertisementId, setPlayingAdvertisementId] = useState<string>();
  const [visibleAdvertisementIds, setVisibleAdvertisementIds] = useState<Set<string>>(() => new Set());
  const isFocused = useIsFocused();
  const { location } = useCurrentLocation();

  const categoriesQuery = useCategories();
  const jobsQuery = useJobs({
    search: search || undefined,
    categoryId: filters.categoryIds.length > 0 ? filters.categoryIds.join(",") : undefined,
    minBudget: filters.minBudget > 0 ? filters.minBudget : undefined,
    maxBudget: filters.maxBudget < 1000 ? filters.maxBudget : undefined,
    peopleNeeded: filters.peopleNeeded ?? undefined,
    lng: location.status === "granted" ? location.coords.lng : undefined,
    lat: location.status === "granted" ? location.coords.lat : undefined,
    radiusKm: location.status === "granted" ? radiusKm : undefined,
  });
  const advertisementsQuery = useAdvertisements(viewMode === "list");

  useFocusEffect(
    useCallback(() => {
      void jobsQuery.refetch();
      if (viewMode === "list") void advertisementsQuery.refetch();
    }, [advertisementsQuery.refetch, jobsQuery.refetch, viewMode])
  );

  useEffect(() => {
    if (!isFocused || viewMode !== "list") {
      setPlayingAdvertisementId(undefined);
      setVisibleAdvertisementIds(new Set());
    }
  }, [isFocused, viewMode]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    setVisibleAdvertisementIds(new Set(viewableItems.flatMap((token) => {
      const item = token.item as ReturnType<typeof insertAdvertisements>[number];
      return item.kind === "advertisement" ? [item.advertisement._id] : [];
    })));
  }).current;
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  const jobs = (jobsQuery.data?.items ?? []).filter((job) => isGloballyVisibleJob(job));
  const homeListItems = insertAdvertisements(jobs, advertisementsQuery.data ?? []);
  const activeFilterCount =
    filters.categoryIds.length +
    (filters.minBudget > 0 || filters.maxBudget < 1000 ? 1 : 0) +
    (filters.peopleNeeded ? 1 : 0);

  const getDistance = (jobCoords: [number, number]) => {
    if (location.status !== "granted") return undefined;
    return formatDistanceKm(distanceKm(location.coords, { lng: jobCoords[0], lat: jobCoords[1] }));
  };

  return (
    <Screen padded={false}>
      <YStack padding="$4" gap="$3">
        <XStack gap="$2" alignItems="center">
          <YStack flex={1}>
            <Input
              placeholder={t("home.searchPlaceholder")}
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
              rightElement={
                search.length > 0 ? (
                  <XStack onPress={() => setSearch("")} padding="$2" accessibilityRole="button" accessibilityLabel={t("filters.clearSearch")}>
                    <Ionicons name="close-circle" size={18} color="#9AA793" />
                  </XStack>
                ) : undefined
              }
            />
          </YStack>
          <NotificationBell
            onPress={() => navigation.navigate("Notifications")}
            label={(count) => t("notifications.bellLabel", { count })}
          />
          <XStack
            width={44}
            height={44}
            borderRadius={22}
            borderWidth={1.5}
            borderColor={activeFilterCount > 0 ? "$primary" : "$borderColor"}
            backgroundColor={activeFilterCount > 0 ? "$primary" : "$backgroundStrong"}
            alignItems="center"
            justifyContent="center"
            onPress={() => setIsFilterOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t("filters.open")}
          >
            <Ionicons name="options-outline" size={20} color={activeFilterCount > 0 ? "white" : "#4F8266"} />
          </XStack>
        </XStack>

        <PillTabs
          options={[
            { value: "map", label: t("home.map") },
            { value: "list", label: t("home.list") },
          ]}
          value={viewMode}
          onChange={setViewMode}
        />

        {location.status === "granted" ? (
          <XStack alignItems="center" gap="$2">
            <Ionicons name="location-outline" size={16} color="#5B6358" />
            <YStack flex={1}>
              <Slider
                minimumValue={MIN_RADIUS_KM}
                maximumValue={MAX_RADIUS_KM}
                step={1}
                value={radiusKm}
                onSlidingComplete={setRadiusKm}
                minimumTrackTintColor="#4F8266"
                maximumTrackTintColor="#DDE3DA"
                thumbTintColor="#4F8266"
              />
            </YStack>
            <Text variant="caption">{radiusKm} km</Text>
          </XStack>
        ) : null}
      </YStack>

      {jobsQuery.isLoading ? (
        <LoadingState label={t("common.loading")} />
      ) : jobsQuery.isError ? (
        <ErrorState
          title={t("home.errorTitle")}
          message={getApiErrorMessage(jobsQuery.error, t("home.errorTitle"))}
          retryLabel={t("common.retry")}
          onRetry={() => jobsQuery.refetch()}
        />
      ) : jobs.length === 0 ? (
        <EmptyState title={t("home.emptyTitle")} body={t("home.emptyBody")} />
      ) : viewMode === "map" ? (
        <JobMapView
          jobs={jobs}
          userCoords={location.status === "granted" ? location.coords : null}
          onSelectJob={(job) => navigation.navigate("JobDetail", { jobId: job._id })}
        />
      ) : (
        <FlatList
          data={homeListItems}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <YStack paddingHorizontal="$4" paddingBottom="$3">
              {item.kind === "job" ? (
                <JobCard
                  job={item.job}
                  distance={getDistance(item.job.location.coordinates)}
                  onPress={() => navigation.navigate("JobDetail", { jobId: item.job._id })}
                />
              ) : (
                <AdvertisementCard
                  advertisement={item.advertisement}
                  screenActive={isFocused && viewMode === "list" && visibleAdvertisementIds.has(item.advertisement._id)}
                  playbackAllowed={!playingAdvertisementId || playingAdvertisementId === item.advertisement._id}
                  onPlaybackChange={(playing) => setPlayingAdvertisementId(playing ? item.advertisement._id : undefined)}
                />
              )}
            </YStack>
          )}
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshing={jobsQuery.isFetching || advertisementsQuery.isFetching}
          onRefresh={() => { void Promise.all([jobsQuery.refetch(), advertisementsQuery.refetch()]); }}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
        />
      )}

      {categoriesQuery.data ? (
        <JobFilterModal
          visible={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          categories={categoriesQuery.data}
          filters={filters}
          onChange={setFilters}
          onClear={() => {
            setFilters(DEFAULT_FILTERS);
            setIsFilterOpen(false);
          }}
        />
      ) : null}
    </Screen>
  );
}
