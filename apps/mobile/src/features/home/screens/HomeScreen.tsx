import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList } from "react-native";
import { YStack } from "tamagui";
import { Input } from "@/components/ui/Input";
import { Screen } from "@/components/ui/Screen";
import { EmptyState } from "@/components/ui/states/EmptyState";
import { ErrorState } from "@/components/ui/states/ErrorState";
import { LoadingState } from "@/components/ui/states/LoadingState";
import { getApiErrorMessage } from "@/lib/apiClient";
import type { HomeStackParamList } from "@/navigation/types";
import { CategoryFilterRow } from "../components/CategoryFilterRow";
import { JobCard } from "../components/JobCard";
import { useCategories, useJobs } from "../hooks/useJobs";

type Props = NativeStackScreenProps<HomeStackParamList, "HomeList">;

export function HomeScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);

  const categoriesQuery = useCategories();
  const jobsQuery = useJobs({ search: search || undefined, categoryId: categoryId ?? undefined });

  return (
    <Screen padded={false}>
      <YStack padding="$4" gap="$3">
        <Input
          placeholder={t("home.searchPlaceholder")}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {categoriesQuery.data ? (
          <CategoryFilterRow categories={categoriesQuery.data} selectedId={categoryId} onSelect={setCategoryId} />
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
      ) : jobsQuery.data && jobsQuery.data.items.length > 0 ? (
        <FlatList
          data={jobsQuery.data.items}
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
      ) : (
        <EmptyState title={t("home.emptyTitle")} body={t("home.emptyBody")} />
      )}
    </Screen>
  );
}
