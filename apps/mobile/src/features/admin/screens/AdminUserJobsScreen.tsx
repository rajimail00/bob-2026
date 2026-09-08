import { useDeferredValue, useState } from "react";
import { FlatList, Image, Pressable, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { XStack, YStack } from "tamagui";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { StatusPill } from "@/components/ui/StatusPill";
import { Text } from "@/components/ui/Text";
import { EmptyState } from "@/components/ui/states/EmptyState";
import { ErrorState } from "@/components/ui/states/ErrorState";
import { LoadingState } from "@/components/ui/states/LoadingState";
import type { JobStatus } from "@/features/home/types/job.types";
import type { AdminStackParamList } from "@/navigation/types";
import { AdminActiveFilters, AdminFilterSection, AdminFilterSheet } from "../components/AdminFilterSheet";
import { AdminFilters } from "../components/AdminFilters";
import { AdminHeader } from "../components/AdminHeader";
import { AdminSearchBar } from "../components/AdminSearchBar";
import { useAdminUser, useAdminUserJobs } from "../hooks/useAdmin";
import type { AdminJob, AdminUserJobKind, AdminUserJobsQuery } from "../types/admin.types";

const statuses: JobStatus[] = ["draft", "active", "offer_pending", "assigned", "completed", "cancelled", "expired"];
const sorts: NonNullable<AdminUserJobsQuery["sort"]>[] = ["newest", "oldest", "scheduled_asc", "scheduled_desc"];

export function AdminUserJobsScreen({ route, navigation }: NativeStackScreenProps<AdminStackParamList, "AdminUserJobs">) {
  const { t, i18n } = useTranslation();
  const [kind, setKind] = useState<AdminUserJobKind>("offered");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<JobStatus>();
  const [sort, setSort] = useState<NonNullable<AdminUserJobsQuery["sort"]>>("newest");
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const userQuery = useAdminUser(route.params.userId);
  const jobsQuery = useAdminUserJobs(route.params.userId, {
    kind,
    page,
    pageSize: 20,
    search: useDeferredValue(search) || undefined,
    status,
    sort,
  });

  const activeFilters = [
    ...(status ? [{ key: "status", label: t(`jobs.status.${status}`), onRemove: () => { setStatus(undefined); setPage(1); } }] : []),
    ...(sort !== "newest" ? [{ key: "sort", label: t(`admin.sort.${sort}`), onRemove: () => { setSort("newest"); setPage(1); } }] : []),
  ];
  const clearFilters = () => {
    setStatus(undefined);
    setSort("newest");
    setPage(1);
  };

  if (userQuery.isLoading) {
    return <Screen padded={false}><AdminHeader title={t("admin.userJobs.title")} showBack /><LoadingState /></Screen>;
  }
  if (userQuery.isError || !userQuery.data) {
    return <Screen padded={false}><AdminHeader title={t("admin.userJobs.title")} showBack /><ErrorState title={t("admin.common.loadError")} retryLabel={t("common.retry")} onRetry={() => userQuery.refetch()} /></Screen>;
  }

  const { user } = userQuery.data;
  const name = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email;
  const summary = jobsQuery.data?.summary;

  return (
    <Screen padded={false}>
      <AdminHeader title={t("admin.userJobs.title")} showBack />
      <FlatList
        data={jobsQuery.data?.items ?? []}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ paddingBottom: 32, gap: 12 }}
        refreshControl={(
          <RefreshControl
            refreshing={userQuery.isRefetching || jobsQuery.isRefetching}
            onRefresh={() => { void Promise.all([userQuery.refetch(), jobsQuery.refetch()]); }}
          />
        )}
        ListHeaderComponent={(
          <YStack gap="$3" paddingTop="$4">
            <YStack paddingHorizontal="$4" gap="$3">
              <Card elevated>
                <XStack gap="$3" alignItems="center">
                  <Avatar uri={user.photoUrl} name={name} size={64} />
                  <YStack flex={1} gap="$1">
                    <Text variant="h3" numberOfLines={1}>{name}</Text>
                    <Text variant="caption" numberOfLines={1}>{user.email}</Text>
                    <Text variant="caption">{t("admin.users.registered")}: {new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium" }).format(new Date(user.createdAt))}</Text>
                  </YStack>
                  <StatusPill label={t(`admin.accountStatus.${user.status}`)} tone={user.status === "active" ? "active" : "danger"} />
                </XStack>
              </Card>

              <Card elevated>
                <Text variant="h4">{t("admin.userJobs.about")}</Text>
                <Text muted={!user.bio}>{user.bio || t("admin.userJobs.noBio")}</Text>
              </Card>

              <XStack flexWrap="wrap" gap="$2">
                <SummaryCard icon="briefcase-outline" value={summary?.offered} label={t("admin.userJobs.offered")} />
                <SummaryCard icon="hand-left-outline" value={summary?.taken} label={t("admin.userJobs.taken")} />
                <SummaryCard icon="pulse-outline" value={summary?.active} label={t("admin.userJobs.active")} />
                <SummaryCard icon="checkmark-circle-outline" value={summary?.completed} label={t("admin.userJobs.completed")} />
              </XStack>

              <XStack gap="$2">
                <Button
                  flex={1}
                  size="sm"
                  variant={kind === "offered" ? "primary" : "outline"}
                  onPress={() => { setKind("offered"); setPage(1); }}
                >
                  {t("admin.userJobs.offeredWithCount", { count: summary?.offered ?? 0 })}
                </Button>
                <Button
                  flex={1}
                  size="sm"
                  variant={kind === "taken" ? "primary" : "outline"}
                  onPress={() => { setKind("taken"); setPage(1); }}
                >
                  {t("admin.userJobs.takenWithCount", { count: summary?.taken ?? 0 })}
                </Button>
              </XStack>
            </YStack>

            <AdminSearchBar
              value={search}
              onChangeText={(value) => { setSearch(value); setPage(1); }}
              placeholder={t("admin.common.search")}
              label={t("admin.userJobs.searchLabel")}
              onOpenFilters={() => setFiltersOpen(true)}
              activeFilterCount={activeFilters.length}
            />
            <AdminActiveFilters filters={activeFilters} />

            {jobsQuery.isLoading ? <LoadingState /> : null}
            {jobsQuery.isError ? <ErrorState title={t("admin.common.loadError")} retryLabel={t("common.retry")} onRetry={() => jobsQuery.refetch()} /> : null}
          </YStack>
        )}
        ListEmptyComponent={jobsQuery.isLoading || jobsQuery.isError ? null : (
          <EmptyState title={t(kind === "offered" ? "admin.userJobs.emptyOffered" : "admin.userJobs.emptyTaken")} />
        )}
        renderItem={({ item }) => (
          <UserJobCard
            job={item}
            kind={kind}
            locale={i18n.language}
            onPress={() => navigation.navigate("AdminJobDetail", { jobId: item._id })}
          />
        )}
        ListFooterComponent={jobsQuery.data && jobsQuery.data.total > 0 ? (
          <XStack justifyContent="space-between" alignItems="center" paddingHorizontal="$4" paddingTop="$2">
            <Button size="sm" variant="outline" disabled={page <= 1} onPress={() => setPage((value) => value - 1)}>{t("admin.common.previous")}</Button>
            <Text variant="caption">{t("admin.common.page", { page, total: Math.max(1, Math.ceil(jobsQuery.data.total / 20)) })}</Text>
            <Button size="sm" variant="outline" disabled={page * 20 >= jobsQuery.data.total} onPress={() => setPage((value) => value + 1)}>{t("admin.common.next")}</Button>
          </XStack>
        ) : null}
      />

      <AdminFilterSheet visible={filtersOpen} onClose={() => setFiltersOpen(false)} onClear={clearFilters} hasActiveFilters={activeFilters.length > 0}>
        <AdminFilterSection title={t("admin.filterGroups.jobStatus")}>
          <AdminFilters values={statuses} selected={status} labels={Object.fromEntries(statuses.map((value) => [value, t(`jobs.status.${value}`)])) as Record<JobStatus, string>} onSelect={(value) => { setStatus(value); setPage(1); }} />
        </AdminFilterSection>
        <AdminFilterSection title={t("admin.filterGroups.sortBy")}>
          <AdminFilters values={sorts} selected={sort} labels={Object.fromEntries(sorts.map((value) => [value, t(`admin.sort.${value}`)])) as Record<NonNullable<AdminUserJobsQuery["sort"]>, string>} onSelect={(value) => { setSort(value ?? "newest"); setPage(1); }} />
        </AdminFilterSection>
      </AdminFilterSheet>
    </Screen>
  );
}

function SummaryCard({ icon, value, label }: { icon: keyof typeof Ionicons.glyphMap; value?: number; label: string }) {
  return (
    <Card width="48.5%" minHeight={92} justifyContent="space-between">
      <XStack alignItems="center" gap="$2">
        <Ionicons name={icon} size={19} color="#4F8266" />
        <Text variant="caption" flex={1}>{label}</Text>
      </XStack>
      <Text variant="h3" color="$primary">{value ?? "—"}</Text>
    </Card>
  );
}

function UserJobCard({ job, kind, locale, onPress }: { job: AdminJob; kind: AdminUserJobKind; locale: string; onPress: () => void }) {
  const { t } = useTranslation();
  const category = job.categoryId?.name?.[locale as keyof typeof job.categoryId.name] ?? job.categoryId?.name?.en ?? "—";
  const relatedPerson = kind === "offered" ? job.assignedWorkerId : job.clientId;
  const relatedName = relatedPerson
    ? `${relatedPerson.firstName ?? ""} ${relatedPerson.lastName ?? ""}`.trim() || relatedPerson.email
    : t("admin.userJobs.unassigned");
  const tone = job.status === "active" ? "active" : job.status === "cancelled" ? "danger" : "neutral";

  return (
    <Pressable onPress={onPress} role="button" aria-label={t("admin.jobs.viewJob", { title: job.title })} style={{ marginHorizontal: 16 }}>
      <Card elevated>
        <XStack gap="$3" alignItems="center">
          {job.media[0]?.url ? (
            <Image source={{ uri: job.media[0].url }} style={{ width: 64, height: 64, borderRadius: 14 }} />
          ) : (
            <YStack width={64} height={64} borderRadius={14} backgroundColor="$brand100" alignItems="center" justifyContent="center">
              <Ionicons name="briefcase-outline" size={27} color="#4F8266" />
            </YStack>
          )}
          <YStack flex={1} gap="$1">
            <Text variant="h4" numberOfLines={2}>{job.title}</Text>
            <Text variant="caption" numberOfLines={1}>{category}</Text>
            <Text variant="caption">{t("admin.userJobs.scheduled")}: {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(job.date))}</Text>
          </YStack>
          <YStack alignItems="flex-end" gap="$2">
            <StatusPill label={t(`jobs.status.${job.status}`)} tone={tone} />
            <Ionicons name="chevron-forward" size={20} color="#78826F" />
          </YStack>
        </XStack>
        <XStack borderTopWidth={1} borderColor="$borderColor" paddingTop="$2" justifyContent="space-between" gap="$2">
          <Text variant="small" color="$primary">{new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(job.budget)}</Text>
          <Text variant="caption" numberOfLines={1} flex={1} textAlign="right">
            {t(kind === "offered" ? "admin.userJobs.worker" : "admin.userJobs.client")}: {relatedName}
          </Text>
        </XStack>
      </Card>
    </Pressable>
  );
}
