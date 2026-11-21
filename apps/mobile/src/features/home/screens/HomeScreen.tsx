import { Ionicons } from "@expo/vector-icons";
import * as ExpoLocation from "expo-location";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import Slider from "@react-native-community/slider";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, FlatList, Keyboard, type ViewToken } from "react-native";
import { XStack, YStack } from "tamagui";
import { Input } from "@/components/ui/Input";
import { CustomerHeader } from "@/components/layout/CustomerHeader";
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
import { AdvertisementCard } from "@/features/advertisements/components/AdvertisementCard";
import { useAdvertisements } from "@/features/advertisements/hooks/useAdvertisements";
import { insertAdvertisements } from "@/features/advertisements/utils/insertAdvertisements";
import { searchPrecisePlace } from "@/features/orders/api/location.api";
import {
  AddressSearchError,
  resolveAddressSearch,
  type Coords,
} from "@/features/orders/components/LocationPickerMap";

type Props = NativeStackScreenProps<HomeStackParamList, "HomeList">;
type ViewMode = "map" | "list";

const MIN_RADIUS_KM = 1;
const MAX_RADIUS_KM = 50;
const DEFAULT_FILTERS: JobFilters = { categoryIds: [], minBudget: 0, maxBudget: 1000, peopleNeeded: null };

export function HomeScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const [searchInput, setSearchInput] = useState("");
  const [searchedLocation, setSearchedLocation] = useState<{ coords: Coords; address: string } | null>(null);
  const [searchErrorKey, setSearchErrorKey] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const searchRevision = useRef(0);
  const [viewMode, setViewMode] = useState<ViewMode>("map");
  const [radiusKm, setRadiusKm] = useState(18);
  const [queryRadiusKm, setQueryRadiusKm] = useState(18);
  const [filters, setFilters] = useState<JobFilters>(DEFAULT_FILTERS);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [playingAdvertisementId, setPlayingAdvertisementId] = useState<string>();
  const [visibleAdvertisementIds, setVisibleAdvertisementIds] = useState<Set<string>>(() => new Set());
  const isFocused = useIsFocused();
  const { location } = useCurrentLocation();
  const centerCoords = searchedLocation?.coords ?? (location.status === "granted" ? location.coords : null);

  const categoriesQuery = useCategories();
  const jobsQuery = useJobs({
    categoryId: filters.categoryIds.length > 0 ? filters.categoryIds.join(",") : undefined,
    minBudget: filters.minBudget > 0 ? filters.minBudget : undefined,
    maxBudget: filters.maxBudget < 1000 ? filters.maxBudget : undefined,
    peopleNeeded: filters.peopleNeeded ?? undefined,
    lng: centerCoords?.lng,
    lat: centerCoords?.lat,
    radiusKm: centerCoords ? queryRadiusKm : undefined,
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

  useEffect(
    () => () => {
      searchRevision.current += 1;
    },
    []
  );

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
    if (!centerCoords) return undefined;
    return formatDistanceKm(distanceKm(centerCoords, { lng: jobCoords[0], lat: jobCoords[1] }));
  };

  const submitSearch = async () => {
    if (!searchInput.trim()) {
      setSearchErrorKey("locationPicker.emptySearch");
      return;
    }

    const revision = searchRevision.current + 1;
    searchRevision.current = revision;
    setSearchErrorKey(null);
    setIsSearching(true);
    try {
      const currentPermission = await ExpoLocation.getForegroundPermissionsAsync();
      const permission = currentPermission.status === "granted"
        ? currentPermission
        : await ExpoLocation.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        if (searchRevision.current === revision) setSearchErrorKey("locationPicker.permissionDenied");
        return;
      }

      const result = await resolveAddressSearch(
        searchInput,
        t("locationPicker.selected"),
        ExpoLocation.geocodeAsync,
        ExpoLocation.reverseGeocodeAsync,
        centerCoords ?? undefined,
        searchPrecisePlace,
        i18n.language
      );
      if (searchRevision.current !== revision) return;
      setSearchedLocation({ coords: result.coords, address: result.address });
      setSearchInput(result.address);
      setSearchErrorKey(result.reverseGeocodeFailed ? "locationPicker.reverseFailed" : null);
      Keyboard.dismiss();
    } catch (error) {
      if (searchRevision.current !== revision) return;
      const code = error instanceof AddressSearchError ? error.code : "searchFailed";
      setSearchErrorKey(`locationPicker.${code}`);
    } finally {
      if (searchRevision.current === revision) setIsSearching(false);
    }
  };

  const clearLocationSearch = () => {
    searchRevision.current += 1;
    setSearchInput("");
    setSearchedLocation(null);
    setSearchErrorKey(null);
    setIsSearching(false);
  };

  return (
    <Screen padded={false} contentGap="$0" safeAreaEdges={["top", "left", "right"]}>
      <CustomerHeader title={t("navigation.home")} />
      <YStack padding="$4" gap="$3">
        <XStack gap="$2" alignItems="center">
          <YStack flex={1}>
            <Input
              placeholder={t("home.searchPlaceholder")}
              value={searchInput}
              onChangeText={(value) => {
                setSearchInput(value);
                setSearchErrorKey(null);
              }}
              returnKeyType="search"
              onSubmitEditing={() => void submitSearch()}
              editable={!isSearching}
              rightElement={
                searchInput.length > 0 ? (
                  <XStack onPress={clearLocationSearch} padding="$2" accessibilityRole="button" accessibilityLabel={t("filters.clearSearch")}>
                    <Ionicons name="close-circle" size={18} color="#9AA793" />
                  </XStack>
                ) : undefined
              }
            />
          </YStack>
          <XStack
            width={44}
            height={44}
            borderRadius={22}
            borderWidth={1.5}
            borderColor="$borderColor"
            backgroundColor="$backgroundStrong"
            alignItems="center"
            justifyContent="center"
            onPress={() => void submitSearch()}
            accessibilityRole="button"
            accessibilityLabel={t("home.submitSearch")}
          >
            {isSearching ? <ActivityIndicator color="#4F8266" /> : <Ionicons name="search" size={20} color="#4F8266" />}
          </XStack>
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
        {searchErrorKey ? <Text variant="small" color="$danger">{t(searchErrorKey)}</Text> : null}

        <PillTabs
          options={[
            { value: "map", label: t("home.map") },
            { value: "list", label: t("home.list") },
          ]}
          value={viewMode}
          onChange={setViewMode}
        />

        {centerCoords ? (
          <XStack alignItems="center" gap="$2">
            <Ionicons name="location-outline" size={16} color="#5B6358" />
            <YStack flex={1}>
              <Slider
                minimumValue={MIN_RADIUS_KM}
                maximumValue={MAX_RADIUS_KM}
                step={1}
                value={radiusKm}
                onValueChange={setRadiusKm}
                onSlidingComplete={(value) => {
                  setRadiusKm(value);
                  setQueryRadiusKm(value);
                }}
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
      ) : viewMode === "map" ? (
        <JobMapView
          jobs={jobs}
          userCoords={centerCoords}
          radiusKm={radiusKm}
          onSelectJob={(job) => navigation.navigate("JobDetail", { jobId: job._id })}
        />
      ) : jobs.length === 0 ? (
        <EmptyState title={t("home.emptyTitle")} body={t("home.emptyBody")} />
      ) : (
        <FlatList
          style={{ flex: 1 }}
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
          contentContainerStyle={{ paddingBottom: 8 }}
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
