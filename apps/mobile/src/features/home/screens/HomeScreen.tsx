import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Slider from "@react-native-community/slider";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList } from "react-native";
import { XStack, YStack } from "tamagui";
import { Input } from "@/components/ui/Input";
import { PillTabs } from "@/components/ui/PillTabs";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { EmptyState } from "@/components/ui/states/EmptyState";
import { ErrorState } from "@/components/ui/states/ErrorState";
import { LoadingState } from "@/components/ui/states/LoadingState";
import { getApiErrorMessage } from "@/lib/apiClient";
import { useCurrentLocation } from "@/lib/useCurrentLocation";
import type { HomeStackParamList } from "@/navigation/types";
import { CategoryFilterRow } from "../components/CategoryFilterRow";
import { JobCard } from "../components/JobCard";
import { JobMapView } from "../components/JobMapView";
import { useCategories, useJobs } from "../hooks/useJobs";

type Props = NativeStackScreenProps<HomeStackParamList, "HomeList">;
type ViewMode = "map" | "list";

const MIN_RADIUS_KM = 1;
const MAX_RADIUS_KM = 50;

export function HomeScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("map");
  const [radiusKm, setRadiusKm] = useState(18);
  const { location } = useCurrentLocation();

  const categoriesQuery = useCategories();
  const jobsQuery = useJobs({
    search: search || undefined,
    categoryId: categoryId ?? undefined,
    lng: location.status === "granted" ? location.coords.lng : undefined,
    lat: location.status === "granted" ? location.coords.lat : undefined,
    radiusKm: location.status === "granted" ? radiusKm : undefined,
  });

  const jobs = jobsQuery.data?.items ?? [];

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
            />
          </YStack>
          <PillTabs
            options={[
              { value: "map", label: t("home.map") },
              { value: "list", label: t("home.list") },
            ]}
            value={viewMode}
            onChange={setViewMode}
          />
        </XStack>

        {categoriesQuery.data ? (
          <CategoryFilterRow categories={categoriesQuery.data} selectedId={categoryId} onSelect={setCategoryId} />
        ) : null}

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
          data={jobs}
          keyExtractor={(job) => job._id}
          renderItem={({ item }) => (
            <YStack paddingHorizontal="$4" paddingBottom="$3">
              <JobCard job={item} onPress={() => navigation.navigate("JobDetail", { jobId: item._id })} />
            </YStack>
          )}
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshing={jobsQuery.isFetching}
          onRefresh={() => jobsQuery.refetch()}
        />
      )}
    </Screen>
  );
}
