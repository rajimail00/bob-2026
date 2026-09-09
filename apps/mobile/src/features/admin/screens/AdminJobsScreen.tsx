import { useDeferredValue, useState } from "react";
import { Alert, FlatList, Image, Pressable, RefreshControl, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { XStack, YStack } from "tamagui";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { StatusPill } from "@/components/ui/StatusPill";
import { Text } from "@/components/ui/Text";
import { EmptyState } from "@/components/ui/states/EmptyState";
import { ErrorState } from "@/components/ui/states/ErrorState";
import { LoadingState } from "@/components/ui/states/LoadingState";
import { AdminFilters } from "../components/AdminFilters";
import { AdminFilterSection, AdminFilterSheet } from "../components/AdminFilterSheet";
import { AdminHeader } from "../components/AdminHeader";
import { AdminSearchBar } from "../components/AdminSearchBar";
import { useAdminCategories, useAdminJobs, useBulkModerateAdminJobs } from "../hooks/useAdmin";
import type { JobQuery, ModerationStatus } from "../types/admin.types";
import type { JobStatus } from "@/features/home/types/job.types";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { AdminStackParamList } from "@/navigation/types";

const statuses: JobStatus[] = ["draft", "active", "offer_pending", "assigned", "completed", "cancelled", "expired"];
const moderation: ModerationStatus[] = ["pending", "approved", "rejected", "suspended"];
const sorts: NonNullable<JobQuery["sort"]>[] = ["newest", "oldest", "scheduled_asc", "scheduled_desc"];
const createdPeriods = ["day", "week", "month"] as const;
const schedules = ["future", "past"] as const;

export function AdminJobsScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<AdminStackParamList>>();
  const [search, setSearch] = useState(""); const [status, setStatus] = useState<JobStatus>(); const [moderationStatus, setModeration] = useState<ModerationStatus>(); const [page, setPage] = useState(1); const [sort, setSort] = useState<NonNullable<JobQuery["sort"]>>("newest"); const [emergency, setEmergency] = useState(false); const [categoryId, setCategoryId] = useState<string>(); const [pageSelected, setPageSelected] = useState(false); const [createdPeriod, setCreatedPeriod] = useState<typeof createdPeriods[number]>(); const [schedule, setSchedule] = useState<typeof schedules[number]>(); const [filtersOpen, setFiltersOpen] = useState(false);
  const categories = useAdminCategories();
  const [filterNow, setFilterNow] = useState(() => Date.now()); const duration = createdPeriod === "day" ? 86_400_000 : createdPeriod === "week" ? 604_800_000 : createdPeriod === "month" ? 2_592_000_000 : undefined;
  const query = useAdminJobs({ page, pageSize: 20, search: useDeferredValue(search) || undefined, status, moderationStatus, sort, emergency: emergency || undefined, categoryId, createdFrom: duration ? new Date(filterNow - duration).toISOString() : undefined, scheduledFrom: schedule === "future" ? new Date(filterNow).toISOString() : undefined, scheduledTo: schedule === "past" ? new Date(filterNow).toISOString() : undefined });
  const bulkMutation = useBulkModerateAdminJobs();
  const clearFilters = () => {
    setStatus(undefined);
    setModeration(undefined);
    setCategoryId(undefined);
    setSort("newest");
    setCreatedPeriod(undefined);
    setSchedule(undefined);
    setEmergency(false);
    setPage(1);
  };
  const selectedCategory = categories.data?.find((item) => item._id === categoryId);
  const selectedCategoryLabel = selectedCategory
    ? selectedCategory.name[i18n.language as keyof typeof selectedCategory.name] || selectedCategory.name.en
    : undefined;
  const activeFilters = [
    ...(status ? [{ key: "status", label: t(`jobs.status.${status}`), onRemove: () => { setStatus(undefined); setPage(1); } }] : []),
    ...(moderationStatus ? [{ key: "moderation", label: t(`admin.moderation.${moderationStatus}`), onRemove: () => { setModeration(undefined); setPage(1); } }] : []),
    ...(selectedCategoryLabel ? [{ key: "category", label: selectedCategoryLabel, onRemove: () => { setCategoryId(undefined); setPage(1); } }] : []),
    ...(sort !== "newest" ? [{ key: "sort", label: t(`admin.sort.${sort}`), onRemove: () => { setSort("newest"); setPage(1); } }] : []),
    ...(createdPeriod ? [{ key: "created", label: t(`admin.filters.created${createdPeriod[0].toUpperCase()}${createdPeriod.slice(1)}`), onRemove: () => { setCreatedPeriod(undefined); setPage(1); } }] : []),
    ...(schedule ? [{ key: "schedule", label: t(schedule === "future" ? "admin.filters.scheduledFuture" : "admin.filters.scheduledPast"), onRemove: () => { setSchedule(undefined); setPage(1); } }] : []),
    ...(emergency ? [{ key: "emergency", label: t("admin.filters.emergencyOnly"), onRemove: () => { setEmergency(false); setPage(1); } }] : []),
  ];
  const bulkModerate = (nextStatus: ModerationStatus) => {
    const jobIds = (query.data?.items ?? []).map((item) => item._id);
    Alert.alert(t("admin.bulk.confirmTitle"), t("admin.bulk.confirmBody", { count: jobIds.length }), [{ text: t("common.cancel"), style: "cancel" }, { text: t(`admin.moderation.${nextStatus}`), onPress: () => bulkMutation.mutate({ jobIds, status: nextStatus }, { onSuccess: () => setPageSelected(false) }) }]);
  };
  return <Screen padded={false} safeAreaEdges={["top", "left", "right"]}><AdminHeader title={t("admin.navigation.jobs")} /><AdminSearchBar value={search} onChangeText={(value) => { setSearch(value); setPage(1); }} placeholder={t("admin.common.search")} label={t("admin.jobs.searchLabel")} onOpenFilters={() => setFiltersOpen(true)} activeFilterCount={activeFilters.length} />
    <AdminFilterSheet visible={filtersOpen} onClose={() => setFiltersOpen(false)} onClear={clearFilters} hasActiveFilters={activeFilters.length > 0}>
      <AdminFilterSection title={t("admin.filterGroups.jobStatus")}>
        <AdminFilters values={statuses} selected={status} labels={Object.fromEntries(statuses.map((value) => [value, t(`jobs.status.${value}`)])) as Record<JobStatus, string>} onSelect={(value) => { setStatus(value); setPage(1); }} />
      </AdminFilterSection>
      <AdminFilterSection title={t("admin.filterGroups.moderation")}>
        <AdminFilters values={moderation} selected={moderationStatus} labels={Object.fromEntries(moderation.map((value) => [value, t(`admin.moderation.${value}`)])) as Record<ModerationStatus, string>} onSelect={(value) => { setModeration(value); setPage(1); }} />
      </AdminFilterSection>
      {categories.data?.length ? <AdminFilterSection title={t("admin.filterGroups.category")}><AdminFilters values={categories.data.map((item) => item._id)} selected={categoryId} labels={Object.fromEntries(categories.data.map((item) => [item._id, item.name[i18n.language as keyof typeof item.name] || item.name.en]))} onSelect={(value) => { setCategoryId(value); setPage(1); }} /></AdminFilterSection> : null}
      <AdminFilterSection title={t("admin.filterGroups.sortBy")}>
        <AdminFilters values={sorts} selected={sort} labels={Object.fromEntries(sorts.map((value) => [value, t(`admin.sort.${value}`)])) as Record<NonNullable<JobQuery["sort"]>, string>} onSelect={(value) => { setSort(value ?? "newest"); setPage(1); }} />
      </AdminFilterSection>
      <AdminFilterSection title={t("admin.filterGroups.created")}>
        <AdminFilters values={createdPeriods} selected={createdPeriod} labels={{ day: t("admin.filters.createdDay"), week: t("admin.filters.createdWeek"), month: t("admin.filters.createdMonth") }} onSelect={(value) => { setFilterNow(Date.now()); setCreatedPeriod(value); setPage(1); }} />
      </AdminFilterSection>
      <AdminFilterSection title={t("admin.filterGroups.schedule")}>
        <AdminFilters values={schedules} selected={schedule} labels={{ future: t("admin.filters.scheduledFuture"), past: t("admin.filters.scheduledPast") }} onSelect={(value) => { setFilterNow(Date.now()); setSchedule(value); setPage(1); }} />
      </AdminFilterSection>
      <Button size="sm" variant={emergency ? "primary" : "outline"} onPress={() => { setEmergency((value) => !value); setPage(1); }}>{t("admin.filters.emergencyOnly")}</Button>
    </AdminFilterSheet>
    {moderationStatus && (query.data?.items.length ?? 0) > 0 ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8, gap: 8 }}><Button size="sm" variant="outline" onPress={() => setPageSelected((value) => !value)}>{pageSelected ? t("admin.bulk.clear") : t("admin.bulk.selectPage")}</Button>{pageSelected && moderationStatus === "pending" ? <><Button size="sm" onPress={() => bulkModerate("approved")}>{t("admin.jobs.approve")}</Button><Button size="sm" variant="destructive" onPress={() => bulkModerate("rejected")}>{t("admin.jobs.reject")}</Button></> : null}{pageSelected && moderationStatus === "approved" ? <Button size="sm" variant="destructive" onPress={() => bulkModerate("suspended")}>{t("admin.jobs.suspend")}</Button> : null}{pageSelected && (moderationStatus === "suspended" || moderationStatus === "rejected") ? <Button size="sm" onPress={() => bulkModerate("approved")}>{t("admin.jobs.restore")}</Button> : null}</ScrollView> : null}
    {query.isLoading ? <LoadingState /> : query.isError ? <ErrorState title={t("admin.common.loadError")} retryLabel={t("common.retry")} onRetry={() => query.refetch()} /> : (
      <FlatList
        data={query.data?.items ?? []}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />}
        ListEmptyComponent={<EmptyState title={t("admin.jobs.empty")} />}
        renderItem={({ item }) => (
          <Pressable onPress={() => navigation.navigate("AdminJobDetail", { jobId: item._id })} role="button" aria-label={t("admin.jobs.viewJob", { title: item.title })}>
            <Card elevated>
              <XStack gap="$3" alignItems="center">
                {item.media[0]?.url ? (
                  <Image source={{ uri: item.media[0].url }} style={{ width: 54, height: 54, borderRadius: 27 }} />
                ) : (
                  <YStack width={54} height={54} borderRadius={27} backgroundColor="$brand100" alignItems="center" justifyContent="center">
                    <Ionicons name="briefcase-outline" size={24} color="#4F8266" />
                  </YStack>
                )}
                <YStack flex={1} gap="$1">
                  <Text variant="h4" numberOfLines={1}>{item.title}</Text>
                  <Text variant="caption" numberOfLines={1}>{t("admin.jobs.created")}: {new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium" }).format(new Date(item.createdAt))}</Text>
                  <Text variant="caption" numberOfLines={1}>{item.categoryId?.name?.[i18n.language as keyof typeof item.categoryId.name] ?? item.categoryId?.name?.en}</Text>
                </YStack>
                <YStack gap="$1" alignItems="flex-end">
                  <StatusPill label={t(`jobs.status.${item.status}`)} tone={item.status === "active" ? "active" : item.status === "cancelled" ? "danger" : "neutral"} />
                  <StatusPill label={t(`admin.moderation.${item.moderationStatus ?? "approved"}`)} tone={item.moderationStatus === "approved" ? "brand" : item.moderationStatus === "rejected" || item.moderationStatus === "suspended" ? "danger" : "neutral"} />
                </YStack>
              </XStack>
            </Card>
          </Pressable>
        )}
        ListFooterComponent={<XStack justifyContent="space-between" alignItems="center" paddingTop="$3"><Button size="sm" variant="outline" disabled={page <= 1} onPress={() => setPage((value) => value - 1)}>{t("admin.common.previous")}</Button><Text variant="caption">{t("admin.common.page", { page, total: Math.max(1, Math.ceil((query.data?.total ?? 0) / 20)) })}</Text><Button size="sm" variant="outline" disabled={page * 20 >= (query.data?.total ?? 0)} onPress={() => setPage((value) => value + 1)}>{t("admin.common.next")}</Button></XStack>}
      />
    )}
  </Screen>;
}
